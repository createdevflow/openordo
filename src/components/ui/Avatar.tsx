import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
  color?: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, name, color, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-forest text-[13px] font-bold text-white",
          className
        )}
        style={{ ...(color ? { backgroundColor: color } : {}), ...style }}
        {...props}
      >
        {getInitials(name)}
      </div>
    )
  }
)
Avatar.displayName = "Avatar"
