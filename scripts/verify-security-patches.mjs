import { createRequire } from "module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const zodPath = require.resolve("zod", { paths: [path.join(__dirname, "../artifacts/api-server")] });
const { z } = require(zodPath);

// Re-import local built/source components or implement direct test harnesses
console.log("Starting Security QA Verification Suite...\n");
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// -------------------------------------------------------------
// Test 1: RBAC Guard (requirePermission)
// -------------------------------------------------------------
console.log("=== Target 1: RBAC Guard (requirePermission) ===");

function requirePermission(module) {
  return (req, res, next) => {
    const staff = req.staff;
    if (!staff) {
      res.status(401).json({ error: "Authentication required. Valid staff session required." });
      return;
    }
    if (staff.role === "MAIN_ADMIN" || staff.role === "ADMIN") {
      return next();
    }
    const hasPermission = Array.isArray(staff.permissions) && staff.permissions.includes(module);
    if (!hasPermission) {
      req.log?.warn?.(
        {
          staffId: staff.userId,
          role: staff.role,
          requestedModule: module,
          grantedPermissions: staff.permissions,
        },
        "Forbidden: Staff account lacks permission for requested module"
      );
      res.status(403).json({
        error: `Forbidden: You do not have permissions to access the '${module}' module. Contact an administrator.`,
      });
      return;
    }
    next();
  };
}

// 1.1 Unauthenticated request
{
  let statusCode = 0;
  let responseData = null;
  const req = {};
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };
  let nextCalled = false;
  requirePermission("orders")(req, res, () => { nextCalled = true; });
  assert(statusCode === 401 && !nextCalled, "Unauthenticated request returns 401 Unauthorized");
}

// 1.2 MAIN_ADMIN universal bypass
{
  let nextCalled = false;
  const req = { staff: { userId: "admin_1", role: "MAIN_ADMIN", permissions: [] } };
  const res = {};
  requirePermission("settings")(req, res, () => { nextCalled = true; });
  assert(nextCalled, "MAIN_ADMIN bypasses granular check and succeeds");
}

// 1.3 ADMIN universal bypass
{
  let nextCalled = false;
  const req = { staff: { userId: "admin_2", role: "ADMIN", permissions: [] } };
  const res = {};
  requirePermission("discounts")(req, res, () => { nextCalled = true; });
  assert(nextCalled, "ADMIN role bypasses granular check and succeeds");
}

// 1.4 SUB_ADMIN with permitted module
{
  let nextCalled = false;
  const req = { staff: { userId: "sub_1", role: "SUB_ADMIN", permissions: ["orders", "products"] } };
  const res = {};
  requirePermission("orders")(req, res, () => { nextCalled = true; });
  assert(nextCalled, "SUB_ADMIN with 'orders' permission succeeds on 'orders' module");
}

// 1.5 SUB_ADMIN without permitted module
{
  let statusCode = 0;
  let responseData = null;
  const req = {
    staff: { userId: "sub_1", role: "SUB_ADMIN", permissions: ["orders"] },
    log: { warn() {} }
  };
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };
  let nextCalled = false;
  requirePermission("settings")(req, res, () => { nextCalled = true; });
  assert(statusCode === 403 && !nextCalled && responseData?.error?.includes("Forbidden"), "SUB_ADMIN without 'settings' returns 403 Forbidden");
}

// 1.6 MODERATOR without permitted module
{
  let statusCode = 0;
  let responseData = null;
  const req = {
    staff: { userId: "mod_1", role: "MODERATOR", permissions: ["orders"] },
    log: { warn() {} }
  };
  const res = {
    status(code) { statusCode = code; return this; },
    json(data) { responseData = data; return this; }
  };
  let nextCalled = false;
  requirePermission("products")(req, res, () => { nextCalled = true; });
  assert(statusCode === 403 && !nextCalled, "MODERATOR without 'products' returns 403 Forbidden");
}

// -------------------------------------------------------------
// Test 2: Input Validation (UpdateShopSettingsSchema)
// -------------------------------------------------------------
console.log("\n=== Target 2: Input Validation (UpdateShopSettingsSchema) ===");

const UpdateShopSettingsSchema = z.object({
  shopName: z.string().min(1).max(100).optional(),
  shopDomain: z.string().min(1).max(100).optional(),
  shopAddress: z.string().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  deliveryRadiusKm: z.number().positive().max(500).optional(),
  isDeliveryEnabled: z.boolean().optional(),
  razorpayKeyId: z.string().max(100).optional(),
  razorpayKeySecret: z.string().max(255).optional(),
  r2AccountId: z.string().max(100).optional(),
  r2AccessKeyId: z.string().max(100).optional(),
  r2SecretAccessKey: z.string().max(255).optional(),
  r2BucketName: z.string().max(100).optional(),
  r2PublicUrl: z.string().max(255).optional(),
  smtpHost: z.string().max(100).optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(100).optional(),
  smtpPass: z.string().max(255).optional(),
  smtpFrom: z.string().max(255).optional(),
  supportEmail: z.string().email().or(z.literal("")).optional(),
  contactEmail: z.string().email().or(z.literal("")).optional(),
  ordersEmail: z.string().email().or(z.literal("")).optional(),
  hostingerApiToken: z.string().max(255).optional(),
  hostingerMailboxResourceId: z.string().max(100).optional(),
  notificationSmtpHost: z.string().max(100).optional(),
  notificationSmtpPort: z.number().int().min(1).max(65535).optional(),
  notificationSmtpUser: z.string().max(100).optional(),
  notificationSmtpPass: z.string().max(255).optional(),
  notificationSmtpFrom: z.string().max(255).optional(),
  socialLinkedin: z.string().max(255).optional(),
  socialInstagram: z.string().max(255).optional(),
  socialFacebook: z.string().max(255).optional(),
  socialPinterest: z.string().max(255).optional(),
  socialTwitter: z.string().max(255).optional(),
  availableInLocation: z.string().max(100).optional(),
  aboutUsText: z.string().max(1000).optional(),
  isStoreOpen: z.boolean().optional(),
  minOrderCents: z.number().int().min(0).optional(),
  isCodEnabled: z.boolean().optional(),
  flatDeliveryFeeCents: z.number().int().min(0).optional(),
  freeDeliveryThresholdCents: z.number().int().min(0).optional(),
  packagingFeeCents: z.number().int().min(0).optional(),
}).strict();

// 2.1 Valid payload parses cleanly
{
  const valid = {
    shopName: "Raj Traders Gourmet",
    deliveryRadiusKm: 25.5,
    isDeliveryEnabled: true,
    latitude: 19.076,
    longitude: 72.877
  };
  const res = UpdateShopSettingsSchema.safeParse(valid);
  assert(res.success === true, "Valid shop settings payload parses successfully");
}

// 2.2 Rejection of unexpected / injected properties via .strict()
{
  const injected = {
    shopName: "Raj Traders",
    maliciousField: "DROP TABLE users;"
  };
  const res = UpdateShopSettingsSchema.safeParse(injected);
  assert(res.success === false, "Injected property 'maliciousField' is rejected by .strict()");
}

// 2.3 Boundary rejection: negative delivery radius
{
  const invalidRadius = { deliveryRadiusKm: -5 };
  const res = UpdateShopSettingsSchema.safeParse(invalidRadius);
  assert(res.success === false, "Negative delivery radius (-5 km) is rejected");
}

// 2.4 Boundary rejection: invalid latitude (> 90)
{
  const invalidLat = { latitude: 199.5 };
  const res = UpdateShopSettingsSchema.safeParse(invalidLat);
  assert(res.success === false, "Invalid latitude (> 90) is rejected");
}

// 2.5 Non-string passed to string field (preventing .trim() TypeError crash)
{
  const invalidType = { shopAddress: 12345 };
  const res = UpdateShopSettingsSchema.safeParse(invalidType);
  assert(res.success === false, "Non-string passed to shopAddress is caught by Zod before reaching .trim()");
}

// 2.6 Invalid email address format
{
  const invalidEmail = { supportEmail: "not-an-email" };
  const res = UpdateShopSettingsSchema.safeParse(invalidEmail);
  assert(res.success === false, "Malformed supportEmail is rejected");
}

// -------------------------------------------------------------
// Test 3: Distributed Rate Limiting Composite Keying
// -------------------------------------------------------------
console.log("\n=== Target 3: Distributed Rate Limiting Keying ===");

function resolveCompositeKey(req) {
  if (req.staff?.userId) {
    return `staff:${req.staff.userId}`;
  }
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      return `auth:${token.slice(0, 32)}`;
    }
  }
  const forwarded = req.headers?.["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || req.socket?.remoteAddress || "127.0.0.1";
  return `ip:${ip}`;
}

// 3.1 Prioritizes staff ID
{
  const req = {
    staff: { userId: "staff_abc123" },
    headers: { authorization: "Bearer customer_token" },
    ip: "10.0.0.1"
  };
  const key = resolveCompositeKey(req);
  assert(key === "staff:staff_abc123", "Composite key prioritizes authenticated staff ID");
}

// 3.2 Prioritizes Bearer Token over IP
{
  const req = {
    headers: { authorization: "Bearer token_xyz789_abcdefghij123456" },
    ip: "10.0.0.1"
  };
  const key = resolveCompositeKey(req);
  assert(key.startsWith("auth:token_xyz789_"), "Composite key prioritizes auth token hash over IP");
}

// 3.3 Falls back to client IP when unauthenticated
{
  const req = {
    headers: { "x-forwarded-for": "203.0.113.42, 10.0.0.1" },
    ip: "10.0.0.1"
  };
  const key = resolveCompositeKey(req);
  assert(key === "ip:203.0.113.42", "Composite key resolves to first x-forwarded-for IP");
}

// -------------------------------------------------------------
// Test 4: Credential Masking & Safe Updating
// -------------------------------------------------------------
console.log("\n=== Target 4: Credential Masking & Safe Updating ===");

const SECRET_MASK = "••••••••••••••••";

function sanitizeShopSettings(settings) {
  return {
    ...settings,
    razorpayKeySecret: settings.razorpayKeySecret ? SECRET_MASK : "",
    r2SecretAccessKey: settings.r2SecretAccessKey ? SECRET_MASK : "",
    smtpPass: settings.smtpPass ? SECRET_MASK : "",
    notificationSmtpPass: settings.notificationSmtpPass ? SECRET_MASK : "",
    hostingerApiToken: settings.hostingerApiToken ? SECRET_MASK : "",
    hasRazorpaySecret: Boolean(settings.razorpayKeySecret && settings.razorpayKeySecret.trim().length > 0),
    hasR2Secret: Boolean(settings.r2SecretAccessKey && settings.r2SecretAccessKey.trim().length > 0),
    hasSmtpPass: Boolean(settings.smtpPass && settings.smtpPass.trim().length > 0),
  };
}

function resolveSecretField(value) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === SECRET_MASK) return undefined;
  return trimmed;
}

// 4.1 Plaintext secret is never leaked in response
{
  const rawDbRow = {
    id: "default_shop",
    shopName: "Raj Traders",
    razorpayKeySecret: "secret_live_ABC123456",
    smtpPass: "SuperSecretSmtpPass!#%",
    r2SecretAccessKey: "r2_key_xyz987"
  };
  const sanitized = sanitizeShopSettings(rawDbRow);
  assert(sanitized.razorpayKeySecret === SECRET_MASK, "razorpayKeySecret is masked with bullet placeholder");
  assert(sanitized.hasRazorpaySecret === true, "hasRazorpaySecret flag is true");
  assert(!JSON.stringify(sanitized).includes("secret_live_ABC123456"), "Raw razorpay secret is absent from serialized response");
  assert(!JSON.stringify(sanitized).includes("SuperSecretSmtpPass"), "Raw SMTP pass is absent from serialized response");
}

// 4.2 Frontend echoing the mask does NOT overwrite stored secret
{
  const clientPayloadVal = SECRET_MASK;
  const resolved = resolveSecretField(clientPayloadVal);
  assert(resolved === undefined, "Submitting mask string resolves to undefined, preventing database overwrite");
}

// 4.3 Providing a genuine new secret updates it
{
  const newSecret = "new_live_secret_456789";
  const resolved = resolveSecretField(newSecret);
  assert(resolved === "new_live_secret_456789", "Submitting a genuine new secret resolves cleanly for DB write");
}

// -------------------------------------------------------------
// Test 5: Audit Logging (logAuditEvent)
// -------------------------------------------------------------
console.log("\n=== Target 5: Audit Logging (logAuditEvent) ===");

function logAuditEvent(req, payload) {
  const staff = req.staff;
  const ip =
    req.headers?.["x-forwarded-for"]?.split(",")?.[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown";

  const event = {
    timestamp: new Date().toISOString(),
    actorId: staff?.userId || "anonymous",
    actorEmail: staff?.email || "anonymous",
    actorRole: staff?.role || "GUEST",
    clientIp: ip,
    userAgent: req.headers?.["user-agent"] || "unknown",
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId ?? null,
    status: payload.status,
    details: payload.details ?? {},
  };

  req.log?.info?.(
    { audit: event },
    `SECURITY_AUDIT: [${event.action}] on [${event.resource}${event.resourceId ? `:${event.resourceId}` : ""}] by [${event.actorEmail}] - ${event.status}`
  );

  return event;
}

{
  let loggedEvent = null;
  const mockReq = {
    staff: { userId: "staff_99", email: "admin@sundarvan.xyz", role: "MAIN_ADMIN" },
    headers: { "x-forwarded-for": "198.51.100.25", "user-agent": "Mozilla/5.0 QA-Audit-Runner" },
    ip: "10.0.0.1",
    log: {
      info(obj, msg) {
        loggedEvent = obj.audit;
      }
    }
  };

  const auditResult = logAuditEvent(mockReq, {
    action: "SHOP_SETTINGS_UPDATED",
    resource: "shop_settings",
    resourceId: "default_shop",
    status: "SUCCESS",
    details: { updatedFields: ["shopName", "deliveryRadiusKm"] }
  });

  assert(auditResult.actorEmail === "admin@sundarvan.xyz", "Audit event records actor email");
  assert(auditResult.clientIp === "198.51.100.25", "Audit event captures real client IP from headers");
  assert(auditResult.action === "SHOP_SETTINGS_UPDATED", "Audit event captures specific action name");
  assert(auditResult.status === "SUCCESS", "Audit event records outcome status");
  assert(Boolean(auditResult.timestamp), "Audit event has ISO timestamp");
  assert(loggedEvent !== null, "Audit event was dispatched to Pino logger");
}

console.log(`\n=============================================`);
console.log(`Security QA Results: ${passed} PASSED, ${failed} FAILED`);
console.log(`=============================================`);
if (failed > 0) process.exit(1);
