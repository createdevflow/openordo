"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { MoreVertical } from "lucide-react"
import React from "react"

export type AdminMenuAction = {
  label: string
  icon?: React.ReactNode
  tone?: "default" | "danger" | "warning"
  onSelect: () => void
  separator?: boolean  // show separator BEFORE this item
  href?: string        // if set, render as a link instead of button
  hidden?: boolean     // skip rendering this item
}

export function AdminMenu({ actions }: { actions: AdminMenuAction[] }) {
  const visible = actions.filter(a => !a.hidden)
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm" aria-label="Row actions">
          <MoreVertical size={15} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="adm-menu-content"
          style={{ backgroundColor: "#FBFAF6", background: "#FBFAF6" }}
        >
          {visible.map((action, i) => (
            <React.Fragment key={i}>
              {action.separator && <DropdownMenu.Separator className="adm-menu-separator" />}
              <DropdownMenu.Item
                className={`adm-menu-item${action.tone === "danger" ? " danger" : action.tone === "warning" ? " warning" : ""}`}
                onSelect={action.onSelect}
                asChild={!!action.href}
              >
                {action.href ? (
                  <a href={action.href}>
                    {action.icon}
                    {action.label}
                  </a>
                ) : (
                  <>
                    {action.icon}
                    {action.label}
                  </>
                )}
              </DropdownMenu.Item>
            </React.Fragment>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
