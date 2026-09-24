# Data Retention

**Last updated:** 24 September 2026

This page explains how long OpenORDO keeps different kinds of data, what happens when you cancel, and how to get your data out. It supports the [Terms of Service](/legal/terms), the [Privacy Policy](/legal/privacy) and the [Data Processing Agreement](/legal/dpa).

**Important:** For patient and medical data, **the clinic** (not OpenORDO) decides what to keep and for how long, and is responsible for meeting the record-keeping laws that apply to it. OpenORDO keeps that data for as long as your account is active, and deletes it after your account ends according to the schedule below.

---

## 1. Your clinic's responsibilities

Medical record retention laws differ by country, state, specialty and the patient's age. For example, Indian medical council regulations commonly require outpatient records to be kept for at least three years from the last treatment, and other laws or hospital and insurance requirements can require much longer (including longer for minors). US state laws and HIPAA-related rules are different again. **Check what applies to you and export your records before your account ends.** OpenORDO does not act as a legal archive or a long-term medical record custodian after your subscription ends.

## 2. Retention schedule

| Data | While your account is active | After cancellation or deletion |
|---|---|---|
| **Patients, appointments, doctors, invoices, medical records, prescriptions, inventory, uploaded files** (clinic data) | Kept until you delete them or delete the clinic | Export window of 90 days, then permanent deletion from active systems (see Section 4) |
| **Deleted individual records** (for example you delete a patient) | Removed from the application immediately | Removed from backups within the backup cycle (Section 5) |
| **User account data** (name, email, username, role, password hash) | Kept while the account exists | Deleted or anonymised within 30 days after the export window ends, unless we must keep it for a legal reason |
| **Clinic profile and booking page settings** | Kept while active | Deleted with clinic data. The public booking page stops working immediately after cancellation ends access |
| **Verification codes (OTP)** | Short-lived, expire quickly and are deleted after use or expiry | n/a |
| **Video call presence signals** | Held in memory only while a call is open and expire seconds after a participant leaves | n/a |
| **Video call media** | Not recorded by OpenORDO | n/a (see the video provider's policy for transient handling) |
| **Billing, subscription and payment records** | Kept as long as your subscription exists | Kept for **8 years** after the transaction, or as tax, GST, company and accounting law requires |
| **Stripe payment data** | Held by Stripe under its own policies | As Stripe's legal obligations require |
| **Audit log of administrative actions** | Kept | Kept for **3 years** for security, accountability and dispute handling, then deleted |
| **Security and access logs** (IP, browser, sign-in events, errors) | Kept for up to **12 months** | Deleted at the end of that period |
| **Support emails and tickets** | Kept while relevant | Kept for up to **3 years** after the last interaction |
| **Marketing preferences and contact** | Until you unsubscribe or ask to delete | Suppression record kept so we honour your opt-out |
| **Website analytics and cookies** | See [Cookie Policy](/legal/cookies) | See [Cookie Policy](/legal/cookies) |

Periods above are maximums or defaults; we may delete data sooner. If a law, court order or an active dispute requires us to keep data longer, we will keep only what is required and protect it, then delete it when no longer needed.

## 3. What happens when you cancel

1. **Cancel a paid plan:** you keep paid features until the end of the paid period, then your Clinic moves to the free Starter plan. **Your data stays** and remains accessible within Starter limits (existing records can be viewed; you cannot add beyond the limits).
2. **Payment failure:** your plan is downgraded but data is **not deleted** (see [Billing Terms](/legal/billing)).
3. **Suspension:** if we suspend a Clinic for breach or security, data is preserved, but users cannot sign in. We release data for export where the law allows and it is safe to do so.
4. **Add-on ending:** the add-on's features switch off. The data you created stays in your Clinic. Free-text prescriptions in medical records are part of the core product and are unaffected.
5. **Closing your account:** the Owner can request closure. Account closure starts the **90-day export window** and, at the end, deletion (Section 4). The Owner will be emailed before deletion.

## 4. Deletion process

- **Hard deletion:** clinic data is permanently deleted from our production database when the export window ends. Deleting a clinic deletes its patients, appointments, invoices, records, prescriptions, inventory and other clinic-owned data together.
- **Administrative deletion:** deleting a clinic on the admin side requires two-step confirmation (typing the clinic's identifier) and is recorded in the audit log.
- **Confirmation:** on request, we confirm deletion by email.
- **Irreversible:** once data is deleted and the backup cycle has passed, we cannot restore it.

## 5. Backups

Our managed database keeps backups so we can recover from failures. Backups are kept for up to **35 days** and then overwritten. Deleted data may therefore remain in backups until they expire; it is not used, and is not restored except for disaster recovery. If we ever restore from a backup, we re-apply deletions that were requested before the restore.

## 6. Exporting your data

- **Self-service:** the Owner and Admin can export the patient list, appointment history and billing records from Settings.
- **Full export on request:** if you need a fuller export (for example medical records or prescriptions), email [support@openordo.com](mailto:support@openordo.com) from the Owner's address. We will provide it in a common machine-readable format (CSV or JSON) within **10 business days**.
- The export tool may be temporarily disabled platform-wide for maintenance or security. If that happens we will provide the export another way on request.
- Please export before closing or when moving to another system. After the export window ends we cannot help retrieve data.

## 7. Individuals' requests (patients and staff)

- **Patients:** contact your clinic. The clinic can correct or delete the record. OpenORDO forwards requests it receives to the clinic.
- **Clinic users:** you can ask us to access, correct or delete your own account data at [support@openordo.com](mailto:support@openordo.com). We may keep some information where the law requires or for legitimate defence of legal claims.

## 8. Changes

We may update this schedule. If a change would materially shorten how long we keep your data, we will notify Clinic Owners at least 30 days ahead.

## 9. Contact

[support@openordo.com](mailto:support@openordo.com) · OpenORDO, Chandigarh, India
