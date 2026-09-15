import nodemailer from "nodemailer"
import { db } from "./db"

// Fetch SMTP credentials from the GlobalSetting table
async function getSmtpConfig() {
  const settings = await db.globalSetting.findMany({
    where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"] } }
  })

  const config: Record<string, string> = {}
  for (const s of settings) {
    config[s.key] = s.value
  }

  return {
    host: config.SMTP_HOST || process.env.SMTP_HOST || "",
    port: parseInt(config.SMTP_PORT || process.env.SMTP_PORT || "587", 10),
    user: config.SMTP_USER || process.env.SMTP_USER || "",
    pass: config.SMTP_PASS || process.env.SMTP_PASS || "",
    from: config.SMTP_FROM || process.env.SMTP_FROM || "OpenORDO <noreply@openordo.com>",
  }
}

async function getTransporter() {
  const config = await getSmtpConfig()

  if (!config.host || !config.user || !config.pass) {
    console.warn("⚠️ SMTP configuration is missing! Emails will not be sent.")
    return null
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465, // true for 465, false for other ports
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })
}

const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1E4638; background-color: #f7f9f8; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .logo { font-size: 24px; font-weight: bold; color: #1E4638; text-decoration: none; display: inline-block; margin-bottom: 24px; letter-spacing: -0.5px; }
    .footer { margin-top: 32px; font-size: 13px; color: #93A69C; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <a href="https://openordo.com" class="logo">OpenORDO</a>
      ${content}
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} OpenORDO. All rights reserved.<br>
      Automating the day-to-day of your clinic.
    </div>
  </div>
</body>
</html>
`

export async function sendVerificationOtp(email: string, code: string) {
  const transporter = await getTransporter()
  if (!transporter) return false

  const config = await getSmtpConfig()

  const html = baseTemplate(`
    <h2 style="margin-top: 0; color: #1E4638;">Verify your email address</h2>
    <p style="color: #4A6B5C;">Welcome to OpenORDO! Please use the following 6-digit verification code to complete your registration:</p>
    <div style="background-color: #f0f4f2; padding: 20px; border-radius: 8px; text-align: center; margin: 32px 0;">
      <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #1E4638;">${code}</span>
    </div>
    <p style="color: #4A6B5C; font-size: 14px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
  `)

  try {
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: "OpenORDO - Email Verification Code",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send OTP email:", error)
    return false
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const transporter = await getTransporter()
  if (!transporter) return false

  const config = await getSmtpConfig()
  const resetUrl = `https://openordo.com/reset-password?token=${resetToken}`

  const html = baseTemplate(`
    <h2 style="margin-top: 0; color: #1E4638;">Reset your password</h2>
    <p style="color: #4A6B5C;">We received a request to reset the password for your OpenORDO account.</p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${resetUrl}" style="background-color: #2D6B53; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Reset Password</a>
    </div>
    <p style="color: #4A6B5C; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:<br>
    <a href="${resetUrl}" style="color: #2D6B53;">${resetUrl}</a></p>
    <p style="color: #4A6B5C; font-size: 14px; margin-top: 24px;">This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
  `)

  try {
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: "OpenORDO - Password Reset Request",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    return false
  }
}
