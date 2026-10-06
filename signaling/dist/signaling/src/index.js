"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const http = __importStar(require("http"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// Need relative path since tsconfig includes ../shared
const video_protocol_1 = require("../../shared/video-protocol");
const PORT = process.env.PORT || 4001;
const SIGNAL_JWT_SECRET = process.env.SIGNAL_JWT_SECRET || "fallback_secret_for_dev";
const API_URL = process.env.API_URL || "http://localhost:3000";
const IS_PROD = process.env.NODE_ENV === "production";
const rooms = new Map();
// IP rate limiting: max 10 connections per minute
const ipConnections = new Map();
function checkIpRateLimit(ip) {
    const now = Date.now();
    let connTimes = ipConnections.get(ip) || [];
    // Keep connections from last 60s
    connTimes = connTimes.filter((t) => now - t < 60000);
    if (connTimes.length >= 10) {
        ipConnections.set(ip, connTimes);
        return false;
    }
    connTimes.push(now);
    ipConnections.set(ip, connTimes);
    return true;
}
// Batched call events
const batchedEvents = [];
async function flushEvents() {
    if (batchedEvents.length === 0)
        return;
    const batch = batchedEvents.splice(0, batchedEvents.length);
    const payload = JSON.stringify(batch);
    const hmac = crypto_1.default.createHmac("sha256", SIGNAL_JWT_SECRET).update(payload).digest("hex");
    try {
        const req = http.request(`${API_URL}/api/internal/call-events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-signature": hmac,
            },
        }, (res) => {
            res.resume(); // consume
        });
        req.on("error", (e) => console.error("Event flush failed:", e.message));
        req.write(payload);
        req.end();
    }
    catch (e) {
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
            if (r.doctor)
                sockets++;
            if (r.patient)
                sockets++;
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ rooms: rooms.size, sockets }));
        return;
    }
    res.writeHead(404);
    res.end();
});
const wss = new ws_1.WebSocketServer({ noServer: true });
server.on("upgrade", (request, socket, head) => {
    const ip = request.socket.remoteAddress || "";
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
function sendTo(ws, msg) {
    if (ws.readyState === ws_1.WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}
function broadcastToPeer(room, senderRole, msg) {
    const peer = senderRole === "doctor" ? room.patient : room.doctor;
    if (peer && peer.ws.readyState === ws_1.WebSocket.OPEN) {
        sendTo(peer.ws, msg);
    }
}
wss.on("connection", (ws, req) => {
    let isAlive = true;
    let attachedRoomId = null;
    let attachedRole = null;
    let authTimeout = null;
    authTimeout = setTimeout(() => {
        if (!attachedRoomId) {
            ws.close(4001, "Auth timeout");
        }
    }, 5000);
    ws.on("message", (data, isBinary) => {
        if (isBinary || data.toString().length > 65536) { // 64KB
            ws.close(4009, "Message too large");
            return;
        }
        try {
            const parsed = JSON.parse(data.toString());
            const msg = video_protocol_1.ClientMessageSchema.parse(parsed);
            if (msg.t === "join") {
                if (authTimeout)
                    clearTimeout(authTimeout);
                try {
                    const decoded = jsonwebtoken_1.default.verify(msg.token, SIGNAL_JWT_SECRET);
                    const roomId = decoded.room;
                    const role = decoded.role;
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
                }
                catch (e) {
                    sendTo(ws, { t: "error", code: "AUTH" });
                    ws.close(4001, "AUTH");
                }
                return;
            }
            // Rest of messages require joining first
            if (!attachedRoomId || !attachedRole)
                return;
            const room = rooms.get(attachedRoomId);
            if (!room)
                return;
            const client = room[attachedRole];
            if (!client)
                return;
            // Rate limiting logic
            client.messageCount++;
            if (client.messageCount > 50) {
                sendTo(ws, { t: "error", code: "RATE_LIMIT" });
                ws.close(4008, "RATE_LIMIT");
                return;
            }
            if (msg.t === "sdp" || msg.t === "ice" || msg.t === "restart") {
                broadcastToPeer(room, attachedRole, msg);
            }
            else if (msg.t === "bye") {
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
        }
        catch (e) {
            // Invalid message schema
        }
    });
    ws.on("close", () => {
        if (attachedRoomId && attachedRole) {
            const room = rooms.get(attachedRoomId);
            if (room && room[attachedRole] && room[attachedRole].ws === ws) {
                const client = room[attachedRole];
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
                room[attachedRole].lastPing = Date.now();
            }
        }
    });
});
// Maintenance interval: Reset rate limits, check pings, check room expiry
setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false)
            return ws.terminate();
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
        if (room.doctor)
            room.doctor.messageCount = 0;
        if (room.patient)
            room.patient.messageCount = 0;
    }
}, 25000); // 25s ping pong interval
server.listen(PORT, () => {
    console.log(`Signaling server listening on port ${PORT}`);
});
