import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import * as fs from "fs/promises"
import * as path from "path"

export async function generateInvoicePDF({
  clinic,
  patient,
  invoice,
  prescription,
  doctor
}: {
  clinic: any,
  patient: any,
  invoice: any,
  prescription?: any,
  doctor?: any
}) {
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  const width = 612 // letter width
  const height = 792 // letter height
  let page = pdfDoc.addPage([width, height])
  let y = height - 50
  const margin = 50

  const drawText = (text: string, x: number, y: number, size: number = 11, isBold: boolean = false) => {
    page.drawText(String(text || ""), { x, y, size, font: isBold ? fontBold : font, color: rgb(0.1, 0.1, 0.1) })
  }

  const stripMd = (str: string) => {
    if (!str) return ""
    return str
      .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold
      .replace(/\*(.*?)\*/g, '$1')     // remove italic
      .replace(/#(.*?)\n/g, '$1\n')    // remove headers
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove links
      .replace(/`/g, '')               // remove inline code
  }

  const drawWrappedText = (text: string, x: number, startY: number, size: number, isBold: boolean, maxWidth: number) => {
    const words = text.split(" ")
    let currentLine = ""
    let currentY = startY
    const targetFont = isBold ? fontBold : font

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const textWidth = targetFont.widthOfTextAtSize(testLine, size)
      if (textWidth > maxWidth && currentLine) {
        page.drawText(currentLine, { x, y: currentY, size, font: targetFont, color: rgb(0.1, 0.1, 0.1) })
        currentLine = word
        currentY -= (size + 4)
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) {
      page.drawText(currentLine, { x, y: currentY, size, font: targetFont, color: rgb(0.1, 0.1, 0.1) })
      currentY -= (size + 4)
    }
    return currentY
  }

  // ==== PAGE 1: INVOICE ====
  // Header
  drawText(clinic.name, margin, y, 20, true)
  y -= 30
  drawText("INVOICE", margin, y, 16, true)
  drawText(`Date: ${new Date(invoice.date).toLocaleDateString()}`, width - margin - 150, y, 11)
  y -= 20
  drawText(`Invoice #: ${invoice.displayId}`, margin, y, 11)
  
  y -= 40
  
  // Patient Info
  drawText("Billed To:", margin, y, 11, true)
  y -= 15
  drawText(`${patient?.name}`, margin, y, 11)
  y -= 15
  if (patient?.phone) {
    drawText(`Phone: ${patient.phone}`, margin, y, 11)
    y -= 15
  }

  y -= 20

  // Items Table Header
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 20
  drawText("Description", margin + 10, y, 11, true)
  drawText("Amount", width - margin - 70, y, 11, true)
  y -= 10
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 20

  // Items
  const items = typeof invoice.items === "string" ? JSON.parse(invoice.items) : invoice.items
  let total = 0
  for (const item of items) {
    y = drawWrappedText(item.desc || "Item", margin + 10, y, 11, false, width - margin * 2 - 100)
    drawText(`$${Number(item.amount).toFixed(2)}`, width - margin - 70, y + 15, 11)
    total += Number(item.amount)
    y -= 10
  }

  y -= 10
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
  y -= 20
  
  drawText("TOTAL:", width - margin - 150, y, 12, true)
  drawText(`$${total.toFixed(2)}`, width - margin - 70, y, 12, true)


  // ==== PAGE 2: PRESCRIPTION (Optional) ====
  if (prescription) {
    page = pdfDoc.addPage([width, height])
    y = height - 50
    
    // Header
    drawText(clinic.name, margin, y, 20, true)
    y -= 30
    drawText("PRESCRIPTION", margin, y, 16, true)
    drawText(`Date: ${new Date(prescription.date || prescription.createdAt).toLocaleDateString()}`, width - margin - 150, y, 11)
    
    if (doctor) {
      y -= 15
      drawText(`Dr. ${doctor.name}`, margin, y, 12, true)
    }

    y -= 40
    
    // Patient Info
    drawText("Patient:", margin, y, 11, true)
    drawText(`${patient?.name}`, margin + 50, y, 11)
    
    let demoStr = ""
    if (patient?.age) {
      demoStr += `${patient.age} yrs `
    }
    if (patient?.gender) {
      demoStr += `| ${patient.gender}`
    }
    if (demoStr) {
      drawText(demoStr, width - margin - 150, y, 11)
    }

    y -= 30
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })
    y -= 20

    // Rx Symbol
    drawText("Rx", margin, y, 24, true)
    y -= 40
    
    // Table Header
    drawText("#", margin, y, 11, true)
    drawText("Medicine / Drug", margin + 30, y, 11, true)
    drawText("Dosage", margin + 200, y, 11, true)
    drawText("Frequency", margin + 270, y, 11, true)
    drawText("Duration", margin + 380, y, 11, true)
    drawText("Instructions", margin + 450, y, 11, true)
    y -= 10
    
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.2, 0.4, 0.3) }) // A dark green line like in the image? Or just 0.8
    y -= 20
    
    // Table Items
    let rxItems = []
    try {
      rxItems = typeof prescription.items === "string" ? JSON.parse(prescription.items) : (prescription.items || [])
    } catch(e) {
      rxItems = []
    }
    
    for (let i = 0; i < rxItems.length; i++) {
      const it = rxItems[i]
      drawText(`${i + 1}`, margin, y, 11)
      const y1 = drawWrappedText(it.drug || "", margin + 30, y, 11, true, 160)
      const y2 = drawWrappedText(it.dosage || "", margin + 200, y, 11, false, 60)
      const y3 = drawWrappedText(it.frequency || "", margin + 270, y, 11, false, 100)
      drawText(it.durationDays ? `${it.durationDays} Days` : "", margin + 380, y, 11)
      const y4 = drawWrappedText(it.notes || "", margin + 450, y, 11, false, 100)
      
      y = Math.min(y1, y2, y3, y4, y - 11) - 15
      page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) })
      y -= 15
    }
  }

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
