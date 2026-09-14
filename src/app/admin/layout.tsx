import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminShellClient } from "./AdminShellClient"
import "../admin.css"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user || session.user.platformRole !== "SUPER_ADMIN") {
    return redirect("/login")
  }

  return (
    <AdminShellClient
      session={{ email: session.user.email, name: session.user.name }}
    >
      {children}
    </AdminShellClient>
  )
}
