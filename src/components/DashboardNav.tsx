"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDown, ChevronRight, Activity, Users, Calendar, Stethoscope, FileText, Settings, Receipt, CalendarCheck, Lock, Puzzle, Archive, FileSignature } from "lucide-react"

const NAV_GROUPS = [
  {
    label: null,
    items: [
      { label: 'Overview', href: '/dashboard', icon: Activity, featureReq: null, pluginReq: null },
    ]
  },
  {
    label: 'Front Desk',
    items: [
      { label: 'Appointments', href: '/dashboard/appointments', icon: Calendar, featureReq: 'core.appointment_calendar', pluginReq: null },
      { label: 'Booking Requests', href: '/dashboard/bookings', icon: CalendarCheck, featureReq: 'scheduling.online_booking', pluginReq: null },
      { label: 'Patients', href: '/dashboard/patients', icon: Users, featureReq: 'core.patient_management', pluginReq: null },
    ]
  },
  {
    label: 'Clinical',
    items: [
      { label: 'Medical Records', href: '/dashboard/records', icon: FileText, featureReq: 'core.patient_management', pluginReq: null },
      { label: 'Prescriptions', href: '/dashboard/prescriptions', icon: FileSignature, featureReq: null, pluginReq: 'e-prescriptions' },
    ]
  },
  {
    label: 'Management',
    items: [
      { label: 'Billing', href: '/dashboard/billing', icon: Receipt, featureReq: 'billing.invoices', pluginReq: null },
      { label: 'Inventory', href: '/dashboard/inventory', icon: Archive, featureReq: null, pluginReq: 'inventory-management' },
      { label: 'Doctors & Staff', href: '/dashboard/doctors', icon: Stethoscope, featureReq: 'core.doctor_profiles', pluginReq: null },
      { label: 'Add-ons', href: '/dashboard/addons', icon: Puzzle, featureReq: null, pluginReq: null },
    ]
  }
]

export function DashboardNav({ 
  onNavClick, 
  pendingBookings = 0,
  activeFeatures = [],
  activePlugins = [],
}: { 
  onNavClick?: () => void; 
  pendingBookings?: number;
  activeFeatures?: string[];
  activePlugins?: string[];
}) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'Front Desk': true,
    'Clinical': true,
    'Management': true
  })

  const toggleGroup = (label: string) => {
    setExpanded(prev => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <nav className="cw-sidebar-nav" style={{ padding: "10px 12px", overflowY: "auto", overflowX: "hidden" }}>
      {NAV_GROUPS.map((group, groupIdx) => {
        const isGroupExpanded = group.label ? expanded[group.label] : true

        return (
          <div key={group.label || `group-${groupIdx}`} className={`cw-nav-group ${!isGroupExpanded ? "collapsed-group" : ""}`} style={{ marginBottom: group.label ? 10 : 4 }}>
            {group.label && (
              <div 
                className="cw-nav-group-header" 
                onClick={() => toggleGroup(group.label as string)}
                style={{ 
                  display: "flex", alignItems: "center", justifyContent: "space-between", 
                  padding: "0 12px", marginBottom: 4, cursor: "pointer",
                  fontSize: 11, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "#93A69C",
                  userSelect: "none"
                }}
              >
                <span>{group.label}</span>
                <span className="cw-nav-group-icon" style={{ opacity: 0.7 }}>
                  {isGroupExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </div>
            )}
            <div className="cw-nav-group-items" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map(item => {
                const isLocked = item.featureReq !== null && !activeFeatures.includes(item.featureReq)
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                const showBadge = !isLocked && item.href === '/dashboard/bookings' && pendingBookings > 0
                const hasPlugin = item.pluginReq === null || activePlugins.includes(item.pluginReq)

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavClick}
                    className={`cw-nav-item ${isActive ? "active" : ""}`}
                    style={{ 
                      position: "relative",
                      opacity: isLocked ? 0.75 : 1
                    }}
                    data-tooltip={isLocked ? `${item.label} (Upgrade Required)` : !hasPlugin ? `${item.label} (Add-on)` : item.label}
                  >
                    <item.icon size={17} style={{ flexShrink: 0 }} />
                    <span className="cw-nav-label">{item.label}</span>
                    {isLocked ? (
                      <span className="cw-nav-lock-badge" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 10, background: "rgba(255,255,255,0.08)", padding: "2px 5px", borderRadius: 4, color: "#B9C8C0" }}>
                        <Lock size={11} />
                      </span>
                    ) : !hasPlugin ? (
                      <span className="cw-nav-addon-badge" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, fontSize: 9, background: "rgba(245,158,11,0.2)", padding: "2px 5px", borderRadius: 4, color: "#fbbf24", fontWeight: 700, letterSpacing: ".02em" }}>
                        ADD-ON
                      </span>
                    ) : showBadge ? (
                      <span className="cw-nav-badge" style={{
                        marginLeft: "auto", background: "var(--amber)", color: "#fff",
                        borderRadius: 10, padding: "1px 6px", fontSize: 10.5, fontWeight: 700,
                        minWidth: 18, textAlign: "center"
                      }}>
                        {pendingBookings}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
