"use client"

import React, { useState, useTransition } from "react"
import { approveBaaRequestAction, finalizeBaaPdfAction, rejectBaaRequestAction } from "@/server/actions/admin/baa-settings"
import { BaaPdfTemplate } from "@/components/baa/BaaPdfTemplate"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/ConfirmDialog"
import { FileText, CheckCircle, XCircle } from "lucide-react"

export function BaaRequestsClient({
  requests,
  currentTemplate,
  globalSettings
}: {
  requests: any[]
  currentTemplate: any
  globalSettings: any
}) {
  const { confirm, showAlert } = useConfirm()
  const [isPending, startTransition] = useTransition()
  const [activeReqId, setActiveReqId] = useState<string | null>(null)
  const [rejectingReq, setRejectingReq] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  
  const pendingRequests = requests.filter(r => r.status === "PENDING")
  const historicalRequests = requests.filter(r => r.status !== "PENDING")

  const handleApprove = async (req: any) => {
    const ok = await confirm({
      title: "Approve BAA Request?",
      body: "This will countersign the Business Associate Agreement and legally execute it. A PDF will be generated and saved.",
      confirmLabel: "Approve and Sign",
      tone: "primary"
    })
    if (!ok) return

    setActiveReqId(req.id)
    startTransition(async () => {
      try {
        // 1. Mark as approved in DB (generates Reference Number & Date & Snapshots template)
        const approvedReq = await approveBaaRequestAction(req.id)

        // 2. Secretly render the PDF template
        const html2pdf = (await import("html2pdf.js")).default
        const ReactDOMServer = (await import("react-dom/server")).default
        
        const htmlString = ReactDOMServer.renderToString(
          <BaaPdfTemplate request={approvedReq} globalSettings={globalSettings} isDraft={false} />
        )
        const container = document.createElement("div")
        container.innerHTML = htmlString
        
        // Use html2pdf to generate blob
        const pdfBlob = await html2pdf().from(container).set({
          margin: 10,
          filename: `BAA_${approvedReq.documentReferenceNumber}.pdf`,
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }).outputPdf("blob")
        
        const file = new File([pdfBlob], `BAA_${approvedReq.documentReferenceNumber}.pdf`, { type: "application/pdf" })
        
        // 3. Upload PDF
        const formData = new FormData()
        formData.append("file", file)
        formData.append("category", "CLINIC_COMPLIANCE")
        
        const res = await fetch("/api/upload", { method: "POST", body: formData })
        if (!res.ok) throw new Error("Failed to upload PDF")
        
        const { id } = await res.json()

        // 4. Finalize PDF url in DB
        await finalizeBaaPdfAction(req.id, id)
        toast.success("BAA Approved and PDF Generated")

      } catch (err: any) {
        console.error(err)
        toast.error(err.message || "Failed to approve BAA")
      } finally {
        setActiveReqId(null)
      }
    })
  }

  const handleReject = async (req: any) => {
    setRejectingReq(req)
    setRejectReason("")
  }

  const submitReject = () => {
    if (!rejectingReq || !rejectReason.trim()) return

    startTransition(async () => {
      try {
        await rejectBaaRequestAction(rejectingReq.id, rejectReason)
        toast.success("BAA Request rejected")
      } catch (err: any) {
        toast.error(err.message || "Failed to reject")
      } finally {
        setRejectingReq(null)
      }
    })
  }

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div className="adm-page-head">
        <h1 className="adm-page-title">BAA Requests</h1>
        <p style={{ fontSize: 13, color: "var(--adm-muted)", marginTop: 6 }}>Review and countersign Business Associate Agreements.</p>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Pending Review ({pendingRequests.length})</h2>
      {pendingRequests.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", border: "1px solid var(--adm-border)", borderRadius: 8, background: "#fff", marginBottom: 32 }}>
          <div style={{ fontSize: 14, color: "var(--adm-muted)" }}>No pending BAA requests.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
          {pendingRequests.map(req => (
            <div key={req.id} style={{ border: "1px solid var(--adm-border)", borderRadius: 8, background: "#fff", padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{req.clinicLegalName}</div>
                  <div style={{ fontSize: 13, color: "var(--adm-muted)" }}>Clinic: {req.clinic.name}</div>
                  <div style={{ fontSize: 13, color: "var(--adm-muted)", marginTop: 8 }}>
                    <strong>Requested By:</strong> {req.ownerFullName}, {req.ownerTitle}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--adm-muted)", marginTop: 4 }}>
                    <strong>Submitted:</strong> {new Date(req.requestedAt).toLocaleString()}
                  </div>
                  
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                    <strong style={{ fontSize: 12, color: "var(--adm-accent)" }}>Verification Documents:</strong>
                    {req.bizRegCertKey && <a href={req.bizRegCertKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--adm-blue)", textDecoration: "underline" }}>1. Business Registration Certificate</a>}
                    {req.signatoryAuthKey && <a href={req.signatoryAuthKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--adm-blue)", textDecoration: "underline" }}>2. Proof of Authority to Sign</a>}
                    {req.photoIdKey && <a href={req.photoIdKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--adm-blue)", textDecoration: "underline" }}>3. Government-issued Photo ID</a>}
                    {req.addressProofKey && <a href={req.addressProofKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--adm-blue)", textDecoration: "underline" }}>4. Proof of Address</a>}
                    {req.practiceLicenseKey && <a href={req.practiceLicenseKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "var(--adm-blue)", textDecoration: "underline" }}>5. Medical Practice License</a>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <button 
                    className="adm-btn adm-btn-primary" 
                    onClick={() => handleApprove(req)}
                    disabled={isPending || activeReqId === req.id}
                  >
                    <CheckCircle size={14} /> {activeReqId === req.id ? "Processing..." : "Approve & Generate"}
                  </button>
                  <button 
                    className="adm-btn adm-btn-danger" 
                    onClick={() => handleReject(req)}
                    disabled={isPending || activeReqId === req.id}
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>

              <div style={{ background: "#f8fafc", padding: 16, borderRadius: 6, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--adm-muted)", marginBottom: 12, textTransform: "uppercase" }}>Draft Preview</div>
                <div style={{ transform: "scale(0.8)", transformOrigin: "top left", width: "125%", height: 300, overflow: "auto", border: "1px solid #ddd", background: "#fff" }}>
                  {/* Inline preview */}
                  <BaaPdfTemplate request={{ ...req, legalTextSnapshot: currentTemplate?.bodyText }} globalSettings={globalSettings} isDraft={true} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Historical Requests</h2>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Clinic Legal Name</th>
              <th>Status</th>
              <th>Reference #</th>
              <th>Document</th>
            </tr>
          </thead>
          <tbody>
            {historicalRequests.map(req => (
              <tr key={req.id}>
                <td style={{ fontSize: 13 }}>{new Date(req.updatedAt).toLocaleDateString()}</td>
                <td style={{ fontSize: 13, fontWeight: 500 }}>{req.clinicLegalName}</td>
                <td>
                  <span className={`adm-badge ${req.status === "APPROVED" ? "adm-badge-green" : "adm-badge-red"}`}>
                    {req.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, fontFamily: "monospace", color: "var(--adm-muted)" }}>
                  {req.documentReferenceNumber || "-"}
                </td>
                <td>
                  {req.pdfFileKey && (
                    <a href={req.pdfFileKey} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--adm-blue)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                      <FileText size={14} /> View PDF
                    </a>
                  )}
                  {req.rejectedReason && (
                    <div style={{ fontSize: 12, color: "var(--adm-coral)" }}>Reason: {req.rejectedReason}</div>
                  )}
                </td>
              </tr>
            ))}
            {historicalRequests.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "var(--adm-muted)" }}>No historical requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Reject Modal */}
      {rejectingReq && (
        <div style={{ position: "fixed", inset: 0, zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(18,48,37,0.5)", backdropFilter: "blur(3px)" }}>
          <div style={{ background: "#FBFAF6", width: "100%", maxWidth: 460, borderRadius: 12, border: "1px solid #DAD6C9", overflow: "hidden", padding: 24 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px 0" }}>Reject BAA Request</h3>
            <p style={{ fontSize: 14, color: "#3C4A45", margin: "0 0 16px 0", lineHeight: 1.55 }}>
              Please provide a reason for rejecting this BAA request. This will be visible to the clinic owner.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason..."
              rows={4}
              style={{ width: "100%", padding: "10px 14px", border: "1px solid #DAD6C9", borderRadius: 8, fontSize: 14, outline: "none", background: "#FFFFFF", marginBottom: 20 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setRejectingReq(null)} disabled={isPending} className="adm-btn adm-btn-ghost">Cancel</button>
              <button onClick={submitReject} disabled={isPending || !rejectReason.trim()} className="adm-btn adm-btn-danger">
                {isPending ? "Rejecting..." : "Reject Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
