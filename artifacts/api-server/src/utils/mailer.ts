import nodemailer from "nodemailer";
import { db, shopSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { enqueueEmail, type EmailJobData } from "../lib/email-queue";

let testAccountCache: nodemailer.TestAccount | null = null;
let transporterCache: { transporter: nodemailer.Transporter; from: string; shopName: string } | null = null;

export function clearTransporterCache(): void {
  transporterCache = null;
}

async function getTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string; shopName: string }> {
  if (transporterCache) return transporterCache;

  // Priority 1: Environment variables (.env file)
  const envHost = process.env.SMTP_HOST;
  const envUser = process.env.SMTP_USER;
  const envPass = process.env.SMTP_PASS;
  const envPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const envFrom = process.env.SMTP_FROM || "";

  // Priority 2: Database shop_settings (admin panel configured)
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];

  const shopName = settings?.shopName || process.env.SHOP_NAME || "My Shop";
  const smtpHost = envHost || settings?.smtpHost || "smtp.hostinger.com";
  const smtpUser = envUser || settings?.smtpUser || "";
  const smtpPass = envPass || settings?.smtpPass || "";
  const smtpPort = envPort !== undefined ? envPort : (settings?.smtpPort || 465);
  const smtpFrom = envFrom || settings?.smtpFrom || `${shopName} <${smtpUser}>`;

  let transporter: nodemailer.Transporter;

  if (smtpUser && smtpPass && smtpHost) {
    const isProduction = process.env.NODE_ENV === "production";
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: isProduction, // enforce cert validation in production
      },
    } as any);
  } else {
    // Priority 3: Ethereal test transport (development fallback) with safe jsonTransport fallback
    try {
      if (!testAccountCache) {
        testAccountCache = await nodemailer.createTestAccount();
      }
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccountCache.user,
          pass: testAccountCache.pass,
        },
      });
    } catch (e) {
      logger.warn({ err: e }, "Ethereal test transport creation failed, falling back to JSON logger transport");
      transporter = nodemailer.createTransport({
        jsonTransport: true,
      } as any);
    }
  }

  transporterCache = { transporter, from: smtpFrom, shopName };
  return transporterCache;
}

// ── Hostinger Mail API (primary sender) ─────────────────────

async function sendViaHostingerApi(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<{ success: boolean }> {
  const apiToken = process.env.HOSTINGER_API_TOKEN;
  const senderEmail = process.env.HOSTINGER_SENDER_EMAIL;

  if (!apiToken || !senderEmail) return { success: false };

  try {
    const response = await fetch("https://api.mail.hostinger.com/api/v1/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: { email: senderEmail, name: process.env.SHOP_NAME || "RAJ TRADERS" },
        to: [{ email: to }],
        subject,
        html: htmlContent,
      }),
    });

    if (response.ok) {
      logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via Hostinger API");
      return { success: true };
    }

    const errText = await response.text();
    logger.warn({ to, status: response.status, errText }, "Hostinger API email failed, falling back to SMTP");
    return { success: false };
  } catch (err) {
    logger.warn({ err, to }, "Hostinger API error, falling back to SMTP");
    return { success: false };
  }
}

// ── Shared email sending logic (Hostinger → SMTP fallback) ──

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<{ success: boolean; previewUrl?: string }> {
  // Try Hostinger API first
  const hostingerResult = await sendViaHostingerApi(to, subject, htmlContent);
  if (hostingerResult.success) return { success: true };

  // Fall back to Nodemailer SMTP
  try {
    const { transporter, from } = await getTransporter();
    const info = await transporter.sendMail({ from, to, subject, html: htmlContent });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via SMTP");
    return { success: true, previewUrl: previewUrl ? previewUrl.toString() : undefined };
  } catch (err) {
    logger.error({ err, to }, "SMTP email send failed");
    return { success: false };
  }
}

// ── Public email functions (with queue support) ─────────────

/**
 * Send a 6-digit verification OTP email.
 * Tries BullMQ queue first → Hostinger API → Nodemailer SMTP.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  userName: string,
  otpCode: string,
): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    // Try queue first
    const queued = await enqueueEmail({
      type: "verification-otp",
      to: toEmail,
      userName,
      otpCode,
    });
    if (queued) return { success: true };

    // Direct send (queue unavailable)
    const { shopName } = await getTransporter();
    const formattedCode = `${otpCode.slice(0, 3)} ${otpCode.slice(3)}`;
    const subject = `Your ${shopName} Verification Code: ${otpCode} (Valid 10 mins)`;
    const htmlContent = buildOtpHtml(shopName, userName, formattedCode);
    return await sendEmail(toEmail, subject, htmlContent);
  } catch (err) {
    logger.error({ err, toEmail }, "Failed to send verification OTP email");
    return { success: false };
  }
}

/**
 * Send a password recovery email with a 60-minute reset link.
 * Tries BullMQ queue first → Hostinger API → Nodemailer SMTP.
 */
export async function sendPasswordRecoveryEmail(
  toEmail: string,
  userName: string,
  resetToken: string,
  resetUrl: string,
): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    // Try queue first
    const queued = await enqueueEmail({
      type: "password-recovery",
      to: toEmail,
      userName,
      resetToken,
      resetUrl,
    });
    if (queued) return { success: true };

    // Direct send (queue unavailable)
    const { shopName } = await getTransporter();
    const subject = `Action Required: Reset your ${shopName} password (valid 60 mins)`;
    const htmlContent = buildRecoveryHtml(shopName, userName, resetToken, resetUrl);
    return await sendEmail(toEmail, subject, htmlContent);
  } catch (err) {
    logger.error({ err, toEmail }, "Failed to send password recovery email");
    return { success: false };
  }
}

// ── HTML template builders ──────────────────────────────────

function buildOtpHtml(shopName: string, userName: string, formattedCode: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F7F2EA; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .header { background: #0E3D42; color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 32px 28px; color: #2D3748; line-height: 1.6; text-align: center; }
        .otp-badge { display: inline-block; background: #FAF5EE; border: 2px dashed #0E3D42; color: #0E3D42; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; padding: 18px 36px; border-radius: 12px; margin: 24px 0; }
        .notice { font-size: 13px; color: #4A5568; margin-top: 15px; }
        .footer { background: #FAF5EE; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #E2E8F0; }
        .warning { background: #FFFBEB; border-left: 4px solid #D97706; padding: 12px; margin-top: 24px; font-size: 13px; color: #92400E; text-align: left; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${shopName}</h1>
          <p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Wholesale & Retail Artisanal Goods</p>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #0E3D42;">Your Verification Code</h2>
          <p style="color: #4A5568;">Hello ${userName || "Valued Customer"},</p>
          <p style="color: #4A5568;">Use the 6-digit verification code below to verify your ${shopName} account:</p>
          <div class="otp-badge">${formattedCode}</div>
          <p class="notice">This single-use code is valid for <strong>10 minutes</strong>.</p>
          <div class="warning">
            <strong>Security Notice:</strong><br>
            • Never share this code with anyone. ${shopName} staff will never ask for your verification code.<br>
            • If you did not attempt to log in, please reset your password immediately.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
          <p>End-to-End Encrypted Login Security</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function buildRecoveryHtml(shopName: string, userName: string, resetToken: string, resetUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #F7F2EA; margin: 0; padding: 20px; }
        .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); }
        .header { background: #0E3D42; color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; }
        .content { padding: 32px 28px; color: #2D3748; line-height: 1.6; }
        .button { display: inline-block; background: #0E3D42; color: #ffffff !important; padding: 14px 28px; border-radius: 10px; font-weight: bold; text-decoration: none; margin: 20px 0; font-size: 15px; }
        .token-box { background: #F7F2EA; border: 1px dashed #0E3D42; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 14px; margin: 15px 0; text-align: center; word-break: break-all; }
        .footer { background: #FAF5EE; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #E2E8F0; }
        .warning { background: #FFF5F5; border-left: 4px solid #E53E3E; padding: 12px; margin-top: 20px; font-size: 13px; color: #C53030; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${shopName}</h1>
          <p style="margin: 6px 0 0; opacity: 0.8; font-size: 13px;">Wholesale & Retail Artisanal Goods</p>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #0E3D42;">Password Recovery Request</h2>
          <p>Hello ${userName || "Valued Customer"},</p>
          <p>We received a request to reset the password for your ${shopName} account. Click the button below to choose a new password:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          <p style="font-size: 13px; color: #4A5568;">Or use your secure reset code directly in the app:</p>
          <div class="token-box">${resetToken}</div>
          <div class="warning">
            <strong>Important Security Details:</strong><br>
            • This recovery link is valid for <strong>exactly 60 minutes</strong>.<br>
            • Once used, a 15-minute security cooldown is enacted to protect your account against unauthorized requests.<br>
            • If you did not request this, you can safely ignore this email.
          </div>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
          <p>End-to-End Encrypted Account Verification System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
