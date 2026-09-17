"use client"

import { useState } from "react"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"
import { banUser, unbanUser, softDeleteUser, restoreUser, hardDeleteUser, changeUserPassword } from "@/server/actions/admin/users"
import { Key, Ban, Trash2, CheckCircle, RefreshCcw } from "lucide-react"

export function UserProfileActions({
  user
}: {
  user: { id: string, username: string, status: string, deletedAt: Date | null }
}) {
  const { confirm } = useConfirm()
  const [showChangePwd, setShowChangePwd] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleBan = async (isBanned: boolean) => {
    const ok = await confirm({
      title: isBanned ? "Unban user?" : "Ban user?",
      body: isBanned ? "User will be able to log in again." : "User will immediately be prevented from logging in.",
      tone: isBanned ? "primary" : "danger",
    })
    if (!ok) return
    toast.promise(
      isBanned ? unbanUser(user.id) : banUser(user.id),
      {
        loading: "Updating...",
        success: (res: any) => { if (!res.ok) throw new Error(res.error); return isBanned ? "User unbanned" : "User banned" },
        error: (err: any) => err.message || "Failed to update",
      }
    )
  }

  const handleSoftDelete = async () => {
    const ok = await confirm({
      title: "Soft delete account?",
      body: "User will be deactivated and marked as deleted. Data will be kept for 30 days.",
      tone: "danger",
    })
    if (!ok) return
    toast.promise(softDeleteUser(user.id), {
      loading: "Deleting...",
      success: (res: any) => { if (!res.ok) throw new Error(res.error); return "User soft deleted" },
      error: (err: any) => err.message || "Failed to delete",
    })
  }

  const handleRestore = async () => {
    const ok = await confirm({
      title: "Restore account?",
      body: "User will be restored to active status.",
      tone: "primary",
    })
    if (!ok) return
    toast.promise(restoreUser(user.id), {
      loading: "Restoring...",
      success: (res: any) => { if (!res.ok) throw new Error(res.error); return "User restored" },
      error: (err: any) => err.message || "Failed to restore",
    })
  }

  const handleHardDelete = async () => {
    const ok = await confirm({
      title: "Hard delete account?",
      body: "WARNING: This is permanent. All data associated with this user will be deleted immediately.",
      tone: "danger",
      confirmLabel: "Hard Delete",
      verifyString: user.username
    })
    if (!ok) return
    toast.promise(hardDeleteUser(user.id), {
      loading: "Deleting...",
      success: (res: any) => {
        if (!res.ok) throw new Error(res.error)
        window.location.href = "/admin/users"
        return "User permanently deleted"
      },
      error: (err: any) => err.message || "Failed to delete",
    })
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return
    setIsSubmitting(true)
    const res = await changeUserPassword(user.id, newPassword)
    setIsSubmitting(false)
    if (!res.ok) {
      toast.error(res.error || "Failed to update password")
    } else {
      toast.success("Password updated")
      setShowChangePwd(false)
      setNewPassword("")
    }
  }

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
      <button className="adm-btn adm-btn-ghost" onClick={() => setShowChangePwd(true)}>
        <Key size={14} /> Change Password
      </button>

      {user.status === "BANNED" ? (
        <button className="adm-btn adm-btn-ghost" onClick={() => handleBan(true)}>
          <CheckCircle size={14} /> Unban User
        </button>
      ) : (
        <button className="adm-btn adm-btn-ghost" onClick={() => handleBan(false)}>
          <Ban size={14} /> Ban User
        </button>
      )}

      {user.status === "SOFT_DELETED" ? (
        <button className="adm-btn adm-btn-ghost" onClick={handleRestore}>
          <RefreshCcw size={14} /> Restore User
        </button>
      ) : (
        <button className="adm-btn adm-btn-ghost" onClick={handleSoftDelete} style={{ color: "var(--adm-danger)" }}>
          <Trash2 size={14} /> Soft Delete
        </button>
      )}

      <button className="adm-btn adm-btn-danger" onClick={handleHardDelete}>
        <Trash2 size={14} /> Hard Delete
      </button>

      {showChangePwd && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{ background: "var(--adm-bg)", borderRadius: 10, padding: 24, width: 400, border: "1px solid var(--adm-border)" }}>
            <div className="adm-section-label" style={{ marginBottom: 16 }}>Change Password for @{user.username}</div>
            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: 16 }}>
                <label className="adm-label">New Password</label>
                <input className="adm-input" type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setShowChangePwd(false)}>Cancel</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={isSubmitting}>Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
