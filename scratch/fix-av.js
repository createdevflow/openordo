const fs = require('fs');
let code = fs.readFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', 'utf8');

// Insert RemoteVideo and RemoteAudio components at the top (after imports)
const components = `
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
`;

code = code.replace(/export function useCall\(.*?\} from "@\/lib\/video\/useCall"\n/, `export { useCall } from "@/lib/video/useCall"\n${components}`);
// Wait, the import is `import { useCall } from "@/lib/video/useCall"`.
code = code.replace(/import \{ useCall \} from "@\/lib\/video\/useCall"\n/, `import { useCall } from "@/lib/video/useCall"\n${components}`);

// Replace the AvatarPlaceholder for remoteJoined && remoteCameraOn
const oldRemoteView = `{remoteJoined && remoteCameraOn ? (
              /**
               * NOTE: No WebRTC SDK wired. Remote camera-on shows their avatar.
               * When a real provider (Daily.co/Twilio/LiveKit) is integrated,
               * replace this block with <VideoTile participantId={...} />.
               */
              <AvatarPlaceholder
                name={remoteName} colorTag={remoteColor}
                size={130} label={remoteName || undefined} sublabel="Live feed active"
              />
            ) : (`;

const newRemoteView = `{remoteJoined && remoteCameraOn && remoteVideoTrack && !audioFirst ? (
              <RemoteVideo track={remoteVideoTrack} cameraOn={remoteCameraOn} />
            ) : (`;

code = code.replace(oldRemoteView, newRemoteView);

// Inject RemoteAudio before the self-view PIP
const pipVideoStart = `<div className="cw-pip-video">`;
const injectedAudio = `<RemoteAudio track={remoteAudioTrack} />\n            <div className="cw-pip-video">`;
code = code.replace(pipVideoStart, injectedAudio);

fs.writeFileSync('src/app/consultation/join/[roomId]/ConsultationRoomClient.tsx', code);
