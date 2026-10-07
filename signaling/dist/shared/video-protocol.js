"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessageSchema = exports.ServerErrorMessageSchema = exports.ServerPeerLeftMessageSchema = exports.ServerPeerJoinedMessageSchema = exports.ServerJoinedMessageSchema = exports.ClientMessageSchema = exports.FileMessageSchema = exports.ChatMessageSchema = exports.StateMessageSchema = exports.ByeMessageSchema = exports.RestartMessageSchema = exports.IceMessageSchema = exports.SdpMessageSchema = exports.JoinMessageSchema = void 0;
const zod_1 = require("zod");
exports.JoinMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("join"),
    token: zod_1.z.string(),
});
exports.SdpMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("sdp"),
    description: zod_1.z.any(), // RTCSessionDescriptionInit
});
exports.IceMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("ice"),
    candidate: zod_1.z.any(), // RTCIceCandidateInit | null
});
exports.RestartMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("restart"),
});
exports.ByeMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("bye"),
});
exports.StateMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("state"),
    cam: zod_1.z.boolean().optional(),
    mic: zod_1.z.boolean().optional(),
});
exports.ChatMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("chat"),
    id: zod_1.z.string(),
    sender: zod_1.z.enum(["doctor", "patient"]),
    text: zod_1.z.string(),
    timestamp: zod_1.z.number(),
});
exports.FileMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("file"),
    id: zod_1.z.string(),
    fileId: zod_1.z.string(),
    name: zod_1.z.string(),
    size: zod_1.z.number(),
    mime: zod_1.z.string(),
    sender: zod_1.z.enum(["doctor", "patient"]),
    timestamp: zod_1.z.number(),
});
exports.ClientMessageSchema = zod_1.z.discriminatedUnion("t", [
    exports.JoinMessageSchema,
    exports.SdpMessageSchema,
    exports.IceMessageSchema,
    exports.RestartMessageSchema,
    exports.ByeMessageSchema,
    exports.StateMessageSchema,
    exports.ChatMessageSchema,
    exports.FileMessageSchema,
]);
exports.ServerJoinedMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("joined"),
    role: zod_1.z.enum(["doctor", "patient"]),
    peerPresent: zod_1.z.boolean(),
    pairedAt: zod_1.z.number().nullable(),
    serverNow: zod_1.z.number(),
});
exports.ServerPeerJoinedMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("peer-joined"),
    role: zod_1.z.enum(["doctor", "patient"]),
    pairedAt: zod_1.z.number().nullable(),
    serverNow: zod_1.z.number(),
});
exports.ServerPeerLeftMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("peer-left"),
    role: zod_1.z.enum(["doctor", "patient"]),
});
exports.ServerErrorMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("error"),
    code: zod_1.z.enum(["AUTH", "ROOM_FULL", "EXPIRED", "RATE_LIMIT"]),
});
exports.ServerMessageSchema = zod_1.z.discriminatedUnion("t", [
    exports.ServerJoinedMessageSchema,
    exports.ServerPeerJoinedMessageSchema,
    exports.ServerPeerLeftMessageSchema,
    exports.ServerErrorMessageSchema,
    exports.SdpMessageSchema,
    exports.IceMessageSchema,
    exports.RestartMessageSchema,
    exports.StateMessageSchema,
    exports.ChatMessageSchema,
    exports.FileMessageSchema,
]);
