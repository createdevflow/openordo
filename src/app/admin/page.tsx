import { db } from "@/lib/db"
import { Building2, Users as UsersIcon, CalendarClock, CreditCard, AlertTriangle, ShieldCheck } from "lucide-react"
import Link from "next/link"

export default async function AdminOverviewPage() {
  const [
    totalClinics, totalUsers, totalAppointments, totalRevenue,
    suspendedClinics, activePromos,
    recentClinics, recentUsers
  ] = await Promise.all([
    db.clinic.count(),
    db.user.count(),
    db.appointment.count(),
    db.payment.aggregate({ where: { status: "succeeded" }, _sum: { amount: true } }),
    db.clinic.count({ where: { status: "SUSPENDED" } }),
    db.promo.count({ where: { isActive: true } }),
    db.clinic.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        memberships: {
          where: { role: "OWNER" },
          include: { user: { select: { name: true, email: true } } },
          take: 1,
        },
        _count: { select: { patients: true, appointments: true } },
        subscription: { include: { plan: { select: { name: true } } } },
      }
    }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, platformRole: true, createdAt: true }
    })
  ])

  const revenueAmount = totalRevenue._sum.amount || 0

  const stats = [
    { label: "Total Clinics", value: totalClinics, icon: Building2, tone: "forest", change: `${suspendedClinics} suspended` },
    { label: "Total Users", value: totalUsers, icon: UsersIcon, tone: "success", change: "Platform members" },
    { label: "Appointments", value: totalAppointments, icon: CalendarClock, tone: "blue", change: "All time" },
    {
      label: "Revenue",
      value: `₹${(revenueAmount / 100).toLocaleString("en-IN")}`,
      icon: CreditCard,
      tone: "amber",
      change: "Total collected"
    },
  ]

  const needsAttention = [
    suspendedClinics > 0 && { label: `${suspendedClinics} clinic${suspendedClinics > 1 ? "s" : ""} suspended`, href: "/admin/clinics", tone: "coral" },
    activePromos > 0 && { label: `${activePromos} promo${activePromos > 1 ? "s" : ""} currently live`, href: "/admin/promotions", tone: "amber" },
  ].filter(Boolean) as { label: string; href: string; tone: string }[]

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">Platform Overview</h1>
        <div style={{ fontSize: 13, color: "var(--adm-muted)" }} suppressHydrationWarning>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div className="adm-card" style={{ marginBottom: 20, padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--adm-muted)" }}>
            <AlertTriangle size={13} /> Needs Attention
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {needsAttention.map((item) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: "none" }}>
                <span className={`adm-badge ${item.tone === "coral" ? "adm-badge-red" : "adm-badge-amber"}`} style={{ cursor: "pointer", padding: "5px 12px" }}>
                  {item.label} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="adm-stat-grid">
        {stats.map((s) => (
          <div className="adm-stat" key={s.label}>
            <div className={`adm-stat-icon adm-stat-icon-${s.tone}`}>
              <s.icon size={18} />
            </div>
            <div className="adm-stat-val">{s.value.toLocaleString()}</div>
            <div className="adm-stat-lbl">{s.label}</div>
            <div className="adm-stat-change" style={{ color: "var(--adm-muted)", fontWeight: 400, fontSize: 11.5 }}>{s.change}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Recent Clinics */}
        <div className="adm-card">
          <div className="adm-card-head">
            <div className="adm-card-title">Recent Clinics</div>
            <Link href="/admin/clinics" className="adm-btn adm-btn-ghost adm-btn-sm">View all</Link>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>Clinic</th><th>Plan</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recentClinics.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/clinics/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{c._count.patients}p · {c._count.appointments}a</div>
                      </Link>
                    </td>
                    <td><span className="adm-badge adm-badge-forest" style={{ fontSize: 11 }}>{c.subscription?.plan?.name || "Trial"}</span></td>
                    <td>
                      <span className={`adm-badge ${c.status === "ACTIVE" ? "adm-badge-green" : "adm-badge-red"}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentClinics.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--adm-muted)", padding: "24px" }}>No clinics yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Users */}
        <div className="adm-card">
          <div className="adm-card-head">
            <div className="adm-card-title">Recent Users</div>
            <Link href="/admin/users" className="adm-btn adm-btn-ghost adm-btn-sm">View all</Link>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{u.email}</div>
                    </td>
                    <td>
                      <span className={`adm-badge ${u.platformRole === "SUPER_ADMIN" ? "adm-badge-forest" : "adm-badge-gray"}`}>
                        {u.platformRole === "SUPER_ADMIN" ? <><ShieldCheck size={10} /> Super Admin</> : "User"}
                      </span>
                    </td>
                    <td className="adm-mono" style={{ fontSize: 12.5, color: "var(--adm-muted)" }}>
                      {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: "center", color: "var(--adm-muted)", padding: "24px" }}>No users yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
