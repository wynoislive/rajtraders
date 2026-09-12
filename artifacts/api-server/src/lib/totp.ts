import { createCipheriv, createDecipheriv, randomBytes, scryptSync, timingSafeEqual, randomInt } from "node:crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { logger } from "./logger";

// ── AES-256-GCM encryption for TOTP secrets at rest ────────

const ENCRYPTION_KEY_HEX = process.env.TOTP_ENCRYPTION_KEY ?? "";

function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). " +
      "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  return Buffer.from(ENCRYPTION_KEY_HEX, "hex");
}

export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:ciphertext (all hex)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSecret(encryptedStr: string): string {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertextHex] = encryptedStr.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error("Invalid encrypted TOTP secret format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// ── TOTP operations ─────────────────────────────────────────

const TOTP_ISSUER = process.env.SHOP_NAME ?? "RAJ TRADERS";

/**
 * Generates a new random TOTP secret (base32 encoded).
 */
export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

/**
 * Generates a QR code data URL for the TOTP setup flow.
 */
export async function generateQrCodeDataUrl(
  secret: string,
  userEmail: string,
): Promise<string> {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    label: userEmail,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  const uri = totp.toString();
  return QRCode.toDataURL(uri, { width: 256, margin: 2 });
}

/**
 * Verifies a 6-digit TOTP token against the secret.
 * Allows a ±1 window (30 seconds either side) for clock drift.
 */
export function verifyTotpToken(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });

  // delta will be null if invalid, or an integer for the time step offset
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

// ── Recovery codes ──────────────────────────────────────────

/**
 * Generates 8 recovery codes, each 8 characters (alphanumeric).
 * Returns both the plaintext codes (to show the user once) and
 * hashed versions (to store in the database).
 */
export function generateRecoveryCodes(): {
  plaintextCodes: string[];
  hashedCodes: string[];
} {
  const plaintextCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    // Generate 8-char alphanumeric code using crypto-safe randomness
    const code = Array.from({ length: 8 }, () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1 to avoid confusion
      return chars[randomInt(0, chars.length)];
    }).join("");

    plaintextCodes.push(code);
    hashedCodes.push(hashRecoveryCode(code));
  }

  return { plaintextCodes, hashedCodes };
}

/**
 * Hashes a recovery code with scrypt for safe database storage.
 */
export function hashRecoveryCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(code.toUpperCase().replace(/\s/g, ""), salt, 32);
  return `${salt}:${derived.toString("hex")}`;
}

/**
 * Verifies a recovery code against a list of hashed codes.
 * Returns the index of the matching code, or -1 if no match.
 */
export function verifyRecoveryCode(
  code: string,
  hashedCodes: string[],
): number {
  const cleanCode = code.toUpperCase().replace(/\s/g, "");

  for (let i = 0; i < hashedCodes.length; i++) {
    const [salt, hash] = hashedCodes[i].split(":");
    if (!salt || !hash) continue;

    const derived = scryptSync(cleanCode, salt, 32);
    const storedBuffer = Buffer.from(hash, "hex");

    if (derived.length === storedBuffer.length && timingSafeEqual(derived, storedBuffer)) {
      return i;
    }
  }

  return -1;
}
