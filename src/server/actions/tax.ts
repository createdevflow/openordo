"use server"

import { db } from "@/lib/db"

export async function getTaxCountryConfig(countryCode: string) {
  try {
    return await db.taxCountryConfig.findUnique({ where: { countryCode } })
  } catch (err) {
    return null
  }
}

export async function getAllActiveTaxCountryConfigs() {
  try {
    return await db.taxCountryConfig.findMany({ 
      where: { isActive: true },
      orderBy: { sortOrder: "asc" }
    })
  } catch (err) {
    return []
  }
}

import { revalidatePath } from "next/cache"

export async function upsertTaxCountryConfig(data: any) {
  try {
    const config = await db.taxCountryConfig.upsert({
      where: { countryCode: data.countryCode },
      update: data,
      create: data,
    })
    revalidatePath("/admin/tax")
    return { success: true, config }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function deleteTaxCountryConfig(countryCode: string) {
  try {
    await db.taxCountryConfig.delete({ where: { countryCode } })
    revalidatePath("/admin/tax")
    return { success: true }
  } catch (err: any) {
    return { error: err.message }
  }
}
