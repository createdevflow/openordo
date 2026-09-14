import { db } from "@/lib/db"
import { SettingsShell } from "./SettingsShell"

export default async function AdminSettingsPage() {
  const [flags, features, plans] = await Promise.all([
    db.platformFlag.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] }).catch(() => []),
    db.feature.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }).catch(() => []),
    db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
  ])

  // Fetch admin user info from settings (stored as a special flag for now)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@citc.biz"

  return (
    <SettingsShell
      flags={flags}
      features={features}
      plans={plans}
      adminEmail={adminEmail}
    />
  )
}
