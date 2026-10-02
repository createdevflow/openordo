"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerMessageSchema = exports.ServerErrorMessageSchema = exports.ServerPeerLeftMessageSchema = exports.ServerPeerJoinedMessageSchema = exports.ServerJoinedMessageSchema = exports.ClientMessageSchema = exports.ByeMessageSchema = exports.RestartMessageSchema = exports.IceMessageSchema = exports.SdpMessageSchema = exports.JoinMessageSchema = void 0;
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
exports.ClientMessageSchema = zod_1.z.discriminatedUnion("t", [
    exports.JoinMessageSchema,
    exports.SdpMessageSchema,
    exports.IceMessageSchema,
    exports.RestartMessageSchema,
    exports.ByeMessageSchema,
]);
exports.ServerJoinedMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("joined"),
    role: zod_1.z.enum(["doctor", "patient"]),
    peerPresent: zod_1.z.boolean(),
});
exports.ServerPeerJoinedMessageSchema = zod_1.z.object({
    t: zod_1.z.literal("peer-joined"),
    role: zod_1.z.enum(["doctor", "patient"]),
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
]);
