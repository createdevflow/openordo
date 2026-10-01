/**
 * Base email layout — CHARTWELL_EMAIL_NOTIFICATIONS_SPEC.md §1.1
 *
 * Brand tokens:
 *  - Forest  #1E4638  (headline, CTA, logo)
 *  - Amber   #D4852A
 *  - Coral   #C5604A
 *  - Body copy: Inter (web-safe fallback: Arial)
 *  - Headline: Fraunces (loaded via Google Fonts @import — degrades gracefully)
 *
 * This renders a complete HTML string compatible with every major email client.
 */

export interface BaseLayoutOptions {
  /** Pre-rendered inner content (the per-template section) */
  body: string
  /** Whether to show an unsubscribe / preferences link in the footer */
  showPreferencesLink?: boolean
  /** URL of the preferences/notifications settings page */
  preferencesUrl?: string
  /** Clinic name to override the default footer brand line */
  clinicName?: string
}

export function baseEmailLayout({
  body,
  showPreferencesLink = false,
  preferencesUrl,
  clinicName,
}: BaseLayoutOptions): string {
  const year = new Date().getFullYear()
  const brandLine = clinicName
    ? `This email was sent on behalf of <strong>${clinicName}</strong> via OpenORDO.`
    : "Automating the day-to-day of your clinic."

  const unsubscribeSection =
    showPreferencesLink && preferencesUrl
      ? `<tr><td style="padding:12px 40px 0 40px;text-align:center;">
           <a href="${preferencesUrl}" style="font-size:12px;color:#93A69C;text-decoration:underline;">
             Manage notification preferences
           </a>
         </td></tr>`
      : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700&family=Inter:wght@400;500;600&display=swap');
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none}
    body{margin:0!important;padding:0!important;background-color:#f4f7f5}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f5;font-family:'Inter',Arial,Helvetica,sans-serif;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f7f5;">
  <tr>
    <td style="padding:32px 16px;">
      <!-- Card -->
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;
                    box-shadow:0 4px 16px rgba(0,0,0,0.06);overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background-color:#1E4638;padding:24px 40px;">
            <a href="https://openordo.com" style="text-decoration:none;">
              <span style="font-family:'Fraunces','Georgia',serif;font-size:22px;font-weight:700;
                           color:#ffffff;letter-spacing:-0.5px;">OpenORDO</span>
            </a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 32px 40px;color:#1E4638;">
            ${body}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color:#f4f7f5;border-top:1px solid #e8ede9;padding:20px 40px 24px 40px;">
            <p style="margin:0;font-size:12px;color:#93A69C;text-align:center;line-height:1.6;">
              &copy; ${year} OpenORDO. All rights reserved.<br>
              ${brandLine}
            </p>
          </td>
        </tr>

        ${unsubscribeSection}

        <!-- Legal links -->
        <tr>
          <td style="padding:0 40px 20px 40px;text-align:center;">
            <a href="https://openordo.com/privacy" style="font-size:11px;color:#b0bdb8;text-decoration:none;margin:0 8px;">Privacy Policy</a>
            <span style="font-size:11px;color:#b0bdb8;">&middot;</span>
            <a href="https://openordo.com/terms" style="font-size:11px;color:#b0bdb8;text-decoration:none;margin:0 8px;">Terms of Service</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ── Shared building blocks ────────────────────────────────────────────────────

/** Forest-green CTA button */
export function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:28px 0;">
  <a href="${url}"
     style="display:inline-block;background-color:#1E4638;color:#ffffff;
            font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:600;
            text-decoration:none;padding:13px 28px;border-radius:7px;
            letter-spacing:0.01em;">
    ${text}
  </a>
</div>`
}

/** Large OTP / code display box */
export function codeBox(code: string): string {
  return `<div style="background:#f0f5f2;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
  <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#1E4638;
               font-family:'Courier New',Courier,monospace;">${code}</span>
</div>`
}

/** Info / callout card */
export function infoCard(lines: { label: string; value: string }[]): string {
  const rows = lines
    .map(
      ({ label, value }) =>
        `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6B8E80;width:40%;">${label}</td>
          <td style="padding:6px 0;font-size:13px;color:#1E4638;font-weight:600;">${value}</td>
        </tr>`
    )
    .join("")
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
          style="background:#f4f7f5;border-radius:8px;padding:16px 20px;margin:20px 0;">
  <tr><td><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
    ${rows}
  </table></td></tr>
</table>`
}

/** Standard section heading using Fraunces */
export function heading(text: string): string {
  return `<h2 style="margin:0 0 16px 0;font-family:'Fraunces','Georgia',serif;
                     font-size:24px;font-weight:700;color:#1E4638;line-height:1.3;">
  ${text}
</h2>`
}

/** Body paragraph */
export function para(text: string): string {
  return `<p style="margin:0 0 14px 0;font-size:15px;color:#4A6B5C;line-height:1.7;">${text}</p>`
}

/** Small dim note */
export function note(text: string): string {
  return `<p style="margin:16px 0 0 0;font-size:13px;color:#93A69C;line-height:1.6;">${text}</p>`
}
