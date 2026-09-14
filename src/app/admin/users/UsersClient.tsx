"use client"

import { useState } from "react"
import { Users, Search, Trash2, ShieldCheck, User, Plus, Ban, CheckCircle, RefreshCcw, Key, Eye } from "lucide-react"
import { toast } from "sonner"
import { banUser, unbanUser, softDeleteUser, restoreUser, hardDeleteUser, createUser, changeUserPassword } from "@/server/actions/admin/users"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { AdminMenu } from "@/components/ui/AdminMenu"
import Link from "next/link"

export function UsersClient({ users }: { users: any[] }) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const { confirm } = useConfirm()

  const [showAddUser, setShowAddUser] = useState(false)
  const [newUser, setNewUser] = useState({ name: "", email: "", username: "", password: "", platformRole: "USER" })

  const [showChangePwd, setShowChangePwd] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const filtered = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "ALL" || u.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleBan = async (userId: string, isBanned: boolean) => {
    const ok = await confirm({
      title: isBanned ? "Unban user?" : "Ban user?",
      body: isBanned ? "User will be able to log in again." : "User will immediately be prevented from logging in.",
      tone: isBanned ? "primary" : "danger",
    })
    if (!ok) return
    toast.promise(
      isBanned ? unbanUser(userId) : banUser(userId),
      {
        loading: "Updating...",
        success: (res: any) => { if (!res.ok) throw new Error(res.error); return isBanned ? "User unbanned" : "User banned" },
        error: (err: any) => err.message || "Failed to update",
      }
    )
  }

  const handleSoftDelete = async (userId: string) => {
    const ok = await confirm({
      title: "Soft delete account?",
      body: "User will be deactivated and marked as deleted. Data will be kept for 30 days.",
      tone: "danger",
    })
    if (!ok) return
    toast.promise(softDeleteUser(userId), {
      loading: "Deleting...",
      success: (res: any) => { if (!res.ok) throw new Error(res.error); return "User soft deleted" },
      error: "Failed to delete",
    })
  }

  const handleRestore = async (userId: string) => {
    const ok = await confirm({
      title: "Restore account?",
      body: "User will be restored to active status.",
      tone: "primary",
    })
    if (!ok) return
    toast.promise(restoreUser(userId), {
      loading: "Restoring...",
      success: (res: any) => { if (!res.ok) throw new Error(res.error); return "User restored" },
      error: "Failed to restore",
    })
  }

  const handleHardDelete = async (userId: string) => {
    const ok = await confirm({
      title: "Hard delete account?",
      body: "WARNING: This is permanent. All data associated with this user will be deleted immediately.",
      tone: "danger",
      confirmLabel: "Hard Delete",
      verifyString: "delete"
    })
    if (!ok) return
    toast.promise(hardDeleteUser(userId), {
      loading: "Deleting...",
      success: (res: any) => { if (!res.ok) throw new Error(res.error); return "User permanently deleted" },
      error: "Failed to delete",
    })
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newUser.name || !newUser.email || !newUser.username) return
    toast.promise(createUser(newUser), {
      loading: "Creating...",
      success: (res: any) => {
        if (!res.ok) throw new Error(res.error)
        setShowAddUser(false)
        setNewUser({ name: "", email: "", username: "", password: "", platformRole: "USER" })
        return "User created"
      },
      error: (err: any) => err.message || "Failed to create",
    })
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showChangePwd || !newPassword) return
    toast.promise(changeUserPassword(showChangePwd, newPassword), {
      loading: "Updating password...",
      success: (res: any) => {
        if (!res.ok) throw new Error(res.error)
        setShowChangePwd(null)
        setNewPassword("")
        return "Password updated"
      },
      error: (err: any) => err.message || "Failed to update",
    })
  }

  const statusCounts = {
    ALL: users.length,
    ACTIVE: users.filter(u => u.status === "ACTIVE").length,
    BANNED: users.filter(u => u.status === "BANNED").length,
    SOFT_DELETED: users.filter(u => u.status === "SOFT_DELETED").length,
  }

  return (
    <div>
      <div className="adm-page-head" style={{ display: "flex", justifyContent: "space-between" }}>
        <h1 className="adm-page-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Users size={22} /> Users
          <span className="adm-badge adm-badge-gray" style={{ fontSize: 13 }}>{users.length}</span>
        </h1>
        <button className="adm-btn adm-btn-primary" onClick={() => setShowAddUser(true)}>
          <Plus size={14} /> Add User
        </button>
      </div>

      {showAddUser && (
        <div style={{ background: "var(--adm-bg)", border: "1px solid var(--adm-border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div className="adm-section-label" style={{ marginBottom: 16 }}>New User</div>
          <form onSubmit={handleAddUser}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label className="adm-label">Name</label>
                <input className="adm-input" required value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="adm-label">Email</label>
                <input className="adm-input" type="email" required value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div>
                <label className="adm-label">Username</label>
                <input className="adm-input" required value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
              </div>
              <div>
                <label className="adm-label">Password</label>
                <input className="adm-input" type="password" required value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" className="adm-btn adm-btn-primary">Create User</button>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setShowAddUser(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showChangePwd && (
        <div style={{ background: "var(--adm-bg)", border: "1px solid var(--adm-border)", borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div className="adm-section-label" style={{ marginBottom: 16 }}>Change Password</div>
          <form onSubmit={handleChangePassword}>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label className="adm-label">New Password</label>
                <input className="adm-input" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <button type="submit" className="adm-btn adm-btn-primary">Update Password</button>
              <button type="button" className="adm-btn adm-btn-ghost" onClick={() => { setShowChangePwd(null); setNewPassword(""); }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="adm-card">
        <div className="adm-filter-row">
          {[
            { key: "ALL", label: `All (${statusCounts.ALL})` },
            { key: "ACTIVE", label: `Active (${statusCounts.ACTIVE})` },
            { key: "BANNED", label: `Banned (${statusCounts.BANNED})`, tone: "coral" },
            { key: "SOFT_DELETED", label: `Deleted (${statusCounts.SOFT_DELETED})`, tone: "amber" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`adm-filter-chip${statusFilter === f.key ? " active" : ""}${f.tone ? ` ${f.tone}` : ""}`}
            >
              {f.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={14} color="var(--adm-muted)" />
            <input
              className="adm-search-input"
              placeholder="Search users…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
            />
          </div>
        </div>

        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>Clinic</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: "50%",
                        background: u.platformRole === "SUPER_ADMIN"
                          ? "rgba(30,70,56,0.12)" : "rgba(92,122,103,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                        color: u.platformRole === "SUPER_ADMIN" ? "var(--adm-accent)" : "var(--adm-muted)",
                      }}>
                        {u.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
                          <Link href={`/admin/users/${u.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                            {u.name}
                          </Link>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "var(--adm-muted)" }} className="adm-mono">
                    @{u.username}
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {u.memberships?.[0]?.clinic?.name || (
                      <span style={{ color: "var(--adm-muted)" }}>No clinic</span>
                    )}
                  </td>
                  <td>
                    <span className={`adm-badge ${u.status === "ACTIVE" ? "adm-badge-green" : u.status === "BANNED" ? "adm-badge-red" : "adm-badge-amber"}`}>
                      {u.status === "ACTIVE" ? <CheckCircle size={11} /> : u.status === "BANNED" ? <Ban size={11} /> : <Trash2 size={11} />}
                      {u.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12.5, color: "var(--adm-muted)", whiteSpace: "nowrap" }} className="adm-mono">
                    {new Date(u.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <AdminMenu actions={[
                      {
                        label: "View Profile",
                        icon: <Eye size={14} />,
                        onSelect: () => window.location.href = `/admin/users/${u.id}`,
                      },
                      {
                        label: "Change Password",
                        icon: <Key size={14} />,
                        onSelect: () => setShowChangePwd(u.id),
                        separator: true,
                      },
                      {
                        label: u.status === "BANNED" ? "Unban User" : "Ban User",
                        icon: u.status === "BANNED" ? <CheckCircle size={14} /> : <Ban size={14} />,
                        tone: u.status === "BANNED" ? "default" : "warning",
                        onSelect: () => handleBan(u.id, u.status === "BANNED"),
                      },
                      {
                        label: u.status === "SOFT_DELETED" ? "Restore User" : "Soft Delete",
                        icon: u.status === "SOFT_DELETED" ? <RefreshCcw size={14} /> : <Trash2 size={14} />,
                        tone: u.status === "SOFT_DELETED" ? "default" : "danger",
                        onSelect: () => u.status === "SOFT_DELETED" ? handleRestore(u.id) : handleSoftDelete(u.id),
                        separator: true,
                      },
                      {
                        label: "Hard Delete",
                        icon: <Trash2 size={14} />,
                        tone: "danger",
                        onSelect: () => handleHardDelete(u.id),
                      },
                    ]} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "48px", color: "var(--adm-muted)" }}>
                    {search ? "No users match your search." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
