import * as React from "react"
import { cn } from "@/lib/utils"

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto w-full">
      <table className={cn("w-full border-collapse text-[13.8px]", className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={className} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />
}

export function TableRow({ className, clickable, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        "group border-b border-line last:border-0",
        clickable && "cursor-pointer hover:bg-paper",
        className
      )}
      {...props}
    />
  )
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-line px-4 pb-2.5 text-left text-[11.5px] font-bold uppercase tracking-[0.04em] text-moss",
        className
      )}
      {...props}
    />
  )
}

export function TableCell({ className, mono, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { mono?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-[13px] align-middle",
        mono && "font-mono text-[13px]",
        className
      )}
      {...props}
    />
  )
}
