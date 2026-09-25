# Cookie Policy

**Last updated:** 24 September 2026

This Cookie Policy explains what cookies and similar technologies OpenORDO uses on our website, sign-in pages, dashboard and public booking pages, and what choices you have. It supplements our [Privacy Policy](/legal/privacy).

**In short:** OpenORDO uses a small number of **essential** cookies to keep you signed in and secure. We do **not** use advertising cookies, and we do not sell or share cookie data for advertising.

---

## 1. What cookies are

Cookies are small text files stored by your browser. Similar technologies include local storage and session storage, which store data in your browser. We refer to all of these as "cookies" on this page.

## 2. Cookies we use

### 2.1 Strictly necessary (always on)

These are required for the service to work and cannot be switched off in our systems. They do not need consent under most laws because they are essential.

| Cookie | Purpose | Duration | Set by |
|---|---|---|---|
| Session token (`authjs.session-token`, `__Secure-authjs.session-token` on HTTPS) | Keeps you signed in and carries your session (user, role, clinic, onboarding step) | Session, up to 30 days | OpenORDO (Auth.js) |
| CSRF token (`authjs.csrf-token`, `__Host-authjs.csrf-token`) | Protects sign-in and forms against cross-site request forgery | Session | OpenORDO (Auth.js) |
| Callback URL (`authjs.callback-url`) | Remembers where to send you after you sign in | Session | OpenORDO (Auth.js) |
| OAuth state / PKCE cookies (`authjs.state`, `authjs.pkce.code_verifier`) | Secure the "Continue with Google" sign-in flow | Minutes | OpenORDO (Auth.js) |
| Signup intent (for example `intent=video-consultation`) | Remembers which add-on you clicked before you registered, so we can take you to it after onboarding | Short-lived (up to 24 hours) | OpenORDO |
| Interface preferences (for example the last active Settings tab, theme, and dismissed banners) | Remembers simple display choices on your device | Up to 12 months | OpenORDO (browser storage) |
| Security and load balancing cookies | Routing and protecting the service from abuse | Session | Hosting provider |

### 2.2 Third-party cookies on specific pages

| Provider | When | Purpose |
|---|---|---|
| **Stripe** | On Stripe's hosted checkout and billing portal pages (which are on Stripe's domain) | Fraud prevention, payment security and session management. Governed by Stripe's own cookie policy. |
| **Google** | When you choose "Continue with Google" | Google sets its own cookies on Google's sign-in page. Governed by Google's policies. |
| **Video provider** (Video Provider) | Only during a video consultation, if the clinic uses that add-on | Connection quality and session management for the call. |

Fonts (Fraunces, Inter and JetBrains Mono) are bundled with the application and are not loaded from an external font service when you use OpenORDO, so no font provider cookie is set.

### 2.3 Analytics and marketing

- **Advertising cookies:** none.
- **Analytics:** OpenORDO does not currently use third-party analytics cookies on the dashboard. If we introduce privacy-friendly analytics on our marketing pages, we will update this table and, where the law requires, ask for consent first.
- **Patients using a booking page:** we do not place any tracking or advertising cookies on a clinic's public booking page. The clinic cannot add third-party trackers through OpenORDO's booking page settings.

## 3. Your choices

- **Essential cookies** are needed to sign in and use the dashboard. If you block them, you will not be able to sign in.
- **Browser controls:** you can view, block and delete cookies in your browser settings. Blocking essential cookies will break sign-in.
- **Signing out** removes your session cookie.
- **Analytics** (if we enable it): where the law requires consent (for example EU/UK), we will ask before setting analytics cookies and you can change your mind at any time through the cookie settings link in the footer.
- **Do Not Track** and Global Privacy Control signals: we do not use cookies for cross-site tracking, so these signals do not change what we do.

## 4. Local and session storage

We may store non-sensitive interface state (like the currently selected tab or an unsent draft of your form) in your browser's local or session storage. This data stays on your device and is not used to identify you across sites. **We never store patient records, passwords or payment details in browser storage.**

## 5. Changes to this policy

We will update this page if we add or change cookies, and will ask for consent where the law requires it before using new non-essential cookies.

## 6. Contact

[support@openordo.com](mailto:support@openordo.com) · OpenORDO, Chandigarh, India
