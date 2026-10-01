import { requireClinicId } from "@/lib/auth-utils"
import { db } from "@/lib/db"
import { AddonsClient } from "./AddonsClient"
import { hasFeature } from "@/lib/features"
import { getEffectiveStorageQuota } from "@/lib/plugins"

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
  const clinic = await db.clinic.findUnique({ where: { id: clinicId }, select: { countryCode: true } })
  const currency = clinic?.countryCode === "IN" ? "INR" : "USD"
  const countryCode = clinic?.countryCode || null

  // Check if plan includes online booking (required for Branded Booking Page)
  const planHasOnlineBooking = await hasFeature(clinicId, "scheduling.online_booking")

  // Storage usage for document-storage add-on
  const storageInfo = await getEffectiveStorageQuota(clinicId)

  const feeSetting = await db.globalSetting.findUnique({ where: { key: "PLATFORM_FEE_PERCENTAGE" } })
  const platformFeePercentage = parseFloat(feeSetting?.value || "10")

  return (
    <AddonsClient
      availablePlugins={availablePlugins}
      ownedPlugins={ownedPlugins}
      currency={currency as "INR" | "USD"}
      countryCode={countryCode}
      planHasOnlineBooking={planHasOnlineBooking}
      storageUsedGB={storageInfo.usedGB}
      storageQuotaGB={storageInfo.quotaGB}
      platformFeePercentage={platformFeePercentage}
    />
  )
}

