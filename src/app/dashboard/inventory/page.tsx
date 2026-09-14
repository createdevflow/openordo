import { requireClinicId } from "@/lib/auth-utils"
import { hasActivePlugin } from "@/lib/plugins"
import { db } from "@/lib/db"
import { PluginUpsellCard } from "@/components/ui/PluginCard"
import { InventoryClient } from "./InventoryClient"

export default async function InventoryPage() {
  const clinicId = await requireClinicId()

  const hasPlugin = await hasActivePlugin(clinicId, "inventory-management")

  if (!hasPlugin) {
    return (
      <div className="cw" style={{ padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>Inventory</h1>
        <PluginUpsellCard
          slug="inventory-management"
          name="Inventory Management"
          tagline="Never run out of stock — track every vial, strip, and box."
        />
      </div>
    )
  }

  const items = await db.inventoryItem.findMany({
    where: { clinicId },
    include: {
      _count: { select: { transactions: true } },
      transactions: { orderBy: { createdAt: "desc" }, take: 5 },
    },
    orderBy: { name: "asc" },
  })

  return <InventoryClient items={items} />
}
