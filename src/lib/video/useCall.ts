import { useState, useEffect, useRef, useCallback } from 'react';

// Need to match ClientMessage and ServerMessage schemas
// Since we don't have access to shared/video-protocol in client without path config, we'll just redefine types
type Role = "doctor" | "patient";

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
}

interface SharedFile {
  fileId: string;
  name: string;
  size: string;
  sender: string;
  url?: string;
}

interface UseCallProps {
  signalToken: string;
  iceServers: any[];
  turnPolicy: "all" | "relay";
  isHost: boolean;
  videoTrack: MediaStreamTrack | null;
  audioTrack: MediaStreamTrack | null;
  appointmentId: string;
  onCallEnded?: () => void;
}

export function useCall({
  signalToken,
  iceServers,
  turnPolicy,
  isHost,
  videoTrack,
  audioTrack,
  appointmentId,
  onCallEnded,
}: UseCallProps) {
  const [connectionState, setConnectionState] = useState<RTCIceConnectionState>("new");
  const [remoteJoined, setRemoteJoined] = useState(false);
  const [remoteVideoTrack, setRemoteVideoTrack] = useState<MediaStreamTrack | null>(null);
  const [remoteAudioTrack, setRemoteAudioTrack] = useState<MediaStreamTrack | null>(null);
  
  const [remoteCameraOn, setRemoteCameraOn] = useState(false);
  const [remoteMicOn, setRemoteMicOn] = useState(false);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  
  const [qualityBars, setQualityBars] = useState(4);
  const [remoteQualityBars, setRemoteQualityBars] = useState(4);
  const [audioFirst, setAudioFirst] = useState(false);
  const [callError, setCallError] = useState<string | null>("Connecting to call server…");
  const [pairedAt, setPairedAt] = useState<number | null>(null);
  const [clockOffset, setClockOffset] = useState<number>(0);
  
  const [wsReadyState, setWsReadyState] = useState<number>(WebSocket.CLOSED);
  const [lastCloseCode, setLastCloseCode] = useState<number | null>(null);
  const [lastServerError, setLastServerError] = useState<string | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  
  const wsReconnectTimer = useRef<any>(null);
  const wsReconnectAttempts = useRef(0);
  
  const localRole: Role = isHost ? "doctor" : "patient";
  const isPolite = !isHost; // patient is polite
  
  const qualityStatsRef = useRef({
    iceRestarts: 0,
    wsReconnects: 0,
    lowestTier: "HD",
  });

  // Call engine implementation here...
  // (Full implementation will go in a separate edit or I can just stub the basics and fill it out if it gets too long)
  // I will write the full implementation.
  
  useEffect(() => {
    if (!signalToken) return;

    let isClosed = false;
    let queuedIceCandidates: any[] = [];
    const wsOutboundQueue: any[] = [];

    const signalSend = (msg: any) => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify(msg));
        } catch (err) {
          console.error("WS send error", err);
        }
      } else {
        wsOutboundQueue.push(msg);
      }
    };

    function setupDataChannel(dc: RTCDataChannel) {
      dcRef.current = dc;
      dc.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.t === "state") {
            setRemoteCameraOn(msg.cam);
            setRemoteMicOn(msg.mic);
          } else if (msg.t === "chat") {
            setChatMessages(prev => [...prev, { id: msg.id, sender: msg.sender, text: msg.text, time: msg.time }]);
          } else if (msg.t === "file") {
            setSharedFiles(prev => [...prev, { fileId: msg.fileId, name: msg.name, size: msg.size, sender: msg.sender }]);
          } else if (msg.t === "quality") {
            setRemoteQualityBars(msg.bars);
          }
        } catch(err) {}
      };
      dc.onopen = () => {
        try {
          dc.send(JSON.stringify({ t: "state", cam: !!videoTrack, mic: !!audioTrack }));
        } catch(err) {}
      };
    }

    function initPC() {
      if (pcRef.current) return;
      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: turnPolicy,
        bundlePolicy: "max-bundle",
        rtcpMuxPolicy: "require",
        iceCandidatePoolSize: 2,
      });
      pcRef.current = pc;

      if (isHost) {
        const dc = pc.createDataChannel("ctl", { ordered: true });
        setupDataChannel(dc);
      }

      pc.ondatachannel = (e) => {
        if (e.channel.label === "ctl") {
          setupDataChannel(e.channel);
        }
      };

      pc.onnegotiationneeded = async () => {
        if (!remoteJoined) return;
        try {
          makingOfferRef.current = true;
          await pc.setLocalDescription();
          signalSend({ t: "sdp", description: pc.localDescription });
        } catch (err) {
          console.error(err);
        } finally {
          makingOfferRef.current = false;
        }
      };

      pc.onicecandidate = (e) => {
        try {
          if (e.candidate) {
            signalSend({ t: "ice", candidate: e.candidate });
          }
        } catch(err) {}
      };

      pc.oniceconnectionstatechange = () => {
        try {
          setConnectionState(pc.iceConnectionState);
          if (pc.iceConnectionState === "failed") {
            qualityStatsRef.current.iceRestarts++;
            pc.restartIce();
          } else if (pc.iceConnectionState === "disconnected") {
            setTimeout(() => {
              if (pc.iceConnectionState === "disconnected") {
                qualityStatsRef.current.iceRestarts++;
                pc.restartIce();
                signalSend({ t: "restart" });
              }
            }, 3000);
          }
        } catch(err) {}
      };

      const handleOnline = () => {
        try {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            qualityStatsRef.current.iceRestarts++;
            pc.restartIce();
            signalSend({ t: "restart" });
          }
        } catch(err) {}
      };
      window.addEventListener("online", handleOnline);
      pcRef.current.addEventListener("signalingstatechange", () => {
         // handle signle state cleanup if needed
      });

      pc.ontrack = (e) => {
        try {
          if (e.track.kind === "video") {
            setRemoteVideoTrack(e.track);
            e.track.onmute = () => setRemoteCameraOn(false);
            e.track.onunmute = () => setRemoteCameraOn(true);
          } else if (e.track.kind === "audio") {
            setRemoteAudioTrack(e.track);
            e.track.onmute = () => setRemoteMicOn(false);
            e.track.onunmute = () => setRemoteMicOn(true);
          }
        } catch(err) {}
      };
      
      if (videoTrack) {
        videoTrack.contentHint = "motion";
        videoSenderRef.current = pc.addTrack(videoTrack);
        if (typeof RTCRtpTransceiver !== "undefined" && 'setCodecPreferences' in RTCRtpTransceiver.prototype) {
          const transceivers = pc.getTransceivers();
          const videoTransceiver = transceivers.find(t => t.sender.track?.kind === 'video');
          if (videoTransceiver && 'setCodecPreferences' in videoTransceiver) {
            const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
            const preferred = ["video/VP9", "video/H264", "video/VP8"];
            const sorted = codecs.sort((a, b) => {
              const aIdx = preferred.indexOf(a.mimeType);
              const bIdx = preferred.indexOf(b.mimeType);
              if (aIdx === -1 && bIdx === -1) return 0;
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            });
            try { videoTransceiver.setCodecPreferences(sorted); } catch (e) {}
          }
        }
        const params = videoSenderRef.current.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 1500000;
        params.encodings[0].maxFramerate = 30;
        params.encodings[0].networkPriority = "medium";
        params.degradationPreference = "balanced";
        videoSenderRef.current.setParameters(params).catch(()=>{});
      }
      if (audioTrack) {
        audioSenderRef.current = pc.addTrack(audioTrack);
        const params = audioSenderRef.current.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].networkPriority = "high";
        audioSenderRef.current.setParameters(params).catch(()=>{});
      }
    }

    const connectWs = () => {
      if (isClosed) return;
      const wsUrl = process.env.NEXT_PUBLIC_SIGNAL_URL || "wss://openordo.com/ws/signal";
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        try {
          setWsReadyState(WebSocket.OPEN);
          setCallError(null);
          wsReconnectAttempts.current = 0;
          ws.send(JSON.stringify({ t: "join", token: signalToken }));
          
          wsOutboundQueue.forEach(msg => {
            try { ws.send(JSON.stringify(msg)); } catch(e){}
          });
          wsOutboundQueue.length = 0;
        } catch(err) {}
      };
      
      ws.onmessage = async (e) => {
        try {
          const msg = JSON.parse(e.data);
          
          if (msg.t === "joined") {
            if (msg.serverNow) setClockOffset(msg.serverNow - Date.now());
            setRemoteJoined(msg.peerPresent);
            if (msg.pairedAt) setPairedAt(msg.pairedAt);
            if (msg.peerPresent === false) {
               setCallError(`Waiting for ${isHost ? 'Patient' : 'Doctor'} to join…`);
            } else {
               setCallError(null);
            }
            initPC();
            
            const pc = pcRef.current;
            if (msg.peerPresent && !isPolite && pc) {
              try {
                makingOfferRef.current = true;
                await pc.setLocalDescription();
                signalSend({ t: "sdp", description: pc.localDescription });
              } catch (err) {
                console.error("Initial offer error:", err);
              } finally {
                makingOfferRef.current = false;
              }
            }
          } else if (msg.t === "peer-joined") {
            setRemoteJoined(true);
            setCallError(null);
            if (msg.serverNow) setClockOffset(msg.serverNow - Date.now());
            if (msg.pairedAt) setPairedAt(msg.pairedAt);
            
            const pc = pcRef.current;
            if (!isPolite && pc) {
              try {
                makingOfferRef.current = true;
                await pc.setLocalDescription();
                signalSend({ t: "sdp", description: pc.localDescription });
              } catch (err) {
                console.error("peer-joined offer error:", err);
              } finally {
                makingOfferRef.current = false;
              }
            }
          } else if (msg.t === "peer-left") {
            setRemoteJoined(false);
            setCallError(`Waiting for ${isHost ? 'Patient' : 'Doctor'} to join…`);
            setRemoteVideoTrack(null);
            setRemoteAudioTrack(null);
          } else if (msg.t === "sdp") {
            const pc = pcRef.current;
            if (!pc) return;
            const offerCollision = msg.description.type === "offer" && (makingOfferRef.current || pc.signalingState !== "stable");
            ignoreOfferRef.current = !isPolite && offerCollision;
            
            if (ignoreOfferRef.current) return;
            
            await pc.setRemoteDescription(msg.description);
            for (const c of queuedIceCandidates) {
              try { await pc.addIceCandidate(c); } catch(err){}
            }
            queuedIceCandidates = [];
            
            if (msg.description.type === "offer") {
              await pc.setLocalDescription();
              signalSend({ t: "sdp", description: pc.localDescription });
            }
          } else if (msg.t === "ice") {
            const pc = pcRef.current;
            if (!pc) return;
            try {
              if (msg.candidate) {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(msg.candidate);
                } else {
                  queuedIceCandidates.push(msg.candidate);
                }
              }
            } catch (err) {
              if (!ignoreOfferRef.current) console.warn("ICE error", err);
            }
          } else if (msg.t === "restart") {
            const pc = pcRef.current;
            if (pc) pc.restartIce();
            } else if (msg.t === "error") {
              setLastServerError(msg.code);
              if (msg.code === "ROOM_FULL") {
                setCallError("Room full");
              } else if (msg.code === "EXPIRED") {
                setCallError("Link expired");
              } else {
                setCallError(`Error: ${msg.code}`);
              }
            }
          } catch (err) {
            console.error(err);
          }
        };
        
        ws.onerror = () => {
          setCallError("Can't reach the call server — retrying…");
        };
  
        ws.onclose = (e) => {
          setWsReadyState(WebSocket.CLOSED);
          setLastCloseCode(e.code);
          if (isClosed || e.code === 1000) return; // intentional close
          if (e.code === 4003) {
            setCallError("Room full");
            return;
          }
          if (e.code === 4002) {
            setCallError("Link expired");
            return;
          }
          setCallError("Reconnecting…");
          qualityStatsRef.current.wsReconnects++;
          const backoff = Math.min(8000, 500 * Math.pow(2, wsReconnectAttempts.current));
          const jitter = backoff * 0.2 * Math.random();
          wsReconnectAttempts.current++;
          wsReconnectTimer.current = setTimeout(connectWs, backoff + jitter);
        };
      };

    connectWs();

    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {}
    };
    requestWakeLock();
    const handleVis = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener("visibilitychange", handleVis);

    return () => {
      isClosed = true;
      document.removeEventListener("visibilitychange", handleVis);
      if (wakeLock) wakeLock.release().catch(()=>{});
      clearTimeout(wsReconnectTimer.current);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try { wsRef.current.send(JSON.stringify({ t: "bye" })); } catch(e){}
      }
      wsRef.current?.close();
      pcRef.current?.close();
    };
  }, [signalToken, iceServers, turnPolicy, isHost]);

  // Handle local tracks
  const videoSenderRef = useRef<RTCRtpSender | null>(null);
  const audioSenderRef = useRef<RTCRtpSender | null>(null);

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;

    if (videoTrack) {
      videoTrack.contentHint = "motion";
      if (!videoSenderRef.current) {
        videoSenderRef.current = pc.addTrack(videoTrack);
        // Codec preferences VP9 -> H264 -> VP8
        if (typeof RTCRtpTransceiver !== "undefined" && 'setCodecPreferences' in RTCRtpTransceiver.prototype) {
          const transceivers = pc.getTransceivers();
          const videoTransceiver = transceivers.find(t => t.sender.track?.kind === 'video');
          if (videoTransceiver && 'setCodecPreferences' in videoTransceiver) {
            const codecs = RTCRtpReceiver.getCapabilities('video')?.codecs || [];
            const preferred = ["video/VP9", "video/H264", "video/VP8"];
            const sorted = codecs.sort((a, b) => {
              const aIdx = preferred.indexOf(a.mimeType);
              const bIdx = preferred.indexOf(b.mimeType);
              if (aIdx === -1 && bIdx === -1) return 0;
              if (aIdx === -1) return 1;
              if (bIdx === -1) return -1;
              return aIdx - bIdx;
            });
            try {
              videoTransceiver.setCodecPreferences(sorted);
            } catch (e) {}
          }
        }

        // Set encoding params
        const params = videoSenderRef.current.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].maxBitrate = 1500000;
        params.encodings[0].maxFramerate = 30;
        params.encodings[0].networkPriority = "medium"; // priority: "medium" is deprecated/removed in some browsers, use networkPriority if possible
        params.degradationPreference = "balanced";
        videoSenderRef.current.setParameters(params).catch(()=>{});
      } else {
        videoSenderRef.current.replaceTrack(videoTrack);
      }
    } else if (videoSenderRef.current) {
      videoSenderRef.current.replaceTrack(null);
    }
    
    // Send state update
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify({ t: "state", cam: !!videoTrack, mic: !!audioTrack }));
    }
  }, [videoTrack]);

  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;

    if (audioTrack) {
      if (!audioSenderRef.current) {
        audioSenderRef.current = pc.addTrack(audioTrack);
        // Codec preferences Opus with useinbandfec=1
        // (usually handled by SDP munging, but we'll try to just set priority)
        const params = audioSenderRef.current.getParameters();
        if (!params.encodings) params.encodings = [{}];
        params.encodings[0].networkPriority = "high";
        audioSenderRef.current.setParameters(params).catch(()=>{});
      } else {
        audioSenderRef.current.replaceTrack(audioTrack);
      }
    }
    
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify({ t: "state", cam: !!videoTrack, mic: !!audioTrack }));
    }
  }, [audioTrack]);

  // Quality Controller
  useEffect(() => {
    const pc = pcRef.current;
    if (!pc) return;
    
    let consecutiveBad = 0;
    let consecutiveGood = 0;
    
    const TIERS = [
      { name: "HD", scale: 1, fps: 30, bitrate: 1500000 },
      { name: "High", scale: 1.33, fps: 30, bitrate: 900000 },
      { name: "Medium", scale: 2, fps: 24, bitrate: 500000 },
      { name: "Low", scale: 4, fps: 15, bitrate: 200000 },
      { name: "Audio-first", scale: 1, fps: 0, bitrate: 0 }
    ];
    let currentTierIdx = 0;

    const interval = setInterval(async () => {
      if (pc.iceConnectionState !== "connected" && pc.iceConnectionState !== "completed") return;
      
      const stats = await pc.getStats();
      let loss = 0;
      let rtt = 0;
      let bandwidthLim = false;
      
      stats.forEach(report => {
        if (report.type === "outbound-rtp" && report.kind === "video") {
          if (report.qualityLimitationReason === "bandwidth") bandwidthLim = true;
        }
        if (report.type === "remote-inbound-rtp") {
          if (report.packetsLost) loss = report.packetsLost; // roughly
          if (report.roundTripTime) rtt = report.roundTripTime * 1000;
        }
      });
      
      let bars = 4;
      if (rtt > 400 || loss > 5) bars = 1;
      else if (rtt > 200 || loss > 2) bars = 2;
      else if (rtt > 100 || loss > 0) bars = 3;
      
      setQualityBars(bars);
      if (dcRef.current?.readyState === "open") {
        dcRef.current.send(JSON.stringify({ t: "quality", bars }));
      }
      
      if (loss > 5 || rtt > 400 || bandwidthLim) {
        consecutiveBad++;
        consecutiveGood = 0;
      } else {
        consecutiveGood++;
        consecutiveBad = 0;
      }
      
      let changed = false;
      if (consecutiveBad >= 2 && currentTierIdx < TIERS.length - 1) {
        currentTierIdx++;
        changed = true;
        consecutiveBad = 0;
      } else if (consecutiveGood >= 5 && currentTierIdx > 0) { // 10s = 5 * 2s
        currentTierIdx--;
        changed = true;
        consecutiveGood = 0;
      }
      
      if (changed && videoSenderRef.current) {
        const tier = TIERS[currentTierIdx];
        qualityStatsRef.current.lowestTier = tier.name;
        
        setAudioFirst(tier.name === "Audio-first");
        
        const params = videoSenderRef.current.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          if (tier.name === "Audio-first") {
            params.encodings[0].active = false;
          } else {
            params.encodings[0].active = true;
            params.encodings[0].scaleResolutionDownBy = tier.scale;
            params.encodings[0].maxBitrate = tier.bitrate;
            params.encodings[0].maxFramerate = tier.fps;
          }
          videoSenderRef.current.setParameters(params).catch(()=>{});
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const sendChat = useCallback((text: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msg = { t: "chat", id, sender: isHost ? "Doctor" : "Patient", text, time };
    setChatMessages(prev => [...prev, msg]);
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(msg));
    }
  }, [isHost]);

  const shareFile = useCallback((fileId: string, name: string, size: string) => {
    const msg = { t: "file", fileId, name, size, sender: isHost ? "Doctor" : "Patient" };
    setSharedFiles(prev => [...prev, msg]);
    if (dcRef.current?.readyState === "open") {
      dcRef.current.send(JSON.stringify(msg));
    }
  }, [isHost]);

  return {
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
  };
}
