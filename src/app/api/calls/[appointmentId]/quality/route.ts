import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ appointmentId: string }> }
) {
  try {
    const params = await context.params;
    const data = await req.json();
    
    // Validate appointmentId exists
    const appointment = await db.appointment.findUnique({
      where: { id: params.appointmentId },
    });
    
    if (!appointment) {
      return new NextResponse("Appointment not found", { status: 404 });
    }

    await db.callQualityLog.create({
      data: {
        appointmentId: params.appointmentId,
        role: data.role || "unknown",
        durationSec: data.durationSec || 0,
        connectionType: data.connectionType || "unknown",
        videoCodec: data.videoCodec,
        audioCodec: data.audioCodec,
        avgRttMs: data.avgRttMs,
        avgLossPct: data.avgLossPct,
        avgSendKbps: data.avgSendKbps,
        avgRecvKbps: data.avgRecvKbps,
        lowestTier: data.lowestTier,
        iceRestarts: data.iceRestarts || 0,
        wsReconnects: data.wsReconnects || 0,
        failureReason: data.failureReason,
        browser: data.browser,
        os: data.os,
      }
    });

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("Failed to save quality log", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
