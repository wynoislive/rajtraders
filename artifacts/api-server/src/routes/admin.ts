import { Router, type IRouter } from "express";
import { and, desc, eq, ilike } from "drizzle-orm";
import { db, discountsTable, ordersTable, productsTable, registrationClaimsTable, registrationPoliciesTable, shopSettingsTable } from "@workspace/db";
import {
  CreateDiscountBody,
  CreateDiscountResponse,
  GetAdminSummaryResponse,
  ListAdminProductsResponse,
  ListDiscountsResponse,
  ListRegistrationPoliciesResponse,
  UpdateDiscountBody,
  UpdateDiscountParams,
  UpdateDiscountResponse,
  UpdateRegistrationPolicyBody,
  UpdateRegistrationPolicyResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { discountResponse } from "./storefront";
import { getStaffFromToken } from "./staff-admin";
import { filterOrders } from "../utils/order-filters";

const router: IRouter = Router();
router.use("/v1/admin", requireAdmin);

const iso = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;
const productResponse = (product: typeof productsTable.$inferSelect) => ({
  ...product,
  createdAt: iso(product.createdAt) as string,
  updatedAt: iso(product.updatedAt) as string,
});
const policyResponse = (policy: typeof registrationPoliciesTable.$inferSelect) => ({
  id: policy.id,
  name: policy.name,
  description: policy.description,
  offerCode: policy.offerCode,
  active: policy.active,
  windowDays: policy.windowDays,
  registrationsCount: policy.registrationsCount,
});
const slugify = (value: string): string =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

router.get("/v1/admin/summary", async (_req, res): Promise<void> => {
  const [products, discounts, claims, policies] = await Promise.all([
    db.select().from(productsTable),
    db.select().from(discountsTable),
    db.select().from(registrationClaimsTable),
    db.select().from(registrationPoliciesTable),
  ]);
  const activeDiscounts = discounts.filter((discount: any) => {
    const now = Date.now();
    const startsAtMs = discount.startsAt ? new Date(discount.startsAt).getTime() : 0;
    const expiresAtMs = discount.expiresAt ? new Date(discount.expiresAt).getTime() : null;
    return discount.active && startsAtMs <= now && (!expiresAtMs || expiresAtMs >= now);
  });
  const recentActivity = [
    ...products.map((product: any) => ({
      id: `product-${product.id}`,
      label: product.approvalStatus === "pending_approval" ? "Product pending approval" : "Product in catalog",
      detail: `${product.name} (${product.prepTimeMinutes}m prep)`,
      timestamp: iso(product.updatedAt) as string,
    })),
    ...discounts.map((discount: any) => ({
      id: `discount-${discount.id}`,
      label: "Discount configured",
      detail: discount.code,
      timestamp: iso(discount.startsAt) as string,
    })),
  ]
    .filter((a) => Boolean(a.timestamp))
    .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
    .slice(0, 6);

  res.json(
    GetAdminSummaryResponse.parse({
      activeProducts: products.filter((product: any) => product.status === "active" && product.approvalStatus === "approved").length,
      draftProducts: products.filter((product: any) => product.status === "draft" || product.approvalStatus === "pending_approval").length,
      liveDiscounts: activeDiscounts.length,
      firstOrderRegistrations: claims.length,
      inventoryValueCents: products.reduce((total: number, product: any) => total + (product.priceCents || 0) * (product.inventory || 0), 0),
      recentActivity,
      policies,
    }),
  );
});

router.get("/v1/admin/products", async (req, res): Promise<void> => {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const products = await db
    .select()
    .from(productsTable)
    .where(search ? ilike(productsTable.name, `%${search}%`) : undefined)
    .orderBy(desc(productsTable.updatedAt));
  res.json(ListAdminProductsResponse.parse(products.map(productResponse)));
});

router.post("/v1/admin/products", async (req, res): Promise<void> => {
  const staff = await getStaffFromToken(req.headers.authorization);
  const { name, description, priceCents, compareAtPriceCents, category, imageUrl, status, featured, inventory, prepTimeMinutes } = req.body;

  if (!name || !description || priceCents === undefined || !category || !imageUrl) {
    res.status(400).json({ error: "Missing required product fields (name, description, priceCents, category, imageUrl)." });
    return;
  }

  // RBAC Approval Rule: If Sub-Admin or Moderator, product goes into 'pending_approval' state
  const isSubAdminOrMod = staff && (staff.role === "SUB_ADMIN" || staff.role === "MODERATOR");
  const approvalStatus = isSubAdminOrMod ? "pending_approval" : "approved";
  const initialStatus = isSubAdminOrMod ? "draft" : status ?? "active";

  try {
    const [created] = await db
      .insert(productsTable)
      .values({
        name: name.trim(),
        slug: slugify(name),
        description: description.trim(),
        priceCents: Math.round(Number(priceCents)),
        compareAtPriceCents: compareAtPriceCents == null ? null : Math.round(Number(compareAtPriceCents)),
        category: category.trim(),
        imageUrl: imageUrl.trim(),
        status: initialStatus,
        featured: Boolean(featured),
        inventory: Math.max(0, Math.round(Number(inventory || 0))),
        prepTimeMinutes: Math.max(1, Math.round(Number(prepTimeMinutes || 30))),
        approvalStatus,
        submittedBy: staff?.userId || null,
        approvedBy: !isSubAdminOrMod ? staff?.userId || "main_admin_01" : null,
      })
      .returning();

    res.status(201).json(productResponse(created));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create product." });
  }
});

router.patch("/v1/admin/products/:productId", async (req, res): Promise<void> => {
  const staff = await getStaffFromToken(req.headers.authorization);
  const { productId } = req.params;
  const { name, description, priceCents, compareAtPriceCents, category, imageUrl, status, featured, inventory, prepTimeMinutes } = req.body;

  const isSubAdminOrMod = staff && (staff.role === "SUB_ADMIN" || staff.role === "MODERATOR");

  try {
    const updateData: Partial<typeof productsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name) {
      updateData.name = name.trim();
      updateData.slug = slugify(name);
    }
    if (description !== undefined) updateData.description = description.trim();
    if (priceCents !== undefined) updateData.priceCents = Math.round(Number(priceCents));
    if (compareAtPriceCents !== undefined) updateData.compareAtPriceCents = compareAtPriceCents == null ? null : Math.round(Number(compareAtPriceCents));
    if (category !== undefined) updateData.category = category.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (status !== undefined) updateData.status = status;
    if (featured !== undefined) updateData.featured = Boolean(featured);
    if (inventory !== undefined) updateData.inventory = Math.max(0, Math.round(Number(inventory)));
    if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = Math.max(1, Math.round(Number(prepTimeMinutes)));

    // If Sub-Admin or Moderator modifies a product, send to pending approval queue
    if (isSubAdminOrMod) {
      updateData.approvalStatus = "pending_approval";
      updateData.submittedBy = staff?.userId;
    }

    const [updated] = await db
      .update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, productId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    res.json(productResponse(updated));
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update product." });
  }
});

router.delete("/v1/admin/products/:productId", async (req, res): Promise<void> => {
  const { productId } = req.params;
  await db.update(productsTable).set({ status: "archived", updatedAt: new Date() }).where(eq(productsTable.id, productId));
  res.status(204).send();
});

router.get("/v1/admin/discounts", async (_req, res): Promise<void> => {
  const discounts = await db.select().from(discountsTable).orderBy(desc(discountsTable.startsAt));
  res.json(ListDiscountsResponse.parse(discounts.map(discountResponse)));
});

router.post("/v1/admin/discounts", async (req, res): Promise<void> => {
  const parsed = CreateDiscountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const discount = parsed.data;
  const [created] = await db
    .insert(discountsTable)
    .values({
      ...discount,
      code: discount.code.trim().toUpperCase(),
      minimumSubtotalCents: Math.round(discount.minimumSubtotalCents),
      usageLimit: discount.usageLimit == null ? null : Math.round(discount.usageLimit),
      startsAt: new Date(discount.startsAt),
      expiresAt: discount.expiresAt ? new Date(discount.expiresAt) : null,
    })
    .returning();
  res.status(201).json(CreateDiscountResponse.parse(discountResponse(created)));
});

router.patch("/v1/admin/discounts/:discountId", async (req, res): Promise<void> => {
  const params = UpdateDiscountParams.safeParse(req.params);
  const body = UpdateDiscountBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const update = body.data;
  const [updated] = await db
    .update(discountsTable)
    .set({
      ...(update.value === undefined ? {} : { value: update.value }),
      ...(update.active === undefined ? {} : { active: update.active }),
      ...(update.firstOrderOnly === undefined ? {} : { firstOrderOnly: update.firstOrderOnly }),
      ...(update.minimumSubtotalCents === undefined ? {} : { minimumSubtotalCents: Math.round(update.minimumSubtotalCents) }),
      ...(update.usageLimit === undefined ? {} : { usageLimit: update.usageLimit == null ? null : Math.round(update.usageLimit) }),
      ...(update.startsAt === undefined ? {} : { startsAt: new Date(update.startsAt) }),
      ...(update.expiresAt === undefined ? {} : { expiresAt: update.expiresAt ? new Date(update.expiresAt) : null }),
    })
    .where(eq(discountsTable.id, params.data.discountId))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Discount not found." });
    return;
  }
  res.json(UpdateDiscountResponse.parse(discountResponse(updated)));
});

router.get("/v1/admin/registrations", async (_req, res): Promise<void> => {
  const policies = await db.select().from(registrationPoliciesTable).orderBy(desc(registrationPoliciesTable.updatedAt));
  res.json(ListRegistrationPoliciesResponse.parse(policies.map(policyResponse)));
});

router.patch("/v1/admin/registrations", async (req, res): Promise<void> => {
  const parsed = UpdateRegistrationPolicyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [policy] = await db.select().from(registrationPoliciesTable).orderBy(desc(registrationPoliciesTable.updatedAt)).limit(1);
  if (!policy) {
    res.status(404).json({ error: "Registration policy not found." });
    return;
  }
  const [updated] = await db
    .update(registrationPoliciesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(registrationPoliciesTable.id, policy.id))
    .returning();
  res.json(UpdateRegistrationPolicyResponse.parse(policyResponse(updated)));
});

router.get("/v1/admin/shop-settings", async (_req, res): Promise<void> => {
  try {
    let settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    if (!settings) {
      const [inserted] = await db
        .insert(shopSettingsTable)
        .values({ id: "default_shop", shopName: "My Shop", shopDomain: "myshop.com", shopAddress: "123 Baker Street, Mumbai", latitude: 19.0760, longitude: 72.8777, deliveryRadiusKm: 15.0, isDeliveryEnabled: true })
        .returning();
      settings = inserted;
    }
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to load shop settings." });
  }
});

router.put("/v1/admin/shop-settings", async (req, res): Promise<void> => {
  const {
    shopName, shopDomain, shopAddress, latitude, longitude, deliveryRadiusKm, isDeliveryEnabled,
    razorpayKeyId, razorpayKeySecret,
    r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, r2PublicUrl,
    smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
  } = req.body;

  try {
    const updateData: Partial<typeof shopSettingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (typeof shopName === "string") updateData.shopName = shopName.trim();
    if (typeof shopDomain === "string") updateData.shopDomain = shopDomain.trim();
    if (typeof shopAddress === "string") updateData.shopAddress = shopAddress.trim();
    if (typeof latitude === "number" && !isNaN(latitude)) updateData.latitude = latitude;
    if (typeof longitude === "number" && !isNaN(longitude)) updateData.longitude = longitude;
    if (typeof deliveryRadiusKm === "number" && !isNaN(deliveryRadiusKm)) updateData.deliveryRadiusKm = Math.max(0.1, deliveryRadiusKm);
    if (typeof isDeliveryEnabled === "boolean") updateData.isDeliveryEnabled = isDeliveryEnabled;
    if (typeof razorpayKeyId === "string" && razorpayKeyId.trim()) updateData.razorpayKeyId = razorpayKeyId.trim();
    if (typeof razorpayKeySecret === "string" && razorpayKeySecret.trim()) updateData.razorpayKeySecret = razorpayKeySecret.trim();

    // Cloudflare R2
    if (r2AccountId !== undefined) updateData.r2AccountId = r2AccountId.trim();
    if (r2AccessKeyId !== undefined) updateData.r2AccessKeyId = r2AccessKeyId.trim();
    if (r2SecretAccessKey !== undefined) updateData.r2SecretAccessKey = r2SecretAccessKey.trim();
    if (r2BucketName !== undefined) updateData.r2BucketName = r2BucketName.trim();
    if (r2PublicUrl !== undefined) updateData.r2PublicUrl = r2PublicUrl.trim();

    // Nodemailer SMTP
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost.trim();
    if (smtpPort !== undefined) updateData.smtpPort = Number(smtpPort) || 587;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser.trim();
    if (smtpPass !== undefined) updateData.smtpPass = smtpPass.trim();
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom.trim();

    await db.update(shopSettingsTable).set(updateData).where(eq(shopSettingsTable.id, "default_shop"));

    const updated = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update shop settings." });
  }
});

// ─── Admin Order Ledger (Clerk-protected via router.use(requireAdmin) above) ───
// The operations console reads ALL customers' orders here; the customer-facing
// /v1/checkout/orders route is scoped to the signed-in user only.

router.get("/v1/admin/orders", async (req, res): Promise<void> => {
  try {
    const allOrders = await db.select().from(ordersTable);
    res.json(filterOrders(allOrders, req.query));
  } catch (err: any) {
    req.log.error({ err }, "Error listing admin orders");
    res.status(500).json({ error: "Failed to load order ledger." });
  }
});

router.get("/v1/admin/orders/stats", async (req, res): Promise<void> => {
  try {
    const allOrders = await db.select().from(ordersTable);
    res.json({
      totalOrders: allOrders.length,
      successfulOrders: allOrders.filter((o: any) => o.status === "paid").length,
      pendingOrders: allOrders.filter((o: any) => o.status === "created").length,
      cancelledOrders: allOrders.filter((o: any) => o.status === "cancelled" || o.status === "failed").length,
      totalRevenueCents: allOrders
        .filter((o: any) => o.status === "paid")
        .reduce((sum: number, o: any) => sum + o.totalCents, 0),
    });
  } catch (err: any) {
    req.log.error({ err }, "Error fetching admin order stats");
    res.status(500).json({ error: "Failed to fetch order statistics." });
  }
});

router.post("/v1/admin/orders/:id/cancel", async (req, res): Promise<void> => {
  const id = req.params.id as string;
  try {
    const found = await db.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
    if (found.length === 0) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (found[0].status === "paid") {
      res.status(400).json({ error: "Paid orders cannot be directly cancelled. Please process a refund." });
      return;
    }
    await db.update(ordersTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(ordersTable.id, id));
    res.json({ success: true, orderId: id, status: "cancelled", message: "Order has been cancelled." });
  } catch (err: any) {
    req.log.error({ err }, "Error cancelling order (admin)");
    res.status(500).json({ error: "Failed to cancel order." });
  }
});

export default router;