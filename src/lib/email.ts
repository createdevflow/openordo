import nodemailer from "nodemailer"
import { db } from "./db"

// Fetch SMTP credentials from the GlobalSetting table
async function getSmtpConfig() {
  const settings = await db.globalSetting.findMany({
    where: { key: { in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM", "SMTP_FROM_AUTH", "SMTP_FROM_BILLING", "SMTP_FROM_GENERAL"] } }
  })

  const config: Record<string, string> = {}
  for (const s of settings) {
    config[s.key] = s.value
  }

  return {
    host: (config.SMTP_HOST || process.env.SMTP_HOST || "").trim(),
    port: parseInt((config.SMTP_PORT || process.env.SMTP_PORT || "587").trim(), 10),
    user: (config.SMTP_USER || process.env.SMTP_USER || "").trim(),
    pass: (config.SMTP_PASS || process.env.SMTP_PASS || "").trim(),
    from: (config.SMTP_FROM && config.SMTP_FROM.includes("@")) 
      ? config.SMTP_FROM.trim()
      : (config.SMTP_FROM ? `${config.SMTP_FROM.trim()} <noreply@openordo.com>` : process.env.SMTP_FROM || "OpenORDO <noreply@openordo.com>"),
    fromAuth: (config.SMTP_FROM_AUTH || "").trim(),
    fromBilling: (config.SMTP_FROM_BILLING || "").trim(),
    fromGeneral: (config.SMTP_FROM_GENERAL || "").trim(),
  }
}

function getFromAddress(category: 'auth' | 'billing' | 'general' | 'default', config: any) {
  let selected = config.from
  if (category === 'auth' && config.fromAuth) selected = config.fromAuth
  if (category === 'billing' && config.fromBilling) selected = config.fromBilling
  if (category === 'general' && config.fromGeneral) selected = config.fromGeneral

  if (selected && !selected.includes("@")) {
    return `${selected} <noreply@openordo.com>`
  }
  return selected
}

async function getTransporter(testConfig?: any) {
  const config = testConfig || await getSmtpConfig()

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
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates or Hostinger cert mismatches
    }
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

  if (process.env.NODE_ENV !== "production") {
    console.log("=========================================")
    console.log(`[DEV ONLY] OTP for ${email}: ${code}`)
    console.log("=========================================")
  }

  try {
    await transporter.sendMail({
      from: getFromAddress('auth', config),
      to: email,
      subject: "OpenORDO - Email Verification Code",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send OTP email:", error)
    console.log(`[FALLBACK] Please use this OTP: ${code}`)
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

  if (process.env.NODE_ENV !== "production") {
    console.log("=========================================")
    console.log(`[DEV ONLY] Password Reset Link for ${email}:`)
    console.log(resetUrl)
    console.log("=========================================")
  }

  try {
    await transporter.sendMail({
      from: getFromAddress('auth', config),
      to: email,
      subject: "OpenORDO - Password Reset Request",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send password reset email:", error)
    console.log(`[FALLBACK] Please use this Reset Link: ${resetUrl}`)
    return false
  }
}

export async function sendTestEmail(email: string, testConfig?: any) {
  const transporter = await getTransporter(testConfig)
  if (!transporter) return false

  const config = testConfig || await getSmtpConfig()

  const html = baseTemplate(`
    <h2 style="margin-top: 0; color: #1E4638;">Test Email Configuration</h2>
    <p style="color: #4A6B5C;">Hello from OpenORDO!</p>
    <p style="color: #4A6B5C;">If you are reading this, your SMTP settings are configured correctly.</p>
  `)

  try {
    await transporter.sendMail({
      from: getFromAddress('general', config),
      to: email,
      subject: "OpenORDO - SMTP Test Successful",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send test email:", error)
    return false
  }
}

export async function sendTrialEndingEmail(
  email: string,
  planName: string,
  priceMonthly: string,
  chargeDate: string
) {
  const transporter = await getTransporter()
  if (!transporter) {
    console.log(`[DEV] Trial ending for ${email} -- plan: ${planName}, charge date: ${chargeDate}`)
    return false
  }

  const config = await getSmtpConfig()

  const html = baseTemplate(`
    <h2 style="margin-top: 0; color: #1E4638;">Your trial ends soon</h2>
    <p style="color: #4A6B5C;">Hi there,</p>
    <p style="color: #4A6B5C;">Your <strong>${planName}</strong> trial on OpenORDO is ending soon.</p>
    <div style="background: #f4f9f6; border: 1px solid #c8e6d4; border-radius: 8px; padding: 16px 20px; margin: 20px 0;">
      <div style="font-size: 13px; color: #4A6B5C; font-weight: 600; margin-bottom: 4px;">Auto-payment scheduled</div>
      <div style="font-size: 20px; font-weight: 700; color: #1E4638;">${priceMonthly} / month</div>
      <div style="font-size: 13px; color: #6B8E80; margin-top: 4px;">Will be charged automatically on <strong>${chargeDate}</strong></div>
    </div>
    <p style="color: #4A6B5C;">If you would like to cancel before being charged, go to Dashboard &rarr; Settings &rarr; Subscription &amp; Plan &rarr; Cancel Subscription.</p>
    <p style="color: #4A6B5C; font-size: 14px;">Thank you for using OpenORDO!</p>
  `)

  if (process.env.NODE_ENV !== "production") {
    console.log("=========================================")
    console.log(`[DEV] Trial ending email for ${email}`)
    console.log(`Plan: ${planName}, Charge date: ${chargeDate}`)
    console.log("=========================================")
  }

  try {
    await transporter.sendMail({
      from: getFromAddress('billing', config),
      to: email,
      subject: `Your OpenORDO ${planName} trial ends soon`,
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send trial ending email:", error)
    return false
  }
}

export async function sendDemoCredentialsEmail(email: string, name: string, link: string) {
  const transporter = await getTransporter()
  if (!transporter) return false

  const config = await getSmtpConfig()
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #1a382c;">Your OpenORDO Demo is Ready</h2>
      <p>Hi ${name},</p>
      <p>Thank you for requesting a demo of OpenORDO. We've set up a temporary sandbox environment for you to explore.</p>
      <div style="margin: 30px 0; padding: 20px; background-color: #f7f9f8; border-left: 4px solid #1a382c; border-radius: 4px;">
        <p style="margin-top: 0;"><strong>Access your demo environment here:</strong></p>
        <a href="${link}" style="display: inline-block; background-color: #1a382c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Enter Demo Environment</a>
      </div>
      <p style="font-size: 14px; color: #666;">Note: This link provides direct access without a password and is valid for 30 minutes from generation. The demo environment is isolated and temporary.</p>
      <p style="margin-top: 30px;">Best regards,<br>The OpenORDO Team</p>
    </div>
  `

  if (process.env.NODE_ENV !== "production") {
    console.log("=========================================")
    console.log(`[DEV] Demo Credentials email for ${email}`)
    console.log(`Link: ${link}`)
    console.log("=========================================")
  }

  try {
    await transporter.sendMail({
      from: getFromAddress('general', config),
      to: email,
      subject: "Your OpenORDO Demo Access",
      html,
    })
    return true
  } catch (error) {
    console.error("Failed to send demo credentials email:", error)
    return false
  }
}
