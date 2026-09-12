/**
 * deploy-build.mjs
 * Creates a self-contained deployment package in /deploy that can be
 * drag-and-dropped to Cloudflare Pages, a VPS, or any Node.js host.
 * 
 * Output structure:
 *   deploy/
 *   ├── api/                  ← Backend (Node.js server)
 *   │   ├── dist/             ← Compiled server bundle
 *   │   ├── node_modules/     ← Production dependencies only
 *   │   ├── package.json      ← Minimal production package.json
 *   │   └── .env.example      ← Template for environment variables
 *   └── admin/                ← Admin Console (static files for Cloudflare Pages)
 *       └── (Vite build output)
 */

import { execSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DEPLOY_DIR = path.join(ROOT, "deploy");

console.log("🚀 RAJ TRADERS — Production Deployment Builder\n");

// ── Step 1: Clean previous deploy ────────────────────────────
console.log("1️⃣  Cleaning previous deploy folder...");
rmSync(DEPLOY_DIR, { recursive: true, force: true });
mkdirSync(path.join(DEPLOY_DIR, "api"), { recursive: true });
mkdirSync(path.join(DEPLOY_DIR, "admin"), { recursive: true });

// ── Step 2: Build API Server ─────────────────────────────────
console.log("2️⃣  Building API server bundle...");
execSync("node artifacts/api-server/build.mjs", { cwd: ROOT, stdio: "inherit" });

// Copy compiled bundle
cpSync(
  path.join(ROOT, "artifacts/api-server/dist"),
  path.join(DEPLOY_DIR, "api/dist"),
  { recursive: true }
);

// Create minimal production package.json
const prodPackageJson = {
  name: "rajtraders-api",
  version: "1.0.0",
  private: true,
  type: "module",
  scripts: {
    start: "node --enable-source-maps dist/index.mjs",
  },
  dependencies: {
    "@electric-sql/pglite": "^0.5.8",
    dotenv: "^17.4.2",
    nodemailer: "^9.0.6",
    pg: "^8.22.0",
  },
  engines: {
    node: ">=20.0.0",
  },
};

writeFileSync(
  path.join(DEPLOY_DIR, "api/package.json"),
  JSON.stringify(prodPackageJson, null, 2)
);

// Copy .env.example
if (existsSync(path.join(ROOT, ".env.example"))) {
  copyFileSync(
    path.join(ROOT, ".env.example"),
    path.join(DEPLOY_DIR, "api/.env.example")
  );
}

// Copy .env if it exists (user can remove before sharing)
if (existsSync(path.join(ROOT, ".env"))) {
  copyFileSync(
    path.join(ROOT, ".env"),
    path.join(DEPLOY_DIR, "api/.env")
  );
}

// Install production dependencies in deploy/api
console.log("3️⃣  Installing production dependencies in deploy/api...");
execSync("npm install --omit=dev --ignore-scripts", {
  cwd: path.join(DEPLOY_DIR, "api"),
  stdio: "inherit",
});

// ── Step 4: Build Public Web Storefront & Admin Console ─────
console.log("4️⃣  Building Public Web Storefront & Admin Console...");
try {
  mkdirSync(path.join(DEPLOY_DIR, "web"), { recursive: true });
  execSync("pnpm --filter @workspace/public-web build", { cwd: ROOT, stdio: "inherit" });
  cpSync(path.join(ROOT, "artifacts/public-web/dist/public"), path.join(DEPLOY_DIR, "web"), { recursive: true });

  mkdirSync(path.join(DEPLOY_DIR, "admin"), { recursive: true });
  execSync("pnpm --filter @workspace/shop-admin build", { cwd: ROOT, stdio: "inherit" });
  cpSync(path.join(ROOT, "artifacts/shop-admin/dist/public"), path.join(DEPLOY_DIR, "admin"), { recursive: true });
} catch (e) {
  console.warn("⚠️  Frontend builds failed:", e.message);
}

// ── Step 5: Create deployment README ─────────────────────────
console.log("5️⃣  Creating deployment README...");
const readme = `# RAJ TRADERS — Deployment Package

## 📦 Structure

\`\`\`
deploy/
├── api/          ← Node.js backend (Express + PGlite)
│   ├── dist/     ← Compiled server bundle
│   ├── .env      ← Your environment variables (EDIT THIS)
│   └── package.json
└── admin/        ← Static admin console (drag-and-drop to Cloudflare Pages)
\`\`\`

## 🚀 Deploy Backend (API Server)

### Option A: Any VPS / Cloud VM
\`\`\`bash
cd deploy/api
cp .env.example .env   # Edit with your real credentials
npm install --omit=dev
node dist/index.mjs    # or use PM2: pm2 start dist/index.mjs
\`\`\`

### Option B: Cloudflare (via Tunnel or VPS behind Cloudflare)
1. Upload the \`api/\` folder to your server
2. Configure \`.env\` with your SMTP, Razorpay, and R2 credentials
3. Run \`node dist/index.mjs\`
4. Point your Cloudflare DNS / Tunnel to your server's port

## 🎨 Deploy Admin Console (Cloudflare Pages)

1. Go to [Cloudflare Dashboard → Pages](https://dash.cloudflare.com/?to=/:account/pages)
2. Click **"Create a project"** → **"Direct Upload"**
3. **Drag and drop** the entire \`admin/\` folder
4. Set the API URL in your admin console's environment

## 📱 Android APK

The APK is located at:
\`mobile-android/app/build/outputs/apk/debug/app-debug.apk\`

## 🔐 Environment Variables

See \`.env.example\` for all configurable values:
- \`SMTP_HOST\`, \`SMTP_USER\`, \`SMTP_PASS\` → Nodemailer email verification
- \`RAZORPAY_KEY_ID\`, \`RAZORPAY_KEY_SECRET\` → Payment gateway
- \`R2_*\` → Cloudflare R2 object storage
- \`DATABASE_URL\` → PostgreSQL (leave empty for local PGlite)
`;

writeFileSync(path.join(DEPLOY_DIR, "README.md"), readme);

console.log("\n✅ Deployment package ready at: deploy/");
console.log("   📂 deploy/api/    → Backend (Node.js)");
console.log("   📂 deploy/admin/  → Admin Console (static, drag-and-drop to Cloudflare Pages)");
console.log("   📄 deploy/README.md → Deployment instructions\n");
