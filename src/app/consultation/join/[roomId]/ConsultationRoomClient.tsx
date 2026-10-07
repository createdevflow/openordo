"use client"

/**
 * ConsultationRoomClient — Video consultation room
 *
 * Hardened per CHARTWELL_SECURITY_COMPLIANCE_SPEC.md §2, §5, CHARTWELL_VIDEO_CALL_UI_SPEC.md
 *
 * Key behaviours:
 *  - Camera toggle: track.stop() + fresh getUserMedia() re-acquire (not track.enabled=false)
 *    so the OS hardware indicator actually clears. (BUILD_LOG: Bug 2 Fix)
 *  - Real signaling: presence driven by polling /api/room/[roomId] every 2–4 s.
 *    remoteJoined / remoteCameraOn / remoteMicOn all come from server-side presence store.
 *  - Share Patient Link: calls generatePatientLinkToken server action, copies token URL to clipboard.
 *    Never generates a URL client-side.
 *  - Notes autosave: debounced 3 s → autosaveConsultationNotes server action.
 *  - End Call: calls logCallEnded server action before navigating away (doctor only).
 *  - ROOM_FULL: if the presence API returns 403 ROOM_FULL the UI shows a "Room is full" banner.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from "react"
import Link from "next/link"
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Share2,
  Copy, Check, Clock, Stethoscope, FileText,
  ChevronDown, ChevronUp, Lock, Zap, User, AlertTriangle, Eye, Download,
} from "lucide-react"
import {
  generatePatientLinkToken,
  autosaveConsultationNotes,
  logCallEnded,
  getCallCredentials
} from "@/server/actions/video-consultation"
import { useCall } from "@/lib/video/useCall"

function RemoteVideo({ track, cameraOn }: { track: MediaStreamTrack | null, cameraOn: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && track) {
      const stream = new MediaStream([track]);
      ref.current.srcObject = stream;
    }
  }, [track]);
  return (
    <video 
      ref={ref} 
      autoPlay 
      playsInline 
      style={{
        width: "100%", height: "100%", objectFit: "cover",
        display: cameraOn ? "block" : "none",
        position: "absolute", top: 0, left: 0, zIndex: 1
      }} 
    />
  );
}

function RemoteAudio({ track }: { track: MediaStreamTrack | null }) {
  const ref = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (ref.current && track) {
      const stream = new MediaStream([track]);
      ref.current.srcObject = stream;
    }
  }, [track]);
  return <audio ref={ref} autoPlay />;
}

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

// ── Side Panel — TOP-LEVEL component (stable identity across re-renders) ──────
// Critical: if defined inside ConsultationRoomClient, React treats it as a new
// component type on every render → unmounts + remounts → input loses focus after
// one keystroke. Top-level = stable reference.
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
  sharedFiles: { name: string; size: string; sender: string; url?: string }[]
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
                  alignSelf: (msg.sender === "Doctor" && isHost) || (msg.sender === "Patient" && !isHost) ? "flex-end" : "flex-start",
                  background: msg.sender === "System" ? "transparent" : ((msg.sender === "Doctor" && isHost) || (msg.sender === "Patient" && !isHost)) ? "rgba(30,70,56,0.7)" : "rgba(255,255,255,0.07)",
                  padding: msg.sender === "System" ? "2px 0" : "8px 12px",
                  borderRadius: 12, maxWidth: "88%",
                  borderBottomRightRadius: ((msg.sender === "Doctor" && isHost) || (msg.sender === "Patient" && !isHost)) ? 3 : 12,
                  borderBottomLeftRadius:  (((msg.sender === "Doctor" && isHost) || (msg.sender === "Patient" && !isHost)) || msg.sender === "System") ? 12 : 3,
                  textAlign: msg.sender === "System" ? "center" : "left",
                  color: msg.sender === "System" ? T.textSecondary : T.textPrimary,
                  fontSize: msg.sender === "System" ? 11 : 13,
                }}>
                  {msg.sender !== "System" && !((msg.sender === "Doctor" && isHost) || (msg.sender === "Patient" && !isHost)) && (
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
                  {f.url && (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => {
                        if (!f.url) return
                        const w = window.open("", "_blank")
                        if (!w) return
                        if (f.url.startsWith("data:text/html")) {
                          w.document.title = f.name
                          const b64 = f.url.split(",")[1]
                          const html = decodeURIComponent(escape(atob(b64)))
                          const escapedHtml = html.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                          w.document.write(`<html><body style="margin:0;"><iframe srcdoc="${escapedHtml}" sandbox="allow-scripts allow-same-origin" style="width:100vw;height:100vh;border:none;"></iframe></body></html>`)
                        } else {
                          try {
                            const [header, b64] = f.url.split(",")
                            const mime = header.match(/:(.*?);/)?.[1] || ""
                            const byteStr = atob(b64)
                            const u8 = new Uint8Array(byteStr.length)
                            for (let i = 0; i < byteStr.length; i++) u8[i] = byteStr.charCodeAt(i)
                            const blob = new Blob([u8], { type: mime })
                            const blobUrl = URL.createObjectURL(blob)
                            w.location.href = blobUrl
                            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
                          } catch (e) {
                            w.document.write(`<html><body><h2>Error opening file</h2></body></html>`)
                          }
                        }
                      }} title="View" style={{ padding: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, color: T.textPrimary, display: "flex", alignItems: "center", justifyContent: "center", border: "none", cursor: "pointer" }}>
                        <Eye size={14} />
                      </button>
                      <a href={f.url} download={f.name} title="Download" style={{ padding: 6, background: "rgba(255,255,255,0.1)", borderRadius: 6, color: T.textPrimary, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Download size={14} />
                      </a>
                    </div>
                  )}
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
  // ── Stable participant ID ─────────────────────────────────────────────────
  const componentId = useId()
  const myParticipantId = useRef(`${isHost ? "host" : "guest"}-${componentId.replace(/:/g, "")}`)

  // ── Local media state ─────────────────────────────────────────────────────
  const [micOn,           setMicOn]           = useState(true)
  const [cameraOn,        setCameraOn]        = useState(true)
  const [cameraError,     setCameraError]     = useState(false)
  const [cameraAcquiring, setCameraAcquiring] = useState(false)

  const [micAcquiring, setMicAcquiring] = useState(false)
  const videoRef      = useRef<HTMLVideoElement | null>(null)
  const streamRef     = useRef<MediaStream | null>(null)
  const videoTrackRef = useRef<MediaStreamTrack | null>(null)

  // ── Room presence ─────────────────────────────────────────────────────────

  // ── Derived remote peer state ─────────────────────────────────────────────

  // Names
  const patientName  = appointment?.patient?.name  ?? null
  const patientColor = appointment?.patient?.colorTag ?? "#5C7A67"
  const doctorName   = appointment?.doctor?.name
    ? `Dr. ${appointment.doctor.name}` : "Doctor"
  const doctorColor  = appointment?.doctor?.colorTag ?? T.amber
  const clinicName   = appointment?.clinic?.name ?? "OpenORDO"


  const [creds, setCreds] = useState<any>(null);
  
  useEffect(() => {
    async function initCreds() {
      if (!appointment) return;
      // Doctor: identifier = appointment.id, isHost=true
      // Patient: identifier = patientLinkToken (stored on appointment passed from the /p/[token] page), isHost=false
      const identifier = isHost ? appointment.id : (appointment.patientLinkToken || appointment.roomId);
      const res = await getCallCredentials(identifier, isHost);
      if (res.ok) {
        setCreds(res);
      } else {
        if (res.error === "ROOM_FULL") alert("Room is full");
        else alert("Failed to join: " + res.error);
      }
    }
    initCreds();
  }, [appointment, isHost]);

  const {
    connectionState,
    remoteJoined,
    remoteVideoTrack,
    remoteAudioTrack,
    remoteCameraOn,
    remoteMicOn,
    chatMessages,
    sendChat,
    sharedFiles,
    shareFile,
    qualityBars,
    remoteQualityBars,
    audioFirst,
    callError,
    pairedAt,
    clockOffset,
    wsReadyState,
    lastCloseCode,
    lastServerError,
    localRole
  } = useCall({
    signalToken: creds?.signalToken,
    iceServers: creds?.iceServers || [],
    turnPolicy: creds?.turnPolicy || "all",
    isHost,
    videoTrack: videoTrackRef.current,
    audioTrack: streamRef.current?.getAudioTracks()[0] || null,
    appointmentId: appointment?.id
  });

  const remoteName  = isHost ? patientName  : doctorName
  const remoteColor = isHost ? patientColor : doctorColor

  const remoteStatusText = callError 
    ? callError
    : !remoteCameraOn
      ? "Camera off"
      : "Live feed active"

  // ── Link generation state (doctor-only) ───────────────────────────────────
  const [linkCopied,      setLinkCopied]      = useState(false)
  const [linkGenerating,  setLinkGenerating]  = useState(false)
  const [linkError,       setLinkError]       = useState<string | null>(null)

  // ── Call state ────────────────────────────────────────────────────────────
  const [callDuration,     setCallDuration]     = useState(0)
  const [notes,            setNotes]            = useState("")
  const [showJoinToast,    setShowJoinToast]    = useState(false)
  const prevRemoteJoinedRef = useRef(false)

  // Start timer only when we have pairedAt
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (pairedAt) {
      const updateDuration = () => {
        const diff = Math.floor((Date.now() + clockOffset - pairedAt) / 1000);
        setCallDuration(diff > 0 ? diff : 0);
      };
      updateDuration();
      timer = setInterval(updateDuration, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [pairedAt, clockOffset])

  const [isDebug, setIsDebug] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsDebug(window.location.search.includes("debug=1"));
    }
  }, []);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"patient" | "chat" | "files">(
    isHost ? "patient" : "chat"
  )
  
  const [newMessage,  setNewMessage]  = useState("")

  const chatEndRef = useRef<HTMLDivElement | null>(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [sheetOpen,       setSheetOpen]       = useState(false)
  const [patientExpanded, setPatientExpanded] = useState(true)

  // ── Notes autosave (debounced 3 s, host only) ─────────────────────────────
  const notesAutosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")

  useEffect(() => {
    if (!isHost || !notes || !appointment?.id) return
    if (notesAutosaveTimer.current) clearTimeout(notesAutosaveTimer.current)
    notesAutosaveTimer.current = setTimeout(async () => {
      setNotesStatus("saving")
      const result = await autosaveConsultationNotes(appointment.id, notes)
      setNotesStatus(result.ok ? "saved" : "error")
      // Reset to idle after 2 s
      setTimeout(() => setNotesStatus("idle"), 2000)
    }, 3000)
    return () => {
      if (notesAutosaveTimer.current) clearTimeout(notesAutosaveTimer.current)
    }
  }, [notes, isHost, appointment?.id])

  // ─────────────────────────────────────────────────────────────────────────
  // Camera toggle: track.stop() + fresh getUserMedia() (not track.enabled=false)
  // BUILD_LOG Bug 2 Fix: track.enabled=false does NOT clear the OS hardware
  // indicator in Chrome on desktop (confirmed). track.stop() does.
  // ─────────────────────────────────────────────────────────────────────────

  const stopVideoTrack = useCallback(() => {
    if (videoTrackRef.current) {
      videoTrackRef.current.stop()
      videoTrackRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(t => {
        t.stop()
        streamRef.current?.removeTrack(t)
      })
    }
  }, [])

  const acquireVideoTrack = useCallback(async () => {
    if (cameraAcquiring) return
    setCameraAcquiring(true)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: true })
      const [track] = newStream.getVideoTracks()
      if (!track) throw new Error("No video track returned")
      videoTrackRef.current = track
      if (videoRef.current) {
        const displayStream = new MediaStream()
        streamRef.current?.getAudioTracks().forEach(t => displayStream.addTrack(t))
        displayStream.addTrack(track)
        videoRef.current.srcObject = displayStream
      }
      setCameraError(false)
    } catch (err: any) {
      console.warn("[Camera] Failed to re-acquire video:", err)
      setCameraError(true)
      if (err.name === 'NotAllowedError') {
        alert("Camera access was denied. Please check your browser/OS permissions.")
      } else if (err.name === 'NotFoundError') {
        alert("No camera found on this device.")
      } else {
        alert("Could not access camera: " + err.message)
      }
    } finally {
      setCameraAcquiring(false)
    }
  }, [cameraAcquiring])

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      stopVideoTrack()
      setCameraOn(false)
    } else {
      setCameraOn(true)
      await acquireVideoTrack()
    }
  }, [cameraOn, stopVideoTrack, acquireVideoTrack])

  const stopAudioTrack = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(t => {
        t.stop()
        streamRef.current?.removeTrack(t)
      })
    }
  }, [])

  const acquireAudioTrack = useCallback(async () => {
    if (micAcquiring) return
    setMicAcquiring(true)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const [track] = newStream.getAudioTracks()
      if (!track) throw new Error("No audio track returned")
      if (streamRef.current) {
        streamRef.current.addTrack(track)
      } else {
        streamRef.current = newStream
      }
    } catch (err: any) {
      console.warn("[Mic] Failed to re-acquire audio:", err)
      if (err.name === 'NotAllowedError') {
        alert("Microphone access was denied. Please check your browser/OS permissions.")
      } else if (err.name === 'NotFoundError') {
        alert("No microphone found on this device.")
      } else {
        alert("Could not access microphone: " + err.message)
      }
      setMicOn(false) // revert if failed
    } finally {
      setMicAcquiring(false)
    }
  }, [micAcquiring])

  const toggleMic = useCallback(async () => {
    if (micOn) {
      stopAudioTrack()
      setMicOn(false)
    } else {
      setMicOn(true)
      await acquireAudioTrack()
    }
  }, [micOn, stopAudioTrack, acquireAudioTrack])

  const retryMedia = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert("Your browser blocks camera access here. Please use a secure connection (HTTPS or localhost).")
      return
    }
    setCameraError(false)
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      } catch (e) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        } catch (e2) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }
      }
      streamRef.current = stream
      const [vidTrack] = stream.getVideoTracks()
      videoTrackRef.current = vidTrack ?? null
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setCameraOn(true)


    } catch (err: any) {
      console.warn("[Media] Retry failed:", err)
      alert("Could not access camera/microphone: " + (err.message || "Please check permissions or if another app is using them."))
      setCameraError(true)
    }
  }, [])

  // Initial media acquisition
  useEffect(() => {
    let active = true
    async function initMedia() {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          if (active) setCameraError(true)
          return
        }
        
        let stream: MediaStream | null = null
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        } catch (e: any) {
          console.warn("[Media] Both failed, trying audio-only", e)
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          } catch (e2: any) {
            console.warn("[Media] Audio-only failed, trying video-only", e2)
            stream = await navigator.mediaDevices.getUserMedia({ video: true })
          }
        }

        if (!stream) throw new Error("No stream acquired")
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const [vidTrack] = stream.getVideoTracks()
        videoTrackRef.current = vidTrack ?? null
        
        if (!vidTrack) {
          // If we successfully got audio but no video track, we should show the avatar placeholder
          setCameraError(true)
        }
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }


      } catch (err: any) {
        console.warn("[Media] getUserMedia totally failed:", err)
        if (active) {
          setCameraError(true)
          if (err.name === 'NotAllowedError') {
            alert("Camera/Microphone access was denied. Please check your browser permissions (the lock icon in the URL bar) and your Windows/macOS Privacy settings.")
          } else if (err.name === 'NotFoundError') {
            alert("No camera or microphone found on this device.")
          } else {
            alert("Could not access camera/microphone: " + err.message)
          }
        }
      }
    }
    initMedia()
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      videoTrackRef.current = null
    }
  }, [])

  // Join toast (host only)
  useEffect(() => {
    if (isHost && remoteJoined && !prevRemoteJoinedRef.current) {
      setShowJoinToast(true)
      setTimeout(() => setShowJoinToast(false), 6000)
    }
    prevRemoteJoinedRef.current = remoteJoined
  }, [isHost, remoteJoined])

  // Call timer removed from sessionStorage

  // Chat scroll
  useEffect(() => {
    if (activeTab === "chat") chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages, activeTab])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60), s = sec % 60
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  /**
   * Share Patient Link — generates a token server-side, then copies the URL.
   * NEVER constructs a URL on the client.
   */
  const sharePatientLink = async () => {
    if (!appointment?.id || linkGenerating) return
    setLinkGenerating(true)
    setLinkError(null)
    try {
      const result = await generatePatientLinkToken(appointment.id)
      if ("error" in result) {
        setLinkError(result.error)
        return
      }
      await navigator.clipboard.writeText(result.url)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.warn("[ShareLink] Failed:", err)
      setLinkError("Could not copy link — please try again.")
    } finally {
      setLinkGenerating(false)
    }
  }


  const onChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendChat(newMessage);
    setNewMessage("");
  }

  const uploadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("For this demo, files must be under 2MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const size = (file.size / 1024 / 1024).toFixed(2) + " MB"
      const newFile = { name: file.name, size, sender: isHost ? "Doctor" : "Patient", url: dataUrl }
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      const msg = { sender: "System", text: `📎 Shared: ${file.name}`, time: now }

      shareFile(Math.random().toString(36), file.name, size)
    }
    reader.readAsDataURL(file)
  }

  const sidePanelProps: SidePanelProps = {
    isHost, hasEprescriptions, appointment,
    activeTab, setActiveTab,
    patientExpanded, setPatientExpanded,
    notes, setNotes,
    chatMessages, chatEndRef,
    newMessage, setNewMessage, sendChat: onChatSubmit,
    sharedFiles, uploadFile,
  }

  // ── Control Bar ───────────────────────────────────────────────────────────
  function ControlBar() {
    const exitHref = isHost ? "/dashboard/appointments" : `/consultation/ended?room=${roomId}`

    const handleEndCall = async () => {
      if (isHost && appointment?.id) {
        await logCallEnded(appointment.id).catch(() => {})
      }
      window.location.href = exitHref
    }

    return (
      <div className="cw-control-bar">
        <button
          onClick={toggleMic}
          disabled={micAcquiring}
          className={`cw-ctrl-btn${micOn ? "" : " cw-ctrl-btn--off"}`}
          style={{ opacity: micAcquiring ? 0.6 : 1 }}
          title={micOn ? "Mute" : "Unmute"}
          aria-label="Toggle microphone"
        >
          {micAcquiring ? (
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.8s linear infinite" }} />
          ) : micOn ? <Mic size={20} /> : <MicOff size={20} />}
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

        <button
          onClick={sharePatientLink}
          disabled={linkGenerating || !isHost}
          className="cw-ctrl-btn hide-on-mobile"
          title="Share patient link"
          aria-label="Share patient link"
          style={{ opacity: (!isHost || linkGenerating) ? 0.4 : 1, cursor: !isHost ? "not-allowed" : "pointer" }}
        >
          {linkCopied ? <Check size={20} color={T.successGreen} /> : <Share2 size={20} />}
        </button>

        <button
          onClick={handleEndCall}
          className="cw-ctrl-btn--end"
          aria-label={isHost ? "End Call" : "Leave"}
        >
          <PhoneOff size={18} />
          <span className="hide-on-mobile">{isHost ? "End Call" : "Leave"}</span>
        </button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="cw-room-root">

      {/* ── Room full banner ────────────────────────────────────────────────── */}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
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
              {pairedAt ? formatTime(callDuration) : "Not started"}
            </span>
          </div>
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
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Notes autosave status indicator (host only) */}
          {isHost && notesStatus !== "idle" && (
            <span style={{ fontSize: 11, color: notesStatus === "saving" ? T.textSecondary : notesStatus === "saved" ? T.successGreen : T.coral }}>
              {notesStatus === "saving" ? "Saving…" : notesStatus === "saved" ? "Notes saved" : "Save failed"}
            </span>
          )}

          {/* Share patient link — host only */}
          {isHost && (
            <button
              onClick={sharePatientLink}
              disabled={linkGenerating}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.08)", border: `1px solid ${T.panelBorder}`,
                color: "#fff", padding: "5px 12px", borderRadius: 7,
                fontSize: 12.5, fontWeight: 600, cursor: linkGenerating ? "not-allowed" : "pointer",
                opacity: linkGenerating ? 0.6 : 1,
              }}
            >
              {linkCopied ? <Check size={13} color={T.successGreen} /> : <Copy size={13} />}
              <span className="hide-on-mobile">
                {linkGenerating ? "Generating…" : linkCopied ? "Copied!" : "Share Patient Link"}
              </span>
            </button>
          )}

          {linkError && (
            <span style={{ fontSize: 11, color: T.coral }}>{linkError}</span>
          )}

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

      {/* ── Join toast ────────────────────────────────────────────────────────── */}
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

      {/* ── Main body ─────────────────────────────────────────────────────────── */}
      <div className="cw-consultation-layout">

        {/* ── Video Stage ────────────────────────────────────────────────────── */}
        <div className="cw-video-col">
          <div className="cw-stage">
            {/* Remote participant view */}
            {remoteJoined && remoteCameraOn && remoteVideoTrack && !audioFirst ? (
              <RemoteVideo track={remoteVideoTrack} cameraOn={remoteCameraOn} />
            ) : (
              <AvatarPlaceholder
                name={!remoteJoined ? undefined : remoteName}
                colorTag={!remoteJoined ? "#2a3a30" : remoteColor}
                size={!remoteJoined ? 80 : 130}
                label={!remoteJoined ? undefined : (remoteName || undefined)}
                sublabel={remoteStatusText}
              />
            )}

            {/* Name badge */}
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

            {/* Remote mic status */}
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

            {/* ── Self-view PIP ──────────────────────────────────────────────── */}
            <RemoteAudio track={remoteAudioTrack} />
            <div className="cw-pip-video">
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

        {/* ── Side panel (desktop/tablet) ─────────────────────────────────────── */}
        <div className="cw-side-panel">
          <ConsultationSidePanel {...sidePanelProps} />
        </div>
      </div>

      {/* ── Mobile bottom sheet ──────────────────────────────────────────────── */}
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
      {isDebug && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(0,0,0,0.8)", color: "#0f0",
          fontSize: 10, padding: 4, zIndex: 9999, fontFamily: "monospace"
        }}>
          sig: {process.env.NEXT_PUBLIC_SIGNAL_URL || "wss://openordo.com/ws/signal"} | 
          wsReady: {wsReadyState} | lastClose: {lastCloseCode || "-"} | lastErr: {lastServerError || "-"} |
          room: {roomId} | role: {localRole} | peer: {remoteJoined ? "Y" : "N"} | conn: {connectionState}
        </div>
      )}
    </div>
  )
}
