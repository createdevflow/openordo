/**
 * Room Presence API — lightweight polling-based signaling
 *
 * GET    /api/room/[roomId] — returns current participants
 * POST   /api/room/[roomId] — announce presence (heartbeat every 4s)
 * DELETE /api/room/[roomId] — remove self on leave
 *
 * Security controls:
 * - Max 2 participants per room (host + 1 guest). A 3rd POST is rejected 403.
 * - Participants expire after EXPIRY_MS of no heartbeat (12 s).
 * - POST body is validated: participantId must be a non-empty string ≤ 128 chars.
 *   Role must be "host" or "guest". Invalid requests return 400.
 * - No session check here — the token-based validation is enforced at the page
 *   level (doctor: requireDoctorAccess; patient: validatePatientToken). The
 *   presence API is rate-limited implicitly by the 4 s heartbeat interval on the
 *   client; a hard cap prevents room-stuffing.
 * - Migrated to Redis for multi-instance production.
 */

import { redis } from "@/lib/redis"

interface Participant {
  role: "host" | "guest"
  joinedAt: number
  lastSeen: number
  cameraOn: boolean
  micOn: boolean
}

interface RoomState {
  participants: Record<string, Participant>
  messages: { sender: string; text: string; time: string }[]
  files: { name: string; size: string; sender: string; url?: string }[]
}

const EXPIRY_MS      = 12_000 // participant considered gone after 12 s no heartbeat
const MAX_PER_ROOM   = 2      // host + 1 patient only
const MAX_PID_LENGTH = 128    // prevent giant participantId strings
const MAX_RETRIES    = 5

function cleanExpiredParticipants(participants: Record<string, Participant>): Record<string, Participant> {
  const now = Date.now()
  const cleaned: Record<string, Participant> = {}
  for (const [pid, p] of Object.entries(participants)) {
    if (now - p.lastSeen <= EXPIRY_MS) {
      cleaned[pid] = p
    }
  }
  return cleaned
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  const key = `room:presence:${roomId}`
  const dataStr = await redis.get(key)
  let state: RoomState = { participants: {}, messages: [], files: [] }
  if (dataStr) {
    try {
      state = JSON.parse(dataStr) as RoomState
    } catch {
      // invalid JSON, ignore
    }
  }
  
  const participants = cleanExpiredParticipants(state.participants)
  
  return Response.json({ 
    roomId, 
    participants, 
    messages: state.messages ?? [], 
    files: state.files ?? [], 
    ts: Date.now() 
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { participantId, role, cameraOn = true, micOn = true, newMessage, newFile } = body as {
    participantId: unknown
    role: unknown
    cameraOn?: boolean
    micOn?: boolean
    newMessage?: { sender: string; text: string; time: string }
    newFile?: { name: string; size: string; sender: string; url?: string }
  }

  // ── Validate inputs server-side ────────────────────────────────────────────
  if (
    typeof participantId !== "string" ||
    participantId.length === 0 ||
    participantId.length > MAX_PID_LENGTH
  ) {
    return Response.json({ error: "Invalid participantId" }, { status: 400 })
  }
  if (role !== "host" && role !== "guest") {
    return Response.json({ error: "role must be 'host' or 'guest'" }, { status: 400 })
  }

  const key = `room:presence:${roomId}`

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    await redis.watch(key)
    const dataStr = await redis.get(key)
    
    let state: RoomState = { participants: {}, messages: [], files: [] }
    if (dataStr) {
      try {
        state = JSON.parse(dataStr) as RoomState
      } catch {
        // overwrite invalid data
      }
    }

    state.participants = cleanExpiredParticipants(state.participants)
    
    // ── Participant cap ────────────────────────────────────────────────────────
    const isExisting = !!state.participants[participantId]
    if (!isExisting && Object.keys(state.participants).length >= MAX_PER_ROOM) {
      await redis.unwatch()
      return Response.json(
        { error: "Room is full", code: "ROOM_FULL" },
        { status: 403 }
      )
    }

    const existing = state.participants[participantId]
    state.participants[participantId] = {
      role: role as "host" | "guest",
      joinedAt: existing?.joinedAt ?? Date.now(),
      lastSeen: Date.now(),
      cameraOn: Boolean(cameraOn),
      micOn:    Boolean(micOn),
    }

    // Append messages / files if provided
    if (newMessage) state.messages.push(newMessage)
    if (newFile) state.files.push(newFile)

    const multi = redis.multi()
    multi.setex(key, 3600, JSON.stringify(state))
    const results = await multi.exec()

    if (results === null) {
      // Transaction failed, retry
      continue
    }

    return Response.json({
      ok: true,
      participants: state.participants,
      messages: state.messages,
      files: state.files,
      ts: Date.now(),
    })
  }

  return Response.json({ error: "Concurrent updates failed" }, { status: 409 })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params

  let participantId: unknown
  try {
    ({ participantId } = await req.json())
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof participantId === "string" && participantId.length > 0) {
    const key = `room:presence:${roomId}`
    
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      await redis.watch(key)
      const dataStr = await redis.get(key)
      if (!dataStr) {
        await redis.unwatch()
        break
      }
      
      let state: RoomState
      try {
        state = JSON.parse(dataStr) as RoomState
      } catch {
        await redis.unwatch()
        break
      }

      if (state.participants[participantId]) {
        delete state.participants[participantId]
        const multi = redis.multi()
        
        if (Object.keys(state.participants).length === 0) {
          multi.del(key)
        } else {
          multi.setex(key, 3600, JSON.stringify(state))
        }
        
        const results = await multi.exec()
        if (results === null) {
          continue
        }
      } else {
        await redis.unwatch()
      }
      break
    }
  }

  return Response.json({ ok: true })
}
