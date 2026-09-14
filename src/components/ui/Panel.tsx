import * as React from "react"
import { cn } from "@/lib/utils"

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-[11px] border border-line bg-paper-raised", className)} {...props} />
  )
}

export function PanelHeader({ className, title, right, ...props }: React.HTMLAttributes<HTMLDivElement> & { title: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between border-b border-line px-5 py-4", className)} {...props}>
      <h3 className="m-0 text-[15.5px] font-bold">{title}</h3>
      {right && <div>{right}</div>}
    </div>
  )
}

export function PanelBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("px-5 py-[18px]", className)} {...props} />
  )
}
