"use server"

/**
 * GST Tax Invoice service — CHARTWELL_PRELAUNCH_OPS_SPEC.md §3
 *
 * Rules:
 * 1. Invoice numbers are sequential, financial-year-scoped, atomically incremented.
 *    Format: OO/2026-27/000123   (prefix / financial-year / 6-digit sequence)
 * 2. Numbers are NEVER reused — void invoices get a documented cancellation
 *    record, not a deleted or reused number.
 * 3. INR invoices carry CGST+SGST (intra-state) or IGST (inter-state).
 *    USD invoices are plain receipts — Indian GST does not apply.
 * 4. PDFs are stored privately and delivered via signed URL only.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

// ─── Financial year helpers ───────────────────────────────────────────────────

/**
 * Returns the Indian financial year label (e.g. "2026-27") for a given date.
 * Financial year runs April 1 → March 31.
 */
function getFinancialYear(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1 // 1-indexed
  // Before April → previous financial year; from April onwards → current
  const fyStart = month >= 4 ? year : year - 1
  const fyEnd = (fyStart + 1).toString().slice(2)
  return `${fyStart}-${fyEnd}`
}

/**
 * Atomically increment the invoice sequence for the given financial year and
 * return the next sequence number.
 *
 * Uses a Prisma transaction with upsert + increment to avoid race conditions
 * under concurrent payment events.
 */
async function nextInvoiceSequence(financialYear: string): Promise<number> {
  const result = await db.$transaction(async (tx) => {
    const existing = await tx.invoiceSequence.findUnique({
      where: { financialYear },
    })

    if (existing) {
      return tx.invoiceSequence.update({
        where: { financialYear },
        data: { sequence: { increment: 1 } },
      })
    } else {
      return tx.invoiceSequence.create({
        data: { financialYear, sequence: 1 },
      })
    }
  })

  return result.sequence
}

/**
 * Format an invoice number from financial year + sequence.
 * e.g. "OO/2026-27/000123"
 */
async function generateInvoiceNumber(): Promise<string> {
  const now = new Date()
  const fy = getFinancialYear(now)
  const seq = await nextInvoiceSequence(fy)
  const prefix = "OO" // OpenORDO prefix — configurable in future
  return `${prefix}/${fy}/${String(seq).padStart(6, "0")}`
}

// ─── GST calculation ──────────────────────────────────────────────────────────

interface GstRates {
  cgst: number | null
  sgst: number | null
  igst: number | null
}

/**
 * Calculate applicable GST given the supplier's state and the recipient's state.
 * Returns values in smallest currency unit (paise).
 *
 * @param taxableValuePaise  Taxable amount in paise
 * @param supplierState     OpenORDO's registered state (from GlobalSettings)
 * @param recipientState    Clinic's registered state (placeOfSupply)
 * @returns { cgst, sgst, igst } in paise
 */
function calculateGst(
  taxableValuePaise: number,
  supplierState: string,
  recipientState: string
): GstRates {
  // Standard GST rate for SaaS services — 18%
  // SAC 998314 / 9983 (management consultancy / IT services)
  // Note: Confirm with CA before going live (per spec §3.3)
  const GST_RATE = 0.18

  const isIntraState =
    supplierState.trim().toLowerCase() === recipientState.trim().toLowerCase()

  const totalGst = Math.round(taxableValuePaise * GST_RATE)

  if (isIntraState) {
    // CGST 9% + SGST 9%
    const half = Math.round(totalGst / 2)
    return { cgst: half, sgst: totalGst - half, igst: null }
  } else {
    // IGST 18%
    return { cgst: null, sgst: null, igst: totalGst }
  }
}

// ─── Main invoice creation function ──────────────────────────────────────────

export interface CreateTaxInvoiceInput {
  clinicId: string
  billingType: "PLAN_SUBSCRIPTION" | "PLUGIN_PURCHASE"
  relatedId: string
  currency: "INR" | "USD"
  /** Clinic's registered country (ISO 2) */
  countryCode: string
  /** Clinic's registered state — required for SPLIT_BY_SUPPLY_REGION */
  placeOfSupply?: string
  /** Taxable amount in smallest unit (paise / cents) */
  taxableValue: number
}

export interface TaxInvoiceResult {
  success: boolean
  invoiceId?: string
  invoiceNumber?: string
  error?: string
}

export async function createTaxInvoice(
  input: CreateTaxInvoiceInput
): Promise<TaxInvoiceResult> {
  const { clinicId, billingType, relatedId, currency, countryCode, placeOfSupply, taxableValue } = input

  try {
    const config = await db.taxCountryConfig.findUnique({
      where: { countryCode },
    })

    if (!config) {
      throw new Error(`Tax configuration not found for country code: ${countryCode}`)
    }

    const prefix = config.invoiceNumberPrefix || "OO"
    const now = new Date()
    const fy = getFinancialYear(now)
    const seq = await nextInvoiceSequence(`${prefix}/${fy}`)
    const invoiceNumber = `${prefix}/${fy}/${String(seq).padStart(6, "0")}`

    let cgst: number | null = null
    let sgst: number | null = null
    let igst: number | null = null
    let taxAmount = 0
    let taxLabel = config.taxLabel
    
    // Calculate platform fee if applicable
    const feeSetting = await db.globalSetting
      .findUnique({ where: { key: "PLATFORM_FEE_PERCENTAGE" } })
      .catch(() => null)
    
    const platformFeeRate = feeSetting?.value || "10"
    const feePercentage = parseFloat(platformFeeRate)
    
    let platformFee: number | null = null
    if (!isNaN(feePercentage) && feePercentage > 0) {
      platformFee = Math.round(taxableValue * (feePercentage / 100))
    }

    let totalValue = taxableValue + (platformFee || 0)

    if (config.calculationMode === "FLAT_PERCENTAGE" && config.flatRate) {
      taxAmount = Math.round(totalValue * (config.flatRate / 100))
      totalValue += taxAmount
    } else if (config.calculationMode === "SPLIT_BY_SUPPLY_REGION" && config.flatRate) {
      const supplierState = config.ourRegisteredRegion || ""
      if (supplierState && placeOfSupply) {
        const isIntraState = supplierState.trim().toLowerCase() === placeOfSupply.trim().toLowerCase()
        const totalGst = Math.round(totalValue * (config.flatRate / 100))
        
        if (isIntraState) {
          const half = Math.round(totalGst / 2)
          cgst = half
          sgst = totalGst - half
        } else {
          igst = totalGst
        }
        taxAmount = totalGst
        totalValue += totalGst
      } else {
        logger.warn("createTaxInvoice: Missing supplierState or placeOfSupply for SPLIT_BY_SUPPLY_REGION", {
          clinicId, invoiceNumber
        })
      }
    }

    const invoice = await db.taxInvoice.create({
      data: {
        invoiceNumber,
        clinicId,
        billingType,
        relatedId,
        currency,
        countryCode,
        taxLabel,
        taxAmount,
        taxableValue,
        platformFee,
        platformFeeRate,
        cgst,
        sgst,
        igst,
        totalValue,
      },
    })

    logger.info("Tax invoice created", { invoiceNumber, clinicId, currency, totalValue })
    return { success: true, invoiceId: invoice.id, invoiceNumber }
  } catch (err: any) {
    logger.error("Failed to create tax invoice", err, { clinicId, relatedId })
    return { success: false, error: err.message || "Failed to create tax invoice" }
  }
}

/**
 * Attach a PDF file key to an existing TaxInvoice.
 * Called after the PDF generation step completes.
 */
export async function attachTaxInvoicePdf(invoiceId: string, pdfFileKey: string): Promise<void> {
  await db.taxInvoice.update({
    where: { id: invoiceId },
    data: { pdfFileKey },
  })
}

/**
 * List all TaxInvoices for a clinic — used in the clinic's Billing History view.
 * Returns only non-voided invoices ordered newest-first.
 */
export async function getClinicTaxInvoices(clinicId: string) {
  return db.taxInvoice.findMany({
    where: { clinicId, isVoided: false },
    orderBy: { issueDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      billingType: true,
      currency: true,
      issueDate: true,
      taxableValue: true,
      cgst: true,
      sgst: true,
      igst: true,
      totalValue: true,
      pdfFileKey: true,
    },
  })
}

/**
 * Admin: list all TaxInvoices across all clinics.
 */
export async function getAllTaxInvoices(opts?: { limit?: number; offset?: number }) {
  return db.taxInvoice.findMany({
    orderBy: { issueDate: "desc" },
    take: opts?.limit ?? 50,
    skip: opts?.offset ?? 0,
    include: {
      clinic: { select: { id: true, name: true } },
    },
  })
}
