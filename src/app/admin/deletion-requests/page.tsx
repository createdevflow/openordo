import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DeletionRequestsClient } from "./DeletionRequestsClient"

export const metadata = {
  title: "Deletion Requests - Admin",
}

export default async function DeletionRequestsPage() {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") redirect("/login")

  // @ts-ignore
  const rawRequests = await db.accountDeletionRequest.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Pre-fetch all associated users
  const emails = rawRequests.map((req: any) => req.email)
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true, status: true },
  })

  const userMap = new Map(users.map(u => [u.email, u]))

  const initialRequests = rawRequests.map((req: any) => {
    const user = userMap.get(req.email)
    return {
      id: req.id,
      email: req.email,
      reason: req.reason || "",
      status: req.status,
      createdAt: req.createdAt.toISOString(),
      user: user ? {
        id: user.id,
        name: user.name,
        status: user.status,
      } : null,
    }
  })

  return <DeletionRequestsClient initialRequests={initialRequests} />
}
