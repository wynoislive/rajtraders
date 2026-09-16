import { Router, type Request, type Response } from "express";
import { db, ordersTable, productsTable, discountsTable, shopSettingsTable, customerCartsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { createHmac, randomUUID } from "node:crypto";
import { calculateHaversineDistanceKm } from "../utils/geo";
import { getUserIdFromToken } from "./customer-auth";
import { computeDiscount } from "../utils/discounts";
import { filterOrders } from "../utils/order-filters";
import { reserveInventory, commitInventoryReservation } from "../lib/inventory-lock";
import { generateTaxInvoicePdf } from "../utils/invoice-generator";
import { sendOrderConfirmationEmail } from "../utils/mailer";
import { getRedisClient } from "../lib/redis";

const router: Router = Router();

// Helper: fetch Razorpay credentials from DB (admin-configurable, NOT hardcoded)
async function getRazorpayCredentials(): Promise<{ keyId: string; keySecret: string }> {
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  return {
    keyId: settings?.razorpayKeyId || "rzp_test_sandbox123456",
    keySecret: settings?.razorpayKeySecret || "sandbox_secret",
  };
}

// Helper: fetch shop delivery & tax settings
async function getShopSettings() {
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  return settings || {
    latitude: 19.0760,
    longitude: 72.8777,
    deliveryRadiusKm: 15.0,
    isDeliveryEnabled: true,
    razorpayKeyId: "rzp_test_sandbox123456",
    razorpayKeySecret: "sandbox_secret",
    shopName: "RAJ TRADERS",
    legalBusinessName: "RAJ TRADERS",
    gstinNumber: "23AAAAA0000A1Z5",
    panNumber: "AAAAA0000A",
    shopAddress: "Birsingpur Pali, MP",
    stateCode: "23",
    stateName: "Madhya Pradesh",
    allowedPincodesJson: '["484661","484660"]',
    flatDeliveryFeeCents: 3000,
    freeDeliveryThresholdCents: 50000,
    packagingFeeCents: 1000,
    isCodEnabled: false,
    isStoreOpen: true,
  };
}

function isPincodeServiceable(pincode: string, allowedPincodesJson?: string | null): boolean {
  if (!allowedPincodesJson) return true;
  try {
    const list = JSON.parse(allowedPincodesJson);
    if (!Array.isArray(list) || list.length === 0) return true;
    return list.includes(pincode.trim());
  } catch {
    return true;
  }
}

interface CheckoutItem {
  productId: string;
  quantity: number;
}

interface CreateOrderBody {
  idempotencyKey: string;
  items: CheckoutItem[];
  discountCode?: string;
  customerEmail?: string;
  // Auth & Shipping fields
  userId?: string;
  customerName?: string;
  customerMobile?: string;
  shippingAddress?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
}

interface VerifyPaymentBody {
  idempotencyKey: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string;
}

// 0. Validate Delivery Address (Haversine formula distance check)
router.post("/validate-delivery", async (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    res.status(400).json({ error: "Please provide valid latitude and longitude." });
    return;
  }

  try {
    const settings = await getShopSettings();

    if (!settings.isDeliveryEnabled) {
      res.status(200).json({
        allowed: true,
        distanceKm: 0,
        radiusKm: 0,
        message: "Delivery radius validation is disabled. All addresses accepted.",
      });
      return;
    }

    const distanceKm = calculateHaversineDistanceKm(
      settings.latitude,
      settings.longitude,
      latitude,
      longitude,
    );

    const allowed = distanceKm <= settings.deliveryRadiusKm;

    res.status(200).json({
      allowed,
      distanceKm,
      radiusKm: settings.deliveryRadiusKm,
      shopLatitude: settings.latitude,
      shopLongitude: settings.longitude,
      message: allowed
        ? `Within delivery range: ${distanceKm} km (max ${settings.deliveryRadiusKm} km).`
        : `Out of delivery range: ${distanceKm} km away. Maximum delivery radius is ${settings.deliveryRadiusKm} km.`,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Error validating delivery address");
    res.status(500).json({ error: "Failed to validate delivery address." });
  }
});

// 0b. Get public shop info (Razorpay key ID for client + delivery settings, NO secret)
router.get("/shop-info", async (_req: Request, res: Response) => {
  try {
    const settings = await getShopSettings();
    res.status(200).json({
      shopLatitude: settings.latitude,
      shopLongitude: settings.longitude,
      deliveryRadiusKm: settings.deliveryRadiusKm,
      isDeliveryEnabled: settings.isDeliveryEnabled,
      razorpayKeyId: settings.razorpayKeyId,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: "Failed to load shop info." });
  }
});

// 0c. Validate PIN code delivery availability
router.post("/check-pincode", async (req: Request, res: Response) => {
  const { pincode } = req.body;
  if (!pincode || typeof pincode !== "string" || !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
    res.status(400).json({ allowed: false, message: "Please enter a valid 6-digit Indian PIN code." });
    return;
  }

  const cleanPin = pincode.trim();
  const settings = await getShopSettings();
  const allowed = isPincodeServiceable(cleanPin, settings.allowedPincodesJson);

  let allowedZones = "Birsingpur Pali (484661, 484660)";
  try {
    const list = JSON.parse(settings.allowedPincodesJson || "[]");
    if (Array.isArray(list) && list.length > 0) {
      allowedZones = list.join(", ");
    }
  } catch {}

  if (!allowed) {
    res.status(200).json({
      allowed: false,
      pincode: cleanPin,
      message: `Sorry, delivery is currently not serviceable for PIN code ${cleanPin}. We deliver exclusively to: ${allowedZones}.`,
    });
    return;
  }

  res.status(200).json({
    allowed: true,
    pincode: cleanPin,
    estimatedDays: "Same Day / Scheduled Slot",
    isExpressAvailable: true,
    message: `Delivery available to PIN code ${cleanPin} via Local Fleet Dispatch.`,
  });
});

// 1. Create Razorpay Order with Idempotency Guard (1-Payment Only Security)
router.post("/create-order", async (req: Request<{}, {}, CreateOrderBody>, res: Response) => {
  const {
    idempotencyKey, items, discountCode, customerEmail,
    customerName, customerMobile, shippingAddress,
    deliveryLatitude, deliveryLongitude,
  } = req.body;

  if (!idempotencyKey || typeof idempotencyKey !== "string") {
    res.status(400).json({ error: "Missing or invalid idempotencyKey." });
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Cart cannot be empty." });
    return;
  }

  // Require authentication. The owner is derived ONLY from the session token —
  // never from a client-supplied body field, which a caller could spoof to
  // attribute orders to another account.
  const authHeader = req.headers.authorization;
  const resolvedUserId = await getUserIdFromToken(authHeader);
  if (!resolvedUserId) {
    res.status(401).json({ error: "Please log in or register before placing an order." });
    return;
  }

  // Require shipping address & validate PIN code serviceability
  if (!shippingAddress || typeof shippingAddress !== "string" || shippingAddress.trim().length < 5) {
    res.status(400).json({ error: "Please provide a valid shipping address." });
    return;
  }

  try {
    const settings = await getShopSettings();

    // Check PIN code serviceability from shipping address
    const pinMatch = shippingAddress.match(/\b([1-9][0-9]{5})\b/);
    if (pinMatch) {
      const extractedPin = pinMatch[1];
      const isAllowed = isPincodeServiceable(extractedPin, settings.allowedPincodesJson);
      if (!isAllowed) {
        let allowedZones = "Birsingpur Pali (484661, 484660)";
        try {
          const list = JSON.parse(settings.allowedPincodesJson || "[]");
          if (Array.isArray(list) && list.length > 0) allowedZones = list.join(", ");
        } catch {}
        res.status(400).json({
          error: `Sorry, delivery is currently not serviceable for PIN code ${extractedPin}. We deliver exclusively to: ${allowedZones}.`,
          unserviceablePincode: extractedPin,
        });
        return;
      }
    }

    // Delivery radius check (Haversine)
    let deliveryDistanceKm: number | null = null;
    if (settings.isDeliveryEnabled && typeof deliveryLatitude === "number" && typeof deliveryLongitude === "number") {
      deliveryDistanceKm = calculateHaversineDistanceKm(
        settings.latitude,
        settings.longitude,
        deliveryLatitude,
        deliveryLongitude,
      );

      if (deliveryDistanceKm > settings.deliveryRadiusKm) {
        res.status(400).json({
          error: `Delivery address is ${deliveryDistanceKm} km away. Maximum delivery radius is ${settings.deliveryRadiusKm} km.`,
          distanceKm: deliveryDistanceKm,
          radiusKm: settings.deliveryRadiusKm,
        });
        return;
      }
    }

    // 1-Payment Idempotency Check
    const existingOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingOrders.length > 0) {
      const existing = existingOrders[0];
      req.log.info({ orderId: existing.id, idempotencyKey }, "Returning existing idempotency order");
      res.status(200).json({
        orderId: existing.id,
        razorpayOrderId: existing.razorpayOrderId,
        amountCents: existing.totalCents,
        currency: existing.currency,
        keyId: settings.razorpayKeyId,
        status: existing.status,
        idempotencyKey: existing.idempotencyKey,
      });
      return;
    }

    // Check store availability
    if (settings.isStoreOpen === false) {
      res.status(400).json({ error: "Store is currently closed for new orders. Please check back shortly." });
      return;
    }

    // Fetch product details
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const productMap = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]));

    let subtotalCents = 0;
    let taxableAmountCents = 0;
    const orderItems: Array<{
      id: string;
      name: string;
      priceCents: number;
      quantity: number;
      hsnCode: string;
      gstRatePercentage: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "active") {
        res.status(400).json({ error: `Product is no longer available for checkout.` });
        return;
      }

      if (product.inventory < item.quantity) {
        res.status(409).json({
          error: `Insufficient stock for "${product.name}". Only ${product.inventory} item(s) remaining.`,
          productId: product.id,
          availableStock: product.inventory,
        });
        return;
      }

      const qty = Math.max(1, Math.min(99, item.quantity || 1));
      const itemGross = product.priceCents * qty;
      const gstRate = product.gstRatePercentage || 5;
      const itemTaxable = Math.round(itemGross / (1 + gstRate / 100));

      subtotalCents += itemGross;
      taxableAmountCents += itemTaxable;

      orderItems.push({
        id: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity: qty,
        hsnCode: product.hsnCode || "1905",
        gstRatePercentage: gstRate,
      });
    }

    // Calculate delivery and packaging fees
    const flatDeliveryFeeCents = settings.flatDeliveryFeeCents ?? 3000;
    const freeDeliveryThresholdCents = settings.freeDeliveryThresholdCents ?? 50000;
    const packagingFeeCents = settings.packagingFeeCents ?? 1000;

    const shippingFeeCents = subtotalCents >= freeDeliveryThresholdCents ? 0 : flatDeliveryFeeCents;

    // Calculate discount if present
    let discountCents = 0;
    let appliedDiscountId: string | null = null;
    if (discountCode && typeof discountCode === "string") {
      const foundDiscounts = await db
        .select()
        .from(discountsTable)
        .where(eq(discountsTable.code, discountCode.trim().toUpperCase()))
        .limit(1);

      if (foundDiscounts.length > 0) {
        const discount = foundDiscounts[0];
        const priorOrders = await db
          .select({ id: ordersTable.id })
          .from(ordersTable)
          .where(eq(ordersTable.userId, resolvedUserId))
          .limit(1);
        const isFirstOrder = priorOrders.length === 0;

        const result = computeDiscount(discount, subtotalCents, isFirstOrder);
        if (result.valid) {
          discountCents = result.discountCents;
          appliedDiscountId = discount.id;
        }
      }
    }

    // Total computation with fees and discounts
    const grossTotal = subtotalCents + shippingFeeCents + packagingFeeCents;
    const totalCents = Math.max(100, grossTotal - discountCents);

    // Reverse GST split
    const totalGstCents = Math.max(0, subtotalCents - taxableAmountCents);
    const cgstCents = Math.round(totalGstCents / 2);
    const sgstCents = totalGstCents - cgstCents;
    const igstCents = 0;

    const internalOrderId = randomUUID();

    // Stage 1: Acquire two-stage Redis inventory reservation lock (15-min TTL)
    const reservation = await reserveInventory(internalOrderId, items, 900);
    if (!reservation.success) {
      res.status(409).json({
        error: reservation.error || "Some items in your cart became unavailable.",
        productId: reservation.failedProductId,
        availableStock: reservation.availableStock,
      });
      return;
    }

    // Create Razorpay Order using admin-configured credentials from DB
    const rzpKeyId = settings.razorpayKeyId;
    const rzpKeySecret = settings.razorpayKeySecret;
    let razorpayOrderId: string;

    const isLiveKeys = rzpKeyId && rzpKeySecret && !rzpKeyId.includes("sandbox") && !rzpKeySecret.includes("sandbox");

    if (isLiveKeys) {
      try {
        const authHeader = Buffer.from(`${rzpKeyId}:${rzpKeySecret}`).toString("base64");

        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: totalCents,
            currency: "INR",
            receipt: internalOrderId,
          }),
        });

        if (!rzpResponse.ok) {
          const errText = await rzpResponse.text();
          req.log.error({ errText }, "Razorpay API order creation failed");
          throw new Error("Razorpay gateway order creation failed.");
        }

        const rzpData = (await rzpResponse.json()) as { id: string };
        razorpayOrderId = rzpData.id;
      } catch (err: unknown) {
        req.log.warn("Falling back to local generated Razorpay order ID for sandbox.");
        razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    } else {
      // Sandbox mode
      razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Save order in database with complete GST & fee breakdown
    await db.insert(ordersTable).values({
      id: internalOrderId,
      idempotencyKey,
      razorpayOrderId,
      userId: resolvedUserId,
      customerEmail: customerEmail || null,
      customerName: customerName || null,
      customerMobile: customerMobile || null,
      shippingAddress: shippingAddress.trim(),
      deliveryLatitude: deliveryLatitude ?? null,
      deliveryLongitude: deliveryLongitude ?? null,
      deliveryDistanceKm: deliveryDistanceKm,
      subtotalCents,
      discountCents,
      totalCents,
      currency: "INR",
      status: "created",
      itemsJson: JSON.stringify(orderItems),
      taxableAmountCents,
      cgstCents,
      sgstCents,
      igstCents,
      shippingFeeCents,
      packagingFeeCents,
      cancellationStatus: "none",
    });

    if (appliedDiscountId) {
      await db
        .update(discountsTable)
        .set({ usageCount: sql`${discountsTable.usageCount} + 1` })
        .where(eq(discountsTable.id, appliedDiscountId));
    }

    req.log.info({ internalOrderId, razorpayOrderId, totalCents, userId: resolvedUserId }, "Created checkout order");

    res.status(201).json({
      orderId: internalOrderId,
      razorpayOrderId,
      amountCents: totalCents,
      currency: "INR",
      keyId: rzpKeyId,
      status: "created",
      idempotencyKey,
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Error creating checkout order");
    res.status(500).json({ error: "Failed to initialize payment checkout." });
  }
});

// 2. Verify Razorpay Payment & Confirm Order
router.post("/verify-payment", async (req: Request<{}, {}, VerifyPaymentBody>, res: Response) => {
  const { idempotencyKey, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  if (!idempotencyKey || !razorpayOrderId || !razorpayPaymentId) {
    res.status(400).json({ error: "Missing required payment verification fields." });
    return;
  }

  try {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.idempotencyKey, idempotencyKey))
      .limit(1);

    if (orders.length === 0) {
      res.status(404).json({ error: "Order not found for verification." });
      return;
    }

    const order = orders[0];

    // Check if already paid
    if (order.status === "paid") {
      req.log.info({ orderId: order.id }, "Payment already verified for this order");
      res.status(200).json({
        success: true,
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        razorpayPaymentId: order.razorpayPaymentId || razorpayPaymentId,
        amountCents: order.totalCents,
        currency: order.currency,
        status: "paid",
        message: "Payment successfully verified.",
      });
      return;
    }

    // Bind the payment to THIS order: the razorpayOrderId in the request must
    // match the one stored for the order this idempotencyKey created. Without
    // this, a valid signature captured from a cheap order could be replayed
    // against an expensive one.
    if (razorpayOrderId !== order.razorpayOrderId) {
      req.log.error(
        { provided: razorpayOrderId, expected: order.razorpayOrderId },
        "Razorpay order id does not match the order being verified",
      );
      res.status(400).json({ error: "Payment does not match this order." });
      return;
    }

    // Verify signature using admin-configured secret from DB. In live mode a
    // valid HMAC signature is MANDATORY — a missing signature no longer skips
    // verification (which previously let anyone mark an order paid for free).
    // Sandbox/test keys keep the local mock-payment flow working.
    const { keyId, keySecret } = await getRazorpayCredentials();
    const isLiveKeys = Boolean(
      keyId && keySecret && !keyId.includes("sandbox") && !keySecret.includes("sandbox"),
    );

    if (isLiveKeys) {
      if (!razorpaySignature) {
        req.log.error({ razorpayOrderId, razorpayPaymentId }, "Missing Razorpay payment signature in live mode");
        res.status(400).json({ error: "Payment signature is required." });
        return;
      }

      const generatedSignature = createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (generatedSignature !== razorpaySignature) {
        req.log.error({ razorpayOrderId, razorpayPaymentId }, "Invalid Razorpay payment signature");
        res.status(400).json({ error: "Payment signature verification failed." });
        return;
      }
    }

    // Update order status to paid
    await db
      .update(ordersTable)
      .set({
        status: "paid",
        razorpayPaymentId,
        razorpaySignature: razorpaySignature || null,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, order.id));

    req.log.info({ orderId: order.id, razorpayPaymentId }, "Order paid and verified successfully");

    // Commit inventory reservation to permanent stock decrement
    try {
      const orderItems = JSON.parse(order.itemsJson);
      const itemsToCommit = orderItems.map((item: any) => ({
        productId: item.id || item.productId,
        quantity: item.quantity,
      }));
      await commitInventoryReservation(order.id, itemsToCommit);
    } catch (invErr) {
      req.log.error({ invErr, orderId: order.id }, "Failed committing inventory reservation");
    }

    // Clear persistent customer cart
    if (order.userId) {
      try {
        await db.delete(customerCartsTable).where(eq(customerCartsTable.userId, order.userId)).catch(() => {});
        const redis = getRedisClient();
        if (redis) await redis.del(`cart:customer:${order.userId}`).catch(() => {});
      } catch (cartErr) {
        req.log.warn({ cartErr, userId: order.userId }, "Failed clearing persistent cart after order");
      }
    }

    // Generate vector PDF tax invoice & dispatch confirmation email
    try {
      const settings = await getShopSettings();
      const pdfInvoiceBuffer = await generateTaxInvoicePdf({
        orderId: order.id,
        invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
        invoiceDate: new Date(),
        paymentId: razorpayPaymentId,
        paymentMethod: "Online (Razorpay)",
        customerName: order.customerName || "Valued Customer",
        customerEmail: order.customerEmail || "",
        customerMobile: order.customerMobile || undefined,
        shippingAddress: order.shippingAddress || "",
        items: JSON.parse(order.itemsJson),
        subtotalCents: order.subtotalCents,
        discountCents: order.discountCents,
        shippingFeeCents: order.shippingFeeCents || 0,
        packagingFeeCents: order.packagingFeeCents || 0,
        totalCents: order.totalCents,
        taxableAmountCents: order.taxableAmountCents || order.subtotalCents,
        cgstCents: order.cgstCents || 0,
        sgstCents: order.sgstCents || 0,
        igstCents: order.igstCents || 0,
        shopName: settings.shopName || "RAJ TRADERS",
        legalBusinessName: settings.legalBusinessName || "RAJ TRADERS",
        gstinNumber: settings.gstinNumber || "23AAAAA0000A1Z5",
        panNumber: settings.panNumber || "AAAAA0000A",
        shopAddress: settings.shopAddress || "Birsingpur Pali, MP",
        stateCode: settings.stateCode || "23",
        stateName: settings.stateName || "Madhya Pradesh",
        contactEmail: settings.contactEmail || settings.supportEmail || "contact@rajtraders.shop",
      });

      if (order.customerEmail) {
        await sendOrderConfirmationEmail(
          order.customerEmail,
          order.customerName || "Valued Customer",
          order.id,
          order.totalCents,
          JSON.parse(order.itemsJson),
          pdfInvoiceBuffer,
        );
      }
    } catch (emailErr) {
      req.log.error({ emailErr, orderId: order.id }, "Failed generating invoice PDF or sending confirmation email");
    }

    res.status(200).json({
      success: true,
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId,
      amountCents: order.totalCents,
      currency: order.currency,
      status: "paid",
      createdAt: order.createdAt,
      message: "Payment verified successfully.",
    });
  } catch (err: unknown) {
    req.log.error({ err }, "Error verifying payment");
    res.status(500).json({ error: "Failed to verify payment." });
  }
});

// 3. List the Signed-in Customer's Own Order History (Status / Duration / Range filters)
router.get("/orders", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in to view your orders." });
    return;
  }

  try {
    const userOrders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, userId));

    const filtered = filterOrders(userOrders, req.query);
    res.status(200).json(filtered);
  } catch (err: unknown) {
    req.log.error({ err }, "Error listing orders");
    res.status(500).json({ error: "Failed to load order history." });
  }
});

// 4. Download Tax Invoice PDF for an Authenticated Order
router.get("/orders/:id/invoice", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in to download invoice." });
    return;
  }

  const id = req.params.id as string;

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);

    if (!order || order.userId !== userId) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const settings = await getShopSettings();
    const pdfBuffer = await generateTaxInvoicePdf({
      orderId: order.id,
      invoiceNumber: `INV-${order.id.slice(0, 8).toUpperCase()}`,
      invoiceDate: order.createdAt,
      paymentId: order.razorpayPaymentId || undefined,
      paymentMethod: order.razorpayPaymentId ? "Online (Razorpay)" : "Pending",
      customerName: order.customerName || "Valued Customer",
      customerEmail: order.customerEmail || "",
      customerMobile: order.customerMobile || undefined,
      shippingAddress: order.shippingAddress || "",
      items: JSON.parse(order.itemsJson),
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      shippingFeeCents: order.shippingFeeCents || 0,
      packagingFeeCents: order.packagingFeeCents || 0,
      totalCents: order.totalCents,
      taxableAmountCents: order.taxableAmountCents || order.subtotalCents,
      cgstCents: order.cgstCents || 0,
      sgstCents: order.sgstCents || 0,
      igstCents: order.igstCents || 0,
      shopName: settings.shopName || "RAJ TRADERS",
      legalBusinessName: settings.legalBusinessName || "RAJ TRADERS",
      gstinNumber: settings.gstinNumber || "23AAAAA0000A1Z5",
      panNumber: settings.panNumber || "AAAAA0000A",
      shopAddress: settings.shopAddress || "Birsingpur Pali, MP",
      stateCode: settings.stateCode || "23",
      stateName: settings.stateName || "Madhya Pradesh",
      contactEmail: settings.contactEmail || settings.supportEmail || "contact@rajtraders.shop",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Tax_Invoice_${order.id.slice(0, 8).toUpperCase()}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    req.log.error({ err, orderId: id }, "Error generating invoice PDF for download");
    res.status(500).json({ error: "Failed to generate invoice PDF." });
  }
});

// 5. Submit Cancellation & Refund Request (Customer-Directed Flow)
router.post("/orders/:id/cancel-request", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in to request cancellation." });
    return;
  }

  const id = req.params.id as string;
  const { reason, preferredRefundMethod } = req.body;

  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    res.status(400).json({ error: "Please provide a valid cancellation reason." });
    return;
  }

  const refundMethod = preferredRefundMethod === "wallet" ? "wallet" : "original";

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);

    if (!order || order.userId !== userId) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    if (order.status === "cancelled") {
      res.status(400).json({ error: "Order is already cancelled." });
      return;
    }

    if (order.status === "out_for_delivery" || order.status === "delivered") {
      res.status(400).json({ error: "Orders out for delivery or delivered cannot be cancelled. Please request an exchange/return pickup." });
      return;
    }

    if (order.cancellationStatus === "requested") {
      res.status(400).json({ error: "A cancellation request for this order is already pending admin review." });
      return;
    }

    await db
      .update(ordersTable)
      .set({
        cancellationStatus: "requested",
        cancellationReason: reason.trim(),
        preferredRefundMethod: refundMethod,
        updatedAt: new Date(),
      })
      .where(eq(ordersTable.id, id));

    req.log.info({ orderId: id, userId, refundMethod }, "Cancellation request submitted");

    res.status(200).json({
      success: true,
      orderId: id,
      cancellationStatus: "requested",
      message: "Cancellation request submitted successfully. Our operations team will review and process your refund shortly.",
    });
  } catch (err: unknown) {
    req.log.error({ err, orderId: id }, "Error submitting cancellation request");
    res.status(500).json({ error: "Failed to submit cancellation request." });
  }
});

export default router;
