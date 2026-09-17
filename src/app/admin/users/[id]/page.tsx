import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User, Building2, Calendar, ShieldCheck, Activity, CreditCard } from "lucide-react"
import { UserProfileActions } from "./UserProfileActions"

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [user, auditLogs] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { 
            clinic: {
              include: {
                subscription: { include: { plan: true } },
                clinicPlugins: { include: { plugin: true } },
                payments: { orderBy: { createdAt: "desc" }, take: 1 }
              }
            }
          },
        },
      },
    }),
    db.auditLogEntry.findMany({
      where: {
        OR: [
          { actorUserId: id },
          { targetId: id }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 100
    })
  ])

  if (!user) notFound()

  const primaryOwnerMembership = user.memberships.find(m => m.role === "OWNER")
  const primaryClinic = primaryOwnerMembership?.clinic

  return (
    <div>
      <div className="adm-page-head">
        <div>
          <Link href="/admin/users" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--adm-muted)", textDecoration: "none", marginBottom: 8 }}>
            <ArrowLeft size={14} /> Back to Users
          </Link>
          <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <User size={22} /> {user.name}
            <span className={`adm-badge ${user.status === "ACTIVE" ? "adm-badge-green" : user.status === "BANNED" ? "adm-badge-red" : "adm-badge-amber"}`} style={{ fontSize: 12 }}>
              {user.status}
            </span>
            {user.platformRole === "SUPER_ADMIN" && (
              <span className="adm-badge adm-badge-forest" style={{ fontSize: 12 }}>
                <ShieldCheck size={12} /> Super Admin
              </span>
            )}
          </h1>
          <div style={{ fontSize: 13, color: "var(--adm-muted)", fontFamily: "var(--font-mono, monospace)" }}>
            @{user.username} · {user.email}
          </div>
          <UserProfileActions user={{ id: user.id, username: user.username, status: user.status, deletedAt: user.deletedAt }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* User Info */}
        <div className="adm-card">
          <div className="adm-card-head"><div className="adm-card-title">Profile Information</div></div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                <span style={{ color: "var(--adm-muted)" }}>Name</span>
                <span>{user.name}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                <span style={{ color: "var(--adm-muted)" }}>Email</span>
                <span>{user.email}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                <span style={{ color: "var(--adm-muted)" }}>Username</span>
                <span className="adm-mono">@{user.username}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                <span style={{ color: "var(--adm-muted)" }}>Phone</span>
                <span>{user.phone || "—"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                <span style={{ color: "var(--adm-muted)" }}>Joined</span>
                <span className="adm-mono">{new Date(user.createdAt).toLocaleString("en-IN")}</span>
              </div>
              {user.deletedAt && (
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                  <span style={{ color: "var(--adm-danger)" }}>Deleted At</span>
                  <span className="adm-mono" style={{ color: "var(--adm-danger)" }}>{new Date(user.deletedAt).toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Billing & Subscription (if owner) */}
        {primaryClinic && (
          <div className="adm-card">
            <div className="adm-card-head"><div className="adm-card-title">Billing & Subscription</div></div>
            <div style={{ padding: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5 }}>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}>
                  <span style={{ color: "var(--adm-muted)" }}>Primary Clinic</span>
                  <Link href={`/admin/clinics/${primaryClinic.id}`} style={{ fontWeight: 600, color: "var(--adm-accent)", textDecoration: "none" }}>
                    {primaryClinic.name}
                  </Link>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}>
                  <span style={{ color: "var(--adm-muted)" }}>Payment Method</span>
                  <span>{primaryClinic.subscription?.stripeCustomerId ? "On File" : "None"}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}>
                  <span style={{ color: "var(--adm-muted)" }}>Autopay</span>
                  <span>{primaryClinic.subscription?.cancelAtPeriodEnd ? "Canceled" : "Active"}</span>
                </div>
                {primaryClinic.payments?.[0] && (
                  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr" }}>
                    <span style={{ color: "var(--adm-muted)" }}>Last Payment</span>
                    <span>
                      {(primaryClinic.payments[0].amount / 100).toLocaleString("en-US", { style: "currency", currency: primaryClinic.payments[0].currency })}
                      <span style={{ color: "var(--adm-muted)", marginLeft: 6 }}>
                        on {new Date(primaryClinic.payments[0].createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Memberships */}
      <div className="adm-card" style={{ marginTop: 20 }}>
        <div className="adm-card-head"><div className="adm-card-title">Clinic Memberships</div></div>
        {user.memberships.length === 0 ? (
          <div style={{ padding: 20, color: "var(--adm-muted)", fontSize: 13.5 }}>
            This user does not belong to any clinics.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Clinic</th>
                  <th>Role</th>
                  <th>Plan & Status</th>
                  <th>Billing Cycle</th>
                  <th>Plugins</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {user.memberships.map((m: any) => {
                  const sub = m.clinic.subscription
                  return (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/admin/clinics/${m.clinic.id}`} style={{ fontWeight: 600, fontSize: 13, textDecoration: "none", color: "var(--adm-accent)" }}>
                          {m.clinic.name}
                        </Link>
                      </td>
                      <td><span className="adm-badge adm-badge-forest">{m.role}</span></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{sub?.plan?.name || "Free"}</span>
                          {sub?.status === "TRIALING" ? (
                            <span className="adm-badge adm-badge-amber" style={{ width: "max-content" }}>
                              Trial (ends {new Date(sub.trialEndsAt).toLocaleDateString("en-IN")})
                            </span>
                          ) : sub?.status === "ACTIVE" ? (
                            <span className="adm-badge adm-badge-green" style={{ width: "max-content" }}>Active</span>
                          ) : sub?.status ? (
                            <span className="adm-badge adm-badge-gray" style={{ width: "max-content" }}>{sub.status}</span>
                          ) : null}
                        </div>
                      </td>
                      <td style={{ fontSize: 13, color: "var(--adm-muted)" }}>
                        {sub?.billingCycle === "yearly" ? "Yearly" : "Monthly"}
                        {sub?.currentPeriodEnd && (
                          <div style={{ fontSize: 11.5, marginTop: 4 }}>Renews {new Date(sub.currentPeriodEnd).toLocaleDateString("en-IN")}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {m.clinic.clinicPlugins?.filter((p: any) => p.status === "ACTIVE").map((cp: any) => (
                            <span key={cp.id} className="adm-badge adm-badge-gray" style={{ fontSize: 11 }}>
                              {cp.plugin.name}
                            </span>
                          ))}
                          {(!m.clinic.clinicPlugins || m.clinic.clinicPlugins.filter((p: any) => p.status === "ACTIVE").length === 0) && (
                            <span style={{ color: "var(--adm-soft)", fontSize: 13 }}>None</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">
                        {new Date(m.createdAt).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Activity Log */}
      <div className="adm-card" style={{ marginTop: 20 }}>
        <div className="adm-card-head"><div className="adm-card-title">Activity Log</div></div>
        {auditLogs.length === 0 ? (
          <div style={{ padding: 20, color: "var(--adm-muted)", fontSize: 13.5 }}>
            No activity found for this user.
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Timestamp</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log: any) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{log.action}</td>
                    <td style={{ fontSize: 13 }}>
                      {log.targetType}: <span className="adm-mono" style={{ color: "var(--adm-muted)" }}>{log.targetId}</span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">
                      {new Date(log.createdAt).toLocaleString("en-IN")}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">
                      {log.metadata ? JSON.stringify(JSON.parse(log.metadata)) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
