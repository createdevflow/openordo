import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, User, Building2, Calendar, ShieldCheck } from "lucide-react"

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const user = await db.user.findUnique({
    where: { id },
    include: {
      memberships: {
        include: { clinic: true },
      },
    },
  })

  if (!user) notFound()

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

        {/* Memberships */}
        <div className="adm-card">
          <div className="adm-card-head"><div className="adm-card-title">Clinic Memberships</div></div>
          {user.memberships.length === 0 ? (
            <div style={{ padding: 20, color: "var(--adm-muted)", fontSize: 13.5 }}>
              This user does not belong to any clinics.
            </div>
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead><tr><th>Clinic</th><th>Role</th><th>Joined</th></tr></thead>
                <tbody>
                  {user.memberships.map((m: any) => (
                    <tr key={m.id}>
                      <td>
                        <Link href={`/admin/clinics/${m.clinic.id}`} style={{ fontWeight: 600, fontSize: 13, textDecoration: "none", color: "var(--adm-accent)" }}>
                          {m.clinic.name}
                        </Link>
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
          )}
        </div>
      </div>
    </div>
  )
}
