import { db, shopSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface WhatsAppGatewayConfig {
  gatewayUrl?: string;
  apiKey?: string;
  sessionId?: string;
  senderNumber?: string;
}

export interface SendWhatsAppOptions {
  toPhone: string;
  message: string;
  gatewayConfig?: WhatsAppGatewayConfig;
}

export interface WhatsAppSendResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  data?: any;
}

/**
 * Normalizes any phone number into an OpenWA recipient chatId.
 * Converts standard 10-digit Indian numbers (e.g., 9876543210) to 919876543210@c.us
 */
export function formatWhatsAppChatId(phone: string): string {
  if (!phone) return "";
  let digits = phone.replace(/\D/g, "");

  // If already full JID
  if (phone.includes("@c.us") || phone.includes("@g.us")) {
    return phone.trim();
  }

  // Handle leading 0 (e.g., 09876543210)
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = "91" + digits.slice(1);
  } else if (digits.length === 10) {
    // Default Indian national number without country code
    digits = "91" + digits;
  }

  return `${digits}@c.us`;
}

/**
 * Dispatches a text message via the OpenWA Gateway REST API.
 */
export async function sendWhatsAppTextMessage({
  toPhone,
  message,
  gatewayConfig,
}: SendWhatsAppOptions): Promise<WhatsAppSendResult> {
  const chatId = formatWhatsAppChatId(toPhone);
  if (!chatId || chatId.length < 8) {
    return { success: false, error: "Invalid recipient phone number." };
  }

  let gatewayUrl = gatewayConfig?.gatewayUrl;
  let apiKey = gatewayConfig?.apiKey;
  let sessionId = gatewayConfig?.sessionId || "default";

  // If credentials not passed directly, pull from live database
  if (!gatewayUrl) {
    try {
      const [settings] = await db
        .select()
        .from(shopSettingsTable)
        .where(eq(shopSettingsTable.id, "default_shop"))
        .limit(1);

      if (!settings) {
        return { success: false, skipped: true, error: "Shop settings record not found." };
      }

      gatewayUrl = settings.whatsappGatewayUrl || process.env.WHATSAPP_GATEWAY_URL || "";
      apiKey = settings.whatsappApiKey || process.env.WHATSAPP_API_KEY || "";
      sessionId = settings.whatsappSessionId || process.env.WHATSAPP_SESSION_ID || "default";
    } catch (dbErr: any) {
      return { success: false, error: `Database error loading WhatsApp config: ${dbErr.message}` };
    }
  }

  if (!gatewayUrl || gatewayUrl.trim().length === 0) {
    return { success: false, skipped: true, error: "OpenWA gateway URL is not configured." };
  }

  const cleanBaseUrl = gatewayUrl.trim().replace(/\/+$/, "");
  const endpoint = `${cleanBaseUrl}/api/sessions/${encodeURIComponent(sessionId.trim())}/messages/send-text`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey && apiKey.trim().length > 0) {
    headers["X-API-Key"] = apiKey.trim();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        chatId,
        text: message,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errMsg = data?.message || data?.error || `OpenWA Gateway responded with HTTP ${res.status}`;
      return { success: false, error: errMsg, data };
    }

    return { success: true, data };
  } catch (err: any) {
    const isAbort = err.name === "AbortError";
    const msg = isAbort ? "Request to OpenWA Gateway timed out after 12s." : err.message;
    return { success: false, error: msg };
  }
}

/**
 * Compact order confirmation receipt sent via WhatsApp upon order placement.
 */
export async function sendOrderConfirmationWhatsApp(
  order: any,
  settings?: any
): Promise<WhatsAppSendResult> {
  const customerMobile = order.customerMobile;
  if (!customerMobile) {
    return { success: false, skipped: true, error: "Customer mobile number not provided." };
  }

  let shop = settings;
  if (!shop) {
    const [row] = await db
      .select()
      .from(shopSettingsTable)
      .where(eq(shopSettingsTable.id, "default_shop"))
      .limit(1);
    shop = row;
  }

  if (!shop?.isWhatsappNotificationsEnabled) {
    return { success: false, skipped: true, error: "WhatsApp notifications disabled in settings." };
  }

  const isPickup = (order.shippingAddress || "").toLowerCase().includes("self-pickup");
  const shortId = (order.id || "").slice(0, 8);
  const formattedAmount = (Number(order.totalCents || 0) / 100).toFixed(2);
  const storeName = shop?.shopName || "RAJ TRADERS";
  const domain = shop?.shopDomain || "sundarvan.xyz";

  const message = [
    `*${storeName}* — Order Confirmed! 🎉`,
    ``,
    `📦 *Order ID:* #${shortId}`,
    `💰 *Amount Paid:* ₹${formattedAmount}`,
    `⚡ *Fulfillment:* ${isPickup ? "Store Self-Pickup (Ready in 15–30 mins)" : "Local Home Delivery"}`,
    `📍 *${isPickup ? "Pickup Location" : "Delivery Address"}:*`,
    isPickup
      ? (shop?.shopAddress || "Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali MP 484551")
      : (order.shippingAddress || "Birsingpur Pali"),
    ``,
    `🔗 *View Invoice & Live Order:*`,
    `https://${domain}/account`,
    ``,
    shop?.supportPhone ? `📞 Help: ${shop.supportPhone}` : `✉️ Help: ${shop?.supportEmail || "support@sundarvan.xyz"}`,
  ].join("\n");

  return sendWhatsAppTextMessage({
    toPhone: customerMobile,
    message,
    gatewayConfig: {
      gatewayUrl: shop.whatsappGatewayUrl,
      apiKey: shop.whatsappApiKey,
      sessionId: shop.whatsappSessionId,
    },
  });
}

/**
 * Compact order status change notification (Dispatched, Ready for Pickup, Delivered, Cancelled).
 */
export async function sendOrderStatusWhatsApp(
  order: any,
  newStatus: string,
  extraData?: { riderName?: string; riderPhone?: string; trackingUrl?: string; cancellationReason?: string },
  settings?: any
): Promise<WhatsAppSendResult> {
  const customerMobile = order.customerMobile;
  if (!customerMobile) {
    return { success: false, skipped: true, error: "Customer mobile number not provided." };
  }

  let shop = settings;
  if (!shop) {
    const [row] = await db
      .select()
      .from(shopSettingsTable)
      .where(eq(shopSettingsTable.id, "default_shop"))
      .limit(1);
    shop = row;
  }

  if (!shop?.isWhatsappNotificationsEnabled) {
    return { success: false, skipped: true, error: "WhatsApp notifications disabled in settings." };
  }

  const shortId = (order.id || "").slice(0, 8);
  const storeName = shop?.shopName || "RAJ TRADERS";
  const domain = shop?.shopDomain || "sundarvan.xyz";
  const isPickup = (order.shippingAddress || "").toLowerCase().includes("self-pickup");

  let statusHeader = "";
  let detailsText = "";

  switch (newStatus.toLowerCase()) {
    case "packed":
      statusHeader = "🎁 Your order is packed and ready!";
      detailsText = isPickup
        ? "Your items are ready for pickup at our offline store counter."
        : "Our delivery fleet is assigned and preparing for dispatch.";
      break;

    case "dispatched":
      statusHeader = "🚀 Out for Delivery!";
      detailsText = [
        extraData?.riderName ? `🛵 Rider: ${extraData.riderName} (${extraData.riderPhone || "Fleet"})` : "🛵 Our delivery partner is on the way to your location.",
        extraData?.trackingUrl ? `📍 Track Rider: ${extraData.trackingUrl}` : "",
      ].filter(Boolean).join("\n");
      break;

    case "delivered":
    case "completed":
      statusHeader = isPickup ? "✅ Order Picked Up Successfully!" : "✅ Order Delivered!";
      detailsText = "Thank you for shopping with Raj Traders. We hope you enjoy your delicacies!";
      break;

    case "cancelled":
      statusHeader = "❌ Order Cancelled";
      detailsText = [
        extraData?.cancellationReason ? `Reason: ${extraData.cancellationReason}` : "Your order has been cancelled.",
        "Any payment debited will be refunded per store policy.",
      ].join("\n");
      break;

    default:
      statusHeader = `Status Update: ${newStatus.toUpperCase()}`;
      detailsText = `Your order status has been updated to: ${newStatus}`;
  }

  const message = [
    `*${storeName}* — ${statusHeader}`,
    ``,
    `📦 *Order ID:* #${shortId}`,
    detailsText,
    ``,
    `🔗 *View Status & Details:*`,
    `https://${domain}/account`,
  ].join("\n");

  return sendWhatsAppTextMessage({
    toPhone: customerMobile,
    message,
    gatewayConfig: {
      gatewayUrl: shop.whatsappGatewayUrl,
      apiKey: shop.whatsappApiKey,
      sessionId: shop.whatsappSessionId,
    },
  });
}

/**
 * Sends a security OTP via WhatsApp for login, registration, or password reset.
 */
export async function sendOtpWhatsApp(
  toPhone: string,
  otpCode: string,
  purpose: "login" | "verification" | "password_reset" = "verification",
  settings?: any
): Promise<WhatsAppSendResult> {
  let shop = settings;
  if (!shop) {
    const [row] = await db
      .select()
      .from(shopSettingsTable)
      .where(eq(shopSettingsTable.id, "default_shop"))
      .limit(1);
    shop = row;
  }

  if (!shop?.isWhatsappOtpEnabled) {
    return { success: false, skipped: true, error: "WhatsApp OTPs are disabled in store settings." };
  }

  const storeName = shop?.shopName || "RAJ TRADERS";
  const purposeTitle =
    purpose === "password_reset"
      ? "Password Reset Code"
      : purpose === "login"
      ? "Login Security Code"
      : "Account Verification Code";

  const message = [
    `*${storeName}* — ${purposeTitle}`,
    ``,
    `Your verification code is:`,
    `*${otpCode}*`,
    ``,
    `⏱️ Valid for 10 minutes.`,
    `⚠️ Never share this code with anyone, including staff.`,
  ].join("\n");

  return sendWhatsAppTextMessage({
    toPhone,
    message,
    gatewayConfig: {
      gatewayUrl: shop.whatsappGatewayUrl,
      apiKey: shop.whatsappApiKey,
      sessionId: shop.whatsappSessionId,
    },
  });
}
