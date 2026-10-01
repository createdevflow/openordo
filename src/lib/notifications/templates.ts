/**
 * Email templates — one render function per event key.
 * CHARTWELL_EMAIL_NOTIFICATIONS_SPEC.md §1.1, §3.3
 *
 * Each function returns { subject, html }.
 *
 * PHI RULE (§3.3, §0.1):
 *   Patient-facing templates are typed to NOT accept clinical fields.
 *   No diagnosis, medication, or notes in any patient email prop type.
 *   Violating this is a compile-time error, not a review miss.
 *
 * ISOLATION RULE (§0.2):
 *   Every value in a patient email comes from the specific event's own
 *   clinic relation — never from a cached or ambient clinic context.
 */

import {
  baseEmailLayout,
  ctaButton,
  codeBox,
  infoCard,
  heading,
  para,
  note,
} from "./layout"

export interface RenderedEmail {
  subject: string
  html: string
}

const APP = process.env.NEXT_PUBLIC_APP_URL || "https://openordo.com"

// ── Helpers ───────────────────────────────────────────────────────────────────

function withPrefs(
  body: string,
  preferencesUrl: string,
  clinicName?: string
): string {
  return baseEmailLayout({
    body,
    showPreferencesLink: true,
    preferencesUrl,
    clinicName,
  })
}

function noPrefs(body: string, clinicName?: string): string {
  return baseEmailLayout({ body, clinicName })
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.1  Account & onboarding (staff)
// ─────────────────────────────────────────────────────────────────────────────

export function renderWelcome(data: { name: string; loginUrl: string }): RenderedEmail {
  const body =
    heading("Welcome to OpenORDO!") +
    para(`Hi ${data.name}, glad you're here.`) +
    para("Your account is set up and ready. Complete the quick onboarding to configure your clinic and start managing appointments.") +
    ctaButton("Go to Onboarding", data.loginUrl)
  return { subject: "Welcome to OpenORDO — let's get started", html: noPrefs(body) }
}



export function renderEmailVerificationOtp(data: { code: string }): RenderedEmail {
  const body =
    heading("Verify your email address") +
    para("Use the code below to complete your registration. It expires in 15 minutes.") +
    codeBox(data.code) +
    note("If you didn't request this, you can safely ignore this email.")
  return { subject: "OpenORDO — your verification code", html: noPrefs(body) }
}

export function renderOnboardingReminder(data: { name: string; step: string; continueUrl: string }): RenderedEmail {
  const body =
    heading("You're almost there!") +
    para(`Hi ${data.name}, you started setting up your OpenORDO clinic but haven't finished yet.`) +
    infoCard([{ label: "Remaining step", value: data.step }]) +
    ctaButton("Continue Onboarding", data.continueUrl)
  return {
    subject: "Complete your OpenORDO onboarding",
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderOnboardingComplete(data: { name: string; clinicName: string; planName: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading("You're all set! 🎉") +
    para(`Hi ${data.name}, your clinic <strong>${data.clinicName}</strong> is fully configured on the <strong>${data.planName}</strong> plan.`) +
    para("You can now start accepting appointments, managing patients, and tracking invoices.") +
    ctaButton("Go to Dashboard", data.dashboardUrl)
  return {
    subject: "OpenORDO — onboarding complete",
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`, data.clinicName),
  }
}

export function renderPasswordResetLink(data: { name: string; resetUrl: string }): RenderedEmail {
  const body =
    heading("Reset your password") +
    para(`Hi ${data.name}, we received a password reset request for your account.`) +
    ctaButton("Reset Password", data.resetUrl) +
    note("This link expires in 1 hour. If you didn't request this, please ignore this email.")
  return { subject: "OpenORDO — password reset request", html: noPrefs(body) }
}

export function renderPasswordChanged(data: { name: string; changedAt: string }): RenderedEmail {
  const body =
    heading("Your password was changed") +
    para(`Hi ${data.name}, your OpenORDO password was successfully changed on ${data.changedAt}.`) +
    para("If you made this change, no action is needed. If you did not, please contact support immediately.") +
    ctaButton("Contact Support", "https://openordo.com/contact")
  return { subject: "OpenORDO — your password was changed", html: noPrefs(body) }
}

export function renderEmailOrPhoneChanged(data: { name: string; changedField: string; newValue: string; changedAt: string }): RenderedEmail {
  const body =
    heading(`Security notice: your ${data.changedField} was changed`) +
    para(`Hi ${data.name}, your account ${data.changedField} was updated to <strong>${data.newValue}</strong> on ${data.changedAt}.`) +
    para("This notice was sent to your previous address. If you did not make this change, please contact support immediately.") +
    ctaButton("Contact Support", "https://openordo.com/contact")
  return { subject: `OpenORDO — your ${data.changedField} was changed`, html: noPrefs(body) }
}

export function renderNewDeviceLogin(data: { name: string; device: string; location: string; time: string; secureUrl: string }): RenderedEmail {
  const body =
    heading("New sign-in detected") +
    para(`Hi ${data.name}, we noticed a new sign-in to your OpenORDO account.`) +
    infoCard([
      { label: "Device", value: data.device },
      { label: "Location", value: data.location },
      { label: "Time", value: data.time },
    ]) +
    para("If this was you, no action is needed. If not, secure your account immediately.") +
    ctaButton("Secure My Account", data.secureUrl)
  return { subject: "OpenORDO — new sign-in from an unrecognized device", html: noPrefs(body) }
}

export function renderAccountStatusChanged(data: { name: string; newStatus: string; reason?: string; contactUrl: string }): RenderedEmail {
  const body =
    heading("Account status update") +
    para(`Hi ${data.name}, your OpenORDO account status has changed to <strong>${data.newStatus}</strong>.`) +
    (data.reason ? para(`Reason: ${data.reason}`) : "") +
    ctaButton("Contact Support", data.contactUrl)
  return { subject: `OpenORDO — your account is now ${data.newStatus}`, html: noPrefs(body) }
}

export function renderAccountDeletionConfirmed(data: { name: string; deletedAt: string }): RenderedEmail {
  const body =
    heading("Account deletion confirmed") +
    para(`Hi ${data.name}, your OpenORDO account was permanently deleted on ${data.deletedAt}.`) +
    para("All your data has been removed in accordance with our privacy policy. Thank you for using OpenORDO.")
  return { subject: "OpenORDO — your account has been deleted", html: noPrefs(body) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.2  Team management
// ─────────────────────────────────────────────────────────────────────────────

export function renderClinicInvite(data: { inviteeName: string; clinicName: string; inviterName: string; role: string; acceptUrl: string }): RenderedEmail {
  const body =
    heading(`You've been invited to join ${data.clinicName}`) +
    para(`Hi ${data.inviteeName}, <strong>${data.inviterName}</strong> has invited you to join <strong>${data.clinicName}</strong> on OpenORDO as <strong>${data.role}</strong>.`) +
    ctaButton("Accept Invitation", data.acceptUrl) +
    note("This invitation expires in 7 days.")
  return { subject: `Invitation to join ${data.clinicName} on OpenORDO`, html: noPrefs(body) }
}

export function renderInviteAccepted(data: { ownerName: string; inviteeName: string; clinicName: string; role: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading("Team invite accepted") +
    para(`Hi ${data.ownerName}, <strong>${data.inviteeName}</strong> has accepted their invitation to join <strong>${data.clinicName}</strong> as <strong>${data.role}</strong>.`) +
    ctaButton("View Team", data.dashboardUrl)
  return {
    subject: `${data.inviteeName} joined ${data.clinicName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderRoleChangedOrRemoved(data: { name: string; clinicName: string; changeType: "changed" | "removed"; newRole?: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading("Your role has been updated") +
    para(
      data.changeType === "removed"
        ? `Hi ${data.name}, you have been removed from <strong>${data.clinicName}</strong> on OpenORDO.`
        : `Hi ${data.name}, your role at <strong>${data.clinicName}</strong> has changed to <strong>${data.newRole}</strong>.`
    ) +
    ctaButton("View Details", data.dashboardUrl)
  return { subject: `OpenORDO — your role at ${data.clinicName} was updated`, html: noPrefs(body) }
}

export function renderOwnershipTransfer(data: { name: string; clinicName: string; action: "requested" | "completed"; newOwnerName: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading("Clinic ownership transfer") +
    para(
      data.action === "completed"
        ? `Hi ${data.name}, ownership of <strong>${data.clinicName}</strong> has been transferred to <strong>${data.newOwnerName}</strong>.`
        : `Hi ${data.name}, an ownership transfer of <strong>${data.clinicName}</strong> to <strong>${data.newOwnerName}</strong> has been requested.`
    ) +
    ctaButton("View Clinic", data.dashboardUrl)
  return { subject: `OpenORDO — ownership transfer for ${data.clinicName}`, html: noPrefs(body) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.3  Trial, subscription & billing
// ─────────────────────────────────────────────────────────────────────────────

export function renderTrialStarted(data: { name: string; planName: string; trialEndsAt: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading(`Your ${data.planName} trial has started`) +
    para(`Hi ${data.name}, your 14-day free trial of OpenORDO <strong>${data.planName}</strong> is now active.`) +
    infoCard([{ label: "Trial ends", value: data.trialEndsAt }]) +
    ctaButton("Go to Dashboard", data.dashboardUrl)
  return { subject: `OpenORDO — your ${data.planName} trial has started`, html: noPrefs(body) }
}

export function renderTrialEndingSoon(data: { name: string; planName: string; daysLeft: number; chargeDate: string; price: string; settingsUrl: string }): RenderedEmail {
  const body =
    heading("Your trial is ending soon") +
    para(`Hi ${data.name}, your OpenORDO <strong>${data.planName}</strong> trial ends in <strong>${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}</strong>.`) +
    infoCard([
      { label: "Plan", value: data.planName },
      { label: "Auto-charge date", value: data.chargeDate },
      { label: "Amount", value: data.price },
    ]) +
    para("If you'd like to cancel before being charged, visit Settings → Subscription.") +
    ctaButton("Manage Subscription", data.settingsUrl)
  return { subject: `Your OpenORDO trial ends in ${data.daysLeft} day${data.daysLeft !== 1 ? "s" : ""}`, html: noPrefs(body) }
}

export function renderTrialConverted(data: { name: string; planName: string; amount: string; billingCycle: string; nextBillingDate: string }): RenderedEmail {
  const body =
    heading("Trial converted — welcome aboard!") +
    para(`Hi ${data.name}, your trial has ended and your <strong>${data.planName}</strong> subscription is now active.`) +
    infoCard([
      { label: "Plan", value: data.planName },
      { label: "Billing cycle", value: data.billingCycle },
      { label: "Amount charged", value: data.amount },
      { label: "Next billing date", value: data.nextBillingDate },
    ])
  return { subject: `OpenORDO — you're now on the ${data.planName} plan`, html: noPrefs(body) }
}

export function renderPaymentReceipt(data: { name: string; amount: string; planName: string; date: string; invoiceUrl: string }): RenderedEmail {
  const body =
    heading("Payment received") +
    para(`Hi ${data.name}, we've received your payment for OpenORDO.`) +
    infoCard([
      { label: "Plan", value: data.planName },
      { label: "Amount", value: data.amount },
      { label: "Date", value: data.date },
    ]) +
    ctaButton("View Receipt", data.invoiceUrl)
  return { subject: `OpenORDO — payment receipt for ${data.amount}`, html: noPrefs(body) }
}

export function renderPaymentFailed(data: { name: string; amount: string; reason: string; retryUrl: string }): RenderedEmail {
  const body =
    heading("Payment failed") +
    para(`Hi ${data.name}, we were unable to process your payment of <strong>${data.amount}</strong>.`) +
    infoCard([{ label: "Reason", value: data.reason }]) +
    para("Please update your payment method to avoid service interruption.") +
    ctaButton("Update Payment Method", data.retryUrl)
  return { subject: `OpenORDO — payment of ${data.amount} failed`, html: noPrefs(body) }
}

export function renderGracePeriodFinalNotice(data: { name: string; planName: string; disableDate: string; settingsUrl: string }): RenderedEmail {
  const body =
    heading("Final notice — account disabling soon") +
    para(`Hi ${data.name}, this is your final notice before your OpenORDO <strong>${data.planName}</strong> account is disabled.`) +
    infoCard([{ label: "Disables on", value: data.disableDate }]) +
    para("Update your payment method now to keep your clinic running.") +
    ctaButton("Update Payment Now", data.settingsUrl)
  return { subject: "OpenORDO — urgent: account disabling tomorrow", html: noPrefs(body) }
}

export function renderPlanChanged(data: { name: string; oldPlan: string; newPlan: string; effectiveDate: string; settingsUrl: string }): RenderedEmail {
  const body =
    heading("Your plan has changed") +
    para(`Hi ${data.name}, your OpenORDO subscription has been updated.`) +
    infoCard([
      { label: "Previous plan", value: data.oldPlan },
      { label: "New plan", value: data.newPlan },
      { label: "Effective date", value: data.effectiveDate },
    ]) +
    ctaButton("View Subscription", data.settingsUrl)
  return { subject: `OpenORDO — you've moved to the ${data.newPlan} plan`, html: noPrefs(body) }
}

export function renderSubscriptionCanceled(data: { name: string; planName: string; endDate: string; reactivateUrl: string }): RenderedEmail {
  const body =
    heading("Subscription canceled") +
    para(`Hi ${data.name}, your OpenORDO <strong>${data.planName}</strong> subscription has been canceled.`) +
    infoCard([{ label: "Access until", value: data.endDate }]) +
    para("You can reactivate at any time before this date.") +
    ctaButton("Reactivate Subscription", data.reactivateUrl)
  return { subject: "OpenORDO — subscription canceled", html: noPrefs(body) }
}

export function renderSubscriptionEnded(data: { name: string; planName: string; endedAt: string; reactivateUrl: string }): RenderedEmail {
  const body =
    heading("Subscription ended") +
    para(`Hi ${data.name}, your OpenORDO <strong>${data.planName}</strong> subscription has ended as of ${data.endedAt}.`) +
    para("Your account has been downgraded. Some features may no longer be available.") +
    ctaButton("Reactivate", data.reactivateUrl)
  return { subject: "OpenORDO — your subscription has ended", html: noPrefs(body) }
}

export function renderRenewalReminder(data: { name: string; planName: string; renewalDate: string; amount: string; settingsUrl: string }): RenderedEmail {
  const body =
    heading("Upcoming subscription renewal") +
    para(`Hi ${data.name}, your OpenORDO <strong>${data.planName}</strong> annual subscription renews in 7 days.`) +
    infoCard([
      { label: "Renewal date", value: data.renewalDate },
      { label: "Amount", value: data.amount },
    ]) +
    ctaButton("Manage Subscription", data.settingsUrl)
  return {
    subject: `OpenORDO — renewal reminder: ${data.planName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderPriceChangeNotice(data: { name: string; planName: string; oldPrice: string; newPrice: string; effectiveDate: string; settingsUrl: string }): RenderedEmail {
  const body =
    heading("Price change notice") +
    para(`Hi ${data.name}, we're updating pricing for the <strong>${data.planName}</strong> plan, effective <strong>${data.effectiveDate}</strong>.`) +
    infoCard([
      { label: "Current price", value: data.oldPrice },
      { label: "New price", value: data.newPrice },
      { label: "Effective from", value: data.effectiveDate },
    ]) +
    ctaButton("View Details", data.settingsUrl)
  return { subject: `OpenORDO — pricing update for ${data.planName}`, html: noPrefs(body) }
}

export function renderPaymentMethodExpiring(data: { name: string; last4: string; expiryMonth: string; expiryYear: string; updateUrl: string }): RenderedEmail {
  const body =
    heading("Your payment method is expiring") +
    para(`Hi ${data.name}, your card ending in <strong>${data.last4}</strong> expires <strong>${data.expiryMonth}/${data.expiryYear}</strong>.`) +
    para("Update your payment method now to avoid interruption to your service.") +
    ctaButton("Update Payment Method", data.updateUrl)
  return { subject: "OpenORDO — your card is expiring soon", html: noPrefs(body) }
}

export function renderPaymentMethodUpdated(data: { name: string; last4: string; cardType: string; updatedAt: string }): RenderedEmail {
  const body =
    heading("Payment method updated") +
    para(`Hi ${data.name}, your payment method has been updated to your <strong>${data.cardType}</strong> ending in <strong>${data.last4}</strong>.`) +
    infoCard([{ label: "Updated on", value: data.updatedAt }]) +
    note("If you did not make this change, contact support immediately.")
  return { subject: "OpenORDO — payment method updated", html: noPrefs(body) }
}

export function renderRefundProcessed(data: { name: string; amount: string; reason: string; processedAt: string }): RenderedEmail {
  const body =
    heading("Refund processed") +
    para(`Hi ${data.name}, a refund of <strong>${data.amount}</strong> has been processed to your payment method.`) +
    infoCard([
      { label: "Amount", value: data.amount },
      { label: "Reason", value: data.reason },
      { label: "Processed on", value: data.processedAt },
    ])
  return { subject: `OpenORDO — refund of ${data.amount} processed`, html: noPrefs(body) }
}

export function renderPromoLifecycle(data: { name: string; promoName: string; phase: "applied" | "expiring_soon" | "ended"; expiresAt?: string; settingsUrl: string }): RenderedEmail {
  const phaseText: Record<string, string> = {
    applied: `Your promotional offer <strong>${data.promoName}</strong> has been applied to your account.`,
    expiring_soon: `Your promotional offer <strong>${data.promoName}</strong> expires on <strong>${data.expiresAt}</strong>.`,
    ended: `Your promotional offer <strong>${data.promoName}</strong> has ended. Standard pricing now applies.`,
  }
  const body =
    heading("Promotional offer update") +
    para(`Hi ${data.name}, ${phaseText[data.phase]}`) +
    ctaButton("View Subscription", data.settingsUrl)
  return { subject: `OpenORDO — promo update: ${data.promoName}`, html: noPrefs(body) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.4  Add-ons & usage limits
// ─────────────────────────────────────────────────────────────────────────────

export function renderAddonActivated(data: { name: string; addonName: string; activatedAt: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading(`Add-on activated: ${data.addonName}`) +
    para(`Hi ${data.name}, the <strong>${data.addonName}</strong> add-on has been activated for your clinic.`) +
    infoCard([{ label: "Activated on", value: data.activatedAt }]) +
    ctaButton("Go to Dashboard", data.dashboardUrl)
  return { subject: `OpenORDO — ${data.addonName} add-on activated`, html: noPrefs(body) }
}

export function renderAddonRenewalReminder(data: { name: string; addonName: string; renewalDate: string; amount: string; settingsUrl: string }): RenderedEmail {
  const body =
    heading(`Add-on renewal reminder: ${data.addonName}`) +
    para(`Hi ${data.name}, your <strong>${data.addonName}</strong> add-on renews soon.`) +
    infoCard([
      { label: "Renewal date", value: data.renewalDate },
      { label: "Amount", value: data.amount },
    ]) +
    ctaButton("Manage Add-ons", data.settingsUrl)
  return {
    subject: `OpenORDO — renewal reminder: ${data.addonName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderAddonRenewalFailed(data: { name: string; addonName: string; reason: string; retryUrl: string }): RenderedEmail {
  const body =
    heading(`Add-on renewal failed: ${data.addonName}`) +
    para(`Hi ${data.name}, we were unable to renew your <strong>${data.addonName}</strong> add-on.`) +
    infoCard([{ label: "Reason", value: data.reason }]) +
    ctaButton("Update Payment Method", data.retryUrl)
  return { subject: `OpenORDO — ${data.addonName} renewal failed`, html: noPrefs(body) }
}

export function renderAddonCanceledOrExpired(data: { name: string; addonName: string; reason: "canceled" | "expired"; date: string; marketplaceUrl: string }): RenderedEmail {
  const body =
    heading(`Add-on ${data.reason}: ${data.addonName}`) +
    para(`Hi ${data.name}, your <strong>${data.addonName}</strong> add-on has ${data.reason} as of ${data.date}.`) +
    para("Features provided by this add-on are no longer available.") +
    ctaButton("Browse Add-ons", data.marketplaceUrl)
  return { subject: `OpenORDO — ${data.addonName} has ${data.reason}`, html: noPrefs(body) }
}

export function renderAddonAdminGranted(data: { name: string; addonName: string; grantedBy: string; expiresAt?: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading(`Add-on granted: ${data.addonName}`) +
    para(`Hi ${data.name}, <strong>${data.grantedBy}</strong> has manually granted your clinic the <strong>${data.addonName}</strong> add-on.`) +
    (data.expiresAt ? infoCard([{ label: "Access until", value: data.expiresAt }]) : "") +
    ctaButton("Go to Dashboard", data.dashboardUrl)
  return { subject: `OpenORDO — ${data.addonName} add-on granted`, html: noPrefs(body) }
}

export function renderUsageLimitWarning(data: { name: string; resource: string; usedPercent: number; limit: string | number; upgradeUrl: string }): RenderedEmail {
  const body =
    heading("Usage limit warning") +
    para(`Hi ${data.name}, you've used <strong>${data.usedPercent}%</strong> of your <strong>${data.resource}</strong> limit (${data.limit}).`) +
    para("Consider upgrading your plan or add-on to avoid interruption.") +
    ctaButton("Upgrade Now", data.upgradeUrl)
  return {
    subject: `OpenORDO — ${data.resource} at ${data.usedPercent}% capacity`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderUsageLimitReached(data: { name: string; resource: string; limit: string | number; upgradeUrl: string }): RenderedEmail {
  const body =
    heading("Usage limit reached") +
    para(`Hi ${data.name}, you've reached your <strong>${data.resource}</strong> limit (${data.limit}).`) +
    para("Some features may be restricted until you upgrade.") +
    ctaButton("Upgrade Now", data.upgradeUrl)
  return { subject: `OpenORDO — ${data.resource} limit reached`, html: noPrefs(body) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5  Compliance & data
// ─────────────────────────────────────────────────────────────────────────────

export function renderBaaRequestReceived(data: { name: string; clinicName: string; refNum?: string; statusUrl: string }): RenderedEmail {
  const body =
    heading("BAA request received") +
    para(`Hi ${data.name}, we've received your Business Associate Agreement (BAA) request for <strong>${data.clinicName}</strong>.`) +
    para("Our team will review it and notify you once a decision has been made. This usually takes 1–2 business days.") +
    (data.refNum ? infoCard([{ label: "Reference number", value: data.refNum }]) : "") +
    ctaButton("View BAA Status", data.statusUrl)
  return { subject: "OpenORDO — BAA request received", html: noPrefs(body) }
}

export function renderBaaApproved(data: { name: string; clinicName: string; refNum: string; pdfUrl: string }): RenderedEmail {
  const body =
    heading("Your BAA has been approved! ✅") +
    para(`Hi ${data.name}, your Business Associate Agreement (BAA) for <strong>${data.clinicName}</strong> has been approved.`) +
    infoCard([{ label: "Reference number", value: data.refNum }]) +
    para("The executed PDF is ready to download.") +
    ctaButton("Download BAA PDF", data.pdfUrl)
  return { subject: `OpenORDO — BAA approved for ${data.clinicName}`, html: noPrefs(body) }
}

export function renderBaaRejected(data: { name: string; clinicName: string; reason: string; resubmitUrl: string }): RenderedEmail {
  const body =
    heading("BAA request rejected") +
    para(`Hi ${data.name}, your BAA request for <strong>${data.clinicName}</strong> could not be approved at this time.`) +
    infoCard([{ label: "Reason", value: data.reason }]) +
    para("Please address the issues above and resubmit.") +
    ctaButton("Resubmit BAA", data.resubmitUrl)
  return { subject: `OpenORDO — BAA request rejected for ${data.clinicName}`, html: noPrefs(body) }
}

export function renderDataExportReady(data: { name: string; clinicName: string; downloadUrl: string; expiresAt: string }): RenderedEmail {
  const body =
    heading("Your data export is ready") +
    para(`Hi ${data.name}, your data export for <strong>${data.clinicName}</strong> is ready to download.`) +
    infoCard([{ label: "Link expires", value: data.expiresAt }]) +
    ctaButton("Download Export", data.downloadUrl)
  return { subject: "OpenORDO — your data export is ready", html: noPrefs(body) }
}

export function renderDataDeletionWarning(data: { name: string; clinicName: string; daysUntilDeletion: number; deletionDate: string; exportUrl: string }): RenderedEmail {
  const body =
    heading(`Data deletion in ${data.daysUntilDeletion} day${data.daysUntilDeletion !== 1 ? "s" : ""}`) +
    para(`Hi ${data.name}, data for <strong>${data.clinicName}</strong> is scheduled for permanent deletion in <strong>${data.daysUntilDeletion} day${data.daysUntilDeletion !== 1 ? "s" : ""}</strong>.`) +
    infoCard([{ label: "Deletion date", value: data.deletionDate }]) +
    para("Export your data now if you wish to retain a copy.") +
    ctaButton("Export Data Now", data.exportUrl)
  return { subject: `OpenORDO — data deletion in ${data.daysUntilDeletion} days`, html: noPrefs(body) }
}

export function renderLegalTermsUpdate(data: { name: string; changeDescription: string; effectiveDate: string; termsUrl: string }): RenderedEmail {
  const body =
    heading("Upcoming changes to our Terms of Service") +
    para(`Hi ${data.name}, we're updating our Terms of Service and Privacy Policy.`) +
    infoCard([
      { label: "What's changing", value: data.changeDescription },
      { label: "Effective from", value: data.effectiveDate },
    ]) +
    ctaButton("Review Updated Terms", data.termsUrl)
  return { subject: "OpenORDO — important: upcoming terms update", html: noPrefs(body) }
}

export function renderSubprocessorNotice(data: { name: string; subprocessorName: string; description: string; objectionDeadline: string; detailsUrl: string }): RenderedEmail {
  const body =
    heading("Sub-processor notice") +
    para(`Hi ${data.name}, we are adding a new sub-processor to our data processing infrastructure.`) +
    infoCard([
      { label: "Sub-processor", value: data.subprocessorName },
      { label: "Purpose", value: data.description },
      { label: "Objection deadline", value: data.objectionDeadline },
    ]) +
    ctaButton("View Details", data.detailsUrl)
  return { subject: "OpenORDO — sub-processor notice (DPA)", html: noPrefs(body) }
}

export function renderSecurityIncidentNotice(data: { name: string; incidentDescription: string; detectedAt: string; affectedData: string; contactUrl: string }): RenderedEmail {
  const body =
    heading("Security incident notice") +
    para(`Hi ${data.name}, we are notifying you of a security incident that may affect your data.`) +
    infoCard([
      { label: "Detected at", value: data.detectedAt },
      { label: "Affected data", value: data.affectedData },
      { label: "Description", value: data.incidentDescription },
    ]) +
    para("We have already taken steps to contain the issue. Contact support if you have questions.") +
    ctaButton("Contact Support", data.contactUrl)
  return { subject: "OpenORDO — security incident notice", html: noPrefs(body) }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.6  Clinic operations (staff / doctors)
// ─────────────────────────────────────────────────────────────────────────────

export function renderNewBookingReceived(data: { clinicName: string; patientName: string; date: string; time: string; reason: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading("New booking request") +
    para(`A new booking request has been submitted at <strong>${data.clinicName}</strong>.`) +
    infoCard([
      { label: "Patient", value: data.patientName },
      { label: "Date", value: data.date },
      { label: "Time", value: data.time },
      { label: "Reason", value: data.reason },
    ]) +
    ctaButton("Review Booking", data.dashboardUrl)
  return {
    subject: `New booking at ${data.clinicName} — ${data.patientName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderPatientCanceledOrRescheduled(data: { clinicName: string; patientName: string; action: "canceled" | "rescheduled"; oldDate: string; newDate?: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading(`Appointment ${data.action}`) +
    para(`<strong>${data.patientName}</strong> has ${data.action} their appointment at <strong>${data.clinicName}</strong>.`) +
    infoCard(
      data.action === "rescheduled" && data.newDate
        ? [{ label: "Previous", value: data.oldDate }, { label: "Rescheduled to", value: data.newDate }]
        : [{ label: "Canceled date", value: data.oldDate }]
    ) +
    ctaButton("View Calendar", data.dashboardUrl)
  return {
    subject: `Appointment ${data.action} — ${data.patientName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderDoctorDailyDigest(data: { doctorName: string; clinicName: string; date: string; appointments: { time: string; patientName: string; reason: string }[]; dashboardUrl: string }): RenderedEmail {
  const rows = data.appointments.length > 0
    ? data.appointments
        .map(a => `<tr>
          <td style="padding:6px 0;font-size:13px;color:#6B8E80;width:100px;">${a.time}</td>
          <td style="padding:6px 0;font-size:13px;color:#1E4638;font-weight:600;">${a.patientName}</td>
          <td style="padding:6px 0;font-size:13px;color:#4A6B5C;">${a.reason}</td>
        </tr>`)
        .join("")
    : `<tr><td colspan="3" style="padding:12px 0;font-size:13px;color:#93A69C;">No appointments scheduled.</td></tr>`

  const body =
    heading(`Schedule for ${data.date}`) +
    para(`Hi Dr. ${data.doctorName}, here's your appointment schedule at <strong>${data.clinicName}</strong>.`) +
    `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"
      style="background:#f4f7f5;border-radius:8px;padding:16px 20px;margin:20px 0;">
      <tr><td>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <th style="text-align:left;font-size:11px;color:#93A69C;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;width:100px;">Time</th>
            <th style="text-align:left;font-size:11px;color:#93A69C;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;">Patient</th>
            <th style="text-align:left;font-size:11px;color:#93A69C;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;">Reason</th>
          </tr>
          ${rows}
        </table>
      </td></tr>
    </table>` +
    ctaButton("Open Calendar", data.dashboardUrl)
  return {
    subject: `Your schedule for ${data.date} — ${data.clinicName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderStaffAppointmentReminder(data: { name: string; clinicName: string; patientName: string; date: string; time: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading("Appointment reminder") +
    para(`Hi ${data.name}, you have an upcoming appointment at <strong>${data.clinicName}</strong>.`) +
    infoCard([
      { label: "Patient", value: data.patientName },
      { label: "Date", value: data.date },
      { label: "Time", value: data.time },
    ]) +
    ctaButton("View Appointment", data.dashboardUrl)
  return {
    subject: `Reminder: ${data.patientName} at ${data.time} — ${data.clinicName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderOverdueInvoiceAlert(data: { name: string; clinicName: string; patientName: string; invoiceId: string; amountDue: string; daysOverdue: number; invoiceUrl: string }): RenderedEmail {
  const body =
    heading("Overdue invoice alert") +
    para(`Hi ${data.name}, invoice <strong>${data.invoiceId}</strong> for <strong>${data.patientName}</strong> at <strong>${data.clinicName}</strong> is ${data.daysOverdue} days overdue.`) +
    infoCard([
      { label: "Invoice ID", value: data.invoiceId },
      { label: "Amount due", value: data.amountDue },
      { label: "Days overdue", value: String(data.daysOverdue) },
    ]) +
    ctaButton("View Invoice", data.invoiceUrl)
  return {
    subject: `Overdue invoice: ${data.invoiceId} (${data.daysOverdue} days)`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderLowStockAlert(data: { name: string; clinicName: string; itemName: string; quantity: number; threshold: number; inventoryUrl: string }): RenderedEmail {
  const body =
    heading("Low stock alert") +
    para(`Hi ${data.name}, stock for <strong>${data.itemName}</strong> at <strong>${data.clinicName}</strong> is below the reorder threshold.`) +
    infoCard([
      { label: "Item", value: data.itemName },
      { label: "Current stock", value: String(data.quantity) },
      { label: "Reorder threshold", value: String(data.threshold) },
    ]) +
    ctaButton("View Inventory", data.inventoryUrl)
  return {
    subject: `Low stock: ${data.itemName} — ${data.clinicName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderPatientWaitingInLobby(data: { name: string; clinicName: string; patientName: string; appointmentTime: string; joinUrl: string }): RenderedEmail {
  const body =
    heading("Patient is waiting in the lobby") +
    para(`Hi ${data.name}, <strong>${data.patientName}</strong> has joined the video consultation lobby for their <strong>${data.appointmentTime}</strong> appointment at <strong>${data.clinicName}</strong>.`) +
    ctaButton("Join Video Call", data.joinUrl)
  return {
    subject: `${data.patientName} is waiting in the lobby — ${data.clinicName}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

export function renderWeeklyClinicSummary(data: { name: string; clinicName: string; weekLabel: string; totalAppointments: number; completedAppointments: number; pendingInvoices: number; totalRevenue: string; dashboardUrl: string }): RenderedEmail {
  const body =
    heading(`Weekly summary — ${data.weekLabel}`) +
    para(`Hi ${data.name}, here's how <strong>${data.clinicName}</strong> performed this week.`) +
    infoCard([
      { label: "Total appointments", value: String(data.totalAppointments) },
      { label: "Completed", value: String(data.completedAppointments) },
      { label: "Pending invoices", value: String(data.pendingInvoices) },
      { label: "Total revenue", value: data.totalRevenue },
    ]) +
    ctaButton("View Dashboard", data.dashboardUrl)
  return {
    subject: `${data.clinicName} — weekly summary for ${data.weekLabel}`,
    html: withPrefs(body, `${APP}/dashboard/settings?tab=notifs`),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.7  Patients — PHI-safe (§3.3)
//
// ⚠️  NO clinical fields in any prop type below.
//     No diagnosis / medication / notes / test results / clinical content.
//     This is enforced by TypeScript prop signatures — not just convention.
//
// ⚠️  ISOLATION (§0.2): clinicName / clinicPhone / clinicEmail MUST come
//     from the specific event's own Clinic relation at the call site.
// ─────────────────────────────────────────────────────────────────────────────

/** Props shared by all patient templates — all PHI-free */
interface PatientBaseProps {
  patientName: string
  /** MUST come from the event's own Clinic relation — never from a cached context */
  clinicName: string
  loginUrl: string
  preferencesUrl: string
}

export function renderPortalAccountCreated(
  data: PatientBaseProps
): RenderedEmail {
  const body =
    heading(`Your patient record at ${data.clinicName}`) +
    para(`Hi ${data.patientName}, a patient record has been created for you at <strong>${data.clinicName}</strong>.`) +
    para("Sign in to the patient portal to view your upcoming appointments and invoices.") +
    ctaButton("Access Patient Portal", data.loginUrl) +
    note("Use your email or phone number to log in — no password required for first access.")
  return {
    subject: `Your patient record at ${data.clinicName} — access the patient portal`,
    html: noPrefs(body, data.clinicName),
  }
}

export function renderPatientLoginCode(
  data: Omit<PatientBaseProps, "preferencesUrl"> & { code: string }
): RenderedEmail {
  const body =
    heading(`Your login code for ${data.clinicName}`) +
    para(`Hi ${data.patientName}, use the code below to sign in to your patient portal. It expires in 10 minutes.`) +
    codeBox(data.code) +
    note("If you did not request this code, you can safely ignore this email.")
  return {
    subject: `${data.code} — your patient portal login code`,
    html: noPrefs(body, data.clinicName),
  }
}

export function renderPatientPasswordSet(
  data: PatientBaseProps
): RenderedEmail {
  const body =
    heading("Password set successfully") +
    para(`Hi ${data.patientName}, your patient portal password for <strong>${data.clinicName}</strong> has been set.`) +
    ctaButton("Sign In", data.loginUrl) +
    note("If you did not set this password, contact support immediately.")
  return {
    subject: `Patient portal — password set for ${data.clinicName}`,
    html: noPrefs(body, data.clinicName),
  }
}

export function renderBookingRequestReceived(
  data: PatientBaseProps & { date: string; time: string }
): RenderedEmail {
  const body =
    heading("Booking request received") +
    para(`Hi ${data.patientName}, we've received your appointment request at <strong>${data.clinicName}</strong>.`) +
    infoCard([
      { label: "Requested date", value: data.date },
      { label: "Requested time", value: data.time },
    ]) +
    para("The clinic will confirm or get in touch with you shortly.") +
    ctaButton("View in Portal", data.loginUrl)
  return {
    subject: `Booking request received — ${data.clinicName}`,
    html: noPrefs(body, data.clinicName),
  }
}

export function renderAppointmentConfirmed(
  data: PatientBaseProps & { date: string; time: string; doctorName: string }
): RenderedEmail {
  const body =
    heading("Appointment confirmed ✓") +
    para(`Hi ${data.patientName}, your appointment at <strong>${data.clinicName}</strong> has been confirmed.`) +
    infoCard([
      { label: "Doctor", value: data.doctorName },
      { label: "Date", value: data.date },
      { label: "Time", value: data.time },
    ]) +
    ctaButton("View Appointment", data.loginUrl)
  return {
    subject: `Appointment confirmed — ${data.clinicName}, ${data.date}`,
    html: withPrefs(body, data.preferencesUrl, data.clinicName),
  }
}

export function renderAppointmentReminder(
  data: PatientBaseProps & { date: string; time: string; doctorName: string; hoursUntil: number }
): RenderedEmail {
  const body =
    heading(`Appointment reminder — in ${data.hoursUntil} hour${data.hoursUntil !== 1 ? "s" : ""}`) +
    para(`Hi ${data.patientName}, you have an appointment at <strong>${data.clinicName}</strong> soon.`) +
    infoCard([
      { label: "Doctor", value: data.doctorName },
      { label: "Date", value: data.date },
      { label: "Time", value: data.time },
    ]) +
    ctaButton("View in Portal", data.loginUrl)
  return {
    subject: `Appointment reminder — ${data.clinicName}, ${data.date}`,
    html: withPrefs(body, data.preferencesUrl, data.clinicName),
  }
}

export function renderAppointmentChangedByClinic(
  data: PatientBaseProps & { changeType: "rescheduled" | "canceled"; newDate?: string; newTime?: string; reason?: string }
): RenderedEmail {
  const body =
    heading(`Appointment ${data.changeType} by ${data.clinicName}`) +
    para(`Hi ${data.patientName}, your appointment at <strong>${data.clinicName}</strong> has been <strong>${data.changeType}</strong>.`) +
    (data.changeType === "rescheduled" && data.newDate
      ? infoCard([
          { label: "New date", value: data.newDate },
          { label: "New time", value: data.newTime || "" },
        ])
      : "") +
    (data.reason ? para(`Reason: ${data.reason}`) : "") +
    ctaButton("View in Portal", data.loginUrl)
  return {
    subject: `Appointment ${data.changeType} — ${data.clinicName}`,
    html: noPrefs(body, data.clinicName),
  }
}

export function renderVideoConsultLink(
  data: PatientBaseProps & { date: string; time: string; joinUrl: string }
): RenderedEmail {
  const body =
    heading("Your video consultation link") +
    para(`Hi ${data.patientName}, here is your secure video consultation link for your appointment at <strong>${data.clinicName}</strong>.`) +
    infoCard([
      { label: "Date", value: data.date },
      { label: "Time", value: data.time },
    ]) +
    ctaButton("Join Video Call", data.joinUrl) +
    note("This link is unique to you and should not be shared. It becomes active 10 minutes before your appointment.")
  return {
    subject: `Video consultation link — ${data.clinicName}, ${data.date}`,
    html: noPrefs(body, data.clinicName),
  }
}

export function renderInvoiceEvent(
  data: PatientBaseProps & { invoiceDisplayId: string; amount: string; status: "created" | "paid" | "due" }
): RenderedEmail {
  const subjectMap = {
    created: `Invoice created — ${data.clinicName}`,
    paid: `Payment confirmed — ${data.clinicName}`,
    due: `Payment due — ${data.clinicName}`,
  }
  const bodyText = {
    created: `An invoice of <strong>${data.amount}</strong> has been created at <strong>${data.clinicName}</strong>.`,
    paid: `Your payment of <strong>${data.amount}</strong> at <strong>${data.clinicName}</strong> has been received. Thank you!`,
    due: `Your invoice of <strong>${data.amount}</strong> at <strong>${data.clinicName}</strong> is due. Please log in to pay.`,
  }
  const body =
    heading(subjectMap[data.status]) +
    para(`Hi ${data.patientName}, ${bodyText[data.status]}`) +
    infoCard([
      { label: "Invoice", value: data.invoiceDisplayId },
      { label: "Amount", value: data.amount },
    ]) +
    ctaButton("View Invoice", data.loginUrl)
  return {
    subject: subjectMap[data.status],
    html: noPrefs(body, data.clinicName),
  }
}

/**
 * PRESCRIPTION_ISSUED — notification only.
 * Per §0.1: no prescription content, drug names, dosage, or diagnosis in this email.
 * Props are structurally enforced to exclude all clinical fields.
 */
export function renderPrescriptionIssued(
  // Explicitly excludes: medication, drug, dosage, diagnosis, notes, condition, items
  data: { patientName: string; clinicName: string; loginUrl: string; preferencesUrl: string }
): RenderedEmail {
  const body =
    heading("You have a new prescription") +
    para(`Hi ${data.patientName}, a new prescription has been issued for you at <strong>${data.clinicName}</strong>.`) +
    para("Log in to the patient portal to view it.") +
    ctaButton("View in Patient Portal", data.loginUrl)
  return {
    subject: `New prescription — ${data.clinicName}`,
    html: withPrefs(body, data.preferencesUrl, data.clinicName),
  }
}

/**
 * RECORD_SHARED — notification only.
 * Per §0.1: no record content, diagnosis, notes, or clinical data in this email.
 */
export function renderRecordShared(
  // Explicitly excludes: diagnosis, notes, prescription, documentUrl, clinical content
  data: { patientName: string; clinicName: string; loginUrl: string; preferencesUrl: string }
): RenderedEmail {
  const body =
    heading("A medical record has been shared with you") +
    para(`Hi ${data.patientName}, <strong>${data.clinicName}</strong> has shared a medical record with you.`) +
    para("Log in to the patient portal to view it.") +
    ctaButton("View in Patient Portal", data.loginUrl)
  return {
    subject: `Medical record shared — ${data.clinicName}`,
    html: withPrefs(body, data.preferencesUrl, data.clinicName),
  }
}

export function renderMissedAppointment(
  data: PatientBaseProps & { date: string; rebookUrl: string }
): RenderedEmail {
  const body =
    heading("We missed you") +
    para(`Hi ${data.patientName}, it looks like you missed your appointment on <strong>${data.date}</strong> at <strong>${data.clinicName}</strong>.`) +
    para("We'd love to help you reschedule at a time that works for you.") +
    ctaButton("Rebook Appointment", data.rebookUrl)
  return {
    subject: `Missed appointment — ${data.clinicName}`,
    html: withPrefs(body, data.preferencesUrl, data.clinicName),
  }
}

export function renderPatientContactChanged(
  data: { patientName: string; clinicName: string; changedField: string; loginUrl: string }
): RenderedEmail {
  const body =
    heading(`Security notice: your ${data.changedField} was updated`) +
    para(`Hi ${data.patientName}, your <strong>${data.changedField}</strong> on the <strong>${data.clinicName}</strong> patient portal has been updated.`) +
    para("If you did not make this change, please contact the clinic immediately.") +
    ctaButton("Sign In to Verify", data.loginUrl)
  return {
    subject: `Security notice — contact info changed at ${data.clinicName}`,
    html: noPrefs(body, data.clinicName),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.8  Platform admin (internal alerts)
// ─────────────────────────────────────────────────────────────────────────────

export function renderNewClinicSignup(data: { clinicName: string; ownerName: string; ownerEmail: string; plan: string; adminUrl: string }): RenderedEmail {
  const body =
    heading("New clinic signup") +
    infoCard([
      { label: "Clinic", value: data.clinicName },
      { label: "Owner", value: data.ownerName },
      { label: "Email", value: data.ownerEmail },
      { label: "Plan", value: data.plan },
    ]) +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] New clinic: ${data.clinicName}`, html: noPrefs(body) }
}

export function renderNewLead(data: { name: string; email: string; message: string; adminUrl: string }): RenderedEmail {
  const body =
    heading("New contact form submission") +
    infoCard([
      { label: "Name", value: data.name },
      { label: "Email", value: data.email },
      { label: "Message", value: data.message.slice(0, 200) + (data.message.length > 200 ? "…" : "") },
    ]) +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] New lead: ${data.name}`, html: noPrefs(body) }
}

export function renderNewBaaRequestPending(data: { clinicName: string; ownerName: string; requestedAt: string; adminUrl: string }): RenderedEmail {
  const body =
    heading("New BAA request pending review") +
    infoCard([
      { label: "Clinic", value: data.clinicName },
      { label: "Submitted by", value: data.ownerName },
      { label: "Submitted at", value: data.requestedAt },
    ]) +
    ctaButton("Review in Admin", data.adminUrl)
  return { subject: `[Admin] BAA request pending — ${data.clinicName}`, html: noPrefs(body) }
}

export function renderBillingEventAlert(data: { clinicName: string; eventType: string; amount?: string; reason?: string; adminUrl: string }): RenderedEmail {
  const body =
    heading("Billing event alert") +
    infoCard([
      { label: "Clinic", value: data.clinicName },
      { label: "Event", value: data.eventType },
      ...(data.amount ? [{ label: "Amount", value: data.amount }] : []),
      ...(data.reason ? [{ label: "Reason", value: data.reason }] : []),
    ]) +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] Billing alert — ${data.clinicName}: ${data.eventType}`, html: noPrefs(body) }
}

export function renderIntegrationFailure(data: { clinicName: string; integration: string; errorMessage: string; adminUrl: string }): RenderedEmail {
  const body =
    heading("Integration failure") +
    infoCard([
      { label: "Clinic", value: data.clinicName },
      { label: "Integration", value: data.integration },
      { label: "Error", value: data.errorMessage },
    ]) +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] Integration failure — ${data.integration} @ ${data.clinicName}`, html: noPrefs(body) }
}

export function renderBackupResult(data: { clinicName: string; result: "success" | "failure"; duration?: string; errorMessage?: string; adminUrl: string }): RenderedEmail {
  const body =
    heading(`Backup ${data.result === "success" ? "completed ✅" : "failed ❌"}`) +
    infoCard([
      { label: "Clinic", value: data.clinicName },
      { label: "Result", value: data.result === "success" ? "Success" : "Failed" },
      ...(data.duration ? [{ label: "Duration", value: data.duration }] : []),
      ...(data.errorMessage ? [{ label: "Error", value: data.errorMessage }] : []),
    ]) +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] Backup ${data.result} — ${data.clinicName}`, html: noPrefs(body) }
}

export function renderSecurityEvent(data: { eventType: string; description: string; userId?: string; occurredAt: string; adminUrl: string }): RenderedEmail {
  const body =
    heading("Security event detected") +
    infoCard([
      { label: "Event type", value: data.eventType },
      { label: "Description", value: data.description },
      ...(data.userId ? [{ label: "User ID", value: data.userId }] : []),
      { label: "Occurred at", value: data.occurredAt },
    ]) +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] Security event: ${data.eventType}`, html: noPrefs(body) }
}

export function renderPromoLimitReached(data: { promoName: string; redemptionLimit: number; adminUrl: string }): RenderedEmail {
  const body =
    heading("Promo redemption limit reached") +
    para(`The promo <strong>${data.promoName}</strong> has reached its redemption limit of <strong>${data.redemptionLimit}</strong>.`) +
    para("No further redemptions will be accepted. You may update the limit in the admin panel.") +
    ctaButton("View in Admin", data.adminUrl)
  return { subject: `[Admin] Promo limit reached — ${data.promoName}`, html: noPrefs(body) }
}
