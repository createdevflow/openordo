import { z } from "zod";

export const JoinMessageSchema = z.object({
  t: z.literal("join"),
  token: z.string(),
});

export const SdpMessageSchema = z.object({
  t: z.literal("sdp"),
  description: z.any(), // RTCSessionDescriptionInit
});

export const IceMessageSchema = z.object({
  t: z.literal("ice"),
  candidate: z.any(), // RTCIceCandidateInit | null
});

export const RestartMessageSchema = z.object({
  t: z.literal("restart"),
});

export const ByeMessageSchema = z.object({
  t: z.literal("bye"),
});

export const StateMessageSchema = z.object({
  t: z.literal("state"),
  cam: z.boolean().optional(),
  mic: z.boolean().optional(),
});

export const ChatMessageSchema = z.object({
  t: z.literal("chat"),
  id: z.string(),
  sender: z.enum(["doctor", "patient"]),
  text: z.string(),
  timestamp: z.number(),
});

export const FileMessageSchema = z.object({
  t: z.literal("file"),
  id: z.string(),
  fileId: z.string(),
  name: z.string(),
  size: z.number(),
  mime: z.string(),
  sender: z.enum(["doctor", "patient"]),
  timestamp: z.number(),
});

export const ClientMessageSchema = z.discriminatedUnion("t", [
  JoinMessageSchema,
  SdpMessageSchema,
  IceMessageSchema,
  RestartMessageSchema,
  ByeMessageSchema,
  StateMessageSchema,
  ChatMessageSchema,
  FileMessageSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerJoinedMessageSchema = z.object({
  t: z.literal("joined"),
  role: z.enum(["doctor", "patient"]),
  peerPresent: z.boolean(),
  pairedAt: z.number().nullable(),
  serverNow: z.number(),
});

export const ServerPeerJoinedMessageSchema = z.object({
  t: z.literal("peer-joined"),
  role: z.enum(["doctor", "patient"]),
  pairedAt: z.number().nullable(),
  serverNow: z.number(),
});

export const ServerPeerLeftMessageSchema = z.object({
  t: z.literal("peer-left"),
  role: z.enum(["doctor", "patient"]),
});

export const ServerErrorMessageSchema = z.object({
  t: z.literal("error"),
  code: z.enum(["AUTH", "ROOM_FULL", "EXPIRED", "RATE_LIMIT"]),
});

export const ServerMessageSchema = z.discriminatedUnion("t", [
  ServerJoinedMessageSchema,
  ServerPeerJoinedMessageSchema,
  ServerPeerLeftMessageSchema,
  ServerErrorMessageSchema,
  SdpMessageSchema,
  IceMessageSchema,
  RestartMessageSchema,
  StateMessageSchema,
  ChatMessageSchema,
  FileMessageSchema,
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
