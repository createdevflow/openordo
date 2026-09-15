import { db } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Contact Leads | Admin",
}

export default async function AdminLeadsPage() {
  const session = await auth()
  if (session?.user?.platformRole !== "SUPER_ADMIN") redirect("/")

  const leads = await db.contactLead.findMany({
    orderBy: { createdAt: "desc" }
  })

  return (
    <div>
      <div className="adm-page-head">
        <h1 className="adm-page-title">Contact Leads</h1>
        <span style={{ fontSize: 13, color: "var(--adm-muted)" }}>{leads.length} total inquiries</span>
      </div>

      <div className="adm-card">
        {leads.length === 0 ? (
          <div className="adm-empty">
            <div className="adm-empty-title">No leads yet</div>
            <div className="adm-empty-desc">When users submit the contact form, they will appear here.</div>
          </div>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Name</th>
                <th>Email</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="adm-mono" style={{ color: "var(--adm-muted)", fontSize: 12 }}>
                    {lead.createdAt.toLocaleDateString()}
                  </td>
                  <td style={{ fontWeight: 600 }}>{lead.name}</td>
                  <td>
                    <a href={`mailto:${lead.email}`} style={{ color: "var(--adm-forest)", textDecoration: "none" }}>
                      {lead.email}
                    </a>
                  </td>
                  <td style={{ maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={lead.message}>
                    {lead.message}
                  </td>
                  <td>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      backgroundColor: lead.status === "NEW" ? "var(--adm-amber-soft)" : "var(--adm-bg)",
                      color: lead.status === "NEW" ? "var(--adm-amber)" : "var(--adm-muted)",
                    }}>
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
