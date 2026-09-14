import * as React from "react"
import { cn } from "@/lib/utils"

interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "px-[13px] py-[7px] rounded-pill text-[13px] font-semibold border transition-colors duration-150",
          active
            ? "bg-forest border-forest text-white"
            : "border-line bg-paper-raised text-ink-soft hover:border-ink-soft hover:text-ink",
          className
        )}
        {...props}
      />
    )
  }
)
Chip.displayName = "Chip"
