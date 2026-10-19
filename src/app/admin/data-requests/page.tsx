import React from "react"
import { adminGetDataRequestsAction } from "@/server/actions/data-export"
import { DataRequestsClient } from "./DataRequestsClient"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Data Export Requests | Admin",
}

export default async function AdminDataRequestsPage() {
  const requests = await adminGetDataRequestsAction()

  const serialized = requests.map((req: any) => ({
    id: req.id,
    status: req.status,
    downloadUrl: req.downloadUrl || null,
    createdAt: req.createdAt.toISOString(),
    patientAccount: {
      name: req.patientAccount.name,
      email: req.patientAccount.email,
    },
    clinic: {
      name: req.clinic.name,
    },
  }))

  return <DataRequestsClient initialRequests={serialized} />
}
