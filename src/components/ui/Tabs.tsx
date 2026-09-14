import * as React from "react"
import { cn } from "@/lib/utils"

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex w-fit gap-1 rounded-lg border border-line bg-paper p-[3px]", className)}
      {...props}
    />
  )
}

interface TabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3.5 py-[7px] text-[13px] font-semibold transition-colors duration-150",
          active
            ? "bg-paper-raised text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
            : "bg-transparent text-ink-soft hover:text-ink",
          className
        )}
        {...props}
      />
    )
  }
)
Tab.displayName = "Tab"
