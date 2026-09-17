import { db } from "@/lib/db"
import { UsersClient } from "./UsersClient"

export default async function AdminUsersPage() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      platformRole: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      activeClinicId: true,
      memberships: {
        include: { 
          clinic: { 
            select: { 
              name: true,
              subscription: {
                select: { status: true }
              }
            } 
          } 
        },
        take: 1
      }
    }
  })

  return <UsersClient users={users} />
}
