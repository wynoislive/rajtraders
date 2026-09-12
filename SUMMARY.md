# 🌟 RAJ TRADERS — Complete Platform Summary & Documentation

Welcome to the **RAJ TRADERS** Full-Stack Shopping Platform. This document provides an exhaustive overview of the entire system architecture, key features, security flows, environment variables, deployment instructions, and mobile app details.

---

## 🏛️ Architecture Overview

The system consists of three seamlessly integrated tiers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           RAJ TRADERS PLATFORM                          │
├──────────────────────────┬───────────────────────┬──────────────────────┤
│      Android App         │     Admin Console     │     Backend API      │
│  (Kotlin Jetpack Compose)│     (React + Vite)    │   (Node.js + Express)│
├──────────────────────────┼───────────────────────┼──────────────────────┤
│ • Product Catalog & Prep │ • Catalog & Approvals │ • PGlite / PostgreSQL│
│ • Razorpay Checkout      │ • RBAC Staff & Access │ • Nodemailer SMTP    │
│ • Haversine Geofence     │ • Haversine Radius UI │ • Cloudflare R2      │
│ • 6-Digit Email OTP 2FA  │ • Dynamic Settings    │ • Razorpay Gateway   │
│ • Order History (1 Year) │ • Live Revenue Stats  │ • 15-Day Penalty Log │
└──────────────────────────┴───────────────────────┴──────────────────────┘
```

---

## 🚀 Key Features & Capabilities

### 1. 🔐 Authentication, 2FA & Compliance
- **Nodemailer 6-Digit Email OTP Verification**:
  - Outbound email delivery via `smtp.gmail.com:465` (`notifications.rajtraders@gmail.com`).
  - Branded HTML template with single-use numeric code valid for **10 minutes**.
  - Rate-limited with a 5-attempt security lock.
  - Native verification modal on Android with live resend timer.
- **Universal Domain Registration**:
  - Supports all standard and corporate email domains.
  - Cross-binding validation: 1 phone number + 1 email uniquely bound to 1 identity.
- **Play Store Compliant Account Deletion (`DELETE /api/v1/auth/delete-account`)**:
  - Full data purge endpoint accessible directly from Android Account screen.
  - **15-Day Lockdown Penalty**: Immediate re-registrations forfeit new-user welcome discounts (`WELCOME10`).
- **Nodemailer Password Recovery**:
  - 60-minute single-use cryptographic recovery link.
  - 15-minute anti-spam lockout following a password reset.

---

### 2. 📦 Product Management & Cloudflare R2 Storage
- **Preparation Time Tracking**:
  - Individual prep time assigned per product (e.g. `45 mins`).
  - Rendered on every Android product card (`⏱️ 45m prep`).
- **Public Shareable URLs**:
  - Generates dedicated public URLs: `https://rajtraders.shop/products/:slug`.
  - Android App includes a **Share Button** triggering native `Intent.ACTION_SEND`.
  - Admin Panel features a **Copy Public Share URL** button for each product.
- **Cloudflare R2 Object Storage**:
  - Configured in `/settings` (Account ID, Access Key, Secret Key, Bucket Name, Public CDN URL).
  - Admin image upload route `/api/v1/admin/storage/upload` streams product images directly to Cloudflare R2.
- **End-to-End Encryption**:
  - Sensitive passwords hashed using cryptographic `scrypt` with unique salt and SHA-256 digests.

---

### 3. 🛡️ Role-Based Access Control (RBAC) & Approvals Queue
- **4-Tier Staff Hierarchy**:
  - `MAIN_ADMIN` (Master Administrator): Exclusive authority to invite staff, assign roles, and grant time-bound temporary access.
  - `ADMIN`: Full authority over catalog, discounts, settings, and product approvals.
  - `SUB_ADMIN`: Can draft and edit products; submissions enter `pending_approval` state.
  - `MODERATOR`: Can draft products; submissions require Admin sign-off.
- **Temporary Time-Bound Access**:
  - Main Admin can assign temporary durations (`24 Hours`, `7 Days`, `30 Days`, or `Permanent`).
  - Expired accounts are automatically locked at the API layer.
- **Product Approval Workflow**:
  - Sub-Admin / Moderator additions appear in the **Approvals** tab (`/approvals`).
  - Admins can inspect modifications and click **"Authorize & Publish"** or **"Reject"**.

---

### 4. 💳 Checkout, Debounce & Geospatial Haversine Geofencing
- **Razorpay Sandbox & Production Checkout**:
  - Razorpay Key ID & Secret dynamically loaded from Admin settings / `.env`.
  - Hardware debounce and idempotency locks prevent double charges on rapid clicks.
- **Haversine Geofencing Delivery Radius**:
  - Shop coordinates and delivery radius (in km) configurable in Admin Console.
  - Customer address converted to coordinates; orders beyond the allowed radius are automatically blocked with clear distance warnings.

---

### 5. 📜 Orders & History Tab
- **Multi-Filter Orders Screen**:
  - Real-time order tracking in both Android App and Admin Console.
  - Filter by status: `All`, `Successful`, `Pending`, `Cancelled`.
  - Filter by duration: `Last 30 Days`, `Last 3 Months`, `Last 6 Months`, `Last 1 Year`.

---

## ⚙️ Environment Configuration (`.env`)

The backend automatically loads settings from [`.env`](file:///c:/Users/Dev/Documents/Cake%20Ordering%20App/.env) on startup and syncs them with the local database:

```env
# ─── Server & DB ─────────────────────────────────────────────
PORT=8080
NODE_ENV=development
DATABASE_URL=                          # Empty for local PGlite, or PostgreSQL connection string

# ─── Nodemailer SMTP (Live Credentials) ──────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=notifications.rajtraders@gmail.com
SMTP_PASS=NOTIFICATIONS@RAJ
SMTP_FROM=My Shop <notifications.rajtraders@gmail.com>

# ─── Razorpay Payment Gateway ────────────────────────────────
RAZORPAY_KEY_ID=rzp_test_sandbox123456
RAZORPAY_KEY_SECRET=sandbox_secret

# ─── Cloudflare R2 Object Storage ───────────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=rajtraders-products
R2_PUBLIC_URL=https://pub-r2.rajtraders.shop

# ─── Shop Defaults ───────────────────────────────────────────
SHOP_NAME=RAJ TRADERS
SHOP_ADDRESS=123 Baker Street, Mumbai
SHOP_LATITUDE=19.0760
SHOP_LONGITUDE=72.8777
DELIVERY_RADIUS_KM=15.0
DELIVERY_ENABLED=true
```

---

## 📦 Deployment Guide

To generate a complete, self-contained deployment bundle:

```bash
node deploy-build.mjs
```

This populates the [`deploy/`](file:///c:/Users/Dev/Documents/Cake%20Ordering%20App/deploy) directory:

```
deploy/
├── admin/          ← Drag & drop directly into Cloudflare Pages (Direct Upload)
│   ├── index.html
│   ├── assets/
│   └── favicon.svg
├── api/            ← Standalone Node.js server (dist/ + node_modules/ + .env)
│   ├── dist/index.mjs
│   ├── .env
│   └── package.json
└── README.md
```

### Deploying the Admin Console to Cloudflare Pages:
1. Open the [Cloudflare Pages Dashboard](https://dash.cloudflare.com/?to=/:account/pages).
2. Select **Create a project** → **Direct Upload**.
3. Drag and drop the `deploy/admin/` folder.

### Running the Backend API:
```bash
cd deploy/api
npm start
```

---

## 📱 Android Application

- **APK Location**: [`mobile-android/app/build/outputs/apk/debug/app-debug.apk`](file:///c:/Users/Dev/Documents/Cake%20Ordering%20App/mobile-android/app/build/outputs/apk/debug/app-debug.apk) *(17.9 MB)*
- **App Label**: `RAJ TRADERS`
- **Build Tooling**: Gradle 8.11.1 + Jetpack Compose + JDK 17 (Microsoft HotSpot).
- **To Rebuild APK**:
  ```powershell
  .\build-apk.ps1
  ```
  *(or double-click `build-apk.bat`)*

---

## 🔗 Quick URL Reference

| Service | Address / Path |
|---|---|
| **Admin Console** | [`http://localhost:18085`](http://localhost:18085) |
| **Admin Staff & RBAC** | [`http://localhost:18085/staff`](http://localhost:18085/staff) |
| **Admin Product Approvals** | [`http://localhost:18085/approvals`](http://localhost:18085/approvals) |
| **Admin Store & SMTP Settings** | [`http://localhost:18085/settings`](http://localhost:18085/settings) |
| **Backend API Health Check** | [`http://localhost:8080/api/v1/health`](http://localhost:8080/api/v1/health) |
| **Public Storefront Summary** | [`http://localhost:8080/api/v1/storefront/summary`](http://localhost:8080/api/v1/storefront/summary) |
