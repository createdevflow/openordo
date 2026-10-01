"use server"

import { db } from "@/lib/db"
import { requireSuperAdmin, logAudit } from "@/server/actions/admin-base"
import { sendNotificationEmail } from "@/lib/notifications/send"
import { renderBaaApproved, renderBaaRejected, renderBaaRequestReceived, renderNewBaaRequestPending } from "@/lib/notifications/templates"
import { revalidatePath } from "next/cache"

export async function publishBaaTemplateVersion(bodyText: string) {
  try {
    const session = await requireSuperAdmin()
    const now = new Date()
    const versionLabel = now.toISOString().split("T")[0]

    await db.$transaction(async (tx) => {
      await tx.baaTemplateVersion.updateMany({
        where: { isCurrent: true },
        data: { isCurrent: false }
      })

      const newVersion = await tx.baaTemplateVersion.create({
        data: {
          bodyText,
          versionLabel: versionLabel + "-" + Math.random().toString(36).substring(2, 6),
          isCurrent: true,
          publishedByAdminId: session.user.id!
        }
      })
      
      await tx.auditLogEntry.create({
        data: {
          actorUserId: session.user.id!,
          action: "PUBLISH_BAA_TEMPLATE",
          targetType: "BaaTemplateVersion",
          targetId: newVersion.id,
        }
      })
    })

    revalidatePath("/admin/settings")
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}

export async function approveBaaRequestAction(requestId: string) {
  const session = await requireSuperAdmin()
  const req = await db.baaRequest.findUnique({ where: { id: requestId }, include: { clinic: true } })
  if (!req) throw new Error("Request not found")
  if (req.status !== "PENDING") throw new Error("Request is not pending")

  const currentTemplate = await db.baaTemplateVersion.findFirst({ where: { isCurrent: true } })
  if (!currentTemplate) throw new Error("No current BAA template version published")

  const array = new Uint8Array(8)
  crypto.getRandomValues(array)
  const refNumber = "BAA-" + Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("").substring(0, 10).toUpperCase()

  // Generate a valid PDF using pdf-lib
  const fs = await import("fs/promises")
  const path = await import("path")
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib")
  
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  let page = pdfDoc.addPage([612, 792])
  let y = 730
  const margin = 50
  const width = 612
  const maxWidth = width - margin * 2
  
  const checkPage = (heightNeeded = 20) => {
    if (y < margin + heightNeeded) {
      page = pdfDoc.addPage([612, 792])
      y = 730
    }
  }

  // Header
  page.drawText("BUSINESS ASSOCIATE AGREEMENT", { x: margin, y, size: 18, font: fontBold, color: rgb(0.05, 0.15, 0.35) })
  y -= 30
  
  page.drawText(`Reference Number: ${refNumber}`, { x: margin, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) })
  page.drawText(`Date Approved: ${new Date().toLocaleDateString()}`, { x: width - margin - 130, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) })
  y -= 15
  
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 30

  // Parties
  page.drawText("PARTIES", { x: margin, y, size: 12, font: fontBold })
  y -= 20

  page.drawText("Covered Entity (Clinic):", { x: margin, y, size: 11, font: fontBold })
  page.drawText(req.clinicLegalName, { x: margin + 150, y, size: 11, font })
  y -= 15
  page.drawText("Authorized Signatory:", { x: margin, y, size: 11, font: fontBold })
  page.drawText(`${req.ownerFullName} (${req.ownerTitle})`, { x: margin + 150, y, size: 11, font })
  y -= 25

  page.drawText("Business Associate:", { x: margin, y, size: 11, font: fontBold })
  page.drawText("OpenORDO Platform", { x: margin + 150, y, size: 11, font })
  y -= 30

  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 30

  // Agreement Terms (The long text)
  page.drawText("AGREEMENT TERMS", { x: margin, y, size: 12, font: fontBold })
  y -= 20

  const paragraphs = currentTemplate.bodyText.split('\n')
  for (const p of paragraphs) {
    if (!p.trim()) {
      y -= 10
      checkPage()
      continue
    }

    // Handle Horizontal Rule
    if (p.trim() === '---') {
      y -= 10
      checkPage(10)
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
      y -= 15
      continue
    }

    // Handle Headings
    let isHeading = false
    let headingSize = 10
    let text = p
    let headingFont = fontBold

    if (p.startsWith('# ')) {
      isHeading = true; headingSize = 16; text = p.substring(2)
    } else if (p.startsWith('## ')) {
      isHeading = true; headingSize = 14; text = p.substring(3)
    } else if (p.startsWith('### ')) {
      isHeading = true; headingSize = 12; text = p.substring(4)
    }

    if (isHeading) {
      checkPage(headingSize + 15)
      page.drawText(text, { x: margin, y, size: headingSize, font: headingFont, color: rgb(0.1, 0.2, 0.3) })
      y -= headingSize + 10
      continue
    }

    // Normal Text with bold markdown **...**
    const chunks = text.split('**').map((t, i) => ({ text: t, isBold: i % 2 === 1 }))
    
    let currentLineTokens: { text: string, isBold: boolean }[] = []
    let listIndent = text.startsWith('- ') || text.startsWith('* ') ? 15 : 0
    let currentLineWidth = listIndent
    
    const renderLine = (indent: number) => {
      checkPage(15)
      let xOffset = margin + indent
      for (const t of currentLineTokens) {
        if (!t.text) continue;
        const currentFont = t.isBold ? fontBold : font;
        page.drawText(t.text, { x: xOffset, y, size: 10, font: currentFont })
        xOffset += currentFont.widthOfTextAtSize(t.text, 10)
      }
      y -= 15
      currentLineTokens = []
      currentLineWidth = indent
    }

    for (const chunk of chunks) {
      const currentFont = chunk.isBold ? fontBold : font
      const words = chunk.text.match(/(\S+|\s+)/g) || []
      
      for (const word of words) {
        const wordWidth = currentFont.widthOfTextAtSize(word, 10)
        
        if (currentLineWidth + wordWidth > maxWidth && word.trim().length > 0) {
          renderLine(listIndent)
        }
        
        if (currentLineTokens.length === 0 && !word.trim()) {
           continue // Skip leading spaces on new line
        }
        
        if (currentLineTokens.length > 0 && currentLineTokens[currentLineTokens.length - 1].isBold === chunk.isBold) {
           currentLineTokens[currentLineTokens.length - 1].text += word
        } else {
           currentLineTokens.push({ text: word, isBold: chunk.isBold })
        }
        currentLineWidth += wordWidth
      }
    }
    
    if (currentLineTokens.length > 0) {
      renderLine(listIndent)
    }
    
    y -= 10
  }

  y -= 20
  checkPage(100)
  
  // Signatures
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 20
  page.drawText("IN WITNESS WHEREOF, the parties hereto have executed this Agreement.", { x: margin, y, size: 10, font: fontBold })
  y -= 50

  page.drawLine({ start: { x: margin, y }, end: { x: margin + 200, y }, thickness: 1 })
  page.drawText(`For: ${req.clinicLegalName}`, { x: margin, y: y - 15, size: 10, font: fontBold })
  page.drawText(`By: ${req.ownerFullName}`, { x: margin, y: y - 30, size: 10, font })
  page.drawText(`Title: ${req.ownerTitle}`, { x: margin, y: y - 45, size: 10, font })

  const rightX = width - margin - 200
  page.drawLine({ start: { x: rightX, y }, end: { x: rightX + 200, y }, thickness: 1 })
  page.drawText("For: OpenORDO Platform", { x: rightX, y: y - 15, size: 10, font: fontBold })
  page.drawText(`By: ${session.user.name || "Administrator"}`, { x: rightX, y: y - 30, size: 10, font })
  page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: rightX, y: y - 45, size: 10, font })
  
  const pdfBytes = await pdfDoc.save()
  
  const filename = `BAA_${refNumber}.pdf`
  const uploadDir = path.join(process.cwd(), "private_uploads")
  await fs.mkdir(uploadDir, { recursive: true }).catch(() => {})
  
  await fs.writeFile(path.join(uploadDir, filename), pdfBytes)
  const fileUrl = `/api/files/${filename}`

  const approvedReq = await db.baaRequest.update({
    where: { id: requestId },
    data: {
      status: "APPROVED",
      documentReferenceNumber: refNumber,
      approvedAt: new Date(),
      reviewedByAdminId: session.user.id,
      templateVersionLabel: currentTemplate.versionLabel,
      legalTextSnapshot: currentTemplate.bodyText,
      pdfFileKey: fileUrl
    }
  })
  
  await logAudit(session.user.id!, "APPROVE_BAA_REQUEST", "BaaRequest", requestId, JSON.stringify({ refNumber, pdfUrl: fileUrl }))

  // Send BAA_APPROVED email via the notification system
  const requester = await db.user.findUnique({ where: { id: req.requestedByUserId } })
  if (requester?.email) {
    const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
    const downloadUrl = `${APP}/api/baa-download?id=${req.id}`
    await sendNotificationEmail(
      "BAA_APPROVED",
      { toEmail: requester.email, ownerType: "USER", ownerId: requester.id, clinicId: req.clinicId },
      renderBaaApproved({
        name: requester.name,
        clinicName: req.clinic.name,
        refNum: refNumber,
        pdfUrl: downloadUrl,
      })
    )
    await sendNotificationEmail(
      "NEW_BAA_REQUEST_PENDING",
      { toEmail: process.env.ADMIN_ALERT_EMAIL || requester.email, ownerType: "ADMIN" },
      renderNewBaaRequestPending({
        clinicName: req.clinic.name,
        ownerName: requester.name,
        requestedAt: new Date().toLocaleString(),
        adminUrl: `${APP}/admin/baa-requests`,
      })
    )
    await logAudit(session.user.id!, "AUTO_SENT_BAA_APPROVED_EMAIL", "BaaRequest", requestId, JSON.stringify({ clinicId: req.clinicId, email: requester.email }))
  }

  revalidatePath("/admin/baa-requests")
  return approvedReq
}

export async function finalizeBaaPdfAction(requestId: string, pdfUrl: string) {
  const session = await requireSuperAdmin()
  const req = await db.baaRequest.findUnique({ where: { id: requestId }, include: { clinic: true } })
  if (!req) throw new Error("Request not found")

  await db.baaRequest.update({
    where: { id: requestId },
    data: { pdfFileKey: pdfUrl }
  })

  const globalSettings = await db.globalSetting.findMany()
  const autoSend = globalSettings.find(s => s.key === "BAA_AUTO_SEND")?.value === "true"
  if (autoSend) {
     const requester = await db.user.findUnique({ where: { id: req.requestedByUserId } })
     if (requester && requester.email) {
       const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
       await sendNotificationEmail(
         "BAA_APPROVED",
         { toEmail: requester.email, ownerType: "USER", ownerId: requester.id, clinicId: req.clinicId },
         renderBaaApproved({
           name: requester.name,
           clinicName: req.clinic.name,
           refNum: req.documentReferenceNumber || "—",
           pdfUrl: `${APP}/api/baa-download?id=${req.id}`,
         })
       )
       await logAudit(session.user.id!, "AUTO_SENT_BAA_PDF", "BaaRequest", requestId, JSON.stringify({ clinicId: req.clinicId, email: requester.email }))
     }
  }

  await logAudit(session.user.id!, "UPLOADED_BAA_PDF", "BaaRequest", requestId, JSON.stringify({ pdfUrl }))

  // Send BAA_APPROVED email for manual PDF finalize too
  const reqFull = await db.baaRequest.findUnique({ where: { id: requestId }, include: { clinic: true } })
  if (reqFull) {
    const requester = await db.user.findUnique({ where: { id: reqFull.requestedByUserId } })
    if (requester?.email) {
      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
      await sendNotificationEmail(
        "BAA_APPROVED",
        { toEmail: requester.email, ownerType: "USER", ownerId: requester.id, clinicId: reqFull.clinicId },
        renderBaaApproved({
          name: requester.name,
          clinicName: reqFull.clinic.name,
          refNum: reqFull.documentReferenceNumber || "—",
          pdfUrl: `${APP}/api/baa-download?id=${reqFull.id}`,
        })
      )
      await logAudit(session.user.id!, "AUTO_SENT_BAA_APPROVED_EMAIL", "BaaRequest", requestId, JSON.stringify({ clinicId: reqFull.clinicId, email: requester.email }))
    }
  }
  revalidatePath("/admin/baa-requests")
  return true
}

export async function rejectBaaRequestAction(requestId: string, reason: string) {
  const session = await requireSuperAdmin()
  const req = await db.baaRequest.findUnique({ where: { id: requestId } })
  if (!req) throw new Error("Request not found")

  await db.baaRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      rejectedReason: reason,
      reviewedByAdminId: session.user.id
    }
  })

  // Wire BAA_REJECTED through sendNotificationEmail (spec §2.5)
  const reqFull = await db.baaRequest.findUnique({ where: { id: requestId }, include: { clinic: true } })
  if (reqFull) {
    const requester = await db.user.findUnique({ where: { id: reqFull.requestedByUserId } })
    if (requester?.email) {
      const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"
      await sendNotificationEmail(
        "BAA_REJECTED",
        { toEmail: requester.email, ownerType: "USER", ownerId: requester.id, clinicId: reqFull.clinicId },
        renderBaaRejected({
          name: requester.name,
          clinicName: reqFull.clinic.name,
          reason,
          resubmitUrl: `${APP}/dashboard/settings?tab=compliance`,
        })
      )
    }
  }

  await logAudit(session.user.id!, "REJECT_BAA_REQUEST", "BaaRequest", requestId, JSON.stringify({ reason }))
  revalidatePath("/admin/baa-requests")
  return true
}

export async function adminCreateBaaRequest(clinicId: string, data: { 
  clinicLegalName: string; 
  ownerFullName: string; 
  ownerTitle: string;
  bizRegCertKey: string;
  signatoryAuthKey: string;
  photoIdKey: string;
  addressProofKey: string;
  practiceLicenseKey: string;
}) {
  const session = await requireSuperAdmin()
  
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, include: { memberships: { orderBy: { createdAt: "asc" }, take: 1 } } })
  if (!clinic) throw new Error("Clinic not found")

  const requestedByUserId = clinic.memberships[0]?.userId || session.user.id!

  const existing = await db.baaRequest.findFirst({
    where: { clinicId }
  })
  
  if (existing) {
    if (existing.status === "PENDING" || existing.status === "APPROVED") {
      throw new Error(`A BAA request is already ${existing.status.toLowerCase()} for this clinic.`)
    }
    
    const req = await db.baaRequest.update({
      where: { id: existing.id },
      data: {
        clinicLegalName: data.clinicLegalName,
        ownerFullName: data.ownerFullName,
        ownerTitle: data.ownerTitle || "Clinic Owner",
        bizRegCertKey: data.bizRegCertKey,
        signatoryAuthKey: data.signatoryAuthKey,
        photoIdKey: data.photoIdKey,
        addressProofKey: data.addressProofKey,
        practiceLicenseKey: data.practiceLicenseKey,
        status: "PENDING",
        rejectedReason: null,
        requestedAt: new Date()
      }
    })
    await logAudit(session.user.id!, "ADMIN_RESUBMIT_BAA_REQUEST", "BaaRequest", req.id, JSON.stringify({ clinicId }))
    revalidatePath(`/admin/clinics/${clinicId}`)
    revalidatePath("/admin/baa-requests")
    return req
  }

  const newReq = await db.baaRequest.create({
    data: {
      clinicId,
      requestedByUserId,
      status: "PENDING",
      clinicLegalName: data.clinicLegalName,
      ownerFullName: data.ownerFullName,
      ownerTitle: data.ownerTitle || "Clinic Owner",
      bizRegCertKey: data.bizRegCertKey,
      signatoryAuthKey: data.signatoryAuthKey,
      photoIdKey: data.photoIdKey,
      addressProofKey: data.addressProofKey,
      practiceLicenseKey: data.practiceLicenseKey,
    }
  })

  await logAudit(session.user.id!, "ADMIN_CREATE_BAA_REQUEST", "BaaRequest", newReq.id, JSON.stringify({ clinicId }))
  revalidatePath(`/admin/clinics/${clinicId}`)
  revalidatePath("/admin/baa-requests")
  return newReq
}