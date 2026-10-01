import { db } from "@/lib/db"
import { BaaRequestsClient } from "./BaaRequestsClient"

export default async function AdminBaaRequestsPage() {
  const [requests, currentTemplate, settingsList] = await Promise.all([
    db.baaRequest.findMany({
      include: {
        clinic: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { requestedAt: "desc" }
    }),
    db.baaTemplateVersion.findFirst({
      where: { isCurrent: true },
    }),
    db.globalSetting.findMany()
  ])

  const globalSettings = settingsList.reduce((acc: any, s) => {
    acc[s.key] = s.value
    return acc
  }, {})

  return <BaaRequestsClient requests={requests} currentTemplate={currentTemplate} globalSettings={globalSettings} />
}
