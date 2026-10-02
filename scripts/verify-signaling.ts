import WebSocket from "ws";

async function verify() {
  console.log("Verifying signaling server...");
  const ws = new WebSocket("ws://localhost:4001");
  
  ws.on("open", () => {
    console.log("Connected to signaling server");
    // Send join with invalid token
    ws.send(JSON.stringify({ t: "join", token: "invalid" }));
  });
  
  ws.on("message", (data: any) => {
    const msg = JSON.parse(data.toString());
    console.log("Received:", msg);
    if (msg.t === "error" && msg.code === "UNAUTHORIZED") {
      console.log("SUCCESS: Signaling server rejected invalid token");
      ws.close();
      process.exit(0);
    }
  });
  
  ws.on("close", () => {
    console.log("Connection closed");
  });
  
  ws.on("error", (err: any) => {
    console.error("Connection failed", err);
    process.exit(1);
  });
  
  setTimeout(() => {
    console.error("Timeout");
    process.exit(1);
  }, 5000);
}

verify();
