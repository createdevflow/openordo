import { NextRequest, NextResponse } from "next/server";
import { saveFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { getPatientAccountSession } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { FileCategory } from "@/lib/storage/categories";

import { verifySignalToken } from "../../../../shared/video-token";

export async function POST(req: NextRequest) {
  const adminSession = await auth();
  const patSession = await getPatientAccountSession();

  let signalTokenValid = false;
  let signalTokenClaims = null;

  try {
    const formData = await req.formData();
    const token = formData.get("token") as string | undefined;
    if (token) {
      signalTokenClaims = await verifySignalToken(token);
      signalTokenValid = true;
    }
    
    if (!adminSession?.user?.id && !patSession?.patientAccountId && !signalTokenValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = formData.get("file") as File;
    const category = formData.get("category") as FileCategory;
    const patientId = formData.get("patientId") as string | undefined;
    const appointmentId = formData.get("appointmentId") as string | undefined;

    if (!file) return NextResponse.json({ error: "No file received." }, { status: 400 });
    if (!category) return NextResponse.json({ error: "No category provided." }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());

    let actor: { id: string; type: "USER" | "PATIENT_ACCOUNT" };
    let clinicId: string | undefined;

    if (adminSession?.user) {
      actor = { id: adminSession.user.id, type: "USER" };
      // Resolve clinic ID from membership
      const user = await db.user.findUnique({ where: { id: adminSession.user.id } });
      clinicId = user?.activeClinicId || undefined;
    } else if (patSession?.patientAccountId) {
      actor = { id: patSession.patientAccountId, type: "PATIENT_ACCOUNT" };
      // Assume patientId is linked if patient session is present.
      // But we need the clinicId!
      const link = await db.patientAccountLink.findFirst({
        where: { patientAccountId: patSession.patientAccountId }
      });
      if (link) clinicId = link.clinicId;
    } else if (signalTokenValid && signalTokenClaims) {
      // Ephemeral token user
      actor = { id: signalTokenClaims.sub, type: signalTokenClaims.role === "doctor" ? "USER" : "PATIENT_ACCOUNT" };
      if (appointmentId) {
         const apt = await db.appointment.findUnique({ where: { id: appointmentId }});
         if (apt) clinicId = apt.clinicId;
      }
    } else {
       throw new Error("No actor found");
    }

    const storedFile = await saveFile({
      category,
      clinicId,
      patientId,
      appointmentId,
      file: buffer,
      originalName: file.name,
      actor,
    });

    return NextResponse.json({
      url: `/api/files/${storedFile.id}`,
      id: storedFile.id,
      sizeBytes: storedFile.sizeBytes,
      originalFilename: storedFile.originalName,
      success: true
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "File upload failed" }, { status: 500 });
  }
}
