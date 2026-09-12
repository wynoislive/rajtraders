import { Router, type Request, type Response } from "express";
import { db, ordersTable, productsTable, discountsTable, shopSettingsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { createHmac, randomUUID } from "node:crypto";
import { calculateHaversineDistanceKm } from "../utils/geo";
import { getUserIdFromToken } from "./customer-auth";
import { computeDiscount } from "../utils/discounts";
import { filterOrders } from "../utils/order-filters";

const router: Router = Router();

// Helper: fetch Razorpay credentials from DB (admin-configurable, NOT hardcoded)
async function getRazorpayCredentials(): Promise<{ keyId: string; keySecret: string }> {
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  return {
    keyId: settings?.razorpayKeyId || "rzp_test_sandbox123456",
    keySecret: settings?.razorpayKeySecret || "sandbox_secret",
  };
}

// Helper: fetch shop delivery settings
async function getShopSettings() {
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  return settings || {
    latitude: 19.0760,
    longitude: 72.8777,
    deliveryRadiusKm: 15.0,
    isDeliveryEnabled: true,
    razorpayKeyId: "rzp_test_sandbox123456",
    razorpayKeySecret: "sandbox_secret",
  };
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
  } catch (err: any) {
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
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load shop info." });
  }
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

  // Require shipping address
  if (!shippingAddress || typeof shippingAddress !== "string" || shippingAddress.trim().length < 5) {
    res.status(400).json({ error: "Please provide a valid shipping address." });
    return;
  }

  try {
    // Delivery radius check (Haversine)
    let deliveryDistanceKm: number | null = null;
    const settings = await getShopSettings();

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

    // Fetch product details
    const productIds = items.map((i) => i.productId);
    const dbProducts = await db
      .select()
      .from(productsTable)
      .where(inArray(productsTable.id, productIds));

    const productMap = new Map<string, any>(dbProducts.map((p: any) => [p.id, p]));

    let subtotalCents = 0;
    const orderItems: Array<{ id: string; name: string; priceCents: number; quantity: number }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product || product.status !== "active") {
        res.status(400).json({ error: `Product not available for checkout.` });
        return;
      }
      const qty = Math.max(1, Math.min(99, item.quantity || 1));
      subtotalCents += product.priceCents * qty;
      orderItems.push({
        id: product.id,
        name: product.name,
        priceCents: product.priceCents,
        quantity: qty,
      });
    }

    // Calculate discount if present. Uses the SAME shared validator as
    // `/v1/discounts/validate` so the money path enforces the full validity
    // window (active, start/expiry, usage limit, minimum, first-order-only)
    // and can never apply an expired/exhausted code or exceed the subtotal.
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
        // "First order" is authoritative on the server: does this user have any
        // prior order already recorded?
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

    const totalCents = Math.max(100, subtotalCents - discountCents);
    const internalOrderId = randomUUID();

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
      } catch (err: any) {
        req.log.warn("Falling back to local generated Razorpay order ID for sandbox.");
        razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
    } else {
      // Sandbox mode
      razorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    // Save order in database with user + shipping + delivery data
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
    });

    // Atomically record a use of the discount so per-code usage limits are
    // actually enforced on the next order.
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
  } catch (err: any) {
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
  } catch (err: any) {
    req.log.error({ err }, "Error verifying payment");
    res.status(500).json({ error: "Failed to verify payment." });
  }
});

// 3. List the Signed-in Customer's Own Order History (Status / Duration / Range filters)
//    Scoped strictly to the authenticated user — never returns other customers'
//    orders or PII. Admin-wide order listing lives under the Clerk-protected
//    /v1/admin/orders route instead.
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
  } catch (err: any) {
    req.log.error({ err }, "Error listing orders");
    res.status(500).json({ error: "Failed to load order history." });
  }
});

// 4. Cancel one of the Signed-in Customer's Own Pending Orders
router.post("/orders/:id/cancel", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in to cancel an order." });
    return;
  }

  const id = req.params.id as string;

  try {
    const found = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);

    // Treat "not yours" the same as "not found" so order ids can't be probed.
    if (found.length === 0 || found[0].userId !== userId) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const order = found[0];

    if (order.status === "paid") {
      res.status(400).json({ error: "Paid orders cannot be directly cancelled. Please process a refund." });
      return;
    }

    await db
      .update(ordersTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(ordersTable.id, id));

    req.log.info({ orderId: id, userId }, "Order cancelled successfully");

    res.status(200).json({
      success: true,
      orderId: id,
      status: "cancelled",
      message: "Order has been cancelled.",
    });
  } catch (err: any) {
    req.log.error({ err }, "Error cancelling order");
    res.status(500).json({ error: "Failed to cancel order." });
  }
});

export default router;
