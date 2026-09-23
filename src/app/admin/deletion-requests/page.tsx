import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ActionButtons from "./ActionButtons"
import { Chip } from "@/components/ui/Chip"

export const metadata = {
  title: "Deletion Requests - Admin",
}

export default async function DeletionRequestsPage() {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") redirect("/login")

  // @ts-ignore
  const requests = await db.accountDeletionRequest.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Pre-fetch all associated users
  const emails = requests.map((req: any) => req.email)
  const users = await db.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true, status: true, deletedAt: true },
  })

  const userMap = new Map(users.map(u => [u.email, u]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Account Deletion Requests</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review and process requests from users who want to delete their accounts. 
          Approving a request will soft-delete the user for 30 days before permanent deletion.
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Account Found</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reason</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested At</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                    No deletion requests found.
                  </td>
                </tr>
              ) : (
                requests.map((request: any) => {
                  const user = userMap.get(request.email)
                  
                  return (
                    <tr key={request.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {request.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {user ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900">{user.name}</span>
                            <span className="text-xs">{user.id}</span>
                            <span className="text-xs mt-1">
                              <Chip
                                color={user.status === "ACTIVE" ? "green" : user.status === "SOFT_DELETED" ? "red" : "gray"}
                              >
                                {user.status}
                              </Chip>
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No account found</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Chip
                          color={
                            request.status === "PENDING" ? "yellow" :
                            request.status === "APPROVED" ? "green" : "red"
                          }
                        >
                          {request.status}
                        </Chip>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {request.status === "PENDING" && (
                          <ActionButtons requestId={request.id} hasUser={!!user} />
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
