# Harbor Lane Shopping Platform — Local Testing Guide

This guide covers the complete local setup for the versioned commerce platform:

- Node.js/Express V1 backend
- PostgreSQL persistence with Drizzle
- Clerk-protected React admin console
- Native Kotlin/Jetpack Compose Android shopping app

The repository is a pnpm workspace. Run commands from the repository root unless a command says otherwise.

## 1. Project map

| Area | Location | Purpose |
| --- | --- | --- |
| API contract | `lib/api-spec/openapi.yaml` | Source of truth for the V1 HTTP contract |
| Generated React client | `lib/api-client-react/src/generated/` | React Query hooks generated from OpenAPI |
| Generated Zod validators | `lib/api-zod/src/generated/` | Runtime request/response validation |
| Database schema | `lib/db/src/schema/` | Products, discounts, registration policies, and offer claims |
| Backend | `artifacts/api-server/` | Express API and security gateway |
| Admin app | `artifacts/shop-admin/` | Clerk-protected browser operations console |
| Public Android app | `mobile-android/` | Kotlin storefront client |

The Android app uses a repository boundary around the V1 API. This leaves room for a future V2 adapter without rewriting the Compose UI.

## 2. Prerequisites

### Web/backend development

- Node.js compatible with the workspace
- pnpm
- A provisioned PostgreSQL database exposed through `DATABASE_URL`
- Clerk development configuration

The Replit workspace already has the Clerk-related secrets provisioned. Do not paste secret values into source files, this guide, chat, or `gradle.properties`.

Expected server-side environment:

```text
DATABASE_URL
CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
SESSION_SECRET
```

Optional admin restriction:

```text
ADMIN_CLERK_USER_IDS=user_xxx,user_yyy
```

If `ADMIN_CLERK_USER_IDS` is set, only those Clerk user IDs can use admin APIs. If it is empty, any authenticated Clerk user can reach the admin routes.

### Android development

- Android Studio
- Android SDK with API 35
- An Android emulator or Android device
- JDK 17, supplied/configured by Android Studio

The workspace currently contains the Android source project, not a prebuilt APK. Android Studio is the recommended way to create the debug APK.

## 3. Install dependencies and prepare the database

Install the workspace dependencies:

```bash
pnpm install
```

If the development database has not been initialized yet, push the Drizzle schema:

```bash
pnpm --filter @workspace/db run push
```

The API seeds starter products, discount codes, and the welcome policy automatically when the database is empty.

## 4. Start the services in Replit

The recommended method is to use the configured Replit workflows:

| Workflow | Command | Local port | Role |
| --- | --- | ---: | --- |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | `8080` | Backend/API |
| `artifacts/shop-admin: web` | `pnpm --filter @workspace/shop-admin run dev` | `18085` | Admin browser app |
| `artifacts/mockup-sandbox: Component Preview Server` | `pnpm --filter @workspace/mockup-sandbox run dev` | `8081` | Optional design preview |

Start the API first, then start the admin workflow. The managed workflows inject the required `PORT` and `BASE_PATH` values.

## 5. Start services from a terminal

Use separate terminal sessions if starting services manually.

### Backend

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

The API build is run automatically by the `dev` script before the server starts.

### Admin app

```bash
PORT=18085 BASE_PATH=/ pnpm --filter @workspace/shop-admin run dev
```

The admin Vite config requires both `PORT` and `BASE_PATH`. `VITE_CLERK_PUBLISHABLE_KEY` must be present in the environment for the sign-in shell to load. Use the workspace environment/secrets UI rather than putting it in a committed file.

## 6. URLs for the current Replit development session

The currently verified development domain is:

```text
https://094d3880-4288-4f77-b406-560cca39c086-00-amvf3lxzccev.pike.replit.dev
```

Development domains can change when a workspace is recreated. Use the current Replit Preview URL if this one is no longer active.

### Backend checks

- Health: `/api/healthz`
- Products: `/api/v1/products`
- Storefront summary: `/api/v1/storefront/summary`

Full examples:

```bash
BASE_URL="https://094d3880-4288-4f77-b406-560cca39c086-00-amvf3lxzccev.pike.replit.dev"

curl "$BASE_URL/api/healthz"
curl "$BASE_URL/api/v1/products"
curl "$BASE_URL/api/v1/storefront/summary"
```

Expected health response:

```json
{"status":"ok"}
```

### Admin app

Open this URL in a browser:

```text
https://094d3880-4288-4f77-b406-560cca39c086-00-amvf3lxzccev.pike.replit.dev/
```

The first screen is Clerk sign-in. After authenticating, the console provides:

- `/` — overview and system health
- `/products` — product creation, editing, filtering, and archiving
- `/discounts` — discount rule management and live rule testing
- `/registrations` — first-order offer policy management and eligibility checks

The admin API is intentionally protected:

```bash
curl -i "$BASE_URL/api/v1/admin/summary"
```

Without a Clerk session, the expected response is HTTP `401`.

## 7. V1 public API smoke tests

### List products

```bash
curl "$BASE_URL/api/v1/products"
```

Optional query parameters:

```text
search=<text>
category=<category>
```

### Get storefront summary

```bash
curl "$BASE_URL/api/v1/storefront/summary"
```

### Check first-order eligibility

```bash
curl -X POST "$BASE_URL/api/v1/registrations/eligibility" \
  -H "Content-Type: application/json" \
  -d '{"email":"new-customer@example.com"}'
```

### Claim a first-order offer

```bash
curl -X POST "$BASE_URL/api/v1/registrations/claim" \
  -H "Content-Type: application/json" \
  -d '{"email":"new-customer@example.com"}'
```

Use a test address when exercising claims because a successful claim is persisted and the same email may no longer be eligible.

### Validate a discount

```bash
curl -X POST "$BASE_URL/api/v1/discounts/validate" \
  -H "Content-Type: application/json" \
  -d '{"code":"WELCOME10","subtotalCents":7500,"isFirstOrder":true}'
```

## 8. Run the public Android app

The public shopping app is the native project in `mobile-android/`.

### Android emulator with the local backend

1. Start the API workflow on port `8080`.
2. Open `mobile-android/` in Android Studio.
3. Let Gradle sync the project.
4. Select an emulator using API 26 or later.
5. Run the `app` configuration.

The default Android emulator API URL is:

```text
http://10.0.2.2:8080/api/
```

`10.0.2.2` maps from the Android emulator to the development machine. The manifest permits cleartext HTTP for this local-development configuration.

### Hosted API or physical device

For a hosted API, set an HTTPS base URL in `mobile-android/gradle.properties`:

```properties
apiBaseUrl=https://your-hosted-domain.example/api/
```

For a physical device, use an HTTPS reachable API URL or a LAN address that the device can reach. Do not use `10.0.2.2` on a physical device.

### Android features to test

- Product grid loads seeded active products
- Search filters products through the V1 API
- Category chips filter by category
- Add products to the bag
- Increase/decrease quantities
- Validate a discount code against the current subtotal
- Check first-order registration eligibility
- Claim a first-order offer

The checkout button is intentionally marked as coming next; no payment provider has been connected yet.

### Build a debug APK

From Android Studio, use **Build → Build Bundle(s) / APK(s) → Build APK(s)**.

The generated debug APK is normally placed at:

```text
mobile-android/app/build/outputs/apk/debug/app-debug.apk
```

If a Gradle wrapper is added to the project later, the equivalent command is:

```bash
./gradlew :app:assembleDebug
```

## 9. Admin console test checklist

1. Open the admin URL.
2. Sign in with a Clerk user.
3. Confirm the overview loads live products, discounts, registration metrics, and storefront summary.
4. Create a draft product.
5. Edit the product and change it to live.
6. Archive it and confirm it leaves the active catalog.
7. Create a discount code.
8. Run the discount rule tester with a subtotal and first-order toggle.
9. Open Registrations.
10. Toggle the policy, change the offer code/window, and run an eligibility check.
11. Sign out and confirm the admin UI returns to the sign-in landing screen.

## 10. Quality and security checks

Run the workspace typechecks:

```bash
pnpm run typecheck
```

Run the dependency audit:

```bash
pnpm audit
```

The current patched dependency graph reports zero audit vulnerabilities.

Build the API:

```bash
pnpm --filter @workspace/api-server run build
```

Build the admin app locally with its required artifact variables:

```bash
PORT=18085 BASE_PATH=/ pnpm --filter @workspace/shop-admin run build
```

The API applies security headers, CORS allowlisting, request logging, rate limiting, Clerk middleware, and admin authorization before protected routes.

## 11. Troubleshooting

### `PORT environment variable is required`

Use the managed workflow, or set the required value manually:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
PORT=18085 BASE_PATH=/ pnpm --filter @workspace/shop-admin run dev
```

### `BASE_PATH environment variable is required`

The admin app is mounted at `/`, so use:

```bash
BASE_PATH=/ PORT=18085 pnpm --filter @workspace/shop-admin run dev
```

### Admin shows the sign-in screen

That is expected until a Clerk user signs in. If the sign-in UI itself fails, verify that `VITE_CLERK_PUBLISHABLE_KEY` is configured through the workspace environment/secrets UI.

### Admin data returns `401`

The admin API requires a Clerk session. Sign in through the admin app first. If an admin allowlist is configured, confirm the signed-in Clerk user ID is included in `ADMIN_CLERK_USER_IDS`.

### API fails with `DATABASE_URL must be set`

Provision or attach the development PostgreSQL database, then rerun:

```bash
pnpm --filter @workspace/db run push
```

### Android app cannot connect

- Confirm the API workflow is listening on `8080`.
- Android emulator: use `http://10.0.2.2:8080/api/`.
- Physical device: do not use `10.0.2.2`; use a reachable HTTPS or LAN URL.
- Confirm the API health endpoint works from the host browser first.
- Rebuild the app after changing `apiBaseUrl`.

### Port already in use

Stop the stale artifact workflow before restarting it. Avoid starting duplicate API or Vite processes manually while the managed workflows are running.

## 12. Production note

The URLs above are development URLs. A stable public URL requires publishing the deployable artifact. The development domain is not a permanent production endpoint.

For production:

- publish the API and admin artifact through Replit
- use the published HTTPS API URL in the Android build
- keep Clerk production keys and database configuration in environment secrets
- do not enable cleartext HTTP for a production Android build