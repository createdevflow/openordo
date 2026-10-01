import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { logAudit } from "@/server/actions/admin-base"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get("id")
    
    if (!requestId) {
      return new NextResponse("Missing id", { status: 400 })
    }

    const req = await db.baaRequest.findUnique({
      where: { id: requestId },
      include: { clinic: { include: { memberships: true } } }
    })

    if (!req) {
      return new NextResponse("Not Found", { status: 404 })
    }

    // Auth check: Must be Super Admin OR a member of the clinic
    const isSuperAdmin = session.user.platformRole === "SUPER_ADMIN"
    const isMember = req.clinic.memberships.some(m => m.userId === session.user.id)

    if (!isSuperAdmin && !isMember) {
      return new NextResponse("Forbidden", { status: 403 })
    }

    if (!req.pdfFileKey) {
      return new NextResponse("PDF not generated yet", { status: 404 })
    }

    // Log the download action
    // Note: since logAudit relies on admin auth context, we will use direct Prisma call for clinic user downloads
    await db.auditLogEntry.create({
      data: {
        actorUserId: session.user.id,
        action: "DOWNLOAD_BAA_PDF",
        targetType: "BaaRequest",
        targetId: req.id,
        metadata: JSON.stringify({ isSuperAdmin })
      }
    })

    // Read the actual PDF from the private storage
    const fs = await import("fs/promises")
    const path = await import("path")
    
    // Extract filename from /api/files/BAA_...pdf
    const filename = req.pdfFileKey.split("/").pop()
    if (!filename) return new NextResponse("Invalid file path", { status: 400 })
    
    const filePath = path.join(process.cwd(), "private_uploads", filename)
    let fileBuffer: Buffer
    
    try {
      fileBuffer = await fs.readFile(filePath)
    } catch (e) {
      return new NextResponse("Error reading file from disk", { status: 404 })
    }

    return new NextResponse(fileBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="BAA_${req.documentReferenceNumber || req.id}.pdf"`
      }
    })
  } catch (error: any) {
    console.error("BAA Download Error:", error)
    return new NextResponse(error.message || "Internal Server Error", { status: 500 })
  }
}
