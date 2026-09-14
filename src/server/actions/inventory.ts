"use server"

import { db } from "@/lib/db"
import { requireClinicId } from "@/lib/auth-utils"
import { revalidatePath } from "next/cache"

async function getClinicId() {
  return requireClinicId()
}

export async function listInventoryItems() {
  const clinicId = await getClinicId()
  return db.inventoryItem.findMany({
    where: { clinicId },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: "asc" },
  })
}

export async function createInventoryItem(data: {
  name: string
  sku?: string
  unit: string
  quantityOnHand: number
  reorderThreshold: number
  unitCost?: number
}) {
  const clinicId = await getClinicId()
  await db.inventoryItem.create({ data: { ...data, clinicId } })
  revalidatePath("/dashboard/inventory")
  return { ok: true }
}

export async function updateInventoryItem(id: string, data: {
  name?: string
  sku?: string
  unit?: string
  reorderThreshold?: number
  unitCost?: number
}) {
  const clinicId = await getClinicId()
  const item = await db.inventoryItem.findFirst({ where: { id, clinicId } })
  if (!item) throw new Error("Item not found")
  await db.inventoryItem.update({ where: { id }, data })
  revalidatePath("/dashboard/inventory")
  return { ok: true }
}

export async function logInventoryTransaction(data: {
  itemId: string
  change: number
  reason: "RESTOCK" | "USED_IN_VISIT" | "ADJUSTMENT"
  recordId?: string
}) {
  const clinicId = await getClinicId()
  const item = await db.inventoryItem.findFirst({ where: { id: data.itemId, clinicId } })
  if (!item) throw new Error("Item not found")

  await db.inventoryTransaction.create({ data })
  await db.inventoryItem.update({
    where: { id: data.itemId },
    data: { quantityOnHand: { increment: data.change } },
  })

  revalidatePath("/dashboard/inventory")
  return { ok: true }
}

export async function deleteInventoryItem(id: string) {
  const clinicId = await getClinicId()
  const item = await db.inventoryItem.findFirst({ where: { id, clinicId } })
  if (!item) throw new Error("Item not found")
  await db.inventoryItem.delete({ where: { id } })
  revalidatePath("/dashboard/inventory")
  return { ok: true }
}
