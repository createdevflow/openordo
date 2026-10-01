import { NextRequest, NextResponse } from "next/server";
import { saveFile } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { getPatientAccountSession } from "@/lib/patient-auth";
import { db } from "@/lib/db";
import { FileCategory } from "@/lib/storage/categories";

export async function POST(req: NextRequest) {
  const adminSession = await auth();
  const patSession = await getPatientAccountSession();

  if (!adminSession?.user?.id && !patSession?.patientAccountId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
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
    } else {
      actor = { id: patSession!.patientAccountId, type: "PATIENT_ACCOUNT" };
      // Assume patientId is linked if patient session is present.
      // But we need the clinicId!
      const link = await db.patientAccountLink.findFirst({
        where: { patientAccountId: patSession!.patientAccountId }
      });
      if (link) clinicId = link.clinicId;
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
