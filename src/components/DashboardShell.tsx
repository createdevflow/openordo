"use client"

import { useState, useEffect } from "react"
import { ClipboardList, LogOut, Menu, Search, Bell, ChevronsLeft, ChevronsRight, Settings, X, Check, CheckCheck } from "lucide-react"
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
  trialEndsAt = null,
  isTrialExpired = false,
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
  trialEndsAt?: string | null
  isTrialExpired?: boolean
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
  const [readNotifIds, setReadNotifIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`read_notifs_${clinicId || "default"}`)
      if (stored) {
        setReadNotifIds(JSON.parse(stored))
      }
    } catch (e) {}
  }, [clinicId])

  const markAsRead = (id: string) => {
    setReadNotifIds(prev => {
      if (prev.includes(id)) return prev
      const updated = [...prev, id]
      try {
        localStorage.setItem(`read_notifs_${clinicId || "default"}`, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }

  const markAllAsRead = () => {
    const allIds = [
      ...(recentDataRequests || []).map((r: any) => `req_${r.id}`),
      ...(recentBookings || []).map((b: any) => `booking_${b.id}`)
    ]
    setReadNotifIds(prev => {
      const combined = Array.from(new Set([...prev, ...allIds]))
      try {
        localStorage.setItem(`read_notifs_${clinicId || "default"}`, JSON.stringify(combined))
      } catch (e) {}
      return combined
    })
  }

  const unreadDataRequests = (recentDataRequests || []).filter((r: any) => !readNotifIds.includes(`req_${r.id}`))
  const unreadBookings = (recentBookings || []).filter((b: any) => !readNotifIds.includes(`booking_${b.id}`))
  const unreadTotal = unreadDataRequests.length + unreadBookings.length

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
          {isTrialExpired && (
            <div style={{ 
              background: "var(--coral-soft)", 
              color: "var(--coral)", 
              padding: "10px 24px", 
              fontSize: 13.5, 
              fontWeight: 600,
              display: "flex", 
              alignItems: "center",
              justifyContent: "space-between",
              borderBottom: "1px solid rgba(224,36,36,0.18)"
            }}>
              <div>
                <span>⚠️ Your free trial has expired and your account has transitioned to the {planName}. Upgrade to unlock all features.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <a href="/dashboard/settings?tab=subscription" style={{ background: "var(--coral)", color: "#fff", padding: "4px 12px", borderRadius: 4, textDecoration: "none", fontSize: 12 }}>
                  Upgrade Now
                </a>
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
                  <span className="cw-dot-badge" style={{ right: -2, top: -2, display: unreadTotal > 0 ? "block" : "none" }} />
                </button>
                {notifOpen && (
                  <>
                    <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setNotifOpen(false)} />
                    <div className="cw-dropdown" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 310, padding: 0, zIndex: 100 }}>
                      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>Notifications</span>
                          {unreadTotal > 0 && (
                            <span style={{ background: "rgba(30, 70, 56, 0.1)", color: "var(--forest)", fontSize: 11.5, fontWeight: 700, padding: "1px 7px", borderRadius: 10 }}>
                              {unreadTotal}
                            </span>
                          )}
                        </div>
                        {unreadTotal > 0 ? (
                          <button 
                            type="button" 
                            onClick={markAllAsRead} 
                            style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "var(--forest)", display: "flex", alignItems: "center", gap: 4, padding: "2px 4px" }}
                            className="hover:underline"
                          >
                            <CheckCheck size={14} /> Mark all read
                          </button>
                        ) : (
                          <span style={{ fontSize: 11.5, color: "var(--ink-soft)", opacity: 0.75 }}>All caught up</span>
                        )}
                      </div>
                      <div style={{ maxHeight: 320, overflowY: "auto", padding: "4px 0" }}>
                        {((!recentBookings || recentBookings.length === 0) && (!recentDataRequests || recentDataRequests.length === 0)) ? (
                          <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--ink-soft)", textAlign: "center" }}>
                            No new notifications
                          </div>
                        ) : (
                          <>
                            {recentDataRequests?.map((req: any) => {
                              const isRead = readNotifIds.includes(`req_${req.id}`)
                              return (
                                <div 
                                  key={req.id} 
                                  onClick={() => {
                                    markAsRead(`req_${req.id}`)
                                    setNotifOpen(false)
                                    router.push("/dashboard/settings?tab=data-requests")
                                  }}
                                  style={{ 
                                    padding: "11px 16px", 
                                    fontSize: 13, 
                                    borderBottom: "1px solid var(--line)",
                                    cursor: "pointer",
                                    background: isRead ? "transparent" : "rgba(30, 70, 56, 0.04)",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    transition: "background 0.15s ease"
                                  }}
                                  className="hover:bg-paper"
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: isRead ? 500 : 700, color: isRead ? "var(--ink-soft)" : "var(--ink)", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                                      {!isRead && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--forest)", flexShrink: 0 }} />}
                                      Data export requested
                                    </div>
                                    <div style={{ color: "var(--ink-soft)", marginTop: 3, fontSize: 12 }}>
                                      {req.patientAccount?.name} requested their data
                                    </div>
                                    <div style={{ color: "var(--forest)", fontSize: 11.5, marginTop: 4, fontWeight: 500 }}>
                                      View in Settings →
                                    </div>
                                  </div>
                                  {!isRead && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsRead(`req_${req.id}`)
                                      }}
                                      title="Mark as read"
                                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-soft)", opacity: 0.6 }}
                                      className="hover:opacity-100 hover:text-forest"
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                            {recentBookings?.map((b: any) => {
                              const isRead = readNotifIds.includes(`booking_${b.id}`)
                              return (
                                <div 
                                  key={b.id} 
                                  onClick={() => {
                                    markAsRead(`booking_${b.id}`)
                                    setNotifOpen(false)
                                    router.push("/dashboard/bookings")
                                  }}
                                  style={{ 
                                    padding: "11px 16px", 
                                    fontSize: 13, 
                                    borderBottom: "1px solid var(--line)",
                                    cursor: "pointer",
                                    background: isRead ? "transparent" : "rgba(30, 70, 56, 0.04)",
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 8,
                                    transition: "background 0.15s ease"
                                  }}
                                  className="hover:bg-paper"
                                >
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: isRead ? 500 : 700, color: isRead ? "var(--ink-soft)" : "var(--ink)", display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                                      {!isRead && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--forest)", flexShrink: 0 }} />}
                                      New booking request
                                    </div>
                                    <div style={{ color: "var(--ink-soft)", marginTop: 3, fontSize: 12 }}>
                                      {b.name} requested {b.date} at {b.time}
                                    </div>
                                    <div style={{ color: "var(--moss)", fontSize: 11.5, marginTop: 4, fontWeight: 500 }}>
                                      Review booking →
                                    </div>
                                  </div>
                                  {!isRead && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        markAsRead(`booking_${b.id}`)
                                      }}
                                      title="Mark as read"
                                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: "var(--ink-soft)", opacity: 0.6 }}
                                      className="hover:opacity-100 hover:text-forest"
                                    >
                                      <Check size={14} />
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </>
                        )}
                        {((recentBookings && recentBookings.length > 0) || (recentDataRequests && recentDataRequests.length > 0)) && (
                          <a href="/dashboard/bookings" style={{ display: "block", padding: "10px 16px", fontSize: 12.5, textAlign: "center", color: "var(--moss)", textDecoration: "none", fontWeight: 500, borderTop: "1px solid var(--line)" }}>
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
                    <div style={{ position: "fixed", inset: 0, zIndex: 99 }} onClick={() => setProfileOpen(false)} />
                    <div className="cw-dropdown" style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 200, zIndex: 100 }}>
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
