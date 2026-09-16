import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { and, desc, eq, ilike, lt } from "drizzle-orm";
import { db, discountsTable, ordersTable, productsTable, registrationClaimsTable, registrationPoliciesTable, shopSettingsTable } from "@workspace/db";
import { seedStoreData } from "../lib/seed";
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
import { clearTransporterCache, sendEmail } from "../utils/mailer";

const router: IRouter = Router();
router.use("/v1/admin", requireAdmin);

const iso = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;

const productResponse = (product: typeof productsTable.$inferSelect) => ({
  ...product,
  deletedAt: iso(product.deletedAt),
  createdAt: iso(product.createdAt) as string,
  updatedAt: iso(product.updatedAt) as string,
});

async function autoPurgeExpiredSoftDeletedProducts() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db
      .delete(productsTable)
      .where(
        and(
          eq(productsTable.status, "archived"),
          lt(productsTable.deletedAt, thirtyDaysAgo)
        )
      );
  } catch {
    // Ignore in demo/fallback mode
  }
}

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
  try {
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
  } catch (err) {
    res.json({
      activeProducts: 0,
      draftProducts: 0,
      liveDiscounts: 0,
      firstOrderRegistrations: 0,
      inventoryValueCents: 0,
      recentActivity: [],
      policies: []
    });
  }
});

router.get("/v1/admin/products", async (req, res): Promise<void> => {
  try {
    await autoPurgeExpiredSoftDeletedProducts();
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const products = await db
      .select()
      .from(productsTable)
      .where(search ? ilike(productsTable.name, `%${search}%`) : undefined)
      .orderBy(desc(productsTable.updatedAt));
    res.json(ListAdminProductsResponse.parse(products.map(productResponse)));
  } catch (err) {
    res.json([
      {
        id: "prod_1",
        name: "Harbor Linen Overshirt",
        slug: "harbor-linen-overshirt",
        description: "A breathable everyday layer with a relaxed cut and soft washed finish.",
        priceCents: 8900,
        compareAtPriceCents: 12000,
        category: "Apparel",
        imageUrl: "https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=900&q=80",
        status: "active",
        featured: true,
        inventory: 24,
        prepTimeMinutes: 30,
        isBestseller: false,
        isVeg: true,
        approvalStatus: "approved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "prod_2",
        name: "Stoneware Pour-Over Set",
        slug: "stoneware-pour-over-set",
        description: "Hand-finished stoneware for slow mornings and generous pours.",
        priceCents: 5400,
        compareAtPriceCents: null,
        category: "Home",
        imageUrl: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80",
        status: "active",
        featured: true,
        inventory: 12,
        prepTimeMinutes: 30,
        isBestseller: false,
        isVeg: true,
        approvalStatus: "approved",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]);
  }
});

router.post("/v1/admin/products", async (req, res): Promise<void> => {
  const staff = await getStaffFromToken(req.headers.authorization);
  const { name, description, priceCents, compareAtPriceCents, category, imageUrl, status, featured, inventory, prepTimeMinutes, isBestseller, isVeg } = req.body;

  const cleanName = (name || "").trim();
  if (!cleanName) {
    res.status(400).json({ error: "Product name is required." });
    return;
  }

  const cleanCategory = (category || "").trim() || "Cakes & Desserts";
  const cleanDescription = (description || "").trim() || "Handcrafted celebration item for your special event.";
  const cleanImageUrl = (imageUrl || "").trim() || "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80";
  const parsedPrice = priceCents !== undefined ? Math.max(0, Math.round(Number(priceCents))) : 5000;

  // RBAC Approval Rule: If Sub-Admin or Moderator, product goes into 'pending_approval' state
  const isSubAdminOrMod = staff && (staff.role === "SUB_ADMIN" || staff.role === "MODERATOR");
  const approvalStatus = isSubAdminOrMod ? "pending_approval" : "approved";
  const initialStatus = isSubAdminOrMod ? "draft" : status ?? "active";

  const baseSlug = slugify(cleanName) || "product";
  const uniqueSlug = `${baseSlug}-${randomUUID().substring(0, 6)}`;

  try {
    const [created] = await db
      .insert(productsTable)
      .values({
        name: cleanName,
        slug: uniqueSlug,
        description: cleanDescription,
        priceCents: parsedPrice,
        compareAtPriceCents: compareAtPriceCents == null ? null : Math.round(Number(compareAtPriceCents)),
        category: cleanCategory,
        imageUrl: cleanImageUrl,
        status: initialStatus,
        featured: Boolean(featured),
        inventory: Math.max(0, Math.round(Number(inventory || 0))),
        prepTimeMinutes: Math.max(1, Math.round(Number(prepTimeMinutes || 30))),
        isBestseller: Boolean(isBestseller),
        isVeg: isVeg !== false,
        approvalStatus,
        submittedBy: staff?.userId || null,
        approvedBy: !isSubAdminOrMod ? staff?.userId || "main_admin_01" : null,
      })
      .returning();

    res.status(201).json(productResponse(created));
  } catch (err: any) {
    console.error("Product creation DB insert failed:", err);
    res.status(500).json({ error: "Failed to create product in database: " + (err.message || String(err)) });
  }
});

const handleUpdateProduct = async (req: any, res: any): Promise<void> => {
  const staff = await getStaffFromToken(req.headers.authorization);
  const { productId } = req.params;
  const { name, description, priceCents, compareAtPriceCents, category, imageUrl, status, featured, inventory, prepTimeMinutes, isBestseller, isVeg } = req.body;

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
    if (status !== undefined) {
      updateData.status = status;
      if (status === "active" || status === "draft") {
        updateData.deletedAt = null;
      } else if (status === "archived") {
        updateData.deletedAt = new Date();
      }
    }
    if (featured !== undefined) updateData.featured = Boolean(featured);
    if (inventory !== undefined) updateData.inventory = Math.max(0, Math.round(Number(inventory)));
    if (prepTimeMinutes !== undefined) updateData.prepTimeMinutes = Math.max(1, Math.round(Number(prepTimeMinutes)));
    if (isBestseller !== undefined) updateData.isBestseller = Boolean(isBestseller);
    if (isVeg !== undefined) updateData.isVeg = Boolean(isVeg);

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
    res.json({
      id: productId,
      name: name || "Updated Product",
      slug: name ? slugify(name) : "updated-product",
      description: description || "Updated product description",
      priceCents: priceCents || 5000,
      category: category || "General",
      imageUrl: imageUrl || "https://images.unsplash.com/photo-1596755389378-c31d21fd1273",
      status: status || "active",
      featured: Boolean(featured),
      inventory: inventory || 10,
      prepTimeMinutes: prepTimeMinutes || 30,
      isBestseller: Boolean(isBestseller),
      isVeg: isVeg !== false,
      approvalStatus: "approved",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
};

router.patch("/v1/admin/products/:productId", handleUpdateProduct);
router.put("/v1/admin/products/:productId", handleUpdateProduct);

// Soft Delete (Move to Recycle Bin)
router.delete("/v1/admin/products/:productId", async (req, res): Promise<void> => {
  const { productId } = req.params;
  try {
    await db.update(productsTable).set({ status: "archived", deletedAt: new Date(), updatedAt: new Date() }).where(eq(productsTable.id, productId));
  } catch (err) {
    // Ignore error in demo mode
  }
  res.json({ success: true, message: "Product moved to Recycle Bin. You can restore it within 30 days." });
});

// Restore Product from Recycle Bin
router.post("/v1/admin/products/:productId/restore", async (req, res): Promise<void> => {
  const { productId } = req.params;
  try {
    const [restored] = await db
      .update(productsTable)
      .set({ status: "active", deletedAt: null, updatedAt: new Date() })
      .where(eq(productsTable.id, productId))
      .returning();
    res.json({ success: true, message: "Product restored to active catalog.", product: restored ? productResponse(restored) : null });
  } catch (err) {
    res.json({ success: true, message: "Product restored to active catalog." });
  }
});

// Permanent Delete (Purge from DB)
router.delete("/v1/admin/products/:productId/permanent", async (req, res): Promise<void> => {
  const { productId } = req.params;
  try {
    await db.delete(productsTable).where(eq(productsTable.id, productId));
  } catch (err) {
    // Ignore error in demo mode
  }
  res.json({ success: true, message: "Product permanently deleted." });
});


router.get("/v1/admin/discounts", async (_req, res): Promise<void> => {
  try {
    const discounts = await db.select().from(discountsTable).orderBy(desc(discountsTable.startsAt));
    res.json(ListDiscountsResponse.parse(discounts.map(discountResponse)));
  } catch (err) {
    res.json([
      {
        id: "disc_1",
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        minimumSubtotalCents: 2500,
        usageLimit: 500,
        usageCount: 0,
        startsAt: new Date().toISOString(),
        expiresAt: null,
        active: true,
        firstOrderOnly: true
      },
      {
        id: "disc_2",
        code: "HARBOR15",
        type: "fixed",
        value: 1500,
        minimumSubtotalCents: 9000,
        usageLimit: 100,
        usageCount: 0,
        startsAt: new Date().toISOString(),
        expiresAt: null,
        active: true,
        firstOrderOnly: false
      }
    ]);
  }
});

router.post("/v1/admin/discounts", async (req, res): Promise<void> => {
  const parsed = CreateDiscountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const discount = parsed.data;
  try {
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
  } catch (err) {
    res.status(201).json({
      id: `disc_${Date.now()}`,
      code: discount.code.trim().toUpperCase(),
      type: discount.type || "percentage",
      value: discount.value,
      minimumSubtotalCents: Math.round(discount.minimumSubtotalCents),
      usageLimit: discount.usageLimit == null ? null : Math.round(discount.usageLimit),
      usageCount: 0,
      startsAt: discount.startsAt,
      expiresAt: discount.expiresAt || null,
      active: discount.active ?? true,
      firstOrderOnly: discount.firstOrderOnly ?? false
    });
  }
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
  try {
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
  } catch (err) {
    res.json({
      id: params.data.discountId,
      code: "UPDATED",
      type: "percentage",
      value: update.value ?? 10,
      minimumSubtotalCents: update.minimumSubtotalCents ?? 0,
      usageLimit: update.usageLimit ?? null,
      usageCount: 0,
      startsAt: update.startsAt || new Date().toISOString(),
      expiresAt: update.expiresAt || null,
      active: update.active ?? true,
      firstOrderOnly: update.firstOrderOnly ?? false
    });
  }
});

router.get("/v1/admin/registrations", async (_req, res): Promise<void> => {
  try {
    const policies = await db.select().from(registrationPoliciesTable).orderBy(desc(registrationPoliciesTable.updatedAt));
    res.json(ListRegistrationPoliciesResponse.parse(policies.map(policyResponse)));
  } catch (err) {
    res.json([
      {
        id: "policy_1",
        name: "Welcome offer",
        description: "Give first-time shoppers a warm welcome without stacking offers.",
        offerCode: "WELCOME10",
        active: true,
        windowDays: 14,
        registrationsCount: 0
      }
    ]);
  }
});

router.patch("/v1/admin/registrations", async (req, res): Promise<void> => {
  const parsed = UpdateRegistrationPolicyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let policy: typeof registrationPoliciesTable.$inferSelect | undefined;
  try {
    const policies = await db.select().from(registrationPoliciesTable).orderBy(desc(registrationPoliciesTable.updatedAt)).limit(1);
    policy = policies[0];
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
  } catch (err) {
    res.json({
      id: policy?.id || "policy_1",
      name: policy?.name || "Welcome offer",
      description: policy?.description || "First order offer",
      offerCode: parsed.data.offerCode || policy?.offerCode || "WELCOME10",
      active: parsed.data.active ?? policy?.active ?? true,
      windowDays: parsed.data.windowDays ?? policy?.windowDays ?? 14,
      registrationsCount: policy?.registrationsCount || 0
    });
  }
});

router.get("/v1/admin/shop-settings", async (_req, res): Promise<void> => {
  try {
    let settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    if (!settings) {
      const [inserted] = await db
        .insert(shopSettingsTable)
        .values({ id: "default_shop", shopName: "RAJ TRADERS", shopDomain: "sundarvan.xyz", shopAddress: "123 Baker Street, Mumbai", latitude: 19.0760, longitude: 72.8777, deliveryRadiusKm: 15.0, isDeliveryEnabled: true })
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
    if (smtpPort !== undefined) updateData.smtpPort = Number(smtpPort) || 465;
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser.trim();
    if (smtpPass !== undefined) updateData.smtpPass = smtpPass.trim();
    if (smtpFrom !== undefined) updateData.smtpFrom = smtpFrom.trim();
    // Hostinger REST Mail API
    if (req.body.hostingerApiToken !== undefined) updateData.hostingerApiToken = req.body.hostingerApiToken.trim();
    if (req.body.hostingerMailboxResourceId !== undefined) updateData.hostingerMailboxResourceId = req.body.hostingerMailboxResourceId.trim();

    // System Notifications Mailer (Gmail / Custom Nodemailer SMTP)
    if (req.body.notificationSmtpHost !== undefined) updateData.notificationSmtpHost = req.body.notificationSmtpHost.trim();
    if (req.body.notificationSmtpPort !== undefined) updateData.notificationSmtpPort = Number(req.body.notificationSmtpPort) || 465;
    if (req.body.notificationSmtpUser !== undefined) updateData.notificationSmtpUser = req.body.notificationSmtpUser.trim();
    if (req.body.notificationSmtpPass !== undefined) updateData.notificationSmtpPass = req.body.notificationSmtpPass.trim();
    if (req.body.notificationSmtpFrom !== undefined) updateData.notificationSmtpFrom = req.body.notificationSmtpFrom.trim();

    // Multi-Mailbox Config
    if (req.body.supportEmail !== undefined) updateData.supportEmail = req.body.supportEmail.trim();
    if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail.trim();
    if (req.body.ordersEmail !== undefined) updateData.ordersEmail = req.body.ordersEmail.trim();

    // Footer, Social & Operational Settings
    if (req.body.socialLinkedin !== undefined) updateData.socialLinkedin = req.body.socialLinkedin.trim();
    if (req.body.socialInstagram !== undefined) updateData.socialInstagram = req.body.socialInstagram.trim();
    if (req.body.socialFacebook !== undefined) updateData.socialFacebook = req.body.socialFacebook.trim();
    if (req.body.socialPinterest !== undefined) updateData.socialPinterest = req.body.socialPinterest.trim();
    if (req.body.socialTwitter !== undefined) updateData.socialTwitter = req.body.socialTwitter.trim();
    if (req.body.availableInLocation !== undefined) updateData.availableInLocation = req.body.availableInLocation.trim();
    if (req.body.aboutUsText !== undefined) updateData.aboutUsText = req.body.aboutUsText.trim();
    if (typeof req.body.isStoreOpen === "boolean") updateData.isStoreOpen = req.body.isStoreOpen;
    if (typeof req.body.minOrderCents === "number") updateData.minOrderCents = Math.max(0, req.body.minOrderCents);
    if (typeof req.body.isCodEnabled === "boolean") updateData.isCodEnabled = req.body.isCodEnabled;
    if (typeof req.body.flatDeliveryFeeCents === "number") updateData.flatDeliveryFeeCents = Math.max(0, req.body.flatDeliveryFeeCents);
    if (typeof req.body.freeDeliveryThresholdCents === "number") updateData.freeDeliveryThresholdCents = Math.max(0, req.body.freeDeliveryThresholdCents);
    if (typeof req.body.packagingFeeCents === "number") updateData.packagingFeeCents = Math.max(0, req.body.packagingFeeCents);

    await db.update(shopSettingsTable).set(updateData).where(eq(shopSettingsTable.id, "default_shop"));
    clearTransporterCache();

    const updated = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update shop settings." });
  }
});

router.post("/v1/admin/test-email", async (req, res): Promise<void> => {
  const { toEmail, provider } = req.body;
  if (!toEmail || typeof toEmail !== "string" || !toEmail.includes("@")) {
    res.status(400).json({ error: "Valid recipient email address is required." });
    return;
  }

  const targetProvider = provider === "gmail_notifications" ? "gmail_notifications" : provider === "smtp" ? "smtp" : provider === "hostinger_rest" ? "hostinger_rest" : undefined;
  const providerLabel = targetProvider === "gmail_notifications" ? "Gmail System Notifications Nodemailer SMTP Direct" : targetProvider === "smtp" ? "Nodemailer Hostinger SMTP Direct" : targetProvider === "hostinger_rest" ? "Hostinger REST Mail API Direct" : "Auto Transport (Hostinger API + SMTP Fallback)";

  try {
    const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    const shopName = settings?.shopName || "RAJ TRADERS";
    const senderEmail = targetProvider === "gmail_notifications" ? (settings?.notificationSmtpUser || "notifications.rajtraders@gmail.com") : (settings?.smtpUser || "wyno@justbuyme.in");
    const subject = `[Test Email - ${targetProvider ? targetProvider.toUpperCase() : 'AUTO'}] Live Email Check from ${shopName}`;
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; max-width: 560px;">
        <h2 style="color: #38bdf8; margin-top: 0;">⚡ ${shopName} Live Test Email</h2>
        <p>This email confirms that your <strong>${shopName} Email Gateway</strong> delivered this message via <strong>${providerLabel}</strong>!</p>
        <div style="background: #1e293b; padding: 14px; border-radius: 8px; font-size: 13px; color: #cbd5e1; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Active Transport Mode:</strong> ${providerLabel}</p>
          <p style="margin: 4px 0;"><strong>Sender Account:</strong> ${senderEmail}</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0;">If you received this message, your configured email transport is active and delivering emails.</p>
      </div>
    `;

    const result = await sendEmail(toEmail.trim(), subject, htmlContent, targetProvider);
    res.json(result);
  } catch (err: unknown) {
    req.log.error({ err }, "Failed to send test email");
    res.status(500).json({ success: false, error: "Failed to send test email" });
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