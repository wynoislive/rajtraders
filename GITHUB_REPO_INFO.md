# 🐙 GITHUB REPOSITORY INFORMATION — RAJ TRADERS

## 🌐 Repository Metadata
- **GitHub Remote URL**: [https://github.com/wynoislive/rajtraders.git](https://github.com/wynoislive/rajtraders.git)
- **Primary Branch**: `main`
- **Latest Commit**: `d26145f9122aadcc5e853c91478752cc89a33473`
- **Owner / Account**: `wynoislive`

---

## 🏛️ Repository Architecture & Workspaces

The repository is structured as an enterprise-grade monorepo containing the following components:

```
c:\Users\Administrator\Desktop\RAJ_TRADERS_Full_Codebase\RAJ_TRADERS_Full_Codebase
├── artifacts/
│   ├── api-server/         # Express REST API Backend (Node.js, TypeScript, Zod, Drizzle ORM)
│   ├── public-web/         # Customer-Facing Storefront Web App (React 18, Vite, Swiggy UI/UX)
│   └── shop-admin/         # Admin Management Console (React 18, Vite, RBAC, Approvals)
├── lib/
│   ├── db/                 # Drizzle ORM Database Schemas & Migrations (PostgreSQL / PGlite)
│   └── api-zod/            # Shared Zod Validation Schemas across APIs and Web apps
├── mobile-android/         # Native Android Application (Kotlin, Jetpack Compose, Gradle)
├── deploy/                 # Self-contained build package for API backend & static frontends
├── deploy-build.mjs        # Automated deployment build & packaging script
├── build-apk.ps1           # Automated Android APK compilation script
└── scripts/
    └── references-api/     # API references & feature checklist (CHECKLIST.MD)
```

---

## 🚀 Key Features Implemented

1. **Swiggy-Inspired Customer Storefront (`/`)**:
   - Custom customizable Swiggy footer (Company, Support, Location, Social links managed via DB `shop_settings`).
   - Sticky Header with live Cart count & unread Notification Bell drawer.
   - Veg/Non-Veg badges (🟢/🔺), Bestseller chip (⭐), price range pills, & catalog sorting (Relevance, Price Low↔High, Newest, Bestseller).
   - Instant Search modal with recent search chips (`localStorage`) & auto-complete suggestions.
   - Dedicated Product detail pages (`/products/:slug`).

2. **Full-Page Customer Portal (`/account`)**:
   - Navigation sidebar: Orders History, Saved Addresses, Wishlist/Favorites, Settings & Security, Profile details.
   - Address Management with Mapbox reverse geocoding & HTML5 Geolocation fallback.
   - Orders tab with status tracking, reorder, invoice breakdown, & support button.

3. **Backend API & Server-Authoritative Logic**:
   - Dynamic fee structure: Subtotal + Packaging Fee + Delivery Fee - Coupon Discounts.
   - Server-authoritative inventory & price checks at checkout returning `409 Conflict` on stale cart changes.
   - Admin-configurable Cash on Delivery (COD) toggle & Razorpay online payments.
   - Dynamic store status toggle (`is_store_open`).

4. **Admin Management Dashboard**:
   - Store settings editor for fees, store status, COD, footer social links, & customizable address text.
   - Product catalog management with Veg/Non-Veg & Bestseller toggles.
   - Multi-tier Role-Based Access Control (RBAC) & product approval workflow.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` in the root or `artifacts/api-server/` directory:

```env
# ─── Server & DB ─────────────────────────────────────────────
PORT=8080
NODE_ENV=production
DATABASE_URL=                          # Empty for local PGlite, or PostgreSQL connection string

# ─── Payment Gateway ─────────────────────────────────────────
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# ─── Nodemailer SMTP (Email OTP & Account Recovery) ──────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=notifications.rajtraders@gmail.com
SMTP_PASS=NOTIFICATIONS@RAJ
SMTP_FROM=RAJ TRADERS <notifications.rajtraders@gmail.com>

# ─── Cloudflare R2 Object Storage ───────────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=rajtraders-products
R2_PUBLIC_URL=https://pub-r2.rajtraders.shop
```

---

## 🛠️ Build & Deployment Instructions

### 1. Build Web Applications & API Server
```bash
# Build Public Storefront
pnpm --filter @workspace/public-web build

# Build Admin Console
pnpm --filter @workspace/shop-admin build

# Build API Server
pnpm --filter @workspace/api-server build
```

### 2. Package Production Artifacts
```bash
node deploy-build.mjs
```
*Outputs compiled API bundle to `deploy/api` and static frontend web assets to `deploy/admin`.*

### 3. Build Android APK
```powershell
.\build-apk.ps1
```
*Outputs APK to `mobile-android/app/build/outputs/apk/debug/app-debug.apk`.*

---

## 📜 Recent Commits & History
- `d26145f`: Full E-Commerce Platform Upgrade (Swiggy footer, full customer profile `/account`, Mapbox/OSM geolocation, catalog sorting/filtering, wishlist, notifications, cart fee calculations, COD toggle)
- `46fc9db`: Replace native browser alerts with in-modal success banners and floating Toast notifications
- `84caa6e`: Remove upper duplicate Forgot Password button, keeping single bottom link
- `a26145f`: Remove admin console link from public storefront empty catalog state
- `bf9e8e9`: Make Forgot Password button prominent on Sign In modal with 60-min link & OTP
