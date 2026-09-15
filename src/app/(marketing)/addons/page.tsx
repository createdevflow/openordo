import { db } from "@/lib/db"
import { PluginCard } from "@/components/ui/PluginCard"
import { headers } from "next/headers"

export const metadata = {
  title: "Add-ons",
  description: "Expand OpenORDO with optional plugins.",
}

export default async function AddonsPage() {
  const headersList = await headers()
  const country = headersList.get("x-user-country") || "US"
  const initialCurrency = country === "IN" ? "INR" : "USD"

  let landingPlugins: any[] = []
  try {
    landingPlugins = await db.plugin.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
  } catch (e) {}

  return (
    <div className="py-20 px-7 max-w-[1180px] mx-auto">
      <div className="mb-[46px] max-w-[640px]">
        <h1 className="mb-3.5 font-serif text-[42px] font-semibold tracking-[-0.01em] text-ink">
          Power up your clinic
        </h1>
        <p className="text-[18px] leading-[1.55] text-ink-soft">
          Plugins are powerful features you can add to any plan — including Starter. Buy only what your clinic needs, and switch them on or off anytime.
        </p>
      </div>

      {landingPlugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {landingPlugins.map((plugin) => (
            <PluginCard
              key={plugin.id}
              plugin={plugin}
              currency={initialCurrency as "INR" | "USD"}
              variant="landing"
              isLoggedIn={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-paper-raised rounded-card border border-line">
          <p className="text-ink-soft">More add-ons are coming soon!</p>
        </div>
      )}
    </div>
  )
}
