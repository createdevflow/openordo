"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard, Building2, Users as UsersIcon, Settings,
  LogOut, Package, Megaphone, CreditCard, ShieldCheck, ArrowLeft, Puzzle
} from "lucide-react"

const NAV_TOP = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
]

const NAV_MANAGE = [
  { href: "/admin/clinics",    label: "Clinics",    icon: Building2 },
  { href: "/admin/users",      label: "Users",      icon: UsersIcon },
]

const NAV_BILLING = [
  { href: "/admin/plans",       label: "Plans",       icon: Package },
  { href: "/admin/plugins",     label: "Plugins",     icon: Puzzle },
  { href: "/admin/promotions",  label: "Promotions",  icon: Megaphone },
  { href: "/admin/payments",    label: "Payments",    icon: CreditCard },
]

const NAV_SYSTEM = [
  { href: "/admin/audit-log",  label: "Audit Log",  icon: ShieldCheck },
  { href: "/admin/settings",   label: "Settings",   icon: Settings },
]

function NavGroup({ label, items, pathname, onNavigate }: {
  label: string
  items: typeof NAV_MANAGE
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="adm-nav-section">{label}</div>
      {items.map(({ href, label, icon: Icon, exact }: any) => {
        const isActive = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`adm-nav-link${isActive ? " active" : ""}`}
          >
            <Icon size={15} />
            {label}
          </Link>
        )
      })}
    </>
  )
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="adm-nav">
      <NavGroup label="" items={NAV_TOP} pathname={pathname} onNavigate={onNavigate} />
      <div className="adm-nav-section">Manage</div>
      {NAV_MANAGE.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onNavigate} className={`adm-nav-link${isActive ? " active" : ""}`}>
            <Icon size={15} /> {label}
          </Link>
        )
      })}
      <div className="adm-nav-section">Billing</div>
      {NAV_BILLING.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onNavigate} className={`adm-nav-link${isActive ? " active" : ""}`}>
            <Icon size={15} /> {label}
          </Link>
        )
      })}
      <div className="adm-nav-section">System</div>
      {NAV_SYSTEM.map(({ href, label, icon: Icon }) => {
        const isActive = pathname.startsWith(href)
        return (
          <Link key={href} href={href} onClick={onNavigate} className={`adm-nav-link${isActive ? " active" : ""}`}>
            <Icon size={15} /> {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function AdminSidebarFooter() {
  return (
    <div className="adm-sidebar-footer">
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="adm-nav-link"
        style={{ color: "rgba(255,255,255,0.35)", fontSize: 12.5, width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
      >
        <LogOut size={14} />
        Log out
      </button>
    </div>
  )
}
