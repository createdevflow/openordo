import re

with open('src/lib/video/useCall.ts', 'r') as f:
    content = f.read()

# 1. Add callError and pairedAt state
content = content.replace(
    '  const [audioFirst, setAudioFirst] = useState(false);',
    '  const [audioFirst, setAudioFirst] = useState(false);\n  const [callError, setCallError] = useState<string | null>(null);\n  const [pairedAt, setPairedAt] = useState<number | null>(null);'
)

# 2. Add to return
content = content.replace(
    '    audioFirst\n  };',
    '    audioFirst,\n    callError,\n    pairedAt\n  };'
)

# 3. Modify useEffect to move PC creation to initPC, add signalSend wrapper, etc.
# This requires replacing the body of the first useEffect.
# It's better to just do this by finding start and end.
import sys
start_idx = content.find('  useEffect(() => {\n    if (!signalToken) return;')
end_idx = content.find('  // Handle local tracks')
if start_idx == -1 or end_idx == -1:
    print("Could not find useEffect bounds")
    sys.exit(1)

use_effect_body = """  useEffect(() => {
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
            setRemoteJoined(msg.peerPresent);
            if (msg.pairedAt) setPairedAt(msg.pairedAt);
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
            if (msg.code === "ROOM_FULL") {
              alert("Room is full");
            } else if (msg.code === "EXPIRED") {
              alert("Call has expired");
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
        if (isClosed || e.code === 1000) return; // intentional close
        setCallError("Can't reach the call server — retrying…");
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
"""
content = content[:start_idx] + use_effect_body + "\n" + content[end_idx:]

with open('src/lib/video/useCall.ts', 'w') as f:
    f.write(content)
