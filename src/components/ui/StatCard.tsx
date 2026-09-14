import * as React from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  value: React.ReactNode
  label: string
  delta?: React.ReactNode
}

export function StatCard({ className, icon: Icon, value, label, delta, ...props }: StatCardProps) {
  return (
    <div className={cn("rounded-[11px] border border-line bg-paper-raised px-5 py-[18px]", className)} {...props}>
      <div className="mb-[14px] flex items-center justify-between">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-control">
          <Icon size={18} className="text-forest" />
        </div>
      </div>
      <div className="font-serif text-[25px] font-bold">{value}</div>
      <div className="mt-0.5 text-[13px] text-ink-soft">{label}</div>
      {delta && <div className="mt-2 flex items-center gap-[3px] text-[12px] font-semibold">{delta}</div>}
    </div>
  )
}
