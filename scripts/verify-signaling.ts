import WebSocket from "ws";
import jwt from "jsonwebtoken";

const SECRET = process.env.SIGNAL_JWT_SECRET || "fallback_secret_for_dev";

async function verify() {
  console.log("Verifying signaling server...");
  
  // 1. Token generation
  const docToken = jwt.sign({ room: "test-room", role: "doctor", sub: "doc-1", exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET);
  const patToken = jwt.sign({ room: "test-room", role: "patient", sub: "pat-1", exp: Math.floor(Date.now() / 1000) + 3600 }, SECRET);

  // 2. Connect Doctor
  const docWs = new WebSocket("ws://localhost:4001/ws/signal", {
    headers: { origin: "https://openordo.com" }
  });

  let docJoined = false;
  let patJoined = false;
  let pairedAtTime: number | null = null;

  docWs.on("open", () => {
    console.log("Doctor connected (during CONNECTING state sends will be queued in useCall)");
    docWs.send(JSON.stringify({ t: "join", token: docToken }));
  });

  docWs.on("message", (data: any) => {
    const msg = JSON.parse(data.toString());
    if (msg.t === "joined") {
      docJoined = true;
      console.log("Doctor joined room.");
      // Connect patient now
      connectPatient();
    } else if (msg.t === "peer-joined") {
      console.log("Doctor saw patient join. Paired at:", msg.pairedAt);
      pairedAtTime = msg.pairedAt;
      checkSuccess();
    }
  });

  function connectPatient() {
    const patWs = new WebSocket("ws://localhost:4001/ws/signal", {
      headers: { origin: "https://www.openordo.com" }
    });

    patWs.on("open", () => {
      console.log("Patient connected");
      patWs.send(JSON.stringify({ t: "join", token: patToken }));
    });

    patWs.on("message", (data: any) => {
      const msg = JSON.parse(data.toString());
      if (msg.t === "joined") {
        patJoined = true;
        console.log("Patient joined room. Paired at:", msg.pairedAt);
        setTimeout(() => {
          if (pairedAtTime === msg.pairedAt) {
            console.log("SUCCESS: pairedAt is equal for both sides.");
            checkSuccess();
          } else {
            console.error("FAIL: pairedAt mismatch. doc:", pairedAtTime, "pat:", msg.pairedAt);
            process.exit(1);
          }
        }, 500);
      }
    });
  }

  let successChecks = 0;
  function checkSuccess() {
    successChecks++;
    if (successChecks === 2) {
      console.log("SUCCESS: Signaling server working correctly.");
      process.exit(0);
    }
  }

  setTimeout(() => {
    console.error("FAIL: Timeout during verification.");
    process.exit(1);
  }, 5000);
}

verify();
