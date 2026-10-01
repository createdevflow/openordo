# OpenORDO

Automating the day-to-day of your clinic.

## Getting Started

1. Copy `.env.example` to `.env` and configure your environment variables.
2. Generate an `ENCRYPTION_KEY` for securing credentials (e.g. `openssl rand -hex 32`).
3. Run the development server:
```bash
npm run dev
```

## Security & Credentials

OpenORDO takes security seriously:
- **No secrets ship to the browser**. All sensitive configuration (Razorpay keys, SMTP passwords, Google OAuth secrets) are managed via the Global Settings in the Super Admin dashboard.
- **Encrypted at Rest**: Credentials are encrypted using `AES-256-GCM` before being stored in the database.
- **Masked Display**: In the admin panel, sensitive credentials are masked (e.g., `••••••••1234`). You must authenticate with your Super Admin password to reveal them.
- **Patient Files**: Patient documents are securely stored in a private directory and served via a scoped API (`/api/files/[filename]`) which verifies tenant access controls, preventing unauthorized access.
