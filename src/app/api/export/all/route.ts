import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { exportClinicDataAction } from "@/server/actions/settings"
import { ZipArchive } from "archiver"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // allow up to 5 minutes for zipping large exports on vercel

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const range = url.searchParams.get("range") as any || "all"
    const startDate = url.searchParams.get("startDate") || undefined
    const endDate = url.searchParams.get("endDate") || undefined

    const clinicId = await requireClinicId()

    // 1. Get the CSVs from the existing action
    const data = await exportClinicDataAction({ range, startDate, endDate })

    // 2. Fetch the documents for the same range
    let start: Date | null = null
    let end: Date | null = null
    const now = new Date()

    if (range === "1m") {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      end = now
    } else if (range === "3m") {
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      end = now
    } else if (range === "6m") {
      start = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
      end = now
    } else if (range === "1y") {
      start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      end = now
    } else if (range === "custom" && startDate) {
      start = new Date(startDate + "T00:00:00")
      end = endDate ? new Date(endDate + "T23:59:59.999") : now
    }

    const patientWhere: any = { clinicId }
    if (start) {
      patientWhere.createdAt = { gte: start, ...(end ? { lte: end } : {}) }
    }

    const documents = await db.patientDocument.findMany({
      where: patientWhere,
      include: { patient: { select: { name: true } } },
      orderBy: { createdAt: "desc" }
    })

    // 3. Zip everything up
    const archive = new ZipArchive({ zlib: { level: 9 } })
    const readableStream = new ReadableStream({
      start(controller) {
        archive.on("data", (chunk: any) => controller.enqueue(chunk))
        archive.on("end", () => controller.close())
        archive.on("error", (err: any) => {
          console.error("Archive error", err)
          controller.error(err)
        })
      }
    })

    ;(async () => {
      // Add the CSVs
      archive.append(data.patientsCSV, { name: "patients.csv" })
      archive.append(data.appointmentsCSV, { name: "appointments.csv" })
      archive.append(data.invoicesCSV, { name: "invoices.csv" })

      // Add the documents
      for (const doc of documents) {
        try {
          if (!doc.url) continue
          const baseUrl = new URL(req.url).origin
          const fetchUrl = doc.url.startsWith("/") ? new URL(doc.url, baseUrl).toString() : doc.url
          
          const docRes = await fetch(fetchUrl)
          if (!docRes.ok) {
            console.warn(`Failed to fetch document ${doc.id} from ${fetchUrl}`)
            continue
          }
          
          const arrayBuffer = await docRes.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          
          const patientName = doc.patient?.name ? doc.patient.name.replace(/[^a-zA-Z0-9 -]/g, "") : "Unknown Patient"
          let safeFileName = doc.name.replace(/[^a-zA-Z0-9 ._-]/g, "_")
          if (!safeFileName.includes(".")) {
            const urlExt = doc.url.split(".").pop()
            if (urlExt && urlExt.length <= 4) {
              safeFileName += `.${urlExt}`
            } else if (doc.type === "INVOICE" || doc.type === "PRESCRIPTION") {
              safeFileName += ".pdf"
            } else {
              safeFileName += ".pdf"
            }
          }
          const folderName = `Documents/${patientName}`
          
          archive.append(buffer, { name: `${folderName}/${safeFileName}` })
        } catch (err) {
          console.error(`Error processing document ${doc.id}`, err)
        }
      }
      
      archive.finalize()
    })()

    return new NextResponse(readableStream as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${data.clinicSlug}_complete_export.zip"`
      }
    })
  } catch (err: any) {
    console.error("ZIP Export Error:", err)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
