import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "amber" | "danger"
  size?: "default" | "sm" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-control font-semibold border border-transparent transition-all duration-150 active:scale-[0.97] whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-forest text-white hover:bg-forest-dark": variant === "primary",
            "bg-transparent text-ink border-line hover:border-ink-soft": variant === "ghost",
            "bg-amber text-forest-dark hover:brightness-105": variant === "amber",
            "bg-transparent text-coral border-coral-soft hover:bg-coral-soft": variant === "danger",
            "px-5 py-[11px] text-[14.5px]": size === "default",
            "px-[13px] py-[7px] text-[13px]": size === "sm",
            "p-2": size === "icon",
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
