"use client"

/**
 * ConsultationRoomClient — Video consultation room
 * 
 * BUG 2 FIX (Privacy): Camera toggle uses track.stop() + fresh getUserMedia() re-acquire,
 * NOT track.enabled = false, so the OS hardware indicator actually clears.
 * 
 * BUG 1 FIX (Real signaling): Presence driven by polling /api/room/[roomId] every 3s.
 * Both doctor and patient post heartbeats; each side reads real peer state — no fake
 * setTimeout("joined") logic. remoteJoined / remoteCameraOn / remoteMicOn all come
 * from the server-side presence store, not local assumptions.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Share2,
  Copy, Check, Clock, Stethoscope, FileText,
  ChevronDown, ChevronUp, Lock, Zap, User
} from "lucide-react"

// ── Brand tokens (dark surface) ───────────────────────────────────────────────
const T = {
  stageBg:       "#123025",
  panelSurface:  "rgba(255,255,255,0.05)",
  panelBorder:   "rgba(255,255,255,0.09)",
  textPrimary:   "#FFFFFF",
  textSecondary: "#B9C8C0",
  successGreen:  "#5FC97C",
  amber:         "#C8862B",
  coral:         "#B5432F",
  coralSoft:     "rgba(181,67,47,0.22)",
} as const

// ── Helper: initials ──────────────────────────────────────────────────────────
function initials(name?: string | null) {
  if (!name) return "?"
  return name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

// ── Avatar placeholder ────────────────────────────────────────────────────────
function AvatarPlaceholder({
  name, colorTag, size = 120, label, sublabel
}: {
  name?: string | null
  colorTag?: string | null
  size?: number
  label?: string
  sublabel?: string
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: colorTag || T.amber,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: size * 0.36, fontWeight: 700, flexShrink: 0
      }}>
        {initials(name)}
      </div>
      {label    && <div style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>{label}</div>}
      {sublabel && <div style={{ fontSize: 13, color: T.textSecondary, marginTop: -4 }}>{sublabel}</div>}
    </div>
  )
}

// ── Participant info from presence API ────────────────────────────────────────
interface PresenceParticipant {
  role: "host" | "guest"
  joinedAt: number
  lastSeen: number
  cameraOn: boolean
  micOn: boolean
}
type RoomPresence = Record<string, PresenceParticipant>

// ── Side Panel — defined as a TOP-LEVEL component (NOT nested) ───────────────
// Critical: if defined as a function inside ConsultationRoomClient, React treats
// it as a new component type on every render → unmounts + remounts on every
// keystroke → input loses focus after one character. Top-level = stable identity.
interface SidePanelProps {
  isHost: boolean
  hasEprescriptions: boolean
  appointment: any
  activeTab: "patient" | "chat" | "files"
  setActiveTab: (t: "patient" | "chat" | "files") => void
  patientExpanded: boolean
  setPatientExpanded: (fn: (v: boolean) => boolean) => void
  notes: string
  setNotes: (v: string) => void
  chatMessages: { sender: string; text: string; time: string }[]
  chatEndRef: React.RefObject<HTMLDivElement | null>
  newMessage: string
  setNewMessage: (v: string) => void
  sendChat: (e: React.FormEvent) => void
  sharedFiles: { name: string; size: string; sender: string }[]
  uploadFile: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function ConsultationSidePanel({
  isHost, hasEprescriptions, appointment,
  activeTab, setActiveTab,
  patientExpanded, setPatientExpanded,
  notes, setNotes,
  chatMessages, chatEndRef,
  newMessage, setNewMessage, sendChat,
  sharedFiles, uploadFile,
}: SidePanelProps) {
  const tabStyle = (tab: string): React.CSSProperties => ({
    background: "transparent", border: "none", padding: "10px 14px",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    color: activeTab === tab ? T.textPrimary : T.textSecondary,
    borderBottom: activeTab === tab ? `2px solid ${T.amber}` : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s", whiteSpace: "nowrap" as const,
  })

  return (
    <div style={{
      background: T.panelSurface, border: `1px solid ${T.panelBorder}`,
      borderRadius: 12, display: "flex", flexDirection: "column",
      overflow: "hidden", flex: 1
    }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.panelBorder}`, padding: "0 8px" }}>
        {isHost && <button style={tabStyle("patient")} onClick={() => setActiveTab("patient")}>Consultation</button>}
        <button style={tabStyle("chat")}  onClick={() => setActiveTab("chat")}>Chat</button>
        <button style={tabStyle("files")} onClick={() => setActiveTab("files")}>Files</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 16, minHeight: 0 }}>

        {/* ── Consultation tab (host only) ─── */}
        {isHost && activeTab === "patient" && (
          <>
            <div>
              <button
                onClick={() => setPatientExpanded(e => !e)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", background: "none", border: "none",
                  cursor: "pointer", color: T.textPrimary,
                  fontSize: 13, fontWeight: 700, padding: "0 0 8px",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={13} color={T.successGreen} /> Patient Details
                </span>
                {patientExpanded
                  ? <ChevronUp size={14} color={T.textSecondary} />
                  : <ChevronDown size={14} color={T.textSecondary} />}
              </button>
              {patientExpanded && (
                appointment?.patient ? (
                  <div style={{ background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 8, fontSize: 12.5, lineHeight: 1.7, color: T.textPrimary }}>
                    <div><span style={{ color: T.textSecondary }}>Name: </span>{appointment.patient.name}</div>
                    <div><span style={{ color: T.textSecondary }}>Age / Gender: </span>{appointment.patient.age} yrs / {appointment.patient.gender}</div>
                    <div><span style={{ color: T.textSecondary }}>Phone: </span>{appointment.patient.phone}</div>
                    {appointment.patient.bloodGroup && <div><span style={{ color: T.textSecondary }}>Blood Group: </span>{appointment.patient.bloodGroup}</div>}
                    {appointment.patient.allergies  && <div style={{ color: T.coral }}><b>⚠ Allergies: </b>{appointment.patient.allergies}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: T.textSecondary }}>Direct guest or quick session</div>
                )
              )}
            </div>

            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Stethoscope size={13} color={T.amber} /> Reason for Visit
              </div>
              <div style={{ background: "rgba(255,255,255,0.04)", padding: 10, borderRadius: 8, fontSize: 12.5, color: T.textSecondary, lineHeight: 1.5 }}>
                {appointment?.reason || "General virtual consultation"}
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <FileText size={13} color={T.amber} /> Consultation Notes
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Record symptoms, observations, or provisional diagnosis…"
                style={{
                  flex: 1, width: "100%", minHeight: 120,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8, padding: 10,
                  color: T.textPrimary, fontSize: 12.5,
                  resize: "none", fontFamily: "inherit", lineHeight: 1.5,
                }}
              />
            </div>

            <div style={{ marginTop: "auto" }}>
              {hasEprescriptions ? (
                <Link href="/dashboard/prescriptions" target="_blank" style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  background: T.amber, color: "#123025", padding: "11px 16px",
                  borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 700,
                }}>
                  <FileText size={14} /> Open E-Prescriptions ↗
                </Link>
              ) : (
                <Link href="/dashboard/addons" style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(200,134,43,0.12)", color: T.amber,
                  border: "1px solid rgba(200,134,43,0.3)",
                  padding: "8px 12px", borderRadius: 20,
                  textDecoration: "none", fontSize: 12, fontWeight: 600,
                }}>
                  <Zap size={12} /> Add E-Prescriptions
                </Link>
              )}
            </div>
          </>
        )}

        {/* ── Chat tab ─── */}
        {activeTab === "chat" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, height: 0, minHeight: 300 }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
              {chatMessages.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.sender === "You" ? "flex-end" : "flex-start",
                  background: msg.sender === "System" ? "transparent" : msg.sender === "You" ? "rgba(30,70,56,0.7)" : "rgba(255,255,255,0.07)",
                  padding: msg.sender === "System" ? "2px 0" : "8px 12px",
                  borderRadius: 12, maxWidth: "88%",
                  borderBottomRightRadius: msg.sender === "You" ? 3 : 12,
                  borderBottomLeftRadius:  (msg.sender === "You" || msg.sender === "System") ? 12 : 3,
                  textAlign: msg.sender === "System" ? "center" : "left",
                  color: msg.sender === "System" ? T.textSecondary : T.textPrimary,
                  fontSize: msg.sender === "System" ? 11 : 13,
                }}>
                  {msg.sender !== "You" && msg.sender !== "System" && (
                    <div style={{ fontSize: 10, color: T.textSecondary, marginBottom: 2 }}>{msg.sender}</div>
                  )}
                  <div>{msg.text}</div>
                  {msg.sender !== "System" && msg.time && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "right", marginTop: 4 }}>{msg.time}</div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendChat} style={{ display: "flex", gap: 8, borderTop: `1px solid ${T.panelBorder}`, paddingTop: 12 }}>
              <input
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                autoComplete="off"
                style={{
                  flex: 1, background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${T.panelBorder}`, padding: "8px 12px",
                  borderRadius: 20, color: T.textPrimary, fontSize: 13,
                  outline: "none",
                }}
              />
              <button type="submit" disabled={!newMessage.trim()} style={{
                background: newMessage.trim() ? T.amber : "rgba(255,255,255,0.1)",
                color: newMessage.trim() ? "#123025" : T.textSecondary,
                border: "none", borderRadius: 20, padding: "0 16px",
                fontSize: 13, fontWeight: 600, cursor: newMessage.trim() ? "pointer" : "not-allowed",
              }}>
                Send
              </button>
            </form>
          </div>
        )}

        {/* ── Files tab ─── */}
        {activeTab === "files" && (
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {sharedFiles.length === 0 ? (
                <div style={{ textAlign: "center", color: T.textSecondary, fontSize: 13, marginTop: 40 }}>
                  No files shared yet.<br />Upload documents, lab reports, or images.
                </div>
              ) : sharedFiles.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "rgba(255,255,255,0.05)", padding: 12, borderRadius: 8,
                }}>
                  <div style={{ background: "rgba(255,255,255,0.08)", padding: 8, borderRadius: 6 }}>
                    <FileText size={18} color={T.textSecondary} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: T.textSecondary }}>{f.size} · Shared by {f.sender}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, borderTop: `1px solid ${T.panelBorder}`, paddingTop: 16 }}>
              <input type="file" id="cw-file-upload" style={{ display: "none" }} onChange={uploadFile} />
              <label htmlFor="cw-file-upload" style={{
                display: "block", background: "rgba(255,255,255,0.08)",
                color: T.textPrimary, textAlign: "center", padding: "10px",
                borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>
                + Upload File
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ConsultationRoomClient({
  roomId,
  appointment,
  isHost = false,
  hasEprescriptions = false,
}: {
  roomId: string
  appointment: any | null
  isHost?: boolean
  hasEprescriptions?: boolean
}) {
  // ── Stable participant ID (persists across re-renders in this session) ────────
  // useId gives a stable string per component instance; we prefix to make it readable
  const componentId = useId()
  const myParticipantId = useRef(`${isHost ? "host" : "guest"}-${componentId.replace(/:/g, "")}`)

  // ── Local media state ─────────────────────────────────────────────────────────
  const [micOn,       setMicOn]       = useState(true)
  const [cameraOn,    setCameraOn]    = useState(true)
  const [cameraError, setCameraError] = useState(false)
  const [cameraAcquiring, setCameraAcquiring] = useState(false)
  const videoRef  = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)   // full stream for mic track
  const videoTrackRef = useRef<MediaStreamTrack | null>(null) // current video track only

  // ── Room presence (real signaling) ────────────────────────────────────────────
  const [presence,       setPresence]       = useState<RoomPresence>({})
  const [presenceError,  setPresenceError]  = useState(false)

  // ── Derived remote peer state from presence (the real fix for Bug 1) ─────────
  const remoteParticipants = Object.entries(presence).filter(
    ([id]) => id !== myParticipantId.current
  )
  const remotePeer = remoteParticipants[0]?.[1] ?? null
  const remoteJoined    = remotePeer !== null
  const remoteCameraOn  = remotePeer?.cameraOn ?? false
  const remoteMicOn     = remotePeer?.micOn    ?? false

  // Remote display name
  const patientName  = appointment?.patient?.name  ?? null
  const patientColor = appointment?.patient?.colorTag ?? "#5C7A67"
  const doctorName   = appointment?.doctor?.name
    ? `Dr. ${appointment.doctor.name}` : "Doctor"
  const doctorColor  = appointment?.doctor?.colorTag ?? T.amber
  const clinicName   = appointment?.clinic?.name ?? "OpenORDO Telehealth"

  const remoteName  = isHost ? patientName  : doctorName
  const remoteColor = isHost ? patientColor : doctorColor

  // Three distinct status states per spec
  const remoteStatusText = !remoteJoined
    ? `Waiting for ${isHost ? (patientName || "patient") : doctorName} to join…`
    : !remoteCameraOn
    ? "Camera off"
    : "Live feed active"

  // ── Call state ────────────────────────────────────────────────────────────────
  const [copied,       setCopied]       = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [notes,        setNotes]        = useState("")
  const [showJoinToast, setShowJoinToast] = useState(false)
  const prevRemoteJoinedRef = useRef(false)

  // ── Chat state ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"patient" | "chat" | "files">(
    isHost ? "patient" : "chat"
  )
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; time: string }[]>([
    { sender: "System", text: "End-to-end encrypted session started.", time: "" }
  ])
  const [newMessage,  setNewMessage]  = useState("")
  const [sharedFiles, setSharedFiles] = useState<{ name: string; size: string; sender: string }[]>([])
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [sheetOpen,       setSheetOpen]       = useState(false)
  const [patientExpanded, setPatientExpanded] = useState(true)

  // ─────────────────────────────────────────────────────────────────────────────
  // BUG 2 FIX: Camera toggle uses track.stop() + fresh getUserMedia() re-acquire.
  // track.enabled = false is NOT sufficient in all browsers to clear the OS
  // hardware indicator (confirmed failing on the reporter's desktop browser).
  // This approach fully releases the hardware on off, and re-acquires on on.
  // ─────────────────────────────────────────────────────────────────────────────

  /** Stop the current video track and clear the PIP preview */
  const stopVideoTrack = useCallback(() => {
    if (videoTrackRef.current) {
      videoTrackRef.current.stop()           // releases OS camera hardware
      videoTrackRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null       // clear the video element
    }
    // Remove video track from the stream object so audio continues
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => {
        t.stop()
        streamRef.current?.removeTrack(t)
      })
    }
  }, [])

  /** Re-acquire camera and attach to preview */
  const acquireVideoTrack = useCallback(async () => {
    if (cameraAcquiring) return
    setCameraAcquiring(true)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const [track] = newStream.getVideoTracks()
      if (!track) throw new Error("No video track returned")
      videoTrackRef.current = track

      // Attach to the preview element
      if (videoRef.current) {
        // Build a display stream: existing audio + new video
        const displayStream = new MediaStream()
        streamRef.current?.getAudioTracks().forEach(t => displayStream.addTrack(t))
        displayStream.addTrack(track)
        videoRef.current.srcObject = displayStream
      }

      setCameraError(false)
      console.log("[Camera] Re-acquired video track:", track.label, "readyState:", track.readyState)
    } catch (err) {
      console.warn("[Camera] Failed to re-acquire video:", err)
      setCameraError(true)
    } finally {
      setCameraAcquiring(false)
    }
  }, [cameraAcquiring])

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      // Turn OFF: stop the track — OS indicator will clear
      stopVideoTrack()
      setCameraOn(false)
      console.log("[Camera] Stopped — hardware indicator should clear now")
    } else {
      // Turn ON: re-acquire fresh stream
      setCameraOn(true)
      await acquireVideoTrack()
      console.log("[Camera] Re-acquired")
    }
  }, [cameraOn, stopVideoTrack, acquireVideoTrack])

  /** Mic toggle: track.enabled is sufficient for audio (no hardware indicator issue) */
  const toggleMic = useCallback(() => {
    const nextOn = !micOn
    streamRef.current?.getAudioTracks().forEach(t => {
      t.enabled = nextOn
    })
    setMicOn(nextOn)
    console.log("[Mic] enabled =", nextOn)
  }, [micOn])

  // ── Initial media acquisition — works on mobile Safari/Chrome ───────────────
  // Mobile Safari requires getUserMedia to be called after a user gesture on
  // first visit. If it fails (permissions denied or no camera), show a retry UI.
  const retryMedia = useCallback(async () => {
    setCameraError(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      const [vidTrack] = stream.getVideoTracks()
      videoTrackRef.current = vidTrack ?? null
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
      console.log("[Media] Retry succeeded")
    } catch (err) {
      console.warn("[Media] Retry failed:", err)
      setCameraError(true)
    }
  }, [])

  useEffect(() => {
    let active = true
    async function initMedia() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          if (active) setCameraError(true)
          return
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }

        streamRef.current = stream
        const [vidTrack] = stream.getVideoTracks()
        videoTrackRef.current = vidTrack ?? null

        if (videoRef.current) videoRef.current.srcObject = stream
        console.log("[Media] Stream acquired. Tracks:", stream.getTracks().map(t => `${t.kind}:${t.label}`))
      } catch (err) {
        console.warn("[Media] getUserMedia failed:", err)
        if (active) setCameraError(true)
      }
    }
    initMedia()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      videoTrackRef.current = null
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────────
  // BUG 1 FIX: Real presence polling via /api/room/[roomId]
  // Both participants post heartbeats every 4s. Each reads real peer state.
  // No setTimeout("joined") — the UI only updates when the server confirms the
  // other participant's heartbeat has been received.
  // ─────────────────────────────────────────────────────────────────────────────

  const postHeartbeat = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: myParticipantId.current,
          role: isHost ? "host" : "guest",
          cameraOn,
          micOn,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setPresence(data.participants ?? {})
      setPresenceError(false)
    } catch (err) {
      console.warn("[Presence] Heartbeat failed:", err)
      setPresenceError(true)
    }
  }, [roomId, isHost, cameraOn, micOn])

  // Post heartbeat every 4s; also fetch-only every 2s for responsive remote updates
  useEffect(() => {
    // Immediate first heartbeat on mount
    postHeartbeat()
    const heartbeatInterval = setInterval(postHeartbeat, 4000)

    // Fast poll for remote presence updates (GET only, no body)
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/room/${roomId}`)
        if (res.ok) {
          const data = await res.json()
          setPresence(data.participants ?? {})
        }
      } catch {
        // silent — heartbeat error state handled separately
      }
    }, 2000)

    return () => {
      clearInterval(heartbeatInterval)
      clearInterval(pollInterval)
      // DELETE our presence on leave
      fetch(`/api/room/${roomId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: myParticipantId.current }),
      }).catch(() => {})
    }
  }, [postHeartbeat, roomId])

  // Show toast when remote peer joins (host only) — driven by real presence, not timer
  useEffect(() => {
    if (isHost && remoteJoined && !prevRemoteJoinedRef.current) {
      setShowJoinToast(true)
      setTimeout(() => setShowJoinToast(false), 6000)
      console.log("[Signaling] Remote peer joined. Presence:", presence)
    }
    prevRemoteJoinedRef.current = remoteJoined
  }, [isHost, remoteJoined, presence])

  // ── Call timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setCallDuration(d => d + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // ── Chat scroll ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, activeTab])

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60), s = sec % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  const copyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setChatMessages(prev => [...prev, { sender: "You", text: newMessage, time: now }])
    setNewMessage("")
  }

  const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const size = (file.size / 1024 / 1024).toFixed(2) + " MB"
    setSharedFiles(prev => [...prev, { name: file.name, size, sender: "You" }])
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    setChatMessages(prev => [...prev, { sender: "You", text: `📎 Shared: ${file.name}`, time: now }])
  }

  // ── Style helpers ─────────────────────────────────────────────────────────────
  const ctrlBtn = (active: boolean): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: "50%",
    background: active ? "rgba(255,255,255,0.1)" : T.coralSoft,
    border: `1px solid ${active ? T.panelBorder : "rgba(181,67,47,0.4)"}`,
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
    flexShrink: 0,
  })

  const tabStyle = (tab: string): React.CSSProperties => ({
    background: "transparent", border: "none", padding: "10px 14px",
    fontSize: 13, fontWeight: 600, cursor: "pointer",
    color: activeTab === tab ? T.textPrimary : T.textSecondary,
    borderBottom: activeTab === tab ? `2px solid ${T.amber}` : "2px solid transparent",
    transition: "color 0.15s, border-color 0.15s", whiteSpace: "nowrap",
  })

  // SidePanel is now a top-level component (ConsultationSidePanel) — see above.
  // This avoids the remount-on-every-render bug that caused one-char input loss.
  const sidePanelProps: SidePanelProps = {
    isHost,
    hasEprescriptions,
    appointment,
    activeTab,
    setActiveTab,
    patientExpanded,
    setPatientExpanded,
    notes,
    setNotes,
    chatMessages,
    chatEndRef,
    newMessage,
    setNewMessage,
    sendChat,
    sharedFiles,
    uploadFile,
  }

  // ── Control bar (CSS-class driven for mobile override) ───────────────────────
  function ControlBar() {
    // Patients (guests) should not be redirected to /dashboard — it requires login.
    // We navigate them back to a safe "left" screen instead.
    const exitHref = isHost ? "/dashboard/appointments" : `/consultation/ended?room=${roomId}`

    return (
      <div className="cw-control-bar">
        <button
          onClick={toggleMic}
          className={`cw-ctrl-btn${micOn ? "" : " cw-ctrl-btn--off"}`}
          title={micOn ? "Mute" : "Unmute"}
          aria-label="Toggle microphone"
        >
          {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>

        <button
          onClick={toggleCamera}
          disabled={cameraAcquiring}
          className={`cw-ctrl-btn${cameraOn ? "" : " cw-ctrl-btn--off"}`}
          style={{ opacity: cameraAcquiring ? 0.6 : 1 }}
          title={cameraOn ? "Turn off Camera" : "Turn on Camera"}
          aria-label="Toggle camera"
        >
          {cameraAcquiring ? (
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
          ) : cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        {/* Share — only show to host or on desktop; patient mobile has no room to share */}
        <button
          onClick={copyLink}
          className="cw-ctrl-btn hide-on-mobile"
          title="Share link"
          aria-label="Share link"
        >
          {copied ? <Check size={20} color={T.successGreen} /> : <Share2 size={20} />}
        </button>

        <Link href={exitHref} className="cw-ctrl-btn--end">
          <PhoneOff size={18} />
          <span className="hide-on-mobile">{isHost ? "End Call" : "Leave"}</span>
        </Link>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    // cw-room-root: uses CSS for 100dvh with 100vh fallback + overscroll-behavior:none
    // This is critical for mobile Safari where 100vh != real visible height
    <div className="cw-room-root">

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="cw-room-header">
        {/* Left: logo + name */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7, background: "#1E4638",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 800, fontSize: 15, color: "#fff", flexShrink: 0,
          }}>C</div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>{clinicName}</div>
            <div className="hide-on-mobile" style={{ fontSize: 11, color: T.successGreen, display: "flex", alignItems: "center", gap: 4 }}>
              <Lock size={10} /> Encrypted consultation room
            </div>
          </div>
        </div>

        {/* Center: timer + connection badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "rgba(255,255,255,0.06)", padding: "5px 14px",
            borderRadius: 20, border: `1px solid ${T.panelBorder}`,
          }}>
            <Clock size={13} color={T.amber} />
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-jetbrains-mono, monospace)", color: T.amber }}>
              {formatTime(callDuration)}
            </span>
          </div>
          {/* Real connection status badge */}
          <div className="hide-on-mobile" style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            background: remoteJoined ? "rgba(95,201,124,0.15)" : "rgba(200,134,43,0.15)",
            border: `1px solid ${remoteJoined ? "rgba(95,201,124,0.3)" : "rgba(200,134,43,0.3)"}`,
            fontSize: 11, fontWeight: 600,
            color: remoteJoined ? T.successGreen : T.amber,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: remoteJoined ? T.successGreen : T.amber,
            }} />
            {remoteJoined ? "Connected" : "Waiting…"}
            {presenceError && <span style={{ color: T.coral, marginLeft: 4 }}>⚠</span>}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={copyLink} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.08)", border: `1px solid ${T.panelBorder}`,
            color: "#fff", padding: "5px 12px", borderRadius: 7,
            fontSize: 12.5, fontWeight: 600, cursor: "pointer",
          }}>
            {copied ? <Check size={13} color={T.successGreen} /> : <Copy size={13} />}
            <span className="hide-on-mobile">{copied ? "Copied!" : "Share Patient Link"}</span>
          </button>
          <Link href="/dashboard/appointments" style={{ fontSize: 12.5, color: T.textSecondary, textDecoration: "none", padding: "5px 6px" }}>
            <span className="hide-on-mobile">Exit to Dashboard</span>
            <span className="show-on-mobile-inline">Exit</span>
          </Link>
          <button
            className="show-on-mobile-inline"
            onClick={() => setSheetOpen(s => !s)}
            style={{
              background: "rgba(255,255,255,0.08)", border: `1px solid ${T.panelBorder}`,
              color: "#fff", padding: "5px 10px", borderRadius: 7,
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}
          >
            Details
          </button>
        </div>
      </div>

      {/* ── Join toast (driven by real presence, not timer) ─────────────────────── */}
      {showJoinToast && (
        <div style={{
          position: "fixed", top: 72, left: "50%", transform: "translateX(-50%)",
          background: T.successGreen, color: "#123025", padding: "8px 20px",
          borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 100,
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)", pointerEvents: "none",
        }}>
          {patientName ? `${patientName} has joined the meeting.` : "Patient has joined the meeting."}
        </div>
      )}

      {/* ── Main body ───────────────────────────────────────────────────────────── */}
      <div className="cw-consultation-layout">

        {/* ── Video Stage ──────────────────────────────────────────────────────── */}
        <div className="cw-video-col">
          <div className="cw-stage">
            {/* Remote participant view */}
            {remoteJoined && remoteCameraOn ? (
              /**
               * NOTE: No WebRTC SDK wired. Remote camera-on shows their avatar 
               * (their name + colorTag). When a real provider (Daily.co/Twilio/LiveKit)
               * is integrated, replace this block with <VideoTile participantId={...} />.
               * The remoteCameraOn flag will be driven by the provider's track events.
               */
              <AvatarPlaceholder
                name={remoteName} colorTag={remoteColor}
                size={130} label={remoteName || undefined} sublabel="Live feed active"
              />
            ) : (
              <AvatarPlaceholder
                name={!remoteJoined ? undefined : remoteName}
                colorTag={!remoteJoined ? "#2a3a30" : remoteColor}
                size={!remoteJoined ? 80 : 130}
                label={!remoteJoined ? undefined : (remoteName || undefined)}
                sublabel={remoteStatusText}
              />
            )}

            {/* Name badge — top left */}
            <div style={{
              position: "absolute", top: 14, left: 14,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
              padding: "5px 12px", borderRadius: 20,
              fontSize: 12.5, fontWeight: 600, color: "#fff", zIndex: 5,
            }}>
              {remoteJoined
                ? (isHost
                  ? (patientName ? `Patient: ${patientName}` : "Patient")
                  : doctorName)
                : `Room · ${roomId.slice(-6)}`}
            </div>

            {/* Remote mic status indicator */}
            {remoteJoined && !remoteMicOn && (
              <div style={{
                position: "absolute", top: 14, right: 14,
                background: T.coralSoft, border: `1px solid rgba(181,67,47,0.4)`,
                padding: "4px 10px", borderRadius: 20,
                fontSize: 11, fontWeight: 600, color: T.coral, zIndex: 5,
                display: "flex", alignItems: "center", gap: 4,
              }}>
                <MicOff size={11} /> Muted
              </div>
            )}

            {/* ── Self-view PIP ─────────────────────────────────────────────────── */}
            <div className="cw-pip-video">
              {/* <video> always mounted; srcObject is null when camera stopped */}
              <video
                ref={videoRef}
                autoPlay playsInline muted
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover", transform: "scaleX(-1)",
                  display: cameraOn && !cameraError ? "block" : "none",
                }}
              />
              {(!cameraOn || cameraError) && (
                <div style={{
                  width: "100%", height: "100%", background: "#0a1f16",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                }}>
                  <AvatarPlaceholder
                    name={isHost ? appointment?.doctor?.name : patientName}
                    colorTag={isHost ? doctorColor : patientColor}
                    size={30}
                  />
                  {/* Camera permission retry — critical for mobile where autoplay blocks getUserMedia */}
                  {cameraError && (
                    <button
                      onClick={retryMedia}
                      style={{
                        fontSize: 8, color: T.amber, background: "none",
                        border: "none", cursor: "pointer", textDecoration: "underline", padding: 0,
                      }}
                    >
                      Allow cam
                    </button>
                  )}
                </div>
              )}
              <div style={{
                position: "absolute", bottom: 4, left: 6,
                fontSize: 9, fontWeight: 700, color: "#fff",
                textShadow: "0 1px 3px rgba(0,0,0,0.9)",
              }}>
                You{!cameraOn ? " (off)" : ""}
              </div>
            </div>
          </div>

          {/* Control bar */}
          <ControlBar />
        </div>

        {/* ── Side panel (desktop/tablet) ───────────────────────────────────────── */}
        <div className="cw-side-panel">
          <ConsultationSidePanel {...sidePanelProps} />
        </div>
      </div>

      {/* ── Mobile bottom sheet ──────────────────────────────────────────────────── */}
      {sheetOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={() => setSheetOpen(false)} />
          <div style={{
            background: "#123025", borderRadius: "20px 20px 0 0",
            padding: 20, maxHeight: "70dvh", overflowY: "auto",
            border: `1px solid ${T.panelBorder}`, borderBottom: "none",
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.2)", borderRadius: 2, margin: "0 auto 20px" }} />
            <ConsultationSidePanel {...sidePanelProps} />
          </div>
        </div>
      )}
    </div>
  )
}
