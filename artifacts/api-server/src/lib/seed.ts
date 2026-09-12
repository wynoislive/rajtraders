import { db, discountsTable, productsTable, registrationPoliciesTable } from "@workspace/db";
import { logger } from "./logger";

export async function seedStoreData(): Promise<void> {
  const [existingProduct] = await db.select({ id: productsTable.id }).from(productsTable).limit(1);
  if (existingProduct) return;

  await db.insert(productsTable).values([
    {
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
    },
    {
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
    },
    {
      name: "Canvas Market Tote",
      slug: "canvas-market-tote",
      description: "A durable carryall with an inside pocket for the little things.",
      priceCents: 3200,
      compareAtPriceCents: null,
      category: "Accessories",
      imageUrl: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80",
      status: "draft",
      featured: false,
      inventory: 40,
    },
  ]);

  await db.insert(discountsTable).values([
    {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      minimumSubtotalCents: 2500,
      usageLimit: 500,
      active: true,
      firstOrderOnly: true,
    },
    {
      code: "HARBOR15",
      type: "fixed",
      value: 1500,
      minimumSubtotalCents: 9000,
      usageLimit: 100,
      active: true,
      firstOrderOnly: false,
    },
  ]);

  await db.insert(registrationPoliciesTable).values({
    name: "Welcome offer",
    description: "Give first-time shoppers a warm welcome without stacking offers.",
    offerCode: "WELCOME10",
    active: true,
    windowDays: 14,
    registrationsCount: 0,
  });

  logger.info("Seeded starter catalog, discounts, and registration policy");
}