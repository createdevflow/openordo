"use client"

import { useState } from "react"
import { Download, Database, FolderArchive, RefreshCw, CheckCircle, AlertTriangle, FileJson, Terminal } from "lucide-react"

export function BackupTab() {
  const [isDownloading, setIsDownloading] = useState<"sql" | "json" | "zip" | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async (format: "sql" | "json" | "zip") => {
    setIsDownloading(format)
    setError(null)
    try {
      const res = await fetch(`/api/admin/backup?format=${format}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Download failed")
      }
      const blob = await res.blob()
      const contentDisposition = res.headers.get("Content-Disposition") || ""
      const match = contentDisposition.match(/filename="(.+?)"/)
      const filename = match?.[1] || `openordo-backup.${format}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setLastBackup(`${new Date().toLocaleString("en-IN")} (${format.toUpperCase()})`)
    } catch (err: any) {
      setError(err.message || "Backup failed. Please try again.")
    } finally {
      setIsDownloading(null)
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Header */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 6 }}>Backup &amp; Disaster Recovery</div>
        <p style={{ fontSize: 13.5, color: "var(--adm-muted)", margin: 0, lineHeight: 1.6 }}>
          Download an instant snapshot of your entire platform. You can export clean PostgreSQL INSERT scripts
          for one-click database restoration, structured JSON dumps, or a comprehensive ZIP bundle that includes
          all uploaded files and media.
        </p>
      </div>

      {/* Info box */}
      <div className="adm-info-box" style={{ gap: 12, alignItems: "flex-start" }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <strong>Security notice:</strong> Backups contain patient records, appointments, and clinic metadata.
          Store them in an encrypted, access-restricted environment. Third-party API secret keys (Razorpay secrets, SMTP passwords)
          are intentionally excluded from dumps for security.
        </div>
      </div>

      {/* Download options */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* SQL Option */}
        <div style={{
          border: "1px solid var(--adm-border)",
          borderRadius: 12,
          padding: 20,
          background: "var(--adm-card)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--adm-accent-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--adm-accent)"
            }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Database SQL Dump</div>
              <div style={{ fontSize: 12.5, color: "var(--adm-muted)" }}>PostgreSQL script (.sql)</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--adm-muted)", margin: 0, lineHeight: 1.5 }}>
            Executable SQL file with standard transactional <code style={{ background: "var(--adm-bg)", padding: "2px 4px", borderRadius: 4 }}>INSERT</code> statements
            and deferred constraint handling.
          </p>
          <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12.5, color: "var(--adm-muted)", lineHeight: 1.8 }}>
            <li>Direct restore: <code style={{ fontSize: 11 }}>psql &lt; backup.sql</code></li>
            <li>Safe <code style={{ fontSize: 11 }}>ON CONFLICT DO NOTHING</code></li>
            <li>Parent-child table dependency ordering</li>
            <li>Ready for PostgreSQL disaster restore</li>
          </ul>
          <button
            className="adm-btn adm-btn-primary"
            onClick={() => handleDownload("sql")}
            disabled={isDownloading !== null}
            style={{ marginTop: "auto" }}
          >
            {isDownloading === "sql" ? (
              <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating SQL…</>
            ) : (
              <><Database size={14} /> Download SQL</>
            )}
          </button>
        </div>

        {/* JSON Option */}
        <div style={{
          border: "1px solid var(--adm-border)",
          borderRadius: 12,
          padding: 20,
          background: "var(--adm-card)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "rgba(30, 144, 255, 0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#0284c7"
            }}>
              <FileJson size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>JSON Snapshot</div>
              <div style={{ fontSize: 12.5, color: "var(--adm-muted)" }}>Structured data (.json)</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--adm-muted)", margin: 0, lineHeight: 1.5 }}>
            Structured raw JSON format containing all table records. Perfect for data analysis, scripts,
            and custom migrations.
          </p>
          <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12.5, color: "var(--adm-muted)", lineHeight: 1.8 }}>
            <li>Human-readable JSON structure</li>
            <li>Record counts and metadata manifest</li>
            <li>Universal cross-platform format</li>
            <li>Compact and quick download</li>
          </ul>
          <button
            className="adm-btn adm-btn-ghost"
            onClick={() => handleDownload("json")}
            disabled={isDownloading !== null}
            style={{ marginTop: "auto", border: "1px solid var(--adm-border)" }}
          >
            {isDownloading === "json" ? (
              <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Generating JSON…</>
            ) : (
              <><Download size={14} /> Download JSON</>
            )}
          </button>
        </div>

        {/* ZIP Option */}
        <div style={{
          border: "1px solid var(--adm-border)",
          borderRadius: 12,
          padding: 20,
          background: "var(--adm-card)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: "var(--adm-amber-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--adm-amber)"
            }}>
              <FolderArchive size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>Full Platform Archive</div>
              <div style={{ fontSize: 12.5, color: "var(--adm-muted)" }}>Database + Uploads (.zip)</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "var(--adm-muted)", margin: 0, lineHeight: 1.5 }}>
            Complete platform backup: bundles both SQL and JSON database backups along with all clinic-uploaded
            files and media.
          </p>
          <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12.5, color: "var(--adm-muted)", lineHeight: 1.8 }}>
            <li>Includes <code style={{ fontSize: 11 }}>database-backup.sql</code></li>
            <li>Includes <code style={{ fontSize: 11 }}>database-backup.json</code></li>
            <li>All patient documents &amp; media assets</li>
            <li>Complete standalone disaster archive</li>
          </ul>
          <button
            className="adm-btn adm-btn-amber"
            onClick={() => handleDownload("zip")}
            disabled={isDownloading !== null}
            style={{ marginTop: "auto" }}
          >
            {isDownloading === "zip" ? (
              <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Packaging ZIP…</>
            ) : (
              <><FolderArchive size={14} /> Download Full Archive (ZIP)</>
            )}
          </button>
        </div>
      </div>

      {/* Restore Instructions */}
      <div style={{
        background: "var(--adm-bg)",
        border: "1px solid var(--adm-border)",
        borderRadius: 10,
        padding: "16px 20px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13.5, marginBottom: 8, color: "var(--adm-text)" }}>
          <Terminal size={15} /> How to Restore from SQL Backup
        </div>
        <p style={{ fontSize: 13, color: "var(--adm-muted)", margin: "0 0 10px 0" }}>
          In the event of database loss or migration to a new server, run the following command in terminal:
        </p>
        <pre style={{
          background: "#0f172a",
          color: "#e2e8f0",
          padding: "10px 14px",
          borderRadius: 6,
          fontSize: 12.5,
          fontFamily: "monospace",
          overflowX: "auto",
          margin: 0,
        }}>
          psql &quot;postgresql://USER:PASSWORD@HOST:PORT/DBNAME&quot; &lt; openordo-backup-YYYY-MM-DD.sql
        </pre>
      </div>

      {/* Status */}
      {lastBackup && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px",
          background: "var(--adm-success-soft)",
          border: "1px solid rgba(46,107,62,0.2)",
          borderRadius: 8,
          fontSize: 13,
          color: "var(--adm-success)",
        }}>
          <CheckCircle size={14} />
          Last backup downloaded at {lastBackup}
        </div>
      )}

      {error && (
        <div className="adm-alert adm-alert-error">
          <AlertTriangle size={14} style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* What's included */}
      <div>
        <div className="adm-section-label" style={{ marginBottom: 14 }}>Database Tables Included</div>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 8,
        }}>
          {[
            { label: "Users & Accounts", icon: "👤" },
            { label: "Clinics & Memberships", icon: "🏥" },
            { label: "Patients", icon: "🧑‍⚕️" },
            { label: "Appointments", icon: "📅" },
            { label: "Invoices & Payments", icon: "💳" },
            { label: "Doctors & Schedules", icon: "👨‍⚕️" },
            { label: "Plans & Features", icon: "📦" },
            { label: "Promotions & Redemptions", icon: "🎁" },
            { label: "Contact Inquiries / Leads", icon: "✉️" },
            { label: "Plugins & Clinic Addons", icon: "🔌" },
            { label: "Platform Feature Flags", icon: "🚩" },
            { label: "Booking Configs", icon: "📋" },
            { label: "Audit Logs", icon: "🔍" },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px",
              background: "var(--adm-bg)",
              borderRadius: 8,
              fontSize: 13,
              color: "var(--adm-soft)",
            }}>
              <span>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
