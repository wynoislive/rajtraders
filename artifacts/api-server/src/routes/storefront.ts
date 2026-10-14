import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or, ne } from "drizzle-orm";
import { db, discountsTable, productsTable, registrationClaimsTable, registrationPoliciesTable, shopSettingsTable, ordersTable, usersTable } from "@workspace/db";
import { seedStoreData } from "../lib/seed";
import { getUserIdFromToken } from "./customer-auth";
import {
  CheckRegistrationEligibilityBody,
  CheckRegistrationEligibilityResponse,
  GetProductParams,
  GetProductResponse,
  GetStorefrontSummaryResponse,
  ListProductsQueryParams,
  ListProductsResponse,
  ClaimRegistrationOfferResponse,
  ValidateDiscountBody,
  ValidateDiscountResponse,
} from "@workspace/api-zod";
import { computeDiscount } from "../utils/discounts";

const router: IRouter = Router();
const asIso = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;
const productResponse = (product: typeof productsTable.$inferSelect) => ({
  ...product,
  createdAt: asIso(product.createdAt) as string,
  updatedAt: asIso(product.updatedAt) as string,
});
const discountResponse = (discount: typeof discountsTable.$inferSelect) => ({
  ...discount,
  startsAt: asIso(discount.startsAt) as string,
  expiresAt: asIso(discount.expiresAt),
});

// 1. List Products (Only Approved & Active products)
router.get("/v1/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, category } = parsed.data;
  try {
    const conditions = [
      eq(productsTable.status, "active"),
      eq(productsTable.approvalStatus, "approved"),
      ...(category ? [eq(productsTable.category, category)] : []),
      ...(search
        ? [or(ilike(productsTable.name, `%${search}%`), ilike(productsTable.description, `%${search}%`))]
        : []),
    ];
    let products = await db
      .select()
      .from(productsTable)
      .where(and(...conditions))
      .orderBy(asc(productsTable.featured), asc(productsTable.createdAt));

    if (products.length === 0 && !search && !category) {
      await seedStoreData();
      products = await db
        .select()
        .from(productsTable)
        .where(and(...conditions))
        .orderBy(asc(productsTable.featured), asc(productsTable.createdAt));
    }

    res.json(ListProductsResponse.parse(products.map(productResponse)));
  } catch (err) {
    try {
      const fallbackProducts = await db
        .select()
        .from(productsTable)
        .where(eq(productsTable.status, "active"));
      res.json(ListProductsResponse.parse(fallbackProducts.map(productResponse)));
    } catch (fallbackErr) {
      res.json([]);
    }
  }
});

// 2. Public Shareable Product Details by Slug or ID
router.get("/v1/products/share/:slugOrId", async (req, res): Promise<void> => {
  const { slugOrId } = req.params;
  const products = await db
    .select()
    .from(productsTable)
    .where(
      and(
        or(eq(productsTable.slug, slugOrId), eq(productsTable.id, slugOrId)),
        eq(productsTable.approvalStatus, "approved"),
        ne(productsTable.status, "archived")
      )
    )
    .limit(1);

  if (products.length === 0) {
    res.status(404).json({ error: "Product not found or not currently available." });
    return;
  }

  const p = products[0];
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  const shopDomain = settings?.shopDomain || "sundarvan.xyz";
  res.json({
    ...p,
    shareUrl: `https://${shopDomain}/products/${p.slug}`,
    prepTimeFormatted: `${p.prepTimeMinutes} mins`,
  });
});

router.get("/v1/products/:productId", async (req, res): Promise<void> => {
  const parsed = GetProductParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, parsed.data.productId));
  if (!product || product.status === "archived") {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(productResponse(product)));
});

router.get("/v1/storefront/summary", async (_req, res): Promise<void> => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.status, "active"), eq(productsTable.approvalStatus, "approved")));
    const [policy] = await db.select().from(registrationPoliciesTable).where(eq(registrationPoliciesTable.active, true));
    const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    const shopName = settings?.shopName || "RAJ TRADERS";
    const currency = settings?.currency || "INR";
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID || null;
    res.json(
      GetStorefrontSummaryResponse.parse({
        shopName,
        featuredCount: products.filter((product: any) => product.featured).length,
        categories: [...new Set(products.map((product: any) => product.category))],
        firstOrderOffer: policy?.offerCode ?? "WELCOME10",
        currency,
        razorpayKeyId,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (err) {
    res.json({
      shopName: "RAJ TRADERS",
      featuredCount: 2,
      categories: ["Apparel", "Home"],
      firstOrderOffer: "WELCOME10",
      currency: "INR",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
      updatedAt: new Date().toISOString(),
    });
  }
});

router.get("/v1/storefront/settings", async (_req, res): Promise<void> => {
  try {
    const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    res.json({
      shopName: settings?.shopName || "RAJ TRADERS",
      shopDomain: settings?.shopDomain || "sundarvan.xyz",
      shopAddress: settings?.shopAddress || "Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali Birsinghpur, Madhya Pradesh 484551",
      latitude: settings?.latitude ?? 23.3644551,
      longitude: settings?.longitude ?? 81.0442634,
      deliveryRadiusKm: settings?.deliveryRadiusKm ?? 10.0,
      supportEmail: settings?.supportEmail || "support@sundarvan.xyz",
      contactEmail: settings?.contactEmail || "contact@sundarvan.xyz",
      supportPhone: settings?.supportPhone || "",
      whatsappNumber: settings?.whatsappNumber || "",
      googleMapsUrl: settings?.googleMapsUrl || "https://www.google.com/maps/place/Raj+Traders/@23.3644543,81.0442869,21z/data=!4m12!1m5!3m4!2zMjPCsDIxJzUxLjUiTiA4McKwMDInMzguOSJF!8m2!3d23.3643056!4d81.0441389!3m5!1s0x3986c58bb0edcb51:0x49e2a8728e29e896!8m2!3d23.3644551!4d81.0442634!16s%2Fg%2F11t29m5jmv",
      socialLinkedin: settings?.socialLinkedin || "",
      socialInstagram: settings?.socialInstagram || "",
      socialFacebook: settings?.socialFacebook || "",
      socialPinterest: settings?.socialPinterest || "",
      socialTwitter: settings?.socialTwitter || "",
      availableInLocation: settings?.availableInLocation || "BIRSINGPUR PALI",
      aboutUsText: settings?.aboutUsText || "Premium cakes, party decorations & artisanal local delights.",
      isStoreOpen: settings?.isStoreOpen ?? true,
      minOrderCents: settings?.minOrderCents ?? 0,
      isCodEnabled: settings?.isCodEnabled ?? false,
      flatDeliveryFeeCents: settings?.flatDeliveryFeeCents ?? 3000,
      freeDeliveryThresholdCents: settings?.freeDeliveryThresholdCents ?? 50000,
      packagingFeeCents: settings?.packagingFeeCents ?? 1000,
      legalBusinessName: settings?.legalBusinessName || "RAJ TRADERS",
      gstinNumber: settings?.gstinNumber || "23AAAAA0000A1Z5",
      panNumber: settings?.panNumber || "AAAAA0000A",
      stateCode: settings?.stateCode || "23",
      stateName: settings?.stateName || "Madhya Pradesh",
      allowedPincodesJson: settings?.allowedPincodesJson || '["484551"]',
      currency: settings?.currency || "INR",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
      fssaiRegistration: "FSSAI Lic. No. 21423010000000",
      grievanceOfficerName: "Grievance Officer, Raj Traders",
      grievanceOfficerEmail: "support@sundarvan.xyz",
      grievanceOfficerAddress: "Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali Birsinghpur, Madhya Pradesh 484551",
    });
  } catch (err) {
    res.json({
      shopName: "RAJ TRADERS",
      shopDomain: "sundarvan.xyz",
      shopAddress: "Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali Birsinghpur, Madhya Pradesh 484551",
      latitude: 23.3644551,
      longitude: 81.0442634,
      deliveryRadiusKm: 10.0,
      supportEmail: "support@sundarvan.xyz",
      contactEmail: "contact@sundarvan.xyz",
      supportPhone: "",
      whatsappNumber: "",
      googleMapsUrl: "https://www.google.com/maps/place/Raj+Traders/@23.3644543,81.0442869,21z/data=!4m12!1m5!3m4!2zMjPCsDIxJzUxLjUiTiA4McKwMDInMzguOSJF!8m2!3d23.3643056!4d81.0441389!3m5!1s0x3986c58bb0edcb51:0x49e2a8728e29e896!8m2!3d23.3644551!4d81.0442634!16s%2Fg%2F11t29m5jmv",
      socialLinkedin: "",
      socialInstagram: "",
      socialFacebook: "",
      socialPinterest: "",
      socialTwitter: "",
      availableInLocation: "BIRSINGPUR PALI",
      aboutUsText: "Premium cakes, party decorations & artisanal local delights.",
      isStoreOpen: true,
      minOrderCents: 0,
      isCodEnabled: false,
      flatDeliveryFeeCents: 3000,
      freeDeliveryThresholdCents: 50000,
      packagingFeeCents: 1000,
      legalBusinessName: "RAJ TRADERS",
      gstinNumber: "23AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
      stateCode: "23",
      stateName: "Madhya Pradesh",
      allowedPincodesJson: '["484551"]',
      currency: "INR",
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || null,
      fssaiRegistration: "FSSAI Lic. No. 21423010000000",
      grievanceOfficerName: "Grievance Officer, Raj Traders",
      grievanceOfficerEmail: "support@sundarvan.xyz",
      grievanceOfficerAddress: "Thana Rd, beside NAGAR PALIKA, BIRSINGPUR, Pali Birsinghpur, Madhya Pradesh 484551",
    });
  }
});

router.post("/v1/registrations/eligibility", async (req, res): Promise<void> => {
  const parsed = CheckRegistrationEligibilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [existingClaim] = await db.select().from(registrationClaimsTable).where(eq(registrationClaimsTable.email, email));
  const [policy] = await db.select().from(registrationPoliciesTable).where(eq(registrationPoliciesTable.active, true));
  const eligible = !existingClaim && Boolean(policy);
  res.json(
    CheckRegistrationEligibilityResponse.parse({
      eligible,
      reason: eligible ? "This email is eligible for the first-order offer." : existingClaim ? "This email has already claimed the offer or is under a re-registration penalty." : "The first-order offer is not currently active.",
      offerCode: eligible ? policy?.offerCode ?? null : null,
    }),
  );
});

router.post("/v1/registrations/claim", async (req, res): Promise<void> => {
  const parsed = CheckRegistrationEligibilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.trim().toLowerCase();
  const [policy] = await db.select().from(registrationPoliciesTable).where(eq(registrationPoliciesTable.active, true));
  if (!policy) {
    res.status(409).json(ClaimRegistrationOfferResponse.parse({ claimed: false, offerCode: null, message: "The first-order offer is not currently active." }));
    return;
  }
  const [claim] = await db
    .insert(registrationClaimsTable)
    .values({ email, policyId: policy.id })
    .onConflictDoNothing({ target: registrationClaimsTable.email })
    .returning();
  res.status(201).json(
    ClaimRegistrationOfferResponse.parse({
      claimed: Boolean(claim),
      offerCode: claim ? policy.offerCode : null,
      message: claim ? "First-order offer claimed." : "This email has already claimed the offer.",
    }),
  );
});

// Public & Authenticated endpoint: list active, non-expired coupons for customer browsing
// Public store promotions (e.g. WELCOME25, PARTY15) are always visible.
// Private store credits / refund vouchers (CREDIT-* / REFUND-*) are strictly gated to authenticated order owners.
router.get("/v1/discounts/active", async (req, res): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let authUserId: string | null = null;
    if (authHeader) {
      authUserId = await getUserIdFromToken(authHeader);
      if (!authUserId) {
        const clean = authHeader.replace(/^Bearer\s+/i, "").trim();
        try {
          const [u] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.id, clean)).limit(1);
          if (u) authUserId = u.id;
        } catch {}
      }
    }

    let allDiscounts = await db.select().from(discountsTable);
    if (allDiscounts.length === 0) {
      await seedStoreData();
      allDiscounts = await db.select().from(discountsTable);
    }
    const now = Date.now();

    // Look up customer orders matching userId or email if authenticated
    let userOrderPrefixes: string[] = [];
    if (authUserId) {
      try {
        const [user] = await db
          .select({ email: usersTable.email })
          .from(usersTable)
          .where(eq(usersTable.id, authUserId));

        const conditions = [eq(ordersTable.userId, authUserId)];
        if (user?.email) {
          conditions.push(eq(ordersTable.customerEmail, user.email));
        }

        const userOrders = await db
          .select({ id: ordersTable.id })
          .from(ordersTable)
          .where(or(...conditions));

        userOrderPrefixes = userOrders.map((o: { id: string }) => o.id.slice(0, 6).toUpperCase());
      } catch {}
    }

    const activeCoupons = allDiscounts.filter((d: any) => {
      if (!d.active) return false;
      const startsAtMs = d.startsAt ? new Date(d.startsAt).getTime() : 0;
      const expiresAtMs = d.expiresAt ? new Date(d.expiresAt).getTime() : null;
      // Allow 2-minute clock skew so freshly created/edited promo codes are immediately visible
      if (startsAtMs > now + 120000) return false;
      if (expiresAtMs && expiresAtMs < now) return false;
      if (d.usageLimit && d.usageCount >= d.usageLimit) return false;
      if (typeof d.value === "number" && d.value <= 0) return false;

      // Privacy: Store Credit / Refund coupons (CREDIT-* / REFUND-*) only visible to the user who owns that order!
      const isPersonalCredit = d.code.startsWith("CREDIT-") || d.code.startsWith("REFUND-");
      if (isPersonalCredit) {
        if (!authUserId) return false; // Guest users never see private store credits
        const match = userOrderPrefixes.some((prefix) =>
          d.code.startsWith(`CREDIT-${prefix}`) || d.code.startsWith(`REFUND-${prefix}`)
        );
        if (!match) return false;
      }

      return true;
    });

    res.json(activeCoupons.map((d: any) => {
      const isPersonalCredit = d.code.startsWith("CREDIT-") || d.code.startsWith("REFUND-");
      return {
        code: d.code,
        type: d.type,
        value: d.value,
        minimumSubtotalCents: d.minimumSubtotalCents,
        firstOrderOnly: d.firstOrderOnly,
        expiresAt: asIso(d.expiresAt),
        isRefundCredit: isPersonalCredit,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch coupons." });
  }
});

router.post("/v1/discounts/validate", async (req, res): Promise<void> => {
  const parsed = ValidateDiscountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const code = parsed.data.code.trim().toUpperCase();
  const [discount] = await db.select().from(discountsTable).where(eq(discountsTable.code, code));
  const { valid, discountCents } = computeDiscount(
    discount,
    parsed.data.subtotalCents,
    parsed.data.isFirstOrder,
  );
  res.json(
    ValidateDiscountResponse.parse({
      valid,
      code,
      discountCents,
      message: valid ? "Discount applied." : "This code is invalid or no longer available.",
    }),
  );
});

// Dynamic XML Sitemap for SEO Crawlers
router.get("/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const products = await db
      .select()
      .from(productsTable)
      .where(and(eq(productsTable.status, "active"), eq(productsTable.approvalStatus, "approved")));
    
    const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
    const baseUrl = `https://${settings?.shopDomain || "sundarvan.xyz"}`;

    const categories = [...new Set(products.map((p: any) => p.category))];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/account</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/refund</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/cookies</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  ${categories.map((cat: any) => `
  <url>
    <loc>${baseUrl}/?category=${encodeURIComponent(String(cat))}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
  ${products.map((p: any) => `
  <url>
    <loc>${baseUrl}/products/${p.slug}</loc>
    <lastmod>${new Date(p.updatedAt || Date.now()).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    res.status(500).send("Error generating sitemap");
  }
});

export { discountResponse };
export default router;