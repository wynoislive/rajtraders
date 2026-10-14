# 🛡️ RAJ TRADERS — Production Launch & Security Audit Report

**Date:** October 14, 2026  
**Status:** **READY FOR PRODUCTION LAUNCH & DUAL-SYSTEM OPERATION**  
**Target Environments:**
1. **Live Current Stack:** Cloudflare Pages (Public Storefront + Admin Console) + Vercel (API Server) + Supabase (PostgreSQL) + Redis Cloud.
2. **VPS Next Evolution:** Debian 13 VPS (4GB RAM) with Dockerized PostgreSQL 16, Redis 7, Node.js API Gateway, Nginx Reverse Proxy, and Local-to-Cloudflare Edge CDN Image Storage.
3. **Android Client:** Native Kotlin / Jetpack Compose App (`com.rajtraders.shop`) targeting Android SDK 35 (Android 15 ready).

---

## 1. 🔒 Security & Attack Prevention Architecture

### A. DDoS Attack Prevention (Distributed Denial of Service)
* **Layer 3 & Layer 4 (Network/Transport Layer):**
  * Handled automatically by **Cloudflare DNS Proxying** (`sundarvan.xyz` and `api.sundarvan.xyz`). Volumetric SYN floods, UDP amplification, and botnets are blocked at the Cloudflare edge before reaching origin servers.
* **Layer 7 (Application Layer Rate Limiting):**
  * Configured via **multi-tier distributed rate limiters** backed by Redis Cloud (`rate-limit-redis`) with automatic memory fallback:
    * **Global Gateway Limiter:** 120–200 requests/minute per client IP / composite key (`globalLimiter`).
    * **Auth Endpoints:** 10 attempts/minute (`authLimiter`) to block credential stuffing and brute-force attacks.
    * **OTP Verification & Resend:** 5 attempts/minute (`otpLimiter`) to prevent SMS/email gateway budget exhaustion.
    * **Password Recovery:** 3 requests/minute (`recoveryLimiter`) to prevent harassment/spam.
    * **Password Change:** Strictly capped at 5 attempts per 60 minutes (`changePasswordLimiter`).
    * **Checkout & Payment Order Creation:** 20 requests/minute (`checkoutLimiter`) to prevent payment gateway order flooding.
    * **Staff Admin Login:** 5 attempts/minute (`staffLoginLimiter`).
  * **Composite Key Resolution (`resolveCompositeKey`):** Binds rate-limiting to authenticated User IDs, staff session tokens, and sanitized client IP headers (`CF-Connecting-IP`, `X-Forwarded-For`).
  * **Memory Exhaustion Guard:** HTTP request bodies are strictly capped (`express.json({ limit: "1mb" })`).

### B. SQL Injection (SQLi) Prevention
* **100% Parameterized Queries via Drizzle ORM:**
  * Every database interaction in the codebase uses Drizzle ORM query builders (`db.select().from(...).where(eq(...))`).
  * Parameters are sent separately from query strings using native PostgreSQL wire-protocol parameters (`$1`, `$2`), making SQL injection structurally impossible.
  * Zero dynamic raw SQL string interpolation with user input in any route.
  * System boot synchronization (`syncEnvToShopSettings`) uses type-safe parameterized schema updates.

### C. Command Line / Remote Code Execution (RCE) Safety
* **Zero Shell Execution Risk:**
  * Audited: There are **zero occurrences** of `child_process.exec()`, `execSync()`, `spawn()`, or `eval()` in any production API endpoints.
  * User inputs are strictly parsed through JSON/query parsers into typed schemas; no input ever touches a command line or operating system shell.

### D. String Attacks, XSS, CSRF & ReDoS Prevention
* **Cross-Site Scripting (XSS):**
  * **Frontend Immunity:** Both `public-web` and `shop-admin` are built in modern React. React JSX automatically HTML-encodes all dynamic strings before rendering them to the DOM.
  * **Helmet Security Headers:** The `secureGateway` mounts:
    * `Content-Security-Policy (CSP)` restricting script and connect sources.
    * `X-Content-Type-Options: nosniff` preventing MIME-type sniffing attacks.
    * `X-Frame-Options: DENY` preventing clickjacking.
    * `Strict-Transport-Security (HSTS)` forcing HTTPS connections for 1 year.
* **Cross-Site Request Forgery (CSRF):**
  * Protected via `csrfProtection` middleware checking `Sec-Fetch-Site: cross-site`, Bearer authorization header immunity, and strict origin matching against `isAllowedOrigin()`.
* **Regular Expression Denial of Service (ReDoS):**
  * Input validations are constrained with finite character length limits via Zod validators.

---

## 2. 🚀 Live Public Release Checklist (Web Storefront & Admin)

| Category | Status | Action Required |
| :--- | :---: | :--- |
| **Public Storefront** | ✅ Ready | Live checkout, catalog, search, pincode radius checking, cart sync. |
| **Admin Console** | ✅ Ready | Order management, live tracking, dispatch rider assigning, invoice PDFs. |
| **Razorpay Payments** | ⚠️ Switch Keys | Switch from Sandbox Test Key (`rzp_test_...`) to Live Key (`rzp_live_...`) in Admin Settings. |
| **Transactional Email** | ✅ Configured | Hostinger REST Mail API + Nodemailer SMTP configured with HTML templates. |
| **Database** | ✅ Connected | Supabase PostgreSQL pooler connected with self-healing table migrations. |
| **Redis Cache** | ✅ Connected | Redis Cloud cluster active for distributed rate-limiting and sessions. |
| **Cloudflare DNS** | ⚠️ DNS Switch | Ensure A/CNAME records for `sundarvan.xyz`, `admin.sundarvan.xyz`, and `api.sundarvan.xyz` are set to Proxied (Orange Cloud). |

---

## 3. 🖥️ Debian 13 VPS Dual-System Package (`deploy/vps/`)

The repository now contains a self-contained production deployment suite in [`deploy/vps/`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/deploy/vps):

1. **[`docker-compose.yml`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/deploy/vps/docker-compose.yml):**
   * Multi-container stack: `postgres:16-alpine`, `redis:7-alpine`, `rajtraders-api`, and `nginx:alpine`.
   * Internal bridge network with persistent named volumes (`postgres_data`, `redis_data`, `uploads_data`).
2. **[`Dockerfile`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/deploy/vps/Dockerfile):**
   * Minimal Node.js 20 Alpine container with healthchecks and non-root execution.
3. **[`nginx/conf.d/api.sundarvan.xyz.conf`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/deploy/vps/nginx/conf.d/api.sundarvan.xyz.conf):**
   * High-speed static image delivery for `/uploads/` directly from disk with `Cache-Control: public, max-age=31536000, immutable`.
   * Cloudflare CDN edge caching enabled.
   * Real IP restoration via `CF-Connecting-IP`.
4. **[`setup-vps.sh`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/deploy/vps/setup-vps.sh):**
   * 1-click script for Debian 13: updates OS, creates 2GB Swap memory, installs Docker Engine, and configures UFW firewall (ports 22, 80, 443).

---

## 4. 📱 Google Play Store Android Launch Workflow

* **Package ID:** `com.rajtraders.shop`
* **Target SDK:** 35 (Android 15 — Complies with Google Play 2026/2027 Policy)
* **Direct Install Debug APK:** Available at [`READY_TO_INSTALL_APK/RAJ_TRADERS_App.apk`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/READY_TO_INSTALL_APK/RAJ_TRADERS_App.apk)
* **Google Play Release Tools Created:**
  * **[`generate-keystore.bat`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/generate-keystore.bat):** Generates 2048-bit RSA production release keystore (`mobile-android/release.keystore`).
  * **[`build-release-bundle.bat`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/build-release-bundle.bat):** Builds the signed Google Play Android App Bundle (`:app:bundleRelease` → `.aab`).
