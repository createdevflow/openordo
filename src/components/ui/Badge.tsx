import * as React from "react"
import { Clock, CheckCircle2, XCircle, AlertCircle, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type BadgeStatus = "scheduled" | "completed" | "cancelled" | "noshow" | "paid" | "unpaid"

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: BadgeStatus
}

const statusMap: Record<BadgeStatus, { colorClass: string; icon: LucideIcon; label: string }> = {
  scheduled: { colorClass: "bg-blue-soft text-blue", icon: Clock, label: "Scheduled" },
  completed: { colorClass: "bg-success-soft text-success", icon: CheckCircle2, label: "Completed" },
  cancelled: { colorClass: "bg-coral-soft text-coral", icon: XCircle, label: "Cancelled" },
  noshow: { colorClass: "bg-[#EFE3CF] text-amber", icon: AlertCircle, label: "No-show" },
  paid: { colorClass: "bg-success-soft text-success", icon: CheckCircle2, label: "Paid" },
  unpaid: { colorClass: "bg-coral-soft text-coral", icon: AlertCircle, label: "Unpaid" },
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, status, ...props }, ref) => {
    const config = statusMap[status] || statusMap.scheduled
    const Icon = config.icon

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-pill text-[11.5px] font-semibold",
          config.colorClass,
          className
        )}
        {...props}
      >
        <Icon size={11.5} />
        {config.label}
      </span>
    )
  }
)
Badge.displayName = "Badge"

export { Badge }
