# RAJ TRADERS — Deployment Package

## 📦 Structure

```
deploy/
├── api/          ← Node.js backend (Express + PGlite)
│   ├── dist/     ← Compiled server bundle
│   ├── .env      ← Your environment variables (EDIT THIS)
│   └── package.json
└── admin/        ← Static admin console (drag-and-drop to Cloudflare Pages)
```

## 🚀 Deploy Backend (API Server)

### Option A: Any VPS / Cloud VM
```bash
cd deploy/api
cp .env.example .env   # Edit with your real credentials
npm install --omit=dev
node dist/index.mjs    # or use PM2: pm2 start dist/index.mjs
```

### Option B: Cloudflare (via Tunnel or VPS behind Cloudflare)
1. Upload the `api/` folder to your server
2. Configure `.env` with your SMTP, Razorpay, and R2 credentials
3. Run `node dist/index.mjs`
4. Point your Cloudflare DNS / Tunnel to your server's port

## 🎨 Deploy Admin Console (Cloudflare Pages)

1. Go to [Cloudflare Dashboard → Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Click **"Create a project"** → **"Direct Upload"**
3. **Drag and drop** the entire `admin/` folder
4. Set the API URL in your admin console's environment

## 📱 Android APK

The APK is located at:
`mobile-android/app/build/outputs/apk/debug/app-debug.apk`

## 🔐 Environment Variables

See `.env.example` for all configurable values:
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` → Nodemailer email verification
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` → Payment gateway
- `R2_*` → Cloudflare R2 object storage
- `DATABASE_URL` → PostgreSQL (leave empty for local PGlite)
