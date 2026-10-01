import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ZipArchive } from "archiver"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const url = new URL(req.url)
    const requestId = url.searchParams.get("id")
    if (!requestId) return new NextResponse("Missing id", { status: 400 })

    const dataReq = await db.dataExportRequest.findUnique({
      where: { id: requestId },
      include: {
        patientAccount: true,
        clinic: true
      }
    })

    if (!dataReq) return new NextResponse("Not Found", { status: 404 })

    // Generate a simple zip containing a JSON summary
    const archive = new ZipArchive({ zlib: { level: 9 } })
    const readableStream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: any) => controller.enqueue(chunk))
        archive.on("end", () => controller.close())
        archive.on("error", (err: any) => controller.error(err))
      }
    })

    ;(async () => {
      // Gather some mock data for the patient
      const summary = {
        patient: dataReq.patientAccount.name,
        email: dataReq.patientAccount.email,
        clinic: dataReq.clinic.name,
        requestDate: dataReq.createdAt.toISOString(),
        status: dataReq.status,
        note: "This is a consolidated medical record export. In a production environment, attached documents, invoices, and clinical notes would be included here."
      }

      archive.append(JSON.stringify(summary, null, 2), { name: "medical_records_summary.json" })
      archive.finalize()
    })()

    return new NextResponse(readableStream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="patient_data_export_${dataReq.id}.zip"`
      }
    })

  } catch (err: any) {
    console.error("ZIP Export Error:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
