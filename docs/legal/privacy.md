# Privacy Policy

**Last updated:** 24 September 2026

This Privacy Policy explains how **OpenORDO** ("**OpenORDO**", "**we**", "**us**") collects, uses, shares and protects personal data when you visit our website, create an account, or use the OpenORDO clinic management service.

**Two roles matter here, and this policy is careful to separate them:**

1. **OpenORDO as a controller (data fiduciary)**: for data about our own customers and website visitors, for example clinic owners, staff, billing contacts and people who contact us.
2. **OpenORDO as a processor (data processor / business associate)**: for **patient and clinic data** that clinics enter into OpenORDO. Each clinic decides why and how that data is used. If you are a patient of a clinic, the clinic is responsible for your data; see Section 10.

---

## 1. Data we collect about clinic users (our customers)

### 1.1 Account and profile data
- Name, email address, and a hashed password (we never store your password in readable form).
- If you sign in with **Google**, we receive your name, email address and profile image from Google. We do not receive your Google password.
- A unique **username** generated for you, your role (Owner, Admin, Doctor, Front Desk) and platform role.
- Verification data such as one-time email codes and their timestamps.
- Onboarding progress and preferences (for example which step you reached).

### 1.2 Clinic profile
Clinic name, type/specialty, phone, address, working hours, region, and public booking page settings (logo, cover image, tagline, about text, social links, bookable doctors, appointment types).

### 1.3 Billing data
Plan, add-ons, billing cycle, subscription status, invoice and payment history (amount, currency, status, dates, Stripe references). **Card details are entered on Stripe's hosted pages; we do not receive or store your full card number.** We may see the card brand, last four digits and expiry shown by Stripe.

### 1.4 Usage, device and security data
Log data such as IP address, browser and device type, pages requested, timestamps, error reports and authentication events. Administrative actions on the platform are recorded in an audit log. We use this to keep the service secure, prevent abuse and fix bugs.

### 1.5 Communications
Messages you send to support, feedback, survey responses, and emails we send you (verification codes, invites, billing notices, trial or renewal reminders).

### 1.6 Cookies
We use a small number of cookies, mostly essential. See the [Cookie Policy](/legal/cookies).

## 2. Data we process on behalf of clinics (patient and clinical data)

Clinics may enter the following into OpenORDO. We process it only on the clinic's instructions:

- **Patient details:** name, age, gender, phone, email, address, blood group, allergies, current condition or reason for care.
- **Appointments:** date, time, duration, doctor, reason for visit, status; and for video visits, the appointment's video room reference.
- **Medical records:** diagnosis, prescription text and clinical notes; with the E-Prescriptions add-on, structured prescription items (drug, dosage, frequency, duration, notes).
- **Invoices:** line items, amounts, paid/unpaid status.
- **Inventory** (with the Inventory add-on): items, quantities, thresholds and stock movements.
- **Uploads** (where enabled): logos, images and patient documents.
- **Doctor and staff information:** name, specialty, contact details, working days.

This information can include **health data**, which is sensitive. It is stored in the clinic's private workspace and is only accessible to that clinic's authorised users and, where strictly necessary, to authorised OpenORDO personnel as described in Section 6.

### Video consultations
If a clinic uses Video Consultation, audio and video are transmitted in real time through a third-party video provider used by OpenORDO. While a call is in progress, OpenORDO also exchanges brief **presence signals** (for example who has joined, and whether each person's camera and microphone are on) so both sides see an accurate status; these signals expire shortly after the call ends. **OpenORDO does not record video or audio of consultations.** Consultation notes typed during a call are treated as medical record data.

## 3. How we use personal data and our legal bases

| Purpose | Data | Basis (GDPR/UK) | India (DPDP Act) |
|---|---|---|---|
| Create and run your account and Clinic | Account, clinic profile | Contract | Consent / legitimate use for services you requested |
| Provide the Service to clinics (patients, appointments, records, invoices) | Clinic data | Contract, as processor on clinic's instructions | Processing on behalf of the fiduciary |
| Process payments and manage subscriptions | Billing data | Contract; legal obligation | Legitimate use; compliance with law |
| Send service emails (OTP, invites, billing, security) | Contact, account | Contract; legitimate interests | Legitimate use |
| Secure the platform, prevent fraud and abuse, audit admin actions | Log and security data | Legitimate interests; legal obligation | Legitimate use; security safeguards |
| Improve the product using aggregated or de-identified usage | Usage data | Legitimate interests | Consent / legitimate use |
| Marketing about OpenORDO (opt-out any time) | Contact | Consent / legitimate interests | Consent |
| Comply with law, enforce our terms, respond to lawful requests | Any | Legal obligation; legitimate interests | Compliance with law |

We do **not** sell personal data, and we do **not** use patient data for advertising or to build advertising profiles. We do not use clinic or patient data to train generative AI models.

## 4. Who we share data with

- **Sub-processors** that help us run the Service (hosting, database, payments, email, video, sign-in, storage).  They are bound by written data protection terms.
- **Within a Clinic**: your Clinic's Owner and Admins can see the accounts and activity of users in that Clinic.
- **Payments**: Stripe acts as an independent controller for certain payment, fraud and compliance data.
- **Legal and safety**: where required by law, court order or to protect rights, safety and security. We will notify the affected clinic where permitted.
- **Business transfers**: in a merger, acquisition or sale of assets, subject to equivalent privacy commitments.
- **With your direction**: for example when you publish a public booking page, the information you choose to show is public.

## 5. International transfers

OpenORDO's infrastructure providers may process data in India, the United States, the European Union or other locations, depending on the region configured for hosting. Where personal data leaves India, the EEA or the UK, we rely on appropriate safeguards such as Standard Contractual Clauses, transfers permitted under the DPDP Act and its rules, and contractual commitments from sub-processors. The hosting region for your Clinic data is: **the locations configured for the service**.

## 6. Access by OpenORDO personnel

Access to Customer Data is limited to authorised personnel with a need to know (for example to resolve a support request you raise or investigate a security incident). Platform administration actions (suspending a clinic, changing plans, granting add-ons, changing roles) are logged. We do not browse clinical content for any other purpose.

## 7. Retention

We keep personal data only as long as needed for the purposes above or as required by law. Key periods:

- **Clinic data:** while your account is active; after cancellation or deletion, a limited export window, then permanent deletion.
- **Billing and tax records:** kept for the period required by law.
- **Security logs and audit logs:** kept for a limited period for security and accountability.

Detailed timelines are in [Data Retention](/legal/retention).

## 8. Security

We use safeguards including encrypted connections (TLS), hashed passwords, per-clinic data isolation, role-based access control, server-side authorisation checks, verified payment webhooks, audit logging and access restrictions on infrastructure. No system is perfectly secure, and you should also protect your own credentials and devices. See [Security & Trust](/legal/security). We will notify affected clinics and, where required, regulators, of personal data breaches in line with the [DPA](/legal/dpa).

## 9. Your rights

Depending on where you live, you may have the right to access, correct, delete or export your personal data, restrict or object to processing, withdraw consent, nominate someone to exercise rights on your behalf (India), and lodge a complaint with a regulator (for example the Data Protection Board of India or an EU/UK supervisory authority).

- To exercise rights over **your own account data**, email [support@openordo.com](mailto:support@openordo.com) or use Settings where available. We may need to verify your identity.
- We will respond within the time required by law (generally within 30 days).
- **Grievance Officer (India):** Founder and Data Protection contact, [support@openordo.com](mailto:support@openordo.com), Chandigarh, India. We aim to acknowledge complaints within 48 hours and resolve them within 30 days.

## 10. If you are a patient of a OpenORDO clinic

Your clinic decides what is recorded about you and why. OpenORDO only provides the software. To access, correct or delete your health records, or to withdraw consent, **contact your clinic directly**. If you contact us, we will direct your request to the clinic (we cannot act on it without the clinic's authorisation, since we do not control the records). Clinics may be required by law to retain certain records even after you ask for deletion.

## 11. Children

OpenORDO is not directed to children and children cannot create accounts. Clinics may record data about minor patients; the clinic is responsible for obtaining verifiable consent from a parent or guardian where the law requires it.

## 12. Automated decisions

OpenORDO does not make decisions about individuals that produce legal or similarly significant effects based solely on automated processing.

## 13. Third-party links

Our site or a clinic's booking page may link to other websites. We are not responsible for their privacy practices.

## 14. Changes to this policy

We may update this policy. We will post the new version here with the updated date and, for material changes, notify account Owners by email or in-app at least 30 days beforehand where practicable.

## 15. Contact

**OpenORDO**
Chandigarh, India
Contact: [support@openordo.com](mailto:support@openordo.com)
