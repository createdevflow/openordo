import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: React.ReactNode
  className?: string
}

export function Drawer({ isOpen, onClose, children, title, className }: DrawerProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#121D19]/40">
      <div className={cn("h-screen w-[480px] max-w-[92vw] overflow-y-auto bg-paper-raised shadow-[-12px_0_40px_rgba(0,0,0,0.15)] animate-in slide-in-from-right", className)}>
        {title && (
          <div className="flex items-start justify-between border-b border-line p-6">
            <h3 className="m-0 text-[17px] font-bold">{title}</h3>
            <button onClick={onClose} className="text-ink-soft hover:text-ink">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
