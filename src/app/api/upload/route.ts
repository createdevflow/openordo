import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import path from "path"
import { auth } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    
    if (!file) {
      return NextResponse.json({ error: "No file received." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const filename = Date.now() + "_" + file.name.replace(/[^a-zA-Z0-9.-]/g, "")
    const fileSize = buffer.length
    
    // In production you would upload to S3 / Blob storage here.
    // For this MVP, we save to the public/uploads directory.
    const uploadDir = path.join(process.cwd(), "public/uploads")

    // Storage Quota check
    const { db } = await import("@/lib/db")
    const user = await db.user.findUnique({ where: { id: session.user.id } })
    const clinicId = user?.activeClinicId
    
    if (clinicId) {
      const { getEffectiveStorageQuota } = await import("@/lib/plugins")
      const { usedBytes, quotaBytes } = await getEffectiveStorageQuota(clinicId)
      
      if (usedBytes + fileSize > quotaBytes) {
        return NextResponse.json({ 
          error: "Storage quota exceeded. Please upgrade your storage add-on." 
        }, { status: 413 }) // Payload Too Large
      }
    }
    
    try {
      await writeFile(path.join(uploadDir, filename), buffer)
    } catch (err: any) {
      if (err.code === "ENOENT") {
        // Create directory if it doesn't exist
        const fs = await import("fs")
        fs.mkdirSync(uploadDir, { recursive: true })
        await writeFile(path.join(uploadDir, filename), buffer)
      } else {
        throw err
      }
    }

    const fileUrl = `/uploads/${filename}`

    if (clinicId) {
      await db.storageUsage.create({
        data: {
          clinicId,
          filePath: fileUrl,
          bytes: fileSize,
        }
      })
    }

    return NextResponse.json({ 
      url: fileUrl, 
      sizeBytes: fileSize,
      originalFilename: file.name,
      success: true 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "File upload failed" }, { status: 500 })
  }
}
