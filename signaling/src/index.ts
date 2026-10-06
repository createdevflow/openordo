import { WebSocketServer, WebSocket } from "ws";
import * as http from "http";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { ClientMessageSchema, ServerMessage } from "./video-protocol";

const PORT = process.env.PORT || 4001;
const SIGNAL_JWT_SECRET = process.env.SIGNAL_JWT_SECRET || "fallback_secret_for_dev";
const API_URL = process.env.API_URL || "http://localhost:3000";
const IS_PROD = process.env.NODE_ENV === "production";

interface RoomClient {
  ws: WebSocket;
  sub: string;
  role: "doctor" | "patient";
  lastPing: number;
  messageCount: number; // for rate limiting
}

interface Room {
  id: string;
  doctor?: RoomClient;
  patient?: RoomClient;
  exp: number;
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
  event: "DISCONNECTED" | "ENDED";
  timestamp: string;
}> = [];

async function flushEvents() {
  if (batchedEvents.length === 0) return;
  const batch = batchedEvents.splice(0, batchedEvents.length);
  const payload = JSON.stringify(batch);
  const hmac = crypto.createHmac("sha256", SIGNAL_JWT_SECRET).update(payload).digest("hex");

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
  if (req.url === "/stats") {
    // Secret header check could be added here if passed from admin panel
    let sockets = 0;
    rooms.forEach((r) => {
      if (r.doctor) sockets++;
      if (r.patient) sockets++;
    });
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ rooms: rooms.size, sockets }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  // Use X-Forwarded-For to get real client IP when behind Traefik.
  // Without this, ALL connections appear to come from Traefik's internal IP
  // and hit the rate limit after just 10 attempts.
  const forwarded = request.headers['x-forwarded-for'] as string | undefined;
  const ip = (forwarded ? forwarded.split(',')[0].trim() : request.socket.remoteAddress) || "";
  
  if (!checkIpRateLimit(ip)) {
    socket.destroy();
    return;
  }

  const origin = request.headers.origin;
  // Origin check removed to support www. and other aliases.
  // Auth is handled by JWT.

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

function sendTo(ws: WebSocket, msg: ServerMessage) {
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

wss.on("connection", (ws, req) => {
  let isAlive = true;
  let attachedRoomId: string | null = null;
  let attachedRole: "doctor" | "patient" | null = null;
  let authTimeout: NodeJS.Timeout | null = null;

  authTimeout = setTimeout(() => {
    if (!attachedRoomId) {
      ws.close(4001, "Auth timeout");
    }
  }, 5000);

  ws.on("message", (data: any, isBinary) => {
    if (isBinary || data.toString().length > 65536) { // 64KB
      ws.close(4009, "Message too large");
      return;
    }

    try {
      const parsed = JSON.parse(data.toString());
      const msg = ClientMessageSchema.parse(parsed);

      if (msg.t === "join") {
        if (authTimeout) clearTimeout(authTimeout);
        try {
          const decoded = jwt.verify(msg.token, SIGNAL_JWT_SECRET) as any;
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
            sendTo(ws, { t: "error", code: "ROOM_FULL" });
            ws.close(4003, "ROOM_FULL");
            return;
          }

          if (existing) {
            existing.ws.close(4000, "Replaced"); // Replaced by new socket
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

          const peerPresent = role === "doctor" ? !!room.patient : !!room.doctor;
          sendTo(ws, { t: "joined", role, peerPresent });

          if (peerPresent) {
            broadcastToPeer(room, role, { t: "peer-joined", role });
          }

        } catch (e) {
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
        sendTo(ws, { t: "error", code: "RATE_LIMIT" });
        ws.close(4008, "RATE_LIMIT");
        return;
      }

      if (msg.t === "sdp" || msg.t === "ice" || msg.t === "restart") {
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

  ws.on("close", () => {
    if (attachedRoomId && attachedRole) {
      const room = rooms.get(attachedRoomId);
      if (room && room[attachedRole] && room[attachedRole]!.ws === ws) {
        const client = room[attachedRole]!;
        room[attachedRole] = undefined;
        broadcastToPeer(room, attachedRole, { t: "peer-left", role: attachedRole });

        batchedEvents.push({
          roomId: attachedRoomId,
          role: attachedRole,
          identifier: client.sub,
          event: "DISCONNECTED",
          timestamp: new Date().toISOString(),
        });

        if (!room.doctor && !room.patient) {
          rooms.delete(attachedRoomId);
        }
      }
    }
  });

  ws.on("pong", () => {
    isAlive = true;
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
        sendTo(room.doctor.ws, { t: "error", code: "EXPIRED" });
        room.doctor.ws.close(4002, "EXPIRED");
      }
      if (room.patient) {
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
