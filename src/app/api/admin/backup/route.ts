import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { ZipArchive } from "archiver"
import * as path from "path"
import * as fs from "fs/promises"
import { existsSync } from "fs"

export const dynamic = "force-dynamic"
export const maxDuration = 120

function formatSqlValue(val: any): string {
  if (val === null || val === undefined) return "NULL"
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE"
  if (typeof val === "number") return Number.isFinite(val) ? String(val) : "NULL"
  if (val instanceof Date) return `'${val.toISOString()}'`
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
  }
  return `'${String(val).replace(/'/g, "''")}'`
}

function tableToSql(tableName: string, rows: any[]): string {
  if (!rows || rows.length === 0) return `-- No records for "${tableName}"\n`
  const lines: string[] = [`-- Table: "${tableName}" (${rows.length} rows)`]
  for (const row of rows) {
    const keys = Object.keys(row).filter(k => typeof row[k] !== "function")
    const cols = keys.map(k => `"${k}"`).join(", ")
    const vals = keys.map(k => formatSqlValue(row[k])).join(", ")
    lines.push(`INSERT INTO "${tableName}" (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;`)
  }
  return lines.join("\n") + "\n"
}

function generateSqlDump(tables: Record<string, any[]>): string {
  const header = [
    `-- ==============================================================`,
    `-- OpenORDO PostgreSQL Database Backup`,
    `-- Generated at: ${new Date().toISOString()}`,
    `-- Note: Safe for restoration with ON CONFLICT DO NOTHING`,
    `-- ==============================================================\n`,
    `BEGIN;`,
    `SET CONSTRAINTS ALL DEFERRED;\n`,
  ].join("\n")

  const footer = `\nCOMMIT;\n`

  const orderedTables = [
    "User",
    "Clinic",
    "Membership",
    "Plan",
    "Feature",
    "PlanFeature",
    "Subscription",
    "Doctor",
    "Patient",
    "Appointment",
    "Invoice",
    "Payment",
    "Plugin",
    "ClinicPlugin",
    "PlatformFlag",
    "Promo",
    "ContactLead",
    "BookingPageConfig",
    "AuditLogEntry",
  ]

  const sections: string[] = []
  for (const table of orderedTables) {
    if (tables[table]) {
      sections.push(tableToSql(table, tables[table]))
    }
  }

  for (const [table, rows] of Object.entries(tables)) {
    if (!orderedTables.includes(table)) {
      sections.push(tableToSql(table, rows))
    }
  }

  return header + sections.join("\n") + footer
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user || session.user.platformRole !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get("format") || "json"

  try {
    // Fetch all core tables safely
    const [
      users,
      clinics,
      subscriptions,
      plans,
      features,
      planFeatures,
      patients,
      appointments,
      invoices,
      payments,
      doctors,
      plugins,
      clinicPlugins,
      flags,
      globalSettings,
      promotions,
      leads,
      auditLogs,
      memberships,
      bookingPageConfigs,
    ] = await Promise.all([
      db.user.findMany({ select: { id: true, name: true, email: true, username: true, platformRole: true, status: true, createdAt: true } }),
      db.clinic.findMany(),
      db.subscription.findMany(),
      db.plan.findMany(),
      db.feature.findMany(),
      db.planFeature.findMany(),
      db.patient.findMany(),
      db.appointment.findMany(),
      db.invoice.findMany().catch(() => []),
      db.payment.findMany().catch(() => []),
      db.doctor.findMany(),
      db.plugin.findMany().catch(() => []),
      db.clinicPlugin.findMany().catch(() => []),
      db.platformFlag.findMany().catch(() => []),
      db.globalSetting.findMany().then(rows => rows.map((s: any) => ({ key: s.key, updatedAt: s.updatedAt }))).catch(() => []),
      db.promo.findMany().catch(() => []),
      db.contactLead.findMany().catch(() => []),
      db.auditLogEntry.findMany({ take: 10000, orderBy: { createdAt: "desc" } }).catch(() => []),
      db.membership.findMany().catch(() => []),
      db.bookingPageConfig.findMany().catch(() => []),
    ])

    const backupData = {
      meta: {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        platform: "OpenORDO",
        recordCounts: {
          users: users.length,
          clinics: clinics.length,
          subscriptions: subscriptions.length,
          plans: plans.length,
          patients: patients.length,
          appointments: appointments.length,
          invoices: invoices.length,
          payments: payments.length,
          doctors: doctors.length,
          auditLogs: auditLogs.length,
        }
      },
      users,
      clinics,
      memberships,
      subscriptions,
      plans,
      features,
      planFeatures,
      patients,
      appointments,
      invoices,
      payments,
      doctors,
      plugins,
      clinicPlugins,
      flags,
      globalSettings,
      promotions,
      leads,
      auditLogs,
      bookingPageConfigs,
    }

    const tableMap: Record<string, any[]> = {
      User: users,
      Clinic: clinics,
      Membership: memberships,
      Subscription: subscriptions,
      Plan: plans,
      Feature: features,
      PlanFeature: planFeatures,
      Patient: patients,
      Appointment: appointments,
      Invoice: invoices,
      Payment: payments,
      Doctor: doctors,
      Plugin: plugins,
      ClinicPlugin: clinicPlugins,
      PlatformFlag: flags,
      Promo: promotions,
      ContactLead: leads,
      BookingPageConfig: bookingPageConfigs,
      AuditLogEntry: auditLogs,
    }

    const jsonStr = JSON.stringify(backupData, null, 2)
    const dateStr = new Date().toISOString().split("T")[0]

    if (format === "sql") {
      const sqlStr = generateSqlDump(tableMap)
      return new NextResponse(sqlStr, {
        headers: {
          "Content-Type": "application/sql",
          "Content-Disposition": `attachment; filename="openordo-backup-${dateStr}.sql"`,
        },
      })
    }

    if (format === "zip") {
      const sqlStr = generateSqlDump(tableMap)
      const archive = new ZipArchive({ zlib: { level: 6 } })
      const readableStream = new ReadableStream({
        start(controller) {
          archive.on("data", (chunk: any) => controller.enqueue(chunk))
          archive.on("end", () => controller.close())
          archive.on("error", (err: any) => controller.error(err))
        }
      })

      ;(async () => {
        // Add SQL dump
        archive.append(Buffer.from(sqlStr), { name: "database-backup.sql" })

        // Add JSON dump
        archive.append(Buffer.from(jsonStr), { name: "database-backup.json" })

        // Add uploaded files if directory exists
        const uploadsDir = path.join(process.cwd(), "private_uploads")
        if (existsSync(uploadsDir)) {
          const walkDir = async (dir: string, prefix: string) => {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name)
              const entryName = `${prefix}/${entry.name}`
              if (entry.isDirectory()) {
                await walkDir(fullPath, entryName)
              } else {
                try {
                  const buf = await fs.readFile(fullPath)
                  archive.append(buf, { name: entryName })
                } catch {}
              }
            }
          }
          await walkDir(uploadsDir, "uploads")
        }

        // Also check public/uploads
        const publicUploads = path.join(process.cwd(), "public", "uploads")
        if (existsSync(publicUploads)) {
          const walkDir = async (dir: string, prefix: string) => {
            const entries = await fs.readdir(dir, { withFileTypes: true })
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name)
              const entryName = `${prefix}/${entry.name}`
              if (entry.isDirectory()) {
                await walkDir(fullPath, entryName)
              } else {
                try {
                  const buf = await fs.readFile(fullPath)
                  archive.append(buf, { name: entryName })
                } catch {}
              }
            }
          }
          await walkDir(publicUploads, "public_uploads")
        }

        archive.finalize()
      })()

      return new NextResponse(readableStream as any, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="openordo-backup-${dateStr}.zip"`,
        },
      })
    } else {
      // Plain JSON download
      return new NextResponse(jsonStr, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="openordo-backup-${dateStr}.json"`,
        },
      })
    }
  } catch (err: any) {
    console.error("Backup error:", err)
    return NextResponse.json({ error: err.message || "Backup failed" }, { status: 500 })
  }
}
