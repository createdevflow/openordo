import { getDemoRequestsAction } from "@/server/actions/demo"
import { DemoRequestsClient } from "./DemoRequestsClient"

export const metadata = {
  title: "Demo Requests | Admin",
}

export default async function DemoRequestsPage() {
  const res = await getDemoRequestsAction()
  
  return <DemoRequestsClient initialRequests={res.requests || []} />
}
