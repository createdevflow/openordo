# Security & Trust

**Last updated:** 24 September 2026

Clinics trust OpenORDO with some of the most sensitive information there is. This page explains, in plain language, how we protect it, what we do, and what we ask you to do. We keep it factual: we describe controls that are in place, and we do not claim certifications we have not earned.

---

## 1. Our approach

- **Least privilege:** people and systems get only the access they need.
- **Isolation by design:** each Clinic's data is separated from other Clinics.
- **Defence in depth:** several layers (application, database, infrastructure, people, vendors) so one failure does not expose data.
- **Accountability:** administrative actions are recorded and destructive actions need explicit confirmation.
- **Vendor discipline:** we use well-known, specialised providers for hosting, payments, email and video, and do not build risky things ourselves (for example, we use a hosted video provider, not our own real-time media stack).

## 2. Architecture overview

OpenORDO is a web application built on Next.js and TypeScript, deployed on managed cloud hosting. Data is stored in a managed PostgreSQL database. Payments run on Stripe. Email is sent through a transactional email provider. Video consultations run on a hosted video provider. 

## 3. Tenant isolation

OpenORDO is multi-tenant. Every clinic-owned record (patients, appointments, doctors, invoices, medical records, prescriptions, inventory, booking configuration) carries the identifier of the clinic that owns it. **Every read and write in the application is scoped to the signed-in user's clinic** through a shared data-access layer, and server actions check the session's clinic before touching data. Users cannot query another clinic's data through the application.

## 4. Identity and access management

### 4.1 Sign-in
- **Email and password:** passwords are stored only as salted one-way hashes (bcrypt); we cannot read them. New email accounts must verify ownership of their email with a one-time code before first login.
- **Google sign-in:** we rely on Google's authentication and only receive your name, email and profile image. We do not see your Google password. If the same email already exists, the Google identity is linked to the existing account instead of creating a duplicate.
- **Sessions:** signed session tokens carry your user, role and clinic. Deactivated users are blocked from signing in.

### 4.2 Roles
| Role | Access |
|---|---|
| Owner | Full access, billing and plan management, deleting the clinic |
| Admin | Everything except billing/plan changes and deleting the clinic |
| Doctor | Own appointments, patients and records; limited settings |
| Front Desk | Patients, appointments and billing; no editing of medical records, no settings |

Authorisation is enforced **on the server**, not only by hiding buttons in the interface.

### 4.3 OpenORDO staff
A small number of authorised staff have platform administrator ("Super Admin") access. This is a separate role, protected by server-side checks on every administrative action. The admin area is not discoverable to ordinary users (non-admins receive a not-found response). Promoting or demoting administrators requires explicit confirmation, and the last remaining administrator cannot be demoted.

## 5. Data protection

- **In transit:** all connections to OpenORDO use HTTPS/TLS.
- **At rest:** our database and storage providers encrypt data at rest.
- **Secrets:** API keys and credentials are held in environment configuration on the hosting platform, not in the source code.
- **Backups:** the managed database is backed up automatically. Backup windows are described in [Data Retention](/legal/retention).
- **Data minimisation:** we collect only what is needed to provide the service. Card details never touch our servers.
- **Exports:** clinics can export their own data (patients, appointments, billing) so nothing is locked in.

## 6. Payments security

Payments are handled by Stripe, a payment provider that is certified to the PCI-DSS Level 1 standard. OpenORDO never receives or stores full card numbers. Stripe events that update subscriptions (for example payment success, failure or cancellation) are received through signed webhooks that we verify before acting.

## 7. Video consultation security (add-on)

- Video and audio are carried by a specialist hosted video provider, not by OpenORDO servers.
- Each appointment gets its own room identifier; only people with the link and access can enter.
- OpenORDO does **not** record consultations.
- While a call is open, participants exchange brief presence signals (who is connected, camera/mic on or off) so the screen is accurate. They expire automatically shortly after a participant leaves.
- Turning the camera off in the call screen releases the camera hardware, so the browser's recording indicator turns off.
- Encryption of the media stream is provided by the video provider; see their documentation for details.

## 8. Application security practices

- Input validation on client and server with shared schemas.
- Framework protections against common web attacks (for example cross-site request forgery protection for authentication, output escaping).
- Dependency updates and review of security advisories for the frameworks we use.
- Separate environments for development, staging and production.
- Destructive administrative actions (suspending, deleting, role changes, feature switches) require explicit confirmation, and the most dangerous ones require typing the name of the record to proceed.
- No browser pop-up dialogs are used for confirmations, so confirmations cannot be silently bypassed by a script.

## 9. Logging, monitoring and audit

- **Audit log:** every state-changing administrative action records who did it, what changed, the target, a timestamp and (where relevant) a reason.
- **Payment log:** payment events are mirrored for reconciliation.
- **Operational monitoring:** we monitor errors and availability of the service.
- We do not put patient content in operational logs.

## 10. Availability and resilience

We run on managed, redundant cloud infrastructure with automated backups. We can place the platform in **maintenance mode** for planned work; administrators keep access. We aim for high availability but we do not currently offer a contractual uptime guarantee (SLA) on Starter or Practice. Clinic Group customers may ask about SLA terms at [support@openordo.com](mailto:support@openordo.com).

## 11. Incident response

We have a process to detect, triage, contain, investigate and learn from security incidents. If a personal data breach affects your Clinic, we will notify the Owner **without undue delay and within 72 hours** of becoming aware of it, as set out in the [DPA](/legal/dpa), with the facts we have and what we are doing. Where a HIPAA BAA applies, the [BAA](/legal/hipaa) timeline applies.

## 12. Vendor (sub-processor) management

We choose providers that publish security documentation, bind them with data processing terms. We give 30 days' notice before adding a new one.

## 13. Compliance position

Being clear about what we do and do not claim:

- **India:** we design the service to support clinics' obligations under the Digital Personal Data Protection Act, 2023 and the Information Technology Act, 2000 and its reasonable security practices rules.
- **GDPR/UK GDPR:** the [DPA](/legal/dpa) includes processor commitments and Standard Contractual Clauses.
- **HIPAA:** for US covered entities and business associates on eligible plans, a [Business Associate Agreement](/legal/hipaa) is available. HIPAA compliance is a shared responsibility; using OpenORDO does not by itself make a clinic HIPAA compliant.
- **Certifications:** OpenORDO does not currently advertise third-party security certifications such as SOC 2 or ISO 27001. Our infrastructure and payment providers hold their own certifications. We will list ours here when we have them.

## 14. What we ask of you (shared responsibility)

Security is shared. Please:

1. Use strong, unique passwords or Google sign-in with two-step verification on your Google account.
2. Give each person their own login and the lowest suitable role.
3. Remove users who leave, and review your team list regularly.
4. Sign out on shared computers and keep devices, browsers and operating systems updated.
5. Only share video-call links with the intended participant.
6. Do not put unnecessary sensitive data (card numbers, passwords, government IDs) in notes.
7. Tell us right away at [support@openordo.com](mailto:support@openordo.com) if you suspect unauthorised access.

## 15. Reporting a vulnerability

Please email **[support@openordo.com](mailto:support@openordo.com)**. Our responsible disclosure rules are in the [Acceptable Use Policy](/legal/acceptable-use#7-reporting-security-issues-responsible-disclosure). We acknowledge reports within 2 business days.

## 16. Contact

Contact: [support@openordo.com](mailto:support@openordo.com) · OpenORDO, Chandigarh, India
