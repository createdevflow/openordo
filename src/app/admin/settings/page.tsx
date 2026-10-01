import { db } from "@/lib/db"
import { SettingsShell } from "./SettingsShell"
import { getWhatsAppSettings, getWhatsAppTemplateMappings, getWhatsAppActivitySummary } from "@/server/actions/admin/whatsapp-settings"
import { getSmsSettings } from "@/server/actions/admin/sms-settings"
import { maskToken } from "@/lib/crypto"

import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Global Settings",
}

export default async function AdminSettingsPage(props: { searchParams?: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams
  const initialTab = searchParams?.tab || "global"
  const [flags, features, plans, settingsList, videoSetting, baaTemplateVersions, taxConfigs] = await Promise.all([
    db.platformFlag.findMany({ orderBy: [{ category: "asc" }, { label: "asc" }] }).catch(() => []),
    db.feature.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }).catch(() => []),
    db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }).catch(() => []),
    db.globalSetting.findMany().catch(() => []),
    db.globalSetting.findUnique({ where: { key: "demo_video_url" } }).catch(() => null),
    db.baaTemplateVersion.findMany({ orderBy: { publishedAt: "desc" } }).catch(() => []),
    db.taxCountryConfig.findMany({ orderBy: { countryName: 'asc' } }).catch(() => []),
  ])

  const [waSettings, waTemplates, waActivity, smsSettings] = await Promise.all([
    getWhatsAppSettings(),
    getWhatsAppTemplateMappings(),
    getWhatsAppActivitySummary(),
    getSmsSettings(),
  ])

  const sensitiveKeys = ["RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "AUTH_GOOGLE_SECRET", "SMTP_PASS"]
  const globalSettings = settingsList.reduce((acc: Record<string, string>, s) => {
    if (sensitiveKeys.includes(s.key)) {
      acc[s.key] = maskToken(s.value)
    } else {
      acc[s.key] = s.value
    }
    return acc
  }, {})

  // Fetch admin user info from settings (stored as a special flag for now)
  const adminEmail = process.env.ADMIN_EMAIL || "admin@citc.biz"

  return (
    <SettingsShell
      flags={flags}
      features={features}
      plans={plans}
      globalSettings={globalSettings}
      adminEmail={adminEmail}
      waSettings={waSettings}
      waTemplates={waTemplates}
      waActivity={waActivity}
      smsSettings={smsSettings}
      initialTab={initialTab}
      baaTemplateVersions={baaTemplateVersions}
      taxConfigs={taxConfigs}
    />
  )
}
