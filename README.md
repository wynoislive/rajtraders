# RAJ TRADERS — Full Codebase

Gourmet Bakery & Artisanal Cakes E-Commerce System with Express API Backend, Drizzle ORM Database, Admin Dashboard, and Jetpack Compose Android Mobile App.

## 🚀 Key Features

- **Backend API**: Node.js, Express, TypeScript, Zod validation, Pino structured logging.
- **Database**: PostgreSQL (Supabase / PGlite) with Drizzle ORM, optimized indexes, and schema definitions.
- **Authentication & Security**:
  - Nodemailer Email OTP (10-minute validity) & Password Recovery (60-minute single-use links).
  - Two-Factor Authentication (TOTP 2FA) with RFC 6238, AES-256-GCM secret encryption, and emergency recovery codes.
  - Redis Cloud distributed session management & Redis-backed rate limiters.
- **Email System**: Hostinger Mail API integration (`wyno@justbuyme.in`) with Nodemailer SMTP fallback & BullMQ async queueing.
- **Android App**: Jetpack Compose Native App with TOTP 2FA setup/verification, product preparation time tracking, and public link sharing.

## 📁 Repository Structure

```
├── artifacts/
│   ├── api-server/         # Express REST API Server
│   └── admin-panel/        # Admin Panel Dashboard
├── lib/
│   ├── db/                 # Drizzle ORM Schemas & Database Client
│   └── api-zod/            # Shared Zod Validation Schemas
└── mobile-android/         # Native Android App (Kotlin + Compose)
```

## 🛠️ Getting Started

```bash
# Install dependencies
npm install

# Build API Server
npm run build --workspace=@workspace/api-server

# Start Development Server
npm run dev --workspace=@workspace/api-server
```
