import { db } from "@/lib/db"
import { resolvePricingContext } from "@/lib/pricing"
import { MarketingAddonsSection } from "@/components/marketing/MarketingAddonsSection"

import { PluginCardData } from "@/components/ui/PluginCard"

export const metadata = {
  title: "Add-ons",
  description: "Expand OpenORDO with optional plugins.",
}

export default async function AddonsPage() {
  const pricingContext = await resolvePricingContext()

  let landingPlugins: PluginCardData[] = []
  try {
    landingPlugins = await db.plugin.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    })
  } catch {}

  return (
    <div className="py-16 sm:py-20 px-4 sm:px-7 max-w-[1180px] mx-auto">
      <div className="mb-9 sm:mb-[46px] max-w-[640px]">
        <h1 className="mb-3.5 font-serif text-[34px] sm:text-[42px] font-semibold tracking-[-0.01em] text-ink">
          Power up your clinic
        </h1>
        <p className="text-[16px] sm:text-[18px] leading-[1.55] text-ink-soft">
          Plugins are powerful features you can add to any plan — including Starter. Buy only what your clinic needs, and switch them on or off anytime.
        </p>
      </div>

      {landingPlugins.length > 0 ? (
        <MarketingAddonsSection
          plugins={landingPlugins}
          currency={pricingContext.currency as "INR" | "USD"}
          countryCode={pricingContext.countryCode}
          taxConfig={pricingContext.taxConfig}
        />
      ) : (
        <div className="text-center py-20 bg-paper-raised rounded-[12px] border border-line">
          <p className="text-ink-soft">More add-ons are coming soon!</p>
        </div>
      )}
    </div>
  )
}
