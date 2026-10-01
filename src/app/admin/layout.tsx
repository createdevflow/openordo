import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { enforceStaffConsent } from "@/lib/auth-utils"
import { AdminShellClient } from "./AdminShellClient"
import "../admin.css"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: {
    template: "%s | OpenORDO Admin",
    default: "OpenORDO Admin",
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.platformRole !== "SUPER_ADMIN") {
    return redirect("/login")
  }

  await enforceStaffConsent(session.user.id)

  return (
    <AdminShellClient
      session={{ email: session.user.email, name: session.user.name }}
    >
      {children}
    </AdminShellClient>
  )
}
