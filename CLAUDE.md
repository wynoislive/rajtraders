# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This is "Harbor Lane" — a bakery/cake ordering platform. It's a pnpm workspace with a Node/Express API, a Clerk-protected React admin console, and a native Kotlin/Jetpack Compose Android storefront app. See `guided.md` for a detailed local setup and manual test-checklist walkthrough (URLs there are ephemeral Replit dev domains, so treat only the commands/structure as durable — some routes described there, like `/v1/checkout` and `/v1/admin/approvals`, were added after that doc was written).

## Workspace layout

- `lib/api-spec/` — `openapi.yaml` is the source of truth for the V1 HTTP contract. `pnpm --filter @workspace/api-spec run codegen` (orval) regenerates both consumers below from it.
- `lib/api-client-react/src/generated/` — generated React Query hooks (consumed by `shop-admin`). Do not hand-edit `generated/`.
- `lib/api-zod/src/generated/` — generated Zod request/response validators (consumed by `api-server`). Do not hand-edit `generated/`.
- `lib/db/src/schema/` — Drizzle schema (products, discounts, registrations/claims, orders, users, admin-users, shop-settings, security-compliance).
- `artifacts/api-server/` — Express API and security gateway.
- `artifacts/shop-admin/` — Clerk-protected admin console (Vite + React + shadcn/radix).
- `artifacts/mockup-sandbox/` — standalone Vite preview app for design mockups, not part of the shipped product.
- `mobile-android/` — native Kotlin/Jetpack Compose storefront client (package `com.harborlane.shop`).
- `scripts/` — misc workspace-local tsx scripts.

Any change to `openapi.yaml` requires re-running codegen before the API server or admin app will typecheck against it.

## Common commands

Run from the repo root unless noted. This is a pnpm workspace — use `pnpm --filter <pkg>` to target one package (package names are the `name` field in each `package.json`, e.g. `@workspace/api-server`).

```bash
pnpm install                                    # install workspace deps
pnpm run typecheck                              # tsc --build on lib/*, then typecheck artifacts/* + scripts
pnpm run build                                  # typecheck, then build every package with a build script
pnpm --filter @workspace/db run push            # push Drizzle schema to DATABASE_URL (push-force to force)
pnpm --filter @workspace/api-spec run codegen   # regenerate lib/api-client-react + lib/api-zod from openapi.yaml

PORT=8080 pnpm --filter @workspace/api-server run dev              # API server (builds via esbuild, then runs dist)
PORT=18085 BASE_PATH=/ pnpm --filter @workspace/shop-admin run dev # admin console (Vite)
```

There is no configured test runner in this repo — do not assume `pnpm test` exists.

### Android

```bash
./build-apk.ps1     # or build-apk.bat — builds mobile-android debug APK via a pinned local Gradle distribution
```

The emulator's default API base is `http://10.0.2.2:8080/api/` (cleartext HTTP allowed for local dev only). For a hosted API or physical device, set `apiBaseUrl` in `mobile-android/gradle.properties`.

## Architecture notes

### Database: dual backend, auto-selected

`lib/db/src/index.ts` picks the driver based on environment: if `DATABASE_URL` is set it uses `drizzle-orm/node-postgres` against real Postgres; otherwise it falls back to an embedded `@electric-sql/pglite` instance persisted under `.local-db/`, and hand-rolls the schema via a raw `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ADD COLUMN IF NOT EXISTS` script (not Drizzle migrations) so the pglite fallback also self-seeds a default shop and a `MAIN_ADMIN` admin user. This raw SQL block must be kept in sync by hand with `lib/db/src/schema/*` — Drizzle-kit push only applies to the real-Postgres path.

### Three separate auth systems

The API layers three unrelated auth mechanisms — don't assume routes share a session model:

1. **Clerk** (`middlewares/auth.ts` `requireAdmin`, wired in `app.ts`) protects the `/api/v1/admin` router mounted by `routes/admin.ts` (products/discounts/registration policy management for the browser admin console). If `CLERK_SECRET_KEY` is unset, `requireAdmin` becomes a no-op passthrough — routes are open in that case.
2. **Staff sessions** (`routes/staff-admin.ts`) implement their own scrypt-hashed-password + bearer-token login against `admin_users`, independent of Clerk, with an in-process `Map` (`staffSessions`) as the session store. `routes/admin.ts` also imports `getStaffFromToken` from this module for some endpoints.
3. **Customer sessions** (`routes/customer-auth.ts`) implement a third scrypt-hashed-password + bearer-token scheme against `users`, with its own in-process `Map` (`sessionStore`), completely separate from staff/admin auth.

All bearer-token session stores are in-memory (`Map`s) — they do not survive an API server restart and are not shared across instances.

### Request pipeline (`artifacts/api-server/src/app.ts`)

Order matters: pino request logging → Clerk proxy passthrough (`CLERK_PROXY_PATH`) → `secureGateway` (helmet + rate limiting, in `middlewares/security.ts`) → CORS (allowlist via `CORS_ORIGINS` env, checked by `isAllowedOrigin`) → Clerk session middleware (only if `CLERK_SECRET_KEY` set) → body parsers → `/api` router (`routes/index.ts`).

### Build/bundling

`artifacts/api-server/build.mjs` bundles the server with esbuild into a single `dist/index.mjs`, externalizing native/optional deps it can't bundle (pg, pglite, nodemailer, etc. — see the `external` list) and injecting a CJS-interop banner (`require`/`__dirname`/`__filename` shims) since the ESM output still loads CJS-only packages like Express.

### Android boundary

`mobile-android/app/src/main/java/com/harborlane/shop/data/StorefrontApi.kt` is intentionally the *only* HTTP contract the Compose UI talks to, so a future V2 API client can be swapped in without touching the shopping UI.

## Spec workflow

`.specify/` and `.agents/skills/speckit-*` provide a GitHub spec-kit style workflow (constitution → specify → clarify → plan → tasks → analyze → implement) for larger features. Check `.specify/memory/` for the project constitution before proposing large structural changes.
