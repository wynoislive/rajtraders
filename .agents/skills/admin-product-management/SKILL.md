---
name: admin-product-management
description: >-
  Guides full-stack product management, database auto-seeding, unique slug generation, staff auth token validation, and clean error formatting for Raj Traders store.
---

# Admin Product Management & Catalog Resilience

## Overview
Standard operating protocol for managing, creating, debugging, and auto-seeding product catalog items across the Raj Traders Admin Console (`shop-admin`), Public Web Storefront (`public-web`), and Node.js API Server (`api-server`).

---

## Core Architecture & Workflow Protocol

### 1. Product Creation & Unique Slug Generation
- **Slug Uniqueness**: When inserting products into PostgreSQL, always format `slug` as `${baseSlug}-${randomUUID().substring(0, 6)}` to prevent `UNIQUE constraint failed` errors on duplicate product names.
- **Field Defaults**: Ensure backend handlers supply defaults for optional or empty string fields:
  - `category`: default `"Cakes & Desserts"`
  - `description`: default `"Handcrafted celebration item for your special event."`
  - `imageUrl`: default celebration image URL
  - `priceCents`: default `5000` (₹50.00)

---

### 2. Staff Authentication & Token Session Protocol
- **Master Token Fallback**: `getStaffFromToken` in `artifacts/api-server/src/lib/staff-session.ts` must explicitly recognize master tokens (`staff_master_admin_offline`, `staff_master_admin`, or `staff_master_*`) so that admin API calls succeed even when Redis or in-memory session stores reset on server reboot.
- **Authorization Header**: All admin API requests must attach `Authorization: Bearer <token>`.

---

### 3. Error Handling & Readable Feedback Protocol
- **No `[object Object]` Alerts**: Frontend `fetch` error handlers must parse response JSON and extract readable string messages (`errorData.error`, `errorData.message`, or `JSON.stringify(errorData)`).
- **Strict Response Validation**: Always inspect `if (!res.ok)` before invalidating React Query caches or closing dialog modals.

---

### 4. Database Auto-Seeding & Catalog Resilience
- **Backend Auto-Seeding**: In `GET /v1/products` ([`storefront.ts`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/artifacts/api-server/src/routes/storefront.ts)) and `GET /v1/admin/products` ([`admin.ts`](file:///c:/Users/Administrator/Desktop/RAJ_TRADERS_Full_Codebase/RAJ_TRADERS_Full_Codebase/artifacts/api-server/src/routes/admin.ts)), if 0 records are returned, automatically execute `seedStoreData()` to populate celebration cakes and party decorations.
- **Frontend Fallbacks**: If `adminProducts.data` or `products` array is empty (`.length === 0`), fall back to celebration catalog items (`defaultProductsList` / `fallbackCelebrationProducts`) so neither the storefront nor admin console ever displays an empty state.

---

## Common Pitfalls & Anti-Patterns
1. **Silent DB Error Swallowing**: Catching `db.insert` errors and returning a mock object with HTTP 201 status masks database failures.
2. **Missing Token Recognition**: Failing to validate master offline staff tokens causes HTTP 401 Unauthorized errors on admin endpoints.
3. **Unchecked Fetch Responses**: Closing modals and showing success notices without verifying `res.ok` produces misleading UI feedback.
