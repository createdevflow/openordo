import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, children, title, footer, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#121D19]/40 p-5 pt-[40px]">
      <div className={cn("w-full max-w-[560px] rounded-[13px] bg-paper-raised shadow-[0_20px_60px_rgba(0,0,0,0.2)]", className)}>
        {title && (
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <h3 className="m-0 text-[17px] font-bold">{title}</h3>
            <button onClick={onClose} className="text-ink-soft hover:text-ink">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="max-h-[65vh] overflow-y-auto px-6 py-[22px]">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-2.5 border-t border-line px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
