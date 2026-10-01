"use client"

import { useState } from "react"
import { toast } from "sonner"
import { adminCreateBaaRequest, approveBaaRequestAction, rejectBaaRequestAction } from "@/server/actions/admin/baa-settings"
import { FileText, Plus, X, Download, Upload, ExternalLink, CheckCircle, XCircle } from "lucide-react"

export function BaaClinicSection({ clinicId, baaRequests }: { clinicId: string, baaRequests: any[] }) {
  const [showModal, setShowModal] = useState(false)
  const [reviewModalReq, setReviewModalReq] = useState<any | null>(null)
  const [revokeModalReq, setRevokeModalReq] = useState<any | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    clinicLegalName: "",
    ownerFullName: "",
    ownerTitle: "Clinic Owner",
    bizRegCertFile: null as File | null,
    signatoryAuthFile: null as File | null,
    photoIdFile: null as File | null,
    addressProofFile: null as File | null,
    practiceLicenseFile: null as File | null,
  })

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (!formData.bizRegCertFile || !formData.signatoryAuthFile || !formData.photoIdFile || !formData.addressProofFile || !formData.practiceLicenseFile) {
        throw new Error("Please upload all required verification documents.")
      }

      const uploadFile = async (f: File) => {
        const fd = new FormData()
        fd.append("file", f)
        fd.append("category", "CLINIC_COMPLIANCE")
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || "File upload failed")
        return json.id
      }

      const bizRegCertKey = await uploadFile(formData.bizRegCertFile)
      const signatoryAuthKey = await uploadFile(formData.signatoryAuthFile)
      const photoIdKey = await uploadFile(formData.photoIdFile)
      const addressProofKey = await uploadFile(formData.addressProofFile)
      const practiceLicenseKey = await uploadFile(formData.practiceLicenseFile)

      await adminCreateBaaRequest(clinicId, {
        ...formData,
        bizRegCertKey,
        signatoryAuthKey,
        photoIdKey,
        addressProofKey,
        practiceLicenseKey
      })
      toast.success("BAA Request created successfully")
      setShowModal(false)
      setFormData({
        clinicLegalName: "",
        ownerFullName: "",
        ownerTitle: "Clinic Owner",
        bizRegCertFile: null,
        signatoryAuthFile: null,
        photoIdFile: null,
        addressProofFile: null,
        practiceLicenseFile: null,
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to create BAA request")
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (id: string) => {
    window.location.href = `/api/baa-download?id=${id}`
  }

  const handleApprove = async () => {
    if (!reviewModalReq) return
    setLoading(true)
    try {
      await approveBaaRequestAction(reviewModalReq.id)
      toast.success("BAA Request Approved")
      setReviewModalReq(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to approve request")
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!reviewModalReq || !rejectReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }
    setLoading(true)
    try {
      await rejectBaaRequestAction(reviewModalReq.id, rejectReason)
      toast.success("BAA Request Rejected")
      setReviewModalReq(null)
      setRejectReason("")
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request")
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!revokeModalReq || !rejectReason.trim()) {
      toast.error("Please provide a revocation reason")
      return
    }
    setLoading(true)
    try {
      await rejectBaaRequestAction(revokeModalReq.id, "Revoked: " + rejectReason)
      toast.success("BAA Agreement Revoked")
      setRevokeModalReq(null)
      setRejectReason("")
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke agreement")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="adm-card" style={{ marginTop: 20 }}>
      <div className="adm-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="adm-card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={18} /> BAA Requests
        </div>
        <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => setShowModal(true)}>
          <Plus size={14} /> New Request
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Legal Name</th>
              <th>Signer</th>
              <th>Requested At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {baaRequests.length > 0 ? (
              baaRequests.map(req => (
                <tr key={req.id}>
                  <td>
                    <span className={`adm-badge ${req.status === 'APPROVED' ? 'adm-badge-green' : req.status === 'REJECTED' ? 'adm-badge-red' : 'adm-badge-amber'}`}>
                      {req.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{req.clinicLegalName}</td>
                  <td>
                    <div style={{ fontSize: 13.5 }}>{req.ownerFullName}</div>
                    <div style={{ fontSize: 12, color: "var(--adm-muted)" }}>{req.ownerTitle}</div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--adm-muted)" }} className="adm-mono">
                    {new Date(req.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    {req.status === 'APPROVED' && req.pdfFileKey ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" onClick={() => handleDownload(req.id)}>
                          <Download size={14} /> Download PDF
                        </button>
                        <button className="adm-btn adm-btn-ghost adm-btn-sm" style={{ color: "var(--adm-danger)" }} onClick={() => { setRevokeModalReq(req); setRejectReason(""); }}>
                          <XCircle size={14} /> Revoke
                        </button>
                      </div>
                    ) : req.status === 'REJECTED' ? (
                      <div style={{ fontSize: 12, color: "var(--adm-danger)" }}>{req.rejectedReason || "Rejected"}</div>
                    ) : (
                      <button className="adm-btn adm-btn-primary adm-btn-sm" onClick={() => { setReviewModalReq(req); setRejectReason(""); }}>
                        Review & Approve
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "30px", color: "var(--adm-muted)" }}>
                  No BAA requests found for this clinic.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
          <div style={{ background: "var(--adm-bg)", width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--adm-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "var(--adm-accent)" }}>Create BAA Request</h2>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--adm-muted)" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                <div>
                  <label className="adm-label">Clinic Legal Name</label>
                  <input
                    required
                    className="adm-input"
                    placeholder="e.g. Acme Healthcare LLC"
                    value={formData.clinicLegalName}
                    onChange={(e) => setFormData(p => ({ ...p, clinicLegalName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="adm-label">Owner Full Name (Signer)</label>
                  <input
                    required
                    className="adm-input"
                    placeholder="John Doe"
                    value={formData.ownerFullName}
                    onChange={(e) => setFormData(p => ({ ...p, ownerFullName: e.target.value }))}
                  />
                </div>
              </div>
              
              <div>
                <label className="adm-label">Owner Title</label>
                <input
                  required
                  className="adm-input"
                  placeholder="Clinic Owner / CEO"
                  value={formData.ownerTitle}
                  onChange={(e) => setFormData(p => ({ ...p, ownerTitle: e.target.value }))}
                />
              </div>

              <div style={{ marginTop: 8 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, color: "var(--adm-accent)", marginBottom: 12 }}>Verification Documents</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                  <AdminFileDropzone 
                    label="1. Business Registration" 
                    file={formData.bizRegCertFile} 
                    onChange={e => setFormData({ ...formData, bizRegCertFile: e.target.files?.[0] || null })} 
                    disabled={loading} 
                  />
                  <AdminFileDropzone 
                    label="2. Authority to Sign" 
                    file={formData.signatoryAuthFile} 
                    onChange={e => setFormData({ ...formData, signatoryAuthFile: e.target.files?.[0] || null })} 
                    disabled={loading} 
                  />
                  <AdminFileDropzone 
                    label="3. Government ID" 
                    file={formData.photoIdFile} 
                    onChange={e => setFormData({ ...formData, photoIdFile: e.target.files?.[0] || null })} 
                    disabled={loading} 
                  />
                  <AdminFileDropzone 
                    label="4. Proof of Address" 
                    file={formData.addressProofFile} 
                    onChange={e => setFormData({ ...formData, addressProofFile: e.target.files?.[0] || null })} 
                    disabled={loading} 
                  />
                  <AdminFileDropzone 
                    label="5. Medical Practice License" 
                    file={formData.practiceLicenseFile} 
                    onChange={e => setFormData({ ...formData, practiceLicenseFile: e.target.files?.[0] || null })} 
                    disabled={loading} 
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--adm-border)" }}>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="adm-btn adm-btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reviewModalReq && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
          <div style={{ background: "var(--adm-bg)", width: "100%", maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--adm-border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "var(--adm-accent)" }}>Review BAA Request</h2>
              <button
                onClick={() => setReviewModalReq(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--adm-muted)" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--adm-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Legal Name</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{reviewModalReq.clinicLegalName}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--adm-muted)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Signer</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{reviewModalReq.ownerFullName} ({reviewModalReq.ownerTitle})</div>
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--adm-accent)", marginBottom: 12, borderBottom: "1px solid var(--adm-border)", paddingBottom: 8 }}>Verification Documents</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--adm-surface)", borderRadius: 6, border: "1px solid var(--adm-border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>1. Business Registration</span>
                    {reviewModalReq.bizRegCertKey ? (
                      <a href={reviewModalReq.bizRegCertKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "var(--adm-blue)", textDecoration: "none" }}><ExternalLink size={14} /> View File</a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--adm-muted)", fontStyle: "italic" }}>Not Provided</span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--adm-surface)", borderRadius: 6, border: "1px solid var(--adm-border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>2. Authority to Sign</span>
                    {reviewModalReq.signatoryAuthKey ? (
                      <a href={reviewModalReq.signatoryAuthKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "var(--adm-blue)", textDecoration: "none" }}><ExternalLink size={14} /> View File</a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--adm-muted)", fontStyle: "italic" }}>Not Provided</span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--adm-surface)", borderRadius: 6, border: "1px solid var(--adm-border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>3. Government ID</span>
                    {reviewModalReq.photoIdKey ? (
                      <a href={reviewModalReq.photoIdKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "var(--adm-blue)", textDecoration: "none" }}><ExternalLink size={14} /> View File</a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--adm-muted)", fontStyle: "italic" }}>Not Provided</span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--adm-surface)", borderRadius: 6, border: "1px solid var(--adm-border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>4. Proof of Address</span>
                    {reviewModalReq.addressProofKey ? (
                      <a href={reviewModalReq.addressProofKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "var(--adm-blue)", textDecoration: "none" }}><ExternalLink size={14} /> View File</a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--adm-muted)", fontStyle: "italic" }}>Not Provided</span>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--adm-surface)", borderRadius: 6, border: "1px solid var(--adm-border)" }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>5. Medical Practice License</span>
                    {reviewModalReq.practiceLicenseKey ? (
                      <a href={reviewModalReq.practiceLicenseKey} target="_blank" rel="noreferrer" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 4, color: "var(--adm-blue)", textDecoration: "none" }}><ExternalLink size={14} /> View File</a>
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--adm-muted)", fontStyle: "italic" }}>Not Provided</span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="adm-label" style={{ color: "var(--adm-danger)" }}>Rejection Reason (if rejecting)</label>
                <input
                  className="adm-input"
                  placeholder="E.g., Business registration document is illegible"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ borderColor: rejectReason ? "var(--adm-danger)" : undefined }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--adm-border)" }}>
                <button type="button" className="adm-btn adm-btn-ghost" style={{ color: "var(--adm-danger)" }} onClick={handleReject} disabled={loading}>
                  <XCircle size={14} /> Reject Request
                </button>
                <button type="button" className="adm-btn adm-btn-primary" style={{ background: "var(--adm-success)", borderColor: "var(--adm-success)" }} onClick={handleApprove} disabled={loading}>
                  <CheckCircle size={14} /> Approve & Generate BAA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {revokeModalReq && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", padding: 20 }}>
          <div style={{ background: "var(--adm-bg)", width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", borderRadius: 12, boxShadow: "0 10px 25px rgba(0,0,0,0.1)", position: "relative", overflow: "hidden" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--adm-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0, fontSize: 18, color: "var(--adm-danger)" }}>Revoke Agreement</h2>
              <button
                onClick={() => setRevokeModalReq(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--adm-muted)" }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ margin: 0, fontSize: 14, color: "var(--adm-text)" }}>
                Are you sure you want to revoke the active BAA for <strong>{revokeModalReq.clinicLegalName}</strong>? The clinic will be required to submit a new request.
              </p>

              <div>
                <label className="adm-label" style={{ color: "var(--adm-danger)" }}>Reason for Revocation</label>
                <input
                  className="adm-input"
                  placeholder="E.g., Business license expired"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ borderColor: rejectReason ? "var(--adm-danger)" : undefined }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button type="button" className="adm-btn adm-btn-ghost" onClick={() => setRevokeModalReq(null)} disabled={loading}>
                  Cancel
                </button>
                <button type="button" className="adm-btn adm-btn-primary" style={{ background: "var(--adm-danger)", borderColor: "var(--adm-danger)" }} onClick={handleRevoke} disabled={loading}>
                  Revoke Agreement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminFileDropzone({ label, file, onChange, disabled }: { label: string, file: File | null, onChange: (e: any) => void, disabled: boolean }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6, color: "var(--adm-accent)" }}>{label}</label>
      <div 
        style={{ 
          position: "relative", 
          border: "2px dashed var(--adm-border)", 
          borderRadius: 8, 
          padding: 16, 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          justifyContent: "center",
          background: "#fff",
          minHeight: 70,
          cursor: "pointer",
          transition: "all 0.2s ease"
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--adm-blue)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--adm-border)"}
      >
        <input 
          type="file" 
          accept="image/*,application/pdf" 
          disabled={disabled}
          onChange={onChange}
          required={!file}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer", zIndex: 10 }} 
        />
        {file ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", position: "relative", zIndex: 20, pointerEvents: "none" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--adm-blue)", wordBreak: "break-all" }}>{file.name}</span>
            <span style={{ fontSize: 11, color: "var(--adm-muted)", marginTop: 4 }}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", color: "var(--adm-muted)", position: "relative", zIndex: 20, pointerEvents: "none" }}>
            <Upload size={16} style={{ marginBottom: 6 }} />
            <span style={{ fontSize: 12, fontWeight: 500 }}>Click or drag file here</span>
            <span style={{ fontSize: 10, marginTop: 2, opacity: 0.8 }}>PDF, JPG, PNG (Max 10MB)</span>
          </div>
        )}
      </div>
    </div>
  )
}
