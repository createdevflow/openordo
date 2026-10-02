const fs = require('fs');

let code = fs.readFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', 'utf8');

// Imports
code = code.replace(
  `import {
  generatePatientLinkToken,
  autosaveConsultationNotes,
  logCallEnded,
} from "@/server/actions/video-consultation"`,
  `import {
  generatePatientLinkToken,
  autosaveConsultationNotes,
  logCallEnded,
  getCallCredentials
} from "@/server/actions/video-consultation"
import { useCall } from "@/lib/video/useCall"`
);

// Remove Livekit token state
code = code.replace(`  const [livekitToken, setLivekitToken] = useState<string | null>(null)`, ``);

// Remove presence state
code = code.replace(/  const \[presence,      setPresence\][^\n]+\n/, '');
code = code.replace(/  const \[presenceError, setPresenceError\][^\n]+\n/, '');
code = code.replace(/  const \[roomFull,      setRoomFull\][^\n]+\n/, '');
code = code.replace(/  const remoteParticipants = [^\n]+\n[^\n]+\n/, '');
code = code.replace(/  const remotePeer = [^\n]+\n/, '');
code = code.replace(/  const remoteJoined   = remotePeer !== null\n/, '');
code = code.replace(/  const remoteCameraOn = remotePeer\?.cameraOn \?\? false\n/, '');
code = code.replace(/  const remoteMicOn    = remotePeer\?.micOn    \?\? false\n/, '');

// Add WebRTC states
const statesToAdd = `
  const [creds, setCreds] = useState<any>(null);
  
  useEffect(() => {
    async function initCreds() {
      if (!appointment) return;
      const res = await getCallCredentials(isHost ? appointment.id : (appointment.patientLinkToken || appointment.roomId));
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
    audioFirst
  } = useCall({
    signalToken: creds?.signalToken,
    iceServers: creds?.iceServers || [],
    turnPolicy: creds?.turnPolicy || "all",
    isHost,
    videoTrack: videoTrackRef.current,
    audioTrack: streamRef.current?.getAudioTracks()[0] || null,
    appointmentId: appointment?.id
  });
`;

code = code.replace(/  const remoteName  = isHost \? patientName  : doctorName/, statesToAdd + "\n  const remoteName  = isHost ? patientName  : doctorName");

// Remove postHeartbeat and pollInterval
code = code.replace(/  \/\/ ── Presence heartbeat ──(?:.|\n)*?(?=  \/\/ Join toast \(host only\))/g, '');

// Replace old livekit token fetching
code = code.replace(/      \/\/ Fetch token after retry(?:.|\n)*?\n      \}/g, '');
code = code.replace(/        try \{\n          const res = await fetch\(`\/api\/video\/token\?roomId(?:.|\n)*?\n        \} catch \(e\) \{\n          console\.warn\("Failed to fetch LiveKit token", e\)\n        \}/g, '');

// Remove LiveKit imports if any, though I don't see them in the snippet.

// Save the rewritten code
fs.writeFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', code);
