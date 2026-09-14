/**
 * Room Presence API — lightweight polling-based signaling
 * 
 * GET  /api/room/[roomId] — returns current participants
 * POST /api/room/[roomId] — announce presence (heartbeat every 5s)
 * 
 * Uses an in-memory Map keyed by roomId. Participants expire after 10s
 * of no heartbeat. This is sufficient for two-participant consultation rooms
 * without requiring WebSockets or a separate signaling server.
 */

interface Participant {
  role: "host" | "guest"
  joinedAt: number
  lastSeen: number
  cameraOn: boolean
  micOn: boolean
}

// In-memory store: roomId → { participantId → Participant }
// In a production multi-process/serverless deployment this should use Redis.
const rooms = new Map<string, Map<string, Participant>>()

const EXPIRY_MS = 12_000 // participant considered gone after 12s of no heartbeat

function cleanExpired(roomId: string) {
  const room = rooms.get(roomId)
  if (!room) return
  const now = Date.now()
  for (const [pid, p] of room) {
    if (now - p.lastSeen > EXPIRY_MS) room.delete(pid)
  }
  if (room.size === 0) rooms.delete(roomId)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  cleanExpired(roomId)
  const room = rooms.get(roomId)
  const participants = room ? Object.fromEntries(room.entries()) : {}
  return Response.json({ roomId, participants, ts: Date.now() })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  const body = await req.json().catch(() => ({}))

  const { participantId, role, cameraOn = true, micOn = true } = body as {
    participantId: string
    role: "host" | "guest"
    cameraOn: boolean
    micOn: boolean
  }

  if (!participantId || !role) {
    return Response.json({ error: "participantId and role required" }, { status: 400 })
  }

  if (!rooms.has(roomId)) rooms.set(roomId, new Map())
  const room = rooms.get(roomId)!

  const existing = room.get(participantId)
  room.set(participantId, {
    role,
    joinedAt: existing?.joinedAt ?? Date.now(),
    lastSeen: Date.now(),
    cameraOn,
    micOn,
  })

  cleanExpired(roomId)

  return Response.json({
    ok: true,
    participants: Object.fromEntries(room.entries()),
    ts: Date.now(),
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params
  const { participantId } = await req.json().catch(() => ({}))
  rooms.get(roomId)?.delete(participantId)
  return Response.json({ ok: true })
}
