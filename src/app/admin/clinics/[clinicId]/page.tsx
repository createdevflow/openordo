import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, Users, Calendar, FileText } from "lucide-react"

export default async function AdminClinicDetailPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const { clinicId } = await params

  const clinic = await db.clinic.findUnique({
    where: { id: clinicId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, platformRole: true, createdAt: true } } },
        orderBy: { createdAt: "asc" },
      },
      subscription: {
        include: { plan: true },
      },
      _count: {
        select: { patients: true, appointments: true, invoices: true, doctors: true },
      },
    },
  })

  if (!clinic) notFound()

  const recentPayments = await db.payment.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  const recentAuditLogs = await db.auditLogEntry.findMany({
    where: { targetId: clinicId },
    orderBy: { createdAt: "desc" },
    take: 10,
  })

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <Link href="/admin/clinics" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--adm-muted)", textDecoration: "none", marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Clinics
          </Link>
          <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={22} /> {clinic.name}
            <span className={`adm-badge ${clinic.status === "ACTIVE" ? "adm-badge-green" : "adm-badge-red"}`} style={{ fontSize: 12 }}>
              {clinic.status}
            </span>
          </h1>
          <div style={{ fontSize: 13, color: "var(--adm-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            /{clinic.slug} · {clinic.type} · {clinic.country}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="adm-stat-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 20 }}>
        {[
          { label: "Patients", val: clinic._count.patients, icon: <Users size={18} />, tone: "forest" },
          { label: "Appointments", val: clinic._count.appointments, icon: <Calendar size={18} />, tone: "blue" },
          { label: "Doctors", val: clinic._count.doctors, icon: <Users size={18} />, tone: "amber" },
          { label: "Invoices", val: clinic._count.invoices, icon: <FileText size={18} />, tone: "coral" },
        ].map(s => (
          <div key={s.label} className="adm-stat">
            <div className={`adm-stat-icon adm-stat-icon-${s.tone}`}>{s.icon}</div>
            <div className="adm-stat-val">{s.val}</div>
            <div className="adm-stat-lbl">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Members */}
        <div className="adm-card">
          <div className="adm-card-head"><div className="adm-card-title">Team Members</div></div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>User</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {clinic.memberships.map((m: any) => (
                  <tr key={m.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.user.name}</div>
                      <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{m.user.email}</div>
                    </td>
                    <td><span className="adm-badge adm-badge-forest">{m.role}</span></td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">
                      {new Date(m.createdAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subscription */}
        <div className="adm-card">
          <div className="adm-card-head"><div className="adm-card-title">Subscription</div></div>
          <div style={{ padding: 20 }}>
            {clinic.subscription ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{clinic.subscription.plan.name}</div>
                    <div style={{ fontSize: 13, color: "var(--adm-muted)" }}>
                      {clinic.subscription.billingCycle} · ${clinic.subscription.plan.priceMonthlyUsd} / ₹{clinic.subscription.plan.priceMonthlyInr}
                    </div>
                  </div>
                  <span className={`adm-badge ${
                    clinic.subscription.status === "ACTIVE" ? "adm-badge-green" :
                    clinic.subscription.status === "TRIALING" ? "adm-badge-blue" : "adm-badge-amber"
                  }`}>{clinic.subscription.status}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13.5 }}>
                  {clinic.subscription.trialEndsAt && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--adm-muted)" }}>Trial ends</span>
                      <span className="adm-mono">{new Date(clinic.subscription.trialEndsAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                  {clinic.subscription.currentPeriodEnd && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--adm-muted)" }}>Period ends</span>
                      <span className="adm-mono">{new Date(clinic.subscription.currentPeriodEnd).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                  {clinic.subscription.stripeCustomerId && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--adm-muted)" }}>Stripe customer</span>
                      <span className="adm-mono" style={{ fontSize: 12 }}>{clinic.subscription.stripeCustomerId}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ color: "var(--adm-muted)", fontSize: 13.5 }}>No subscription yet.</div>
            )}
          </div>

          {/* Recent payments */}
          {recentPayments.length > 0 && (
            <>
              <div style={{ borderTop: "1px solid var(--adm-border)", padding: "12px 20px 4px" }}>
                <div className="adm-section-label">Recent Payments</div>
              </div>
              {recentPayments.map((p: any) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 20px", borderTop: "1px solid var(--adm-border)" }}>
                  <span className={`adm-badge ${p.status === "succeeded" ? "adm-badge-green" : p.status === "failed" ? "adm-badge-red" : "adm-badge-gray"}`}>{p.status}</span>
                  <span style={{ fontWeight: 600, fontFamily: "var(--font-mono, monospace)", fontSize: 13.5 }}>
                    {(p.amount / 100).toLocaleString("en-IN", { style: "currency", currency: p.currency.toUpperCase() })}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--adm-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                    {new Date(p.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Audit log for this clinic */}
      {recentAuditLogs.length > 0 && (
        <div className="adm-card" style={{ marginTop: 20 }}>
          <div className="adm-card-head"><div className="adm-card-title">Admin Activity Log</div></div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Action</th><th>By</th><th>Timestamp</th><th>Details</th></tr></thead>
              <tbody>
                {recentAuditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td><span className="adm-badge adm-badge-blue">{log.action}</span></td>
                    <td style={{ fontSize: 12, fontFamily: "var(--font-mono, monospace)" }}>{log.actorUserId.slice(0, 8)}…</td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)", fontFamily: "var(--font-mono, monospace)" }}>
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)" }}>
                      {log.metadata && JSON.stringify(JSON.parse(log.metadata))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
