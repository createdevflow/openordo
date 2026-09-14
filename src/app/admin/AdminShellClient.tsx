"use client"

import { useState } from "react"
import { Menu, X, Shield, Settings, LogOut } from "lucide-react"
import { AdminNav, AdminSidebarFooter } from "./AdminNavLink"
import { signOut } from "next-auth/react"
import Link from "next/link"

export function AdminShellClient({
  children,
  session,
}: {
  children?: React.ReactNode
  session: { email?: string | null; name?: string | null }
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="adm-shell">

      <div className="adm-shell-body">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="adm-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`adm-sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="adm-brand">
            <img src="/OpenOrdo_Logo_Monochrome.png" alt="OpenORDO Logo" className="h-[28px] w-auto" />
            OpenORDO
          </div>
          <AdminNav onNavigate={() => setSidebarOpen(false)} />
          <AdminSidebarFooter />
        </aside>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <div className="adm-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="adm-hamburger"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="adm-topbar-title">
                <span style={{ color: "var(--adm-coral)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", opacity: 0.8 }}>
                  ADMIN
                </span>
                &nbsp;·&nbsp;
                <span style={{ fontFamily: "var(--font-fraunces, 'Fraunces', serif)" }}>OpenORDO</span> Control Center
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="adm-topbar-meta">{session.email}</div>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  onBlur={() => setTimeout(() => setMenuOpen(false), 200)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--adm-accent-soft)",
                    border: "2px solid rgba(30,70,56,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: "var(--adm-accent)",
                    cursor: "pointer", padding: 0
                  }}
                >
                  {session.name?.charAt(0) || "A"}
                </button>
                {menuOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 160, background: "var(--adm-card)", border: "1px solid var(--adm-border)",
                    borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    display: "flex", flexDirection: "column", padding: 4, zIndex: 100
                  }}>
                    <Link href="/admin/settings" style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      fontSize: 13, color: "var(--adm-text)", textDecoration: "none", borderRadius: 4
                    }} onMouseEnter={e => e.currentTarget.style.background = "var(--adm-bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <Settings size={14} /> Settings
                    </Link>
                    <button onClick={() => signOut({ callbackUrl: "/login" })} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                      fontSize: 13, color: "var(--adm-coral)", background: "transparent", border: "none",
                      cursor: "pointer", textAlign: "left", borderRadius: 4, width: "100%"
                    }} onMouseEnter={e => e.currentTarget.style.background = "var(--adm-bg)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <LogOut size={14} /> Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <main className="adm-main">{children}</main>
        </div>
      </div>
    </div>
  )
}
