"use client"

import { useState, useEffect } from "react"
import { ClipboardList, LogOut, Menu, Search, Bell, ChevronsLeft, ChevronsRight, Settings, X } from "lucide-react"
import { DashboardNav } from "./DashboardNav"
import { FeedbackWidget } from "./FeedbackWidget"
import { signOut } from "next-auth/react"
import { usePathname, useRouter } from "next/navigation"

export function DashboardShell({
  children,
  clinicName,
  userName,
  userInitials,
  viewTitle,
  planName = "Starter plan",
  pendingBookings = 0,
  recentBookings = [],
  activeFeatures = [],
  activePlugins = [],
  defaultCollapsed = false,
  promoExpiresAt = null,
  clinicStatus = "ACTIVE",
  pendingDataRequests = 0,
  recentDataRequests = [],
  clinicId,
  showFeedbackWidget = false,
}: {
  children: React.ReactNode
  clinicName: string
  userName: string
  userInitials: string
  viewTitle: React.ReactNode
  planName?: string
  pendingBookings?: number
  recentBookings?: any[]
  activeFeatures?: string[]
  activePlugins?: string[]
  defaultCollapsed?: boolean
  promoExpiresAt?: string | null
  clinicStatus?: string
  pendingDataRequests?: number
  recentDataRequests?: any[]
  clinicId?: string
  showFeedbackWidget?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed || false)
  const [globalSearch, setGlobalSearch] = useState("")
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)

  useEffect(() => {
    if (clinicStatus === "LOCKED_CANCELLED" && pathname !== "/dashboard/settings") {
      router.replace("/dashboard/settings")
    }
  }, [clinicStatus, pathname, router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden"
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setSidebarOpen(false)
      }
      let touchStartX = 0
      const handleTouchStart = (e: TouchEvent) => { touchStartX = e.touches[0].clientX }
      const handleTouchMove = (e: TouchEvent) => {
        if (touchStartX - e.touches[0].clientX > 50) setSidebarOpen(false)
      }
      window.addEventListener("keydown", handleKeyDown)
      window.addEventListener("touchstart", handleTouchStart)
      window.addEventListener("touchmove", handleTouchMove)
      return () => {
        document.body.style.overflow = ""
        window.removeEventListener("keydown", handleKeyDown)
        window.removeEventListener("touchstart", handleTouchStart)
        window.removeEventListener("touchmove", handleTouchMove)
      }
    } else {
      document.body.style.overflow = ""
    }
  }, [sidebarOpen])

  useEffect(() => {
    if (!promoExpiresAt) return

    const target = new Date(promoExpiresAt).getTime()
    const update = () => {
      const now = new Date().getTime()
      const diff = target - now
      if (diff <= 0) {
        setTimeLeft({ d: 0, h: 0, m: 0, s: 0 })
      } else {
        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        })
      }
    }
    
    update()
    const interval = setInterval(update, 1000)

    const dismissedAt = localStorage.getItem("promo_banner_dismissed_at")
    if (dismissedAt) {
      const timeSinceDismissal = Date.now() - parseInt(dismissedAt, 10)
      if (timeSinceDismissal < 4 * 24 * 60 * 60 * 1000) {
        setIsBannerDismissed(true)
      }
    }

    return () => clearInterval(interval)
  }, [promoExpiresAt])

  const isLocked = clinicStatus === "LOCKED_CANCELLED"

  if (isLocked && pathname !== "/dashboard/settings") {
    // Show nothing while redirecting to prevent flashing blocked content
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--paper)" }}>
        <div className="text-ink-soft text-sm">Redirecting to settings...</div>
      </div>
    )
  }

  return (
    <div className={`cw ${isCollapsed ? "collapsed-ui" : ""}`}>
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50 }} 
          className="cw-mobile-menu"
        />
      )}
      <div className={`cw-app ${isCollapsed ? "collapsed" : ""}`}>
        <aside className={`cw-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="cw-sidebar-brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isCollapsed && (
                <span className="cw-logo-mark" style={{ flexShrink: 0 }}><ClipboardList size={16} /></span>
              )}
              {!isCollapsed && (
                <span className="cw-brand-text" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img src="/OpenOrdo_Logo_Monochrome.png" alt="OpenORDO Logo" className="h-[28px] w-auto" />
                  OpenORDO
                </span>
              )}
            </div>
            <button 
              onClick={() => {
                const newVal = !isCollapsed;
                setIsCollapsed(newVal);
                document.cookie = `cw_sidebar_collapsed=${newVal}; path=/; max-age=31536000`;
              }}
              className="cw-collapse-btn hidden md:flex"
              style={{ background: "transparent", border: "none", color: "#B9C8C0", cursor: "pointer", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 4 }}
            >
              {isCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          </div>
          <DashboardNav onNavClick={() => setSidebarOpen(false)} pendingBookings={pendingBookings} activeFeatures={activeFeatures} activePlugins={activePlugins} />
          
          <div className="cw-sidebar-foot" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {showFeedbackWidget && (
              <FeedbackWidget clinicId={clinicId} />
            )}
            <button className="cw-nav-item" onClick={() => signOut({ callbackUrl: "/login" })} data-tooltip="Log out">
              <LogOut size={17} style={{ flexShrink: 0 }} />
              <span className="cw-nav-label">Log out</span>
            </button>
          </div>
        </aside>

        <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", overflowX: "clip" }}>
          {promoExpiresAt && timeLeft && (!isBannerDismissed || timeLeft.d === 0) && (
            <div style={{ 
              background: timeLeft.d === 0 ? "var(--coral-soft)" : "var(--amber-soft)", 
              color: timeLeft.d === 0 ? "var(--coral)" : "#b45309", 
              padding: "10px 24px", 
              fontSize: 13.5, 
              fontWeight: 600,
              display: "flex", 
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: `1px solid ${timeLeft.d === 0 ? "rgba(224,36,36,0.15)" : "rgba(217,119,6,0.15)"}`
            }}>
              <div>
                {timeLeft.d === 0 ? (
                  <span>⚠️ Your promotion plan is expiring in {timeLeft.h} hours! Upgrade to continue using services.</span>
                ) : (
                  <span>🚀 You are currently on a promotional plan. {timeLeft.d} days, {timeLeft.h} hours remaining.</span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <a href="/dashboard/settings?tab=subscription" style={{ background: timeLeft.d === 0 ? "var(--coral)" : "var(--amber)", color: "#fff", padding: "4px 12px", borderRadius: 4, textDecoration: "none", fontSize: 12 }}>
                  Upgrade Now
                </a>
                <button 
                  onClick={() => {
                    localStorage.setItem("promo_banner_dismissed_at", Date.now().toString())
                    setIsBannerDismissed(true)
                  }}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit", opacity: 0.7, display: "flex", padding: 0 }}
                  title="Dismiss for 4 days"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}
          <div className="cw-topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1, paddingRight: 12 }}>
              <button 
                className="cw-mobile-menu" 
                onClick={() => setSidebarOpen(true)}
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
              >
                <Menu size={22} color="var(--ink-soft)" />
              </button>
              <h1 style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, margin: 0 }}>{viewTitle}</h1>
            </div>
            <div className="cw-topbar-actions" style={{ flexShrink: 0 }}>
              {/* Notification Dropdown */}
              <div style={{ position: "relative" }}>
                <button 
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }} 
                  style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--ink-soft)", position: "relative" }}
                >
                  <Bell size={18} />
                  <span className="cw-dot-badge" style={{ right: -2, top: -2, display: (pendingBookings + pendingDataRequests) > 0 ? "block" : "none" }} />
                </button>
                {notifOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setNotifOpen(false)} />
                    <div className="cw-dropdown" style={{ width: 280, right: 0, padding: 0 }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 13.5 }}>
                        Notifications {(pendingBookings + pendingDataRequests) > 0 && <span style={{ color: "var(--moss)", marginLeft: 6 }}>({pendingBookings + pendingDataRequests})</span>}
                      </div>
                      <div style={{ maxHeight: 300, overflowY: "auto", padding: "8px 0" }}>
                        {((!recentBookings || recentBookings.length === 0) && (!recentDataRequests || recentDataRequests.length === 0)) ? (
                          <div style={{ padding: "16px", fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
                            No new notifications
                          </div>
                        ) : (
                          <>
                            {recentDataRequests?.map((req: any) => (
                              <div key={req.id} style={{ padding: "12px 16px", fontSize: 13, borderBottom: "1px solid var(--line)" }}>
                                <div style={{ fontWeight: 600 }}>Data export requested</div>
                                <div style={{ color: "var(--ink-soft)", marginTop: 4 }}>{req.patientAccount?.name} requested their data</div>
                                <a href="/dashboard/settings?tab=data-requests" onClick={() => setNotifOpen(false)} style={{ display: "inline-block", marginTop: 8, color: "var(--forest)", fontWeight: 500, textDecoration: "underline" }}>View Settings</a>
                              </div>
                            ))}
                            {recentBookings?.map((b: any) => (
                              <div key={b.id} style={{ padding: "12px 16px", fontSize: 13, borderBottom: "1px solid var(--line)" }}>
                                <div style={{ fontWeight: 600 }}>New booking request</div>
                                <div style={{ color: "var(--ink-soft)", marginTop: 4 }}>{b.name} requested {b.date} at {b.time}</div>
                              </div>
                            ))}
                          </>
                        )}
                        {((recentBookings && recentBookings.length > 0) || (recentDataRequests && recentDataRequests.length > 0)) && (
                          <a href="/dashboard/bookings" style={{ display: "block", padding: "12px 16px", fontSize: 13, textAlign: "center", color: "var(--moss)", textDecoration: "none", fontWeight: 500 }}>
                            View all bookings
                          </a>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Settings Icon */}
              <a 
                href="/dashboard/settings" 
                style={{ color: "var(--ink-soft)", display: "flex", alignItems: "center" }}
                aria-label="Settings"
              >
                <Settings size={18} />
              </a>

              {/* Profile Dropdown */}
              <div style={{ position: "relative" }}>
                <div 
                  className="cw-avatar" 
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  style={{ cursor: "pointer" }}
                >
                  {userInitials}
                </div>
                {profileOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setProfileOpen(false)} />
                    <div className="cw-dropdown" style={{ width: 200, right: 0 }}>
                      <div style={{ padding: "8px 16px 12px", borderBottom: "1px solid var(--line)", marginBottom: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{userName}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-soft)" }}>{clinicName}</div>
                      </div>
                      <a href="/dashboard/settings?tab=account" className="cw-dropdown-item" onClick={() => setProfileOpen(false)}>Edit Profile</a>
                      <a href="/dashboard/settings?tab=subscription" className="cw-dropdown-item" onClick={() => setProfileOpen(false)}>Billing & Plan</a>
                      <a href="/dashboard/settings?tab=clinic" className="cw-dropdown-item" onClick={() => setProfileOpen(false)}>Settings</a>
                      <button className="cw-dropdown-item" style={{ width: "100%", color: "var(--coral)", borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 8 }} onClick={() => signOut({ callbackUrl: "/login" })}>Log out</button>
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          <main className="cw-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
