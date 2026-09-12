import { Router, type IRouter } from "express";
import { and, asc, eq, ilike, or, ne } from "drizzle-orm";
import { db, discountsTable, productsTable, registrationClaimsTable, registrationPoliciesTable, shopSettingsTable } from "@workspace/db";
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
  const conditions = [
    eq(productsTable.status, "active"),
    eq(productsTable.approvalStatus, "approved"),
    ...(category ? [eq(productsTable.category, category)] : []),
    ...(search
      ? [or(ilike(productsTable.name, `%${search}%`), ilike(productsTable.description, `%${search}%`))]
      : []),
  ];
  const products = await db
    .select()
    .from(productsTable)
    .where(and(...conditions))
    .orderBy(asc(productsTable.featured), asc(productsTable.createdAt));
  res.json(ListProductsResponse.parse(products.map(productResponse)));
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
  const shopDomain = settings?.shopDomain || "myshop.com";
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
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.status, "active"), eq(productsTable.approvalStatus, "approved")));
  const [policy] = await db.select().from(registrationPoliciesTable).where(eq(registrationPoliciesTable.active, true));
  const settings = (await db.select().from(shopSettingsTable).where(eq(shopSettingsTable.id, "default_shop")).limit(1))[0];
  const shopName = settings?.shopName || "My Shop";
  res.json(
    GetStorefrontSummaryResponse.parse({
      shopName,
      featuredCount: products.filter((product: any) => product.featured).length,
      categories: [...new Set(products.map((product: any) => product.category))],
      firstOrderOffer: policy?.offerCode ?? "WELCOME10",
      updatedAt: new Date().toISOString(),
    }),
  );
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

export { discountResponse };
export default router;