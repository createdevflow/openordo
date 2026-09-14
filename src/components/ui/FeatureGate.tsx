import { Lock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export function FeatureGate({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
      <div className="w-16 h-16 bg-line rounded-full flex items-center justify-center mb-6">
        <Lock className="text-ink-soft" size={28} />
      </div>
      <h2 className="text-[22px] font-bold mb-2">{featureName} is not included in your plan</h2>
      <p className="text-[15px] text-ink-soft mb-8">
        Your current subscription plan doesn't include access to this feature. Upgrade your plan to unlock it.
      </p>
      <Link href="/dashboard/settings?tab=billing">
        <Button variant="primary">View Subscription Plans</Button>
      </Link>
    </div>
  )
}
