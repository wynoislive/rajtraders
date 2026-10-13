import nodemailer from "nodemailer";
import { db, shopSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { enqueueEmail, type EmailJobData } from "../lib/email-queue";

let testAccountCache: nodemailer.TestAccount | null = null;
let transporterCache: { transporter: nodemailer.Transporter; from: string; shopName: string } | null = null;
let notificationTransporterCache: { transporter: nodemailer.Transporter; from: string; shopName: string } | null = null;

export function clearTransporterCache(): void {
  transporterCache = null;
  notificationTransporterCache = null;
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

async function getNotificationTransporter(): Promise<{ transporter: nodemailer.Transporter; from: string; shopName: string }> {
  if (notificationTransporterCache) return notificationTransporterCache;

  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  const shopName = settings?.shopName || process.env.SHOP_NAME || "RAJ TRADERS";

  const host = process.env.NOTIFICATION_SMTP_HOST || settings?.notificationSmtpHost || "smtp.gmail.com";
  const user = process.env.NOTIFICATION_SMTP_USER || settings?.notificationSmtpUser || "notifications.rajtraders@gmail.com";
  const pass = process.env.NOTIFICATION_SMTP_PASS || settings?.notificationSmtpPass || "";
  const port = parseInt(process.env.NOTIFICATION_SMTP_PORT || String(settings?.notificationSmtpPort || 465), 10);
  const from = process.env.NOTIFICATION_SMTP_FROM || settings?.notificationSmtpFrom || `RAJ TRADERS Notifications <${user}>`;

  let transporter: nodemailer.Transporter;

  if (user && pass && host) {
    const isProduction = process.env.NODE_ENV === "production";
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: isProduction,
      },
    } as any);
  } else {
    return getTransporter();
  }

  notificationTransporterCache = { transporter, from, shopName };
  return notificationTransporterCache;
}

// ── Hostinger Mail API (primary sender) ─────────────────────

async function sendViaHostingerApi(
  to: string,
  subject: string,
  htmlContent: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    const apiToken = settings?.hostingerApiToken || process.env.HOSTINGER_API_TOKEN;
    let resourceId = settings?.hostingerMailboxResourceId || process.env.HOSTINGER_MAILBOX_RESOURCE_ID;
    const shopName = settings?.shopName || process.env.SHOP_NAME || "RAJ TRADERS";
    const senderEmail = settings?.smtpUser || process.env.SMTP_USER || "wyno@justbuyme.in";

    if (!apiToken) {
      return { success: false, error: "Hostinger API token not configured" };
    }

    // Auto-discover resourceId from /api/v1/me if missing
    if (!resourceId) {
      try {
        const meRes = await fetch("https://api.mail.hostinger.com/api/v1/me", {
          headers: { "Authorization": `Bearer ${apiToken}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json() as any;
          const mailboxes = meData?.data?.mailboxes || [];
          const match = mailboxes.find((m: any) => m.address?.toLowerCase() === senderEmail.toLowerCase()) || mailboxes[0];
          if (match?.resourceId) {
            resourceId = match.resourceId;
            logger.info({ resourceId, address: match.address }, "Auto-discovered Hostinger Mailbox Resource ID");
          }
        }
      } catch (e) {
        logger.warn({ err: e }, "Failed to auto-discover Hostinger Mailbox Resource ID");
      }
    }

    if (!resourceId) {
      return { success: false, error: "Mailbox Resource ID could not be determined" };
    }

    const response = await fetch(`https://api.mail.hostinger.com/api/v1/mailboxes/${resourceId}/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [to],
        displayName: shopName,
        subject,
        html: htmlContent,
      }),
    });

    if (response.status === 204 || response.ok) {
      logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via Hostinger REST API");
      return { success: true };
    }

    const errText = await response.text();
    logger.warn({ to, status: response.status, errText }, "Hostinger REST API failed, falling back to SMTP");
    return { success: false, error: `Hostinger API ${response.status}: ${errText}` };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Hostinger API Exception";
    logger.warn({ err, to }, "Hostinger REST API error, falling back to SMTP");
    return { success: false, error: errorMsg };
  }
}

// ── Shared email sending logic (Hostinger → SMTP fallback) ──

export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  forceProvider?: "hostinger_rest" | "smtp" | "gmail_notifications",
  attachments?: nodemailer.SendMailOptions["attachments"],
): Promise<{ success: boolean; provider?: "hostinger_rest" | "smtp" | "gmail_notifications"; previewUrl?: string; error?: string; hostingerError?: string }> {
  // Forced Gmail / System Notifications Nodemailer mode
  if (forceProvider === "gmail_notifications") {
    try {
      const { transporter, from } = await getNotificationTransporter();
      const info = await transporter.sendMail({ from, to, subject, html: htmlContent, attachments });
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via Gmail Notifications Nodemailer SMTP");
      return { success: true, provider: "gmail_notifications", previewUrl: previewUrl ? previewUrl.toString() : undefined };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Gmail Notifications Send Failed";
      logger.error({ err, to }, "Gmail Notifications Nodemailer send failed");
      return { success: false, provider: "gmail_notifications", error: errorMsg };
    }
  }

  // Forced Nodemailer SMTP mode
  if (forceProvider === "smtp") {
    try {
      const { transporter, from } = await getTransporter();
      const info = await transporter.sendMail({ from, to, subject, html: htmlContent, attachments });
      const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
      logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via Nodemailer SMTP (Forced)");
      return { success: true, provider: "smtp", previewUrl: previewUrl ? previewUrl.toString() : undefined };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "SMTP Send Failed";
      logger.error({ err, to }, "SMTP email send failed (Forced)");
      return { success: false, provider: "smtp", error: errorMsg };
    }
  }

  // Forced Hostinger REST API mode
  if (forceProvider === "hostinger_rest") {
    const hostingerResult = await sendViaHostingerApi(to, subject, htmlContent);
    if (hostingerResult.success) {
      return { success: true, provider: "hostinger_rest" };
    }
    return { success: false, provider: "hostinger_rest", error: hostingerResult.error || "Hostinger REST API Failed" };
  }

  // If attachments are provided, prioritize Nodemailer SMTP (since REST API might not support attachments)
  if (!attachments || attachments.length === 0) {
    const hostingerResult = await sendViaHostingerApi(to, subject, htmlContent);
    if (hostingerResult.success) {
      return { success: true, provider: "hostinger_rest" };
    }
  }

  // Fall back 1: Hostinger Nodemailer SMTP
  try {
    const { transporter, from } = await getTransporter();
    const info = await transporter.sendMail({ from, to, subject, html: htmlContent, attachments });
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via Hostinger Nodemailer SMTP");
    return { success: true, provider: "smtp", previewUrl: previewUrl ? previewUrl.toString() : undefined };
  } catch (err: unknown) {
    const primaryErrMsg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: primaryErrMsg, to }, "Primary SMTP email send failed; trying Notification Gmail SMTP fallback");
    // Fall back 2: System / Notification Gmail Nodemailer SMTP
    try {
      const { transporter, from } = await getNotificationTransporter();
      const info = await transporter.sendMail({ from, to, subject, html: htmlContent, attachments });
      logger.info({ to, subject: subject.slice(0, 50) }, "Email sent via Notification Gmail Nodemailer SMTP (Fallback)");
      return { success: true, provider: "gmail_notifications" };
    } catch (notifErr: unknown) {
      const notifErrMsg = notifErr instanceof Error ? notifErr.message : "All email senders failed";
      logger.error({ notifErr: notifErrMsg, to }, "All email providers (Hostinger API, Hostinger SMTP, Gmail SMTP) failed");
      return { success: false, error: notifErrMsg };
    }
  }
}

// ── Public email functions (synchronous delivery for serverless reliability) ─────────────

/**
 * Send a 6-digit verification OTP email immediately.
 * Direct dispatch: Hostinger API → Hostinger SMTP → Gmail Notifications SMTP.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  userName: string,
  otpCode: string,
  directVerifyUrl?: string,
): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    const { shopName } = await getTransporter();
    const cleanCode = otpCode.trim().replace(/\s+/g, "");
    // Standard high-confidence OTP subject recognized by Gmail & mail client parsers
    const subject = `${cleanCode} is your ${shopName} verification code`;
    const htmlContent = buildOtpHtml(shopName, userName, cleanCode, directVerifyUrl);
    return await sendEmail(toEmail, subject, htmlContent);
  } catch (err) {
    logger.error({ err, toEmail }, "Failed to send verification OTP email");
    return { success: false };
  }
}

/**
 * Send a password recovery email with a 60-minute reset link immediately.
 * Direct dispatch: Hostinger API → Hostinger SMTP → Gmail Notifications SMTP.
 */
export async function sendPasswordRecoveryEmail(
  toEmail: string,
  userName: string,
  resetToken: string,
  resetUrl: string,
): Promise<{ success: boolean; previewUrl?: string }> {
  try {
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

function buildOtpHtml(
  shopName: string,
  userName: string,
  cleanCode: string,
  directVerifyUrl?: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">
  <title>${cleanCode} is your verification code</title>
  <!-- Schema.org EmailMessage for Gmail & modern email clients -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "EmailMessage",
    "description": "Your ${shopName} verification code is ${cleanCode}",
    "about": {
      "@type": "Thing",
      "name": "One-Time Password",
      "identifier": "${cleanCode}"
    }
  }
  </script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #F7F2EA;
      margin: 0;
      padding: 24px 12px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 540px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.06);
      border: 1px solid #E2E8F0;
    }
    .header {
      background: #0E3D42;
      color: #ffffff;
      padding: 32px 24px;
      text-align: center;
    }
    .brand-title {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .brand-subtitle {
      margin: 6px 0 0;
      opacity: 0.85;
      font-size: 13px;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 36px 28px;
      color: #2D3748;
      line-height: 1.6;
      text-align: center;
    }
    .title {
      margin: 0 0 12px;
      color: #0E3D42;
      font-size: 22px;
      font-weight: 800;
    }
    .greeting {
      font-size: 15px;
      font-weight: 600;
      color: #4A5568;
      margin: 0 0 8px;
    }
    .message {
      font-size: 15px;
      color: #4A5568;
      margin: 0 0 20px;
    }
    .otp-container {
      margin: 22px 0;
      text-align: center;
    }
    .otp-card {
      display: inline-block;
      background: #F8FAFC;
      border: 2px solid #CBD5E1;
      border-radius: 16px;
      padding: 20px 36px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(0,0,0,0.04);
      cursor: pointer;
      user-select: all;
      -webkit-user-select: all;
      -moz-user-select: all;
      -ms-user-select: all;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'SF Pro Mono', 'Roboto Mono', Menlo, Consolas, Monaco, monospace;
      font-size: 38px;
      font-weight: 800;
      color: #0E3D42;
      letter-spacing: 12px;
      margin: 4px 0 6px 12px;
      user-select: all;
      -webkit-user-select: all;
      -moz-user-select: all;
      -ms-user-select: all;
    }
    .otp-helper {
      display: inline-block;
      margin-top: 8px;
      padding: 5px 14px;
      background-color: #E6F4F1;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      color: #0E3D42;
      letter-spacing: 0.5px;
    }
    .action-container {
      margin: 22px 0 16px;
      text-align: center;
    }
    .action-btn {
      display: inline-block;
      background-color: #0E3D42;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 14px;
      font-weight: 700;
      padding: 13px 28px;
      border-radius: 12px;
      box-shadow: 0 4px 14px rgba(14,61,66,0.22);
    }
    .action-subtext {
      font-size: 11px;
      color: #64748B;
      margin-top: 6px;
    }
    .expiry-notice {
      font-size: 13px;
      color: #64748B;
      margin-top: 16px;
    }
    .warning-box {
      background: #FFFBEB;
      border-left: 4px solid #D97706;
      border-radius: 0 8px 8px 0;
      padding: 14px;
      margin-top: 24px;
      font-size: 12px;
      color: #92400E;
      text-align: left;
      line-height: 1.6;
    }
    .footer {
      background: #FAF5EE;
      padding: 22px;
      text-align: center;
      font-size: 12px;
      color: #718096;
      border-top: 1px solid #E2E8F0;
    }
  </style>
</head>
<body>
  <!-- Gmail & Mail Client Snippet (Triggers automatic OTP highlight & inbox preview) -->
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;mso-hide:all;">
    Your ${shopName} verification code is: ${cleanCode}. Valid for 10 minutes. Do not share this code.
  </div>

  <div class="container">
    <div class="header">
      <div class="brand-title">${shopName}</div>
      <div class="brand-subtitle">Wholesale &amp; Retail Artisanal Goods</div>
    </div>
    <div class="content">
      <h2 class="title">Your Verification Code</h2>
      <p class="greeting">Hello ${userName || "Valued Customer"},</p>
      <p class="message">
        We received a request to access your ${shopName} account. Your verification code is:
      </p>

      <!-- Google-Style Verification Code Highlight Card with Instant Select/Copy -->
      <div class="otp-container">
        <div class="otp-card" title="Click or tap to select all">
          <div class="otp-label">Verification Code</div>
          <div class="otp-code">${cleanCode}</div>
          <div class="otp-helper">
            📋 Tap code to select all
          </div>
        </div>
      </div>

      ${directVerifyUrl ? `
      <!-- Direct 1-Click Auto-Verify Action -->
      <div class="action-container">
        <a href="${directVerifyUrl}" class="action-btn" target="_blank" rel="noopener noreferrer">
          ⚡ 1-Click Auto-Verify &amp; Continue
        </a>
        <div class="action-subtext">Opens your store directly with this code auto-filled</div>
      </div>
      ` : ''}

      <p class="expiry-notice">This single-use code is valid for <strong>10 minutes</strong>.</p>
      <div class="warning-box">
        <strong>Security Notice:</strong><br>
        • Never share this code with anyone. ${shopName} staff will never ask for your verification code.<br>
        • If you did not attempt to log in, please reset your password immediately.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px;">© ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
      <p style="margin: 0;">End-to-End Encrypted Login Security</p>
    </div>
  </div>
</body>
</html>`;
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

function buildOrderConfirmationHtml(
  shopName: string,
  customerName: string,
  orderId: string,
  totalCents: number,
  items: Array<{ name: string; quantity: number; priceCents: number }>,
): string {
  const itemRows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #E2E8F0; text-align: right;">₹${((item.priceCents * item.quantity) / 100).toFixed(2)}</td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="background: #0E3D42; color: #ffffff; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">${shopName}</h1>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Order Confirmation & Official Tax Invoice</p>
        </div>
        <div style="padding: 24px; color: #334155;">
          <h2 style="color: #0E3D42; margin-top: 0;">Thank You for Your Order!</h2>
          <p>Dear ${customerName || "Valued Customer"},</p>
          <p>Your order <strong>#${orderId.slice(0, 8).toUpperCase()}</strong> has been successfully placed and payment confirmed.</p>
          <p>Your official GST Tax Invoice has been generated and is attached to this email as a PDF document for your records.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 8px; text-align: left;">Item</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px 8px; font-weight: bold; text-align: right;">Grand Total:</td>
                <td style="padding: 10px 8px; font-weight: bold; text-align: right; color: #e11d48;">₹${(totalCents / 100).toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p style="font-size: 13px; color: #64748b;">You can track real-time delivery status and download duplicate invoices anytime in your customer account dashboard.</p>
        </div>
        <div style="background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
          <p>© ${new Date().getFullYear()} ${shopName}. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Sends order confirmation email with official GST vector PDF tax invoice attachment.
 */
export async function sendOrderConfirmationEmail(
  toEmail: string,
  customerName: string,
  orderId: string,
  totalCents: number,
  items: Array<{ name: string; quantity: number; priceCents: number }>,
  pdfInvoiceBuffer?: Buffer,
): Promise<{ success: boolean; previewUrl?: string }> {
  try {
    const { shopName } = await getTransporter();
    const subject = `Order Confirmed: #${orderId.slice(0, 8).toUpperCase()} - ${shopName} (Tax Invoice Attached)`;
    const htmlContent = buildOrderConfirmationHtml(shopName, customerName, orderId, totalCents, items);

    const attachments = pdfInvoiceBuffer
      ? [
          {
            filename: `Tax_Invoice_${orderId.slice(0, 8).toUpperCase()}.pdf`,
            content: pdfInvoiceBuffer,
            contentType: "application/pdf",
          },
        ]
      : undefined;

    return await sendEmail(toEmail, subject, htmlContent, undefined, attachments);
  } catch (err) {
    logger.error({ err, toEmail, orderId }, "Failed to send order confirmation email with invoice");
    return { success: false };
  }
}

