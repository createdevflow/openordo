import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { PluginForm } from "../PluginForm"

export default async function EditPluginPage({ params }: { params: Promise<{ pluginId: string }> }) {
  const { pluginId } = await params
  const plugin = await db.plugin.findUnique({ where: { id: pluginId } })
  if (!plugin) notFound()
  return <PluginForm plugin={plugin} />
}
