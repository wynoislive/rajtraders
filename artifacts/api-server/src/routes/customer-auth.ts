import { Router, type Request, type Response } from "express";
import { db, usersTable, deletedAccountsLogTable, passwordResetsTable, passwordLockoutsTable, registrationClaimsTable, emailVerificationsTable, shopSettingsTable, totpSecretsTable } from "@workspace/db";
import { eq, and, ne, gt, asc, desc } from "drizzle-orm";
import { randomBytes, scryptSync, timingSafeEqual, randomUUID, createHash, randomInt } from "node:crypto";
import { z } from "zod";
import { sendPasswordRecoveryEmail, sendVerificationOtpEmail } from "../utils/mailer";
import { getRedisClient } from "../lib/redis";
import { securityConfig } from "../lib/security-config";
import { validate } from "../middlewares/validate";
import { authLimiter, otpLimiter, recoveryLimiter } from "../middlewares/security";
import {
  generateTotpSecret,
  generateQrCodeDataUrl,
  verifyTotpToken,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  verifyRecoveryCode,
} from "../lib/totp";

const router: Router = Router();

// ── Zod Schemas ─────────────────────────────────────────────

const RegisterBodySchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  mobileNumber: z.string().min(10, "Please provide a valid 10-digit mobile number"),
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
});

const LoginBodySchema = z.object({
  email: z.string().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const VerifyOtpBodySchema = z.object({
  email: z.string().email(),
  otpCode: z.string().min(6).max(6),
});

const ResendOtpBodySchema = z.object({
  email: z.string().email(),
});

const ForgotPasswordBodySchema = z.object({
  email: z.string().email(),
});

const ResetPasswordBodySchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().optional(),
});

const UpdateProfileBodySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  mobileNumber: z.string().min(10).optional(),
});

const TotpVerifyBodySchema = z.object({
  totpCode: z.string().min(6).max(6),
});

const TotpLoginVerifySchema = z.object({
  email: z.string().email(),
  totpCode: z.string().min(6).max(6),
});

const TotpRecoverySchema = z.object({
  email: z.string().email(),
  recoveryCode: z.string().min(1),
});

// ── Email verification OTP config ───────────────────────────
const OTP_VALIDITY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const OTP_RATE_LIMIT_MAX = 3;

// ── Password Hashing (scrypt) ───────────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

// ── Session management (Redis primary, in-memory fallback) ──
const SESSION_TTL_MS = securityConfig.sessionTtlMs;
const SESSION_TTL_SECONDS = securityConfig.sessionTtlSeconds;

interface CustomerSession {
  userId: string;
  expiresAt: number;
}

// In-memory fallback for local dev without Redis
const fallbackSessionStore = new Map<string, CustomerSession>();

async function createSession(userId: string): Promise<string> {
  const token = `auth_${randomUUID().replace(/-/g, "")}`;
  const session: CustomerSession = { userId, expiresAt: Date.now() + SESSION_TTL_MS };

  const redis = getRedisClient();
  if (redis) {
    await redis.set(
      `session:customer:${token}`,
      JSON.stringify(session),
      "EX",
      SESSION_TTL_SECONDS,
    );
  } else {
    fallbackSessionStore.set(token, session);
  }

  return token;
}

export async function getUserIdFromToken(token?: string): Promise<string | null> {
  if (!token) return null;
  const clean = token.replace(/^Bearer\s+/i, "").trim();

  const redis = getRedisClient();
  if (redis) {
    const data = await redis.get(`session:customer:${clean}`);
    if (!data) return null;
    const session: CustomerSession = JSON.parse(data);
    if (Date.now() > session.expiresAt) {
      await redis.del(`session:customer:${clean}`);
      return null;
    }
    return session.userId;
  }

  // Fallback
  const session = fallbackSessionStore.get(clean);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    fallbackSessionStore.delete(clean);
    return null;
  }
  return session.userId;
}

async function deleteSession(token?: string): Promise<void> {
  if (!token) return;
  const clean = token.replace(/^Bearer\s+/i, "").trim();
  const redis = getRedisClient();
  if (redis) {
    await redis.del(`session:customer:${clean}`);
  } else {
    fallbackSessionStore.delete(clean);
  }
}

// ── OTP rate limiting ───────────────────────────────────────
async function checkOtpRateLimit(
  email: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterMinutes: number }> {
  const windowStart = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MS);
  const recentOtps = await db
    .select()
    .from(emailVerificationsTable)
    .where(and(eq(emailVerificationsTable.email, email), gt(emailVerificationsTable.createdAt, windowStart)))
    .orderBy(asc(emailVerificationsTable.createdAt));

  if (recentOtps.length < OTP_RATE_LIMIT_MAX) {
    return { allowed: true };
  }

  const oldestInWindow = recentOtps[0];
  const retryAfterMs = oldestInWindow.createdAt.getTime() + OTP_RATE_LIMIT_WINDOW_MS - Date.now();
  return { allowed: false, retryAfterMinutes: Math.max(1, Math.ceil(retryAfterMs / 60_000)) };
}

// ── Issue verification OTP (crypto-safe) ────────────────────
async function issueVerificationOtp(
  req: Request,
  res: Response,
  user: { id: string; firstName: string },
  cleanEmail: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const rateLimit = await checkOtpRateLimit(cleanEmail);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: `Too many verification codes requested. Please wait ${rateLimit.retryAfterMinutes} minute(s) before requesting another code. (Max ${OTP_RATE_LIMIT_MAX} codes per ${OTP_RATE_LIMIT_WINDOW_MS / 60_000} minutes)`,
    });
    return;
  }

  // FIXED: Use crypto.randomInt() instead of Math.random()
  const otpCode = randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + OTP_VALIDITY_MS);

  await db.insert(emailVerificationsTable).values({
    id: randomUUID(),
    userId: user.id,
    email: cleanEmail,
    otpCode,
    attempts: 0,
    expiresAt,
  });

  const emailResult = await sendVerificationOtpEmail(cleanEmail, user.firstName, otpCode);
  req.log.info({ userId: user.id, email: cleanEmail }, "Sent 6-digit email verification OTP");

  res.status(200).json({
    requiresVerification: true,
    email: cleanEmail,
    message: `A 6-digit verification code has been sent to ${cleanEmail}. (Valid for 10 minutes)`,
    previewUrl: emailResult.previewUrl,
    ...extra,
  });
}

// ── 1. Register ─────────────────────────────────────────────
router.post("/register", authLimiter, validate({ body: RegisterBodySchema }), async (req: Request, res: Response) => {
  const { firstName, lastName, mobileNumber, email, password, confirmPassword } = req.body;

  if (confirmPassword && password !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match. Please re-confirm your password." });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanMobile = mobileNumber.trim().replace(/\D/g, "");

  try {
    const existingEmail = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (existingEmail.length > 0) {
      res.status(400).json({ error: "An account with this email already exists. Please log in." });
      return;
    }

    const existingMobile = await db.select().from(usersTable).where(eq(usersTable.mobileNumber, cleanMobile)).limit(1);
    if (existingMobile.length > 0) {
      res.status(400).json({ error: "An account with this mobile number already exists. One phone number can only be bound to one account." });
      return;
    }

    const now = new Date();
    const deletedLogs = await db
      .select()
      .from(deletedAccountsLogTable)
      .where(and(eq(deletedAccountsLogTable.email, cleanEmail), gt(deletedAccountsLogTable.penaltyExpiresAt, now)))
      .limit(1);

    let hasLockdownPenalty = deletedLogs.length > 0;
    const userId = randomUUID();
    const passwordHash = hashPassword(password);

    await db.transaction(async (tx: any) => {
      await tx.insert(usersTable).values({
        id: userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        mobileNumber: cleanMobile,
        email: cleanEmail,
        passwordHash,
      });

      if (hasLockdownPenalty) {
        await tx
          .insert(registrationClaimsTable)
          .values({ id: randomUUID(), email: cleanEmail, policyId: "forfeited_due_to_deletion_penalty" })
          .onConflictDoNothing({ target: registrationClaimsTable.email });
        req.log.warn({ cleanEmail }, "User re-registered within 15-day deletion penalty; welcome offers forfeited.");
      }
    });

    req.log.info({ userId, cleanEmail, hasLockdownPenalty }, "Customer account created; sending verification OTP");

    await issueVerificationOtp(req, res, { id: userId, firstName: firstName.trim() }, cleanEmail, {
      lockdownPenaltyNotice: hasLockdownPenalty
        ? "Notice: Account re-registered within 15-day deletion window. Welcome offer codes are forfeited."
        : null,
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "An account with this email or mobile number already exists. Please log in." });
      return;
    }
    req.log.error({ err }, "Registration error");
    res.status(500).json({ error: "Failed to register user. Please try again." });
  }
});

// ── 2. Login ────────────────────────────────────────────────
router.post("/login", authLimiter, validate({ body: LoginBodySchema }), async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (foundUsers.length === 0) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    const user = foundUsers[0];
    if (!verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: "Invalid email or password." });
      return;
    }

    // Check if TOTP is enabled for this user
    const totpRecords = await db.select().from(totpSecretsTable).where(and(eq(totpSecretsTable.userId, user.id), eq(totpSecretsTable.isEnabled, true))).limit(1);

    if (totpRecords.length > 0) {
      // TOTP is enabled — require TOTP verification instead of email OTP
      res.status(200).json({
        requiresTotpVerification: true,
        email: cleanEmail,
        message: "Please enter your authenticator app code to complete login.",
      });
      return;
    }

    // No TOTP — proceed with email OTP
    await issueVerificationOtp(req, res, user, cleanEmail);
  } catch (err: any) {
    req.log.error({ err }, "Login error");
    res.status(500).json({ error: "Failed to authenticate. Please try again." });
  }
});

// ── 2b. Verify OTP ──────────────────────────────────────────
router.post("/verify-login-otp", otpLimiter, validate({ body: VerifyOtpBodySchema }), async (req: Request, res: Response) => {
  const { email, otpCode } = req.body;
  const cleanEmail = email.trim().toLowerCase();
  const cleanOtp = otpCode.trim().replace(/\s+/g, "");
  const now = new Date();

  try {
    const verifications = await db
      .select()
      .from(emailVerificationsTable)
      .where(and(eq(emailVerificationsTable.email, cleanEmail), gt(emailVerificationsTable.expiresAt, now)))
      .orderBy(desc(emailVerificationsTable.createdAt))
      .limit(1);

    if (verifications.length === 0 || verifications[0].usedAt) {
      res.status(400).json({ error: "Invalid or expired verification code. Please request a new code." });
      return;
    }

    const record = verifications[0];

    if (record.attempts >= 5) {
      res.status(429).json({ error: "Too many incorrect attempts. Please request a new verification code." });
      return;
    }

    if (record.otpCode !== cleanOtp) {
      await db.update(emailVerificationsTable).set({ attempts: record.attempts + 1 }).where(eq(emailVerificationsTable.id, record.id));
      const remaining = 5 - (record.attempts + 1);
      res.status(400).json({ error: `Incorrect verification code. ${remaining} attempts remaining.` });
      return;
    }

    await db.update(emailVerificationsTable).set({ usedAt: now }).where(eq(emailVerificationsTable.id, record.id));

    const user = (await db.select().from(usersTable).where(eq(usersTable.id, record.userId)).limit(1))[0];
    if (!user) {
      res.status(404).json({ error: "User account not found." });
      return;
    }

    const token = await createSession(user.id);
    req.log.info({ userId: user.id, email: user.email }, "Customer verified login OTP and signed in");

    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, mobileNumber: user.mobileNumber, email: user.email },
    });
  } catch (err: any) {
    req.log.error({ err }, "Verify OTP error");
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ── 2c. Resend OTP ──────────────────────────────────────────
router.post("/resend-login-otp", otpLimiter, validate({ body: ResendOtpBodySchema }), async (req: Request, res: Response) => {
  const cleanEmail = req.body.email.trim().toLowerCase();

  try {
    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (foundUsers.length === 0) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    await issueVerificationOtp(req, res, foundUsers[0], cleanEmail);
  } catch (err: any) {
    req.log.error({ err }, "Resend OTP error");
    res.status(500).json({ error: "Failed to resend verification code." });
  }
});

// ── 3. Get Profile ──────────────────────────────────────────
router.get("/me", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized. Please log in." }); return; }

  try {
    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (foundUsers.length === 0) { res.status(404).json({ error: "User not found." }); return; }

    const user = foundUsers[0];

    // Check TOTP status
    const totpRecords = await db.select().from(totpSecretsTable).where(and(eq(totpSecretsTable.userId, userId), eq(totpSecretsTable.isEnabled, true))).limit(1);

    res.status(200).json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      totpEnabled: totpRecords.length > 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// ── 4. Update Profile ───────────────────────────────────────
router.put("/profile", validate({ body: UpdateProfileBodySchema }), async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized. Please log in." }); return; }

  const { firstName, lastName, mobileNumber } = req.body;

  try {
    const updateData: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (firstName && typeof firstName === "string") updateData.firstName = firstName.trim();
    if (lastName && typeof lastName === "string") updateData.lastName = lastName.trim();

    if (mobileNumber && typeof mobileNumber === "string") {
      const cleanMobile = mobileNumber.trim().replace(/\D/g, "");
      if (cleanMobile.length < 10) { res.status(400).json({ error: "Please provide a valid 10-digit mobile number." }); return; }

      const existingMobile = await db.select().from(usersTable).where(and(eq(usersTable.mobileNumber, cleanMobile), ne(usersTable.id, userId))).limit(1);
      if (existingMobile.length > 0) { res.status(400).json({ error: "This mobile number is already in use by another account." }); return; }
      updateData.mobileNumber = cleanMobile;
    }

    await db.update(usersTable).set(updateData).where(eq(usersTable.id, userId));
    const updatedUser = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1))[0];

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: { id: updatedUser.id, firstName: updatedUser.firstName, lastName: updatedUser.lastName, mobileNumber: updatedUser.mobileNumber, email: updatedUser.email },
    });
  } catch (err: any) {
    req.log.error({ err }, "Profile update error");
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// ── 5. Delete Account ───────────────────────────────────────
router.delete("/delete-account", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized. Please log in to delete your account." }); return; }

  try {
    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (foundUsers.length === 0) { res.status(404).json({ error: "User account not found." }); return; }

    const user = foundUsers[0];
    const deletedAt = new Date();
    const penaltyExpiresAt = new Date(deletedAt.getTime() + 15 * 24 * 60 * 60 * 1000);

    await db.insert(deletedAccountsLogTable).values({ id: randomUUID(), email: user.email, mobileNumber: user.mobileNumber, deletedAt, penaltyExpiresAt });
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    // Also clean up TOTP secrets
    await db.delete(totpSecretsTable).where(eq(totpSecretsTable.userId, userId));
    await deleteSession(req.headers.authorization);

    req.log.info({ userId, email: user.email }, "User deleted account with 15-day lockdown penalty registered");

    res.status(200).json({
      success: true,
      message: "Your account and personal data have been completely deleted in compliance with Play Store privacy policies. Note: A 15-day new-user offer lockdown applies if you register again.",
      penaltyExpiresAt: penaltyExpiresAt.toISOString(),
    });
  } catch (err: any) {
    req.log.error({ err }, "Account deletion error");
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

// ── 6. Forgot Password ─────────────────────────────────────
router.post("/forgot-password", recoveryLimiter, validate({ body: ForgotPasswordBodySchema }), async (req: Request, res: Response) => {
  const cleanEmail = req.body.email.trim().toLowerCase();

  try {
    // Check lockout
    const lockout = await db.select().from(passwordLockoutsTable).where(and(eq(passwordLockoutsTable.email, cleanEmail), gt(passwordLockoutsTable.lockedUntil, new Date()))).limit(1);
    if (lockout.length > 0) {
      const minutesLeft = Math.ceil((lockout[0].lockedUntil.getTime() - Date.now()) / 60000);
      res.status(429).json({ error: `A password reset was recently performed. Security lockout is active for another ${minutesLeft} minutes to prevent abuse.` });
      return;
    }

    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (foundUsers.length === 0) {
      // Don't reveal user existence
      res.status(200).json({ success: true, message: "If an account exists with this email, a password recovery link valid for 60 minutes has been sent." });
      return;
    }

    const user = foundUsers[0];
    const rawToken = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const now = Date.now();
    const expiresAt = new Date(now + 60 * 60 * 1000);

    await db.insert(passwordResetsTable).values({ id: randomUUID(), userId: user.id, email: cleanEmail, tokenHash, expiresAt });

    const shopSettings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    const shopDomain = shopSettings?.shopDomain || "myshop.com";
    const resetUrl = `https://${shopDomain}/reset-password?token=${rawToken}&email=${encodeURIComponent(cleanEmail)}`;

    const emailResult = await sendPasswordRecoveryEmail(cleanEmail, user.firstName, rawToken, resetUrl);
    req.log.info({ email: cleanEmail, expiresAt }, "Sent password recovery email");

    res.status(200).json({ success: true, message: "Password recovery email has been sent. The token is valid for 60 minutes.", previewUrl: emailResult.previewUrl });
  } catch (err: any) {
    req.log.error({ err }, "Forgot password error");
    res.status(500).json({ error: "Failed to process recovery request." });
  }
});

// ── 7. Reset Password ───────────────────────────────────────
router.post("/reset-password", recoveryLimiter, validate({ body: ResetPasswordBodySchema }), async (req: Request, res: Response) => {
  const { email, token, newPassword, confirmPassword } = req.body;

  if (confirmPassword && newPassword !== confirmPassword) {
    res.status(400).json({ error: "Passwords do not match." });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const tokenHash = createHash("sha256").update(token.trim()).digest("hex");
  const now = new Date();

  try {
    const resets = await db.select().from(passwordResetsTable).where(and(eq(passwordResetsTable.email, cleanEmail), eq(passwordResetsTable.tokenHash, tokenHash), gt(passwordResetsTable.expiresAt, now))).limit(1);
    if (resets.length === 0 || resets[0].usedAt) {
      res.status(400).json({ error: "Invalid or expired recovery token (tokens are valid for 60 minutes and single-use only)." });
      return;
    }

    const resetRecord = resets[0];
    const newPasswordHash = hashPassword(newPassword);

    await db.update(usersTable).set({ passwordHash: newPasswordHash, updatedAt: now }).where(eq(usersTable.id, resetRecord.userId));
    await db.update(passwordResetsTable).set({ usedAt: now }).where(eq(passwordResetsTable.id, resetRecord.id));

    const lockoutUntil = new Date(now.getTime() + 15 * 60 * 1000);
    await db.insert(passwordLockoutsTable).values({ id: randomUUID(), email: cleanEmail, lockedUntil: lockoutUntil }).onConflictDoUpdate({ target: passwordLockoutsTable.email, set: { lockedUntil: lockoutUntil } });

    req.log.info({ email: cleanEmail }, "Password successfully reset; 15-min lockout enacted");
    res.status(200).json({ success: true, message: "Password reset successful! You may now sign in with your new password." });
  } catch (err: any) {
    req.log.error({ err }, "Reset password error");
    res.status(500).json({ error: "Failed to reset password." });
  }
});

// ═══════════════════════════════════════════════════════════
// ── TOTP Endpoints ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════

// ── TOTP Setup (generate secret + QR code) ──────────────────
router.post("/totp/setup", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized." }); return; }

  try {
    // Check if already set up
    const existing = await db.select().from(totpSecretsTable).where(eq(totpSecretsTable.userId, userId)).limit(1);
    if (existing.length > 0 && existing[0].isEnabled) {
      res.status(400).json({ error: "TOTP is already enabled. Disable it first to reconfigure." });
      return;
    }

    const user = (await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1))[0];
    if (!user) { res.status(404).json({ error: "User not found." }); return; }

    const secret = generateTotpSecret();
    const qrCodeDataUrl = await generateQrCodeDataUrl(secret, user.email);
    const encrypted = encryptSecret(secret);

    // Upsert: delete old pending setup, insert new
    if (existing.length > 0) {
      await db.delete(totpSecretsTable).where(eq(totpSecretsTable.userId, userId));
    }

    await db.insert(totpSecretsTable).values({
      id: randomUUID(),
      userId,
      encryptedSecret: encrypted,
      isEnabled: false,
      recoveryCodes: "[]",
    });

    res.status(200).json({
      secret, // manual entry key (base32)
      qrCodeDataUrl,
      manualEntryKey: secret,
      message: "Scan the QR code with your authenticator app, then verify with a code to enable TOTP.",
    });
  } catch (err: any) {
    req.log.error({ err }, "TOTP setup error");
    res.status(500).json({ error: "Failed to set up TOTP." });
  }
});

// ── TOTP Enable (verify code + generate recovery codes) ─────
router.post("/totp/enable", validate({ body: TotpVerifyBodySchema }), async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized." }); return; }

  const { totpCode } = req.body;

  try {
    const records = await db.select().from(totpSecretsTable).where(eq(totpSecretsTable.userId, userId)).limit(1);
    if (records.length === 0) { res.status(400).json({ error: "Please run TOTP setup first." }); return; }

    const record = records[0];
    if (record.isEnabled) { res.status(400).json({ error: "TOTP is already enabled." }); return; }

    const secret = decryptSecret(record.encryptedSecret);
    if (!verifyTotpToken(secret, totpCode)) {
      res.status(400).json({ error: "Invalid TOTP code. Please try again with a fresh code from your authenticator app." });
      return;
    }

    // Generate 8 downloadable recovery codes
    const { plaintextCodes, hashedCodes } = generateRecoveryCodes();

    await db.update(totpSecretsTable).set({
      isEnabled: true,
      recoveryCodes: JSON.stringify(hashedCodes),
      updatedAt: new Date(),
    }).where(eq(totpSecretsTable.id, record.id));

    req.log.info({ userId }, "TOTP enabled successfully");

    res.status(200).json({
      success: true,
      recoveryCodes: plaintextCodes,
      message: "TOTP has been enabled! Save these recovery codes in a safe place. Each code can only be used once.",
    });
  } catch (err: any) {
    req.log.error({ err }, "TOTP enable error");
    res.status(500).json({ error: "Failed to enable TOTP." });
  }
});

// ── TOTP Disable ────────────────────────────────────────────
router.post("/totp/disable", validate({ body: TotpVerifyBodySchema }), async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) { res.status(401).json({ error: "Unauthorized." }); return; }

  const { totpCode } = req.body;

  try {
    const records = await db.select().from(totpSecretsTable).where(and(eq(totpSecretsTable.userId, userId), eq(totpSecretsTable.isEnabled, true))).limit(1);
    if (records.length === 0) { res.status(400).json({ error: "TOTP is not currently enabled." }); return; }

    const record = records[0];
    const secret = decryptSecret(record.encryptedSecret);

    if (!verifyTotpToken(secret, totpCode)) {
      res.status(400).json({ error: "Invalid TOTP code. Cannot disable TOTP without a valid code." });
      return;
    }

    await db.delete(totpSecretsTable).where(eq(totpSecretsTable.id, record.id));
    req.log.info({ userId }, "TOTP disabled");

    res.status(200).json({ success: true, message: "TOTP has been disabled. You will now use email OTP for login verification." });
  } catch (err: any) {
    req.log.error({ err }, "TOTP disable error");
    res.status(500).json({ error: "Failed to disable TOTP." });
  }
});

// ── TOTP Verify (during login) ──────────────────────────────
router.post("/totp/verify", otpLimiter, validate({ body: TotpLoginVerifySchema }), async (req: Request, res: Response) => {
  const { email, totpCode } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (foundUsers.length === 0) { res.status(401).json({ error: "Invalid credentials." }); return; }

    const user = foundUsers[0];
    const totpRecords = await db.select().from(totpSecretsTable).where(and(eq(totpSecretsTable.userId, user.id), eq(totpSecretsTable.isEnabled, true))).limit(1);
    if (totpRecords.length === 0) { res.status(400).json({ error: "TOTP is not enabled for this account." }); return; }

    const secret = decryptSecret(totpRecords[0].encryptedSecret);
    if (!verifyTotpToken(secret, totpCode)) {
      res.status(400).json({ error: "Invalid TOTP code. Please try again." });
      return;
    }

    const token = await createSession(user.id);
    req.log.info({ userId: user.id, email: user.email }, "Customer verified TOTP and signed in");

    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, mobileNumber: user.mobileNumber, email: user.email },
    });
  } catch (err: any) {
    req.log.error({ err }, "TOTP verify error");
    res.status(500).json({ error: "TOTP verification failed." });
  }
});

// ── TOTP Recover (use recovery code) ────────────────────────
router.post("/totp/recover", otpLimiter, validate({ body: TotpRecoverySchema }), async (req: Request, res: Response) => {
  const { email, recoveryCode } = req.body;
  const cleanEmail = email.trim().toLowerCase();

  try {
    const foundUsers = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
    if (foundUsers.length === 0) { res.status(401).json({ error: "Invalid credentials." }); return; }

    const user = foundUsers[0];
    const totpRecords = await db.select().from(totpSecretsTable).where(and(eq(totpSecretsTable.userId, user.id), eq(totpSecretsTable.isEnabled, true))).limit(1);
    if (totpRecords.length === 0) { res.status(400).json({ error: "TOTP is not enabled for this account." }); return; }

    const record = totpRecords[0];
    const hashedCodes: string[] = JSON.parse(record.recoveryCodes || "[]");
    const matchIndex = verifyRecoveryCode(recoveryCode, hashedCodes);

    if (matchIndex === -1) {
      res.status(400).json({ error: "Invalid recovery code." });
      return;
    }

    // Remove used recovery code
    hashedCodes.splice(matchIndex, 1);
    await db.update(totpSecretsTable).set({ recoveryCodes: JSON.stringify(hashedCodes), updatedAt: new Date() }).where(eq(totpSecretsTable.id, record.id));

    const token = await createSession(user.id);
    req.log.info({ userId: user.id, email: user.email, remainingCodes: hashedCodes.length }, "Customer used TOTP recovery code and signed in");

    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, firstName: user.firstName, lastName: user.lastName, mobileNumber: user.mobileNumber, email: user.email },
      remainingRecoveryCodes: hashedCodes.length,
      message: `Recovery code accepted. You have ${hashedCodes.length} recovery codes remaining.`,
    });
  } catch (err: any) {
    req.log.error({ err }, "TOTP recovery error");
    res.status(500).json({ error: "TOTP recovery failed." });
  }
});

export default router;
