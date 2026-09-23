import { db } from "@/lib/db"
import { RequestDemoClient } from "./RequestDemoClient"

export const metadata = {
  title: "Request a Demo | OpenORDO",
  description: "Request a demo of OpenORDO Practice Management software."
}

export default async function RequestDemoPage() {
  const videoSetting = await db.globalSetting.findUnique({ where: { key: "demo_video_url" } })
  const videoUrl = videoSetting?.value || null

  return (
    <RequestDemoClient videoUrl={videoUrl} />
  )
}
