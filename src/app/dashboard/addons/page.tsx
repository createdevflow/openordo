import { requireClinicId } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { AddonsClient } from "./AddonsClient"

export default async function AddonsPage() {
  const clinicId = await requireClinicId()

  // Plugins this clinic already owns (ACTIVE or CANCELED)
  const ownedPlugins = await db.clinicPlugin.findMany({
    where: {
      clinicId,
      status: { in: ["ACTIVE", "CANCELED"] },
    },
    include: { plugin: true },
    orderBy: { purchasedAt: "asc" },
  })

  const ownedPluginIds = ownedPlugins.map((cp) => cp.pluginId)

  // Available plugins (not yet purchased)
  const availablePlugins = await db.plugin.findMany({
    where: {
      isActive: true,
      id: { notIn: ownedPluginIds.length > 0 ? ownedPluginIds : ["__none__"] },
    },
    orderBy: { sortOrder: "asc" },
  })

  // Detect currency from clinic country
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { country: true } })
  const currency = clinic?.country === "IN" ? "INR" : "USD"

  return (
    <AddonsClient
      availablePlugins={availablePlugins}
      ownedPlugins={ownedPlugins}
      currency={currency as "INR" | "USD"}
    />
  )
}
