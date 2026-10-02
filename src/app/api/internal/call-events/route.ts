import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";

const SIGNAL_JWT_SECRET = process.env.SIGNAL_JWT_SECRET || "fallback_secret_for_dev";

export async function POST(req: NextRequest) {
  try {
    const sig = req.headers.get("x-signature");
    if (!sig) return new NextResponse("Unauthorized", { status: 401 });

    const text = await req.text();
    const hmac = crypto.createHmac("sha256", SIGNAL_JWT_SECRET).update(text).digest("hex");
    if (hmac !== sig) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const events: Array<{
      roomId: string;
      role: "doctor" | "patient";
      identifier: string;
      event: "DISCONNECTED" | "ENDED";
      timestamp: string;
    }> = JSON.parse(text);

    for (const evt of events) {
      const appointment = await db.appointment.findFirst({
        where: { roomId: evt.roomId },
      });
      if (appointment) {
        await db.videoCallAccessLog.create({
          data: {
            clinicId: appointment.clinicId,
            appointmentId: appointment.id,
            roomId: evt.roomId,
            role: evt.role,
            identifier: evt.identifier,
            event: evt.event,
          },
        });
      }
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("Failed to process call events", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
