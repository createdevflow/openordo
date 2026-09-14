import { db } from "@/lib/db"
import { PluginsClient } from "./PluginsClient"

export default async function AdminPluginsPage() {
  const plugins = await db.plugin.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { clinicPlugins: { where: { status: "ACTIVE" } } } }
    }
  })

  return <PluginsClient plugins={plugins} />
}
