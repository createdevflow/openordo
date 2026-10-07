import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import { verifySignalToken } from "../../shared/video-token";
import crypto from "crypto";
import { ClientMessageSchema, ServerMessage } from "../../shared/video-protocol";

import { getSecretBytes } from "../../shared/video-token";

// Fail fast on startup if secret is missing or too short
const SECRET_BYTES = getSecretBytes();

const PORT = process.env.PORT || 4001;
const API_URL = process.env.API_URL || "http://localhost:3000";
const IS_PROD = process.env.NODE_ENV === "production";

interface RoomClient {
  ws: any; // using any to easily attach isAlive
  sub: string;
  role: "doctor" | "patient";
  lastPing: number;
  messageCount: number; // for rate limiting
  disconnectTimeout?: NodeJS.Timeout;
}

interface Room {
  id: string;
  doctor?: RoomClient;
  patient?: RoomClient;
  exp: number;
  pairedAt?: number;
}

const rooms = new Map<string, Room>();

// IP rate limiting: max 60 connections per minute
// Use X-Forwarded-For so Traefik proxy doesn't cause all clients to share one bucket
const ipConnections = new Map<string, number[]>();

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now();
  let connTimes = ipConnections.get(ip) || [];
  // Keep connections from last 60s
  connTimes = connTimes.filter((t) => now - t < 60000);
  if (connTimes.length >= 60) {
    ipConnections.set(ip, connTimes);
    return false;
  }
  connTimes.push(now);
  ipConnections.set(ip, connTimes);
  return true;
}

// Batched call events
const batchedEvents: Array<{
  roomId: string;
  role: string;
  identifier: string;
  event: "DISCONNECTED" | "ENDED" | "PAIRED";
  timestamp: string;
  pairedAt?: number;
}> = [];

async function flushEvents() {
  if (batchedEvents.length === 0) return;
  const batch = batchedEvents.splice(0, batchedEvents.length);
  const payload = JSON.stringify(batch);
  const hmac = crypto.createHmac("sha256", SECRET_BYTES).update(payload).digest("hex");

  try {
    const req = http.request(
      `${API_URL}/api/internal/call-events`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-signature": hmac,
        },
      },
      (res) => {
        res.resume(); // consume
      }
    );
    req.on("error", (e) => console.error("Event flush failed:", e.message));
    req.write(payload);
    req.end();
  } catch (e) {
    console.error("Flush events exception:", e);
  }
}
setInterval(flushEvents, 5000);

// HTTP server for WebSocket upgrade and healthz
const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200);
    res.end("OK");
    return;
  }
  const parsedUrl = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
  if (parsedUrl.pathname === "/ws/signal") {
    res.writeHead(426, { "Content-Type": "text/plain" });
    res.end("Upgrade Required");
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  const parsedUrl = new URL(request.url || "", `http://${request.headers.host || "localhost"}`);
  const origin = request.headers.origin || "";
  const forwarded = request.headers['x-forwarded-for'] as string | undefined;
  const ip = (forwarded ? forwarded.split(',')[0].trim() : request.socket.remoteAddress) || "";

  console.log(`upgrade path=${parsedUrl.pathname} origin=${origin} ip=${ip}`);

  if (parsedUrl.pathname !== "/" && parsedUrl.pathname !== "/ws/signal") {
    console.log(`reject reason=PATH`);
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }

  let allowedOrigins = ["https://openordo.com", "https://www.openordo.com"];
  if (!IS_PROD) allowedOrigins.push("http://localhost:3000");

  if (!allowedOrigins.includes(origin)) {
    console.log(`reject reason=ORIGIN`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  
  if (!checkIpRateLimit(ip)) {
    console.log(`reject reason=RATE_LIMIT`);
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws: any) => {
    ws.isAlive = true;
    wss.emit("connection", ws, request);
  });
});

function sendTo(ws: any, msg: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcastToPeer(room: Room, senderRole: "doctor" | "patient", msg: ServerMessage) {
  const peer = senderRole === "doctor" ? room.patient : room.doctor;
  if (peer && peer.ws.readyState === WebSocket.OPEN) {
    sendTo(peer.ws, msg);
  }
}

wss.on("connection", (ws: any, req) => {
  let attachedRoomId: string | null = null;
  let attachedRole: "doctor" | "patient" | null = null;
  let authTimeout: NodeJS.Timeout | null = null;

  authTimeout = setTimeout(() => {
    if (!attachedRoomId) {
      ws.close(4001, "Auth timeout");
    }
  }, 5000);

  ws.on("message", async (data: any, isBinary: boolean) => {
    if (isBinary || data.toString().length > 65536) { // 64KB
      ws.close(4009, "Message too large");
      return;
    }

    try {
      const parsed = JSON.parse(data.toString());
      const msg = ClientMessageSchema.parse(parsed);

      if (msg.t === "join") {
        if (authTimeout) clearTimeout(authTimeout);
        
        if (!msg.token) {
          console.log(`reject reason=AUTH detail=NO_TOKEN`);
          sendTo(ws, { t: "error", code: "AUTH" });
          ws.close(4001, "AUTH");
          return;
        }

        try {
          const decoded = await verifySignalToken(msg.token);
          const roomId = decoded.room;
          const role = decoded.role as "doctor" | "patient";
          const sub = decoded.sub;
          const exp = decoded.exp;

          let room = rooms.get(roomId);
          if (!room) {
            room = { id: roomId, exp };
            rooms.set(roomId, room);
          }

          // Check if replacing same sub or rejecting different sub
          const existing = room[role];
          if (existing && existing.sub !== sub) {
            console.log(`reject reason=ROOM_FULL`);
            sendTo(ws, { t: "error", code: "ROOM_FULL" });
            ws.close(4003, "ROOM_FULL");
            return;
          }

          let isReconnect = false;
          if (existing) {
            if (existing.disconnectTimeout) clearTimeout(existing.disconnectTimeout);
            existing.ws.close(4000, "Replaced"); // Replaced by new socket
            isReconnect = true;
          }

          attachedRoomId = roomId;
          attachedRole = role;

          room[role] = {
            ws,
            sub,
            role,
            lastPing: Date.now(),
            messageCount: 0,
          };

          console.log(`join room=${roomId} role=${role}`);

          let newlyPaired = false;
          const peerPresent = role === "doctor" ? !!room.patient : !!room.doctor;
          if (peerPresent && !room.pairedAt) {
            room.pairedAt = Date.now();
            newlyPaired = true;
          }

          const serverNow = Date.now();
          sendTo(ws, { t: "joined", role, peerPresent, pairedAt: room.pairedAt || null, serverNow });

          if (peerPresent && !isReconnect) {
            broadcastToPeer(room, role, { t: "peer-joined", role, pairedAt: room.pairedAt || null, serverNow });
          }

          if (newlyPaired && room.pairedAt) {
            batchedEvents.push({
              roomId: roomId,
              role: role,
              identifier: sub,
              event: "PAIRED",
              timestamp: new Date(room.pairedAt).toISOString(),
              pairedAt: room.pairedAt,
            });
          }
        } catch (e: any) {
          let detail = "UNKNOWN";
          if (e.code === "ERR_JWT_EXPIRED") {
            // jose uses code ERR_JWT_EXPIRED
            detail = "EXPIRED";
          } else if (e.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
            detail = "BAD_SIGNATURE";
          } else if (e.code === "ERR_JWS_INVALID" || e.code === "ERR_JWT_INVALID") {
            detail = "MALFORMED";
          } else if (e.code === "ERR_JOSES_ALG_NOT_ALLOWED") {
            detail = "ALG_MISMATCH";
          } else {
            detail = "CLAIMS_INVALID_" + e.code;
          }
          console.log(`reject reason=AUTH detail=${detail}`);
          sendTo(ws, { t: "error", code: "AUTH" });
          ws.close(4001, "AUTH");
        }
        return;
      }

      // Rest of messages require joining first
      if (!attachedRoomId || !attachedRole) return;
      const room = rooms.get(attachedRoomId);
      if (!room) return;
      
      const client = room[attachedRole];
      if (!client) return;

      // Rate limiting logic
      client.messageCount++;
      if (client.messageCount > 50) {
        console.log(`reject reason=RATE_LIMIT`);
        sendTo(ws, { t: "error", code: "RATE_LIMIT" });
        ws.close(4008, "RATE_LIMIT");
        return;
      }

      if (msg.t === "sdp" || msg.t === "ice" || msg.t === "restart" || msg.t === "state" || msg.t === "chat" || msg.t === "file") {
        broadcastToPeer(room, attachedRole, msg as any);
      } else if (msg.t === "bye") {
        // Handled below on close or right now
        batchedEvents.push({
          roomId: attachedRoomId,
          role: attachedRole,
          identifier: client.sub,
          event: "ENDED",
          timestamp: new Date().toISOString(),
        });
        ws.close(1000, "bye");
      }
    } catch (e) {
      // Invalid message schema
    }
  });

  ws.on("close", (code: number) => {
    if (attachedRoomId && attachedRole) {
      console.log(`close code=${code} role=${attachedRole}`);
      const room = rooms.get(attachedRoomId);
      const role = attachedRole;
      const roomId = attachedRoomId;
      
      if (room && room[role] && room[role]!.ws === ws) {
        const client = room[role]!;
        
        client.disconnectTimeout = setTimeout(() => {
          if (room[role] === client) {
            room[role] = undefined;
            broadcastToPeer(room, role, { t: "peer-left", role: role });

            batchedEvents.push({
              roomId: roomId,
              role: role,
              identifier: client.sub,
              event: "DISCONNECTED",
              timestamp: new Date().toISOString(),
            });

            if (!room.doctor && !room.patient) {
              rooms.delete(roomId);
            }
          }
        }, 5000);
      }
    }
  });

  ws.on("pong", () => {
    ws.isAlive = true;
    if (attachedRoomId && attachedRole) {
      const room = rooms.get(attachedRoomId);
      if (room && room[attachedRole]) {
        room[attachedRole]!.lastPing = Date.now();
      }
    }
  });
});

// Maintenance interval: Reset rate limits, check pings, check room expiry
setInterval(() => {
  const now = Math.floor(Date.now() / 1000);
  wss.clients.forEach((ws: any) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });

  for (const [roomId, room] of rooms.entries()) {
    if (now > room.exp) {
      if (room.doctor) {
        console.log(`reject reason=EXPIRED`);
        sendTo(room.doctor.ws, { t: "error", code: "EXPIRED" });
        room.doctor.ws.close(4002, "EXPIRED");
      }
      if (room.patient) {
        console.log(`reject reason=EXPIRED`);
        sendTo(room.patient.ws, { t: "error", code: "EXPIRED" });
        room.patient.ws.close(4002, "EXPIRED");
      }
      rooms.delete(roomId);
      continue;
    }

    if (room.doctor) room.doctor.messageCount = 0;
    if (room.patient) room.patient.messageCount = 0;
  }
}, 25000); // 25s ping pong interval

server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
