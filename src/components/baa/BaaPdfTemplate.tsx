import React from "react"

export function BaaPdfTemplate({
  request,
  globalSettings,
  isDraft = false
}: {
  request: any
  globalSettings: Record<string, string>
  isDraft?: boolean
}) {
  const effDate = isDraft ? "[DRAFT — Not Effective]" : new Date(request.approvedAt || Date.now()).toLocaleDateString()
  const refNumber = isDraft ? "[DRAFT REFERENCE]" : request.documentReferenceNumber || ""
  const signatoryName = globalSettings.BAA_SIGNATORY_NAME || "Jane Doe"
  const signatoryTitle = globalSettings.BAA_SIGNATORY_TITLE || "Authorized Signatory"
  const companyDetails = globalSettings.BAA_COMPANY_DETAILS || "OpenORDO\nChandigarh, India"
  const signatureKey = globalSettings.BAA_SIGNATURE_IMAGE_KEY || ""

  // Assuming request.legalTextSnapshot holds the body text, or we pass currentTemplate if pending
  const bodyText = request.legalTextSnapshot || request.bodyText || ""

  return (
    <div style={{ width: 800, padding: 40, fontFamily: "sans-serif", color: "#111", background: "#fff", position: "relative" }}>
      {isDraft && (
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%) rotate(-45deg)", fontSize: 100, color: "rgba(255,0,0,0.1)", pointerEvents: "none", whiteSpace: "nowrap" }}>
          DRAFT PREVIEW
        </div>
      )}
      
      {/* Cover Page */}
      <div style={{ minHeight: "1000px", pageBreakAfter: "always" }}>
        <h1 style={{ fontSize: 24, textAlign: "center", marginBottom: 40 }}>HIPAA Business Associate Agreement</h1>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 40, fontSize: 12 }}>
          <div><strong>Document Reference:</strong> {refNumber}</div>
          <div><strong>Effective Date:</strong> {effDate}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 14 }}>Customer (Covered Entity)</h3>
            <div style={{ fontSize: 14 }}>{request.clinicLegalName}</div>
          </div>
          
          <div style={{ padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 14 }}>Business Associate</h3>
            <div style={{ fontSize: 14, whiteSpace: "pre-line" }}>{companyDetails}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 80 }}>
          {/* Customer Signature */}
          <div style={{ flex: 1, paddingRight: 20 }}>
            <h4 style={{ marginBottom: 20 }}>Executed by Customer</h4>
            <div style={{ borderBottom: "1px solid #000", height: 60, marginBottom: 10 }}></div>
            <div style={{ fontSize: 14 }}>
              <strong>{request.ownerFullName}</strong><br />
              {request.ownerTitle}<br />
              Date: {effDate}
            </div>
          </div>

          {/* BA Signature */}
          <div style={{ flex: 1, paddingLeft: 20 }}>
            <h4 style={{ marginBottom: 20 }}>Executed by Business Associate</h4>
            <div style={{ borderBottom: "1px solid #000", height: 60, marginBottom: 10, position: "relative" }}>
              {signatureKey && !isDraft && (
                <img src={signatureKey} alt="Signature" style={{ maxHeight: 50, position: "absolute", bottom: 5, left: 0 }} />
              )}
            </div>
            <div style={{ fontSize: 14 }}>
              <strong>{signatoryName}</strong><br />
              {signatoryTitle}<br />
              Date: {effDate}
            </div>
          </div>
        </div>
      </div>

      {/* Body Text Pages */}
      <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", textAlign: "justify" }}>
        {bodyText}
      </div>
    </div>
  )
}
