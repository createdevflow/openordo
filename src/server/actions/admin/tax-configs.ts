"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { TaxCalculationMode } from "@prisma/client"

export async function getTaxCountryConfigs() {
  try {
    return await db.taxCountryConfig.findMany({
      orderBy: { sortOrder: "asc" }
    })
  } catch (err: any) {
    return []
  }
}

export async function createTaxCountryConfig(data: any) {
  try {
    const config = await db.taxCountryConfig.create({
      data: {
        countryCode: data.countryCode,
        countryName: data.countryName,
        currencyBucket: data.currencyBucket,
        taxLabel: data.taxLabel,
        taxIdLabel: data.taxIdLabel || null,
        calculationMode: data.calculationMode,
        flatRate: data.flatRate ? parseFloat(data.flatRate) : null,
        ourRegisteredRegion: data.ourRegisteredRegion || null,
        invoiceNumberPrefix: data.invoiceNumberPrefix || null,
        isActive: data.isActive ?? true,
        sortOrder: data.sortOrder || 0,
      }
    })
    revalidatePath("/admin/settings")
    return { success: true, config }
  } catch (err: any) {
    return { error: err.message || "Failed to create tax config" }
  }
}

export async function updateTaxCountryConfig(id: string, data: any) {
  try {
    const config = await db.taxCountryConfig.update({
      where: { id },
      data: {
        countryCode: data.countryCode,
        countryName: data.countryName,
        currencyBucket: data.currencyBucket,
        taxLabel: data.taxLabel,
        taxIdLabel: data.taxIdLabel || null,
        calculationMode: data.calculationMode,
        flatRate: data.flatRate ? parseFloat(data.flatRate) : null,
        ourRegisteredRegion: data.ourRegisteredRegion || null,
        invoiceNumberPrefix: data.invoiceNumberPrefix || null,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      }
    })
    revalidatePath("/admin/settings")
    return { success: true, config }
  } catch (err: any) {
    return { error: err.message || "Failed to update tax config" }
  }
}

export async function deleteTaxCountryConfig(id: string) {
  try {
    await db.taxCountryConfig.delete({ where: { id } })
    revalidatePath("/admin/settings")
    return { success: true }
  } catch (err: any) {
    return { error: err.message || "Failed to delete tax config" }
  }
}
