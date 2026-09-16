import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const celebrationProducts = [
  {
    id: "prod_cake_belgian_choco",
    name: "Belgian Chocolate Truffle Cake (1kg)",
    slug: "belgian-chocolate-truffle-cake",
    description: "Rich 55% dark Belgian chocolate truffle cake decorated with edible gold leaf and cocoa nibs. Perfect for birthdays & anniversaries.",
    priceCents: 129900,
    compareAtPriceCents: 149900,
    category: "Cakes",
    imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
    inventory: 25,
    prepTimeMinutes: 45,
    status: "active",
    featured: true,
    isBestseller: true,
    isVeg: true,
    approvalStatus: "approved",
  },
  {
    id: "prod_cake_strawberry_bliss",
    name: "Fresh Strawberry Cream Cake (1kg)",
    slug: "fresh-strawberry-cream-cake",
    description: "Fresh Mahabaleshwar strawberries layered with vanilla sponge and light whipping cream.",
    priceCents: 109900,
    compareAtPriceCents: 129900,
    category: "Cakes",
    imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80",
    inventory: 18,
    prepTimeMinutes: 30,
    status: "active",
    featured: true,
    isBestseller: true,
    isVeg: true,
    approvalStatus: "approved",
  },
  {
    id: "prod_party_balloon_arch",
    name: "Metallic Gold & Pastel Balloon Arch Set (100 Pcs)",
    slug: "metallic-gold-pastel-balloon-arch",
    description: "Complete DIY birthday & wedding balloon garland kit including arch tape, glue dots, and 100 thick latex balloons.",
    priceCents: 49900,
    compareAtPriceCents: 79900,
    category: "Decorations",
    imageUrl: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80",
    inventory: 50,
    prepTimeMinutes: 15,
    status: "active",
    featured: true,
    isBestseller: true,
    isVeg: true,
    approvalStatus: "approved",
  },
  {
    id: "prod_decor_led_fairylights",
    name: "Warm White LED Curtain Fairy Lights (10x10 Ft)",
    slug: "warm-white-led-curtain-fairy-lights",
    description: "Waterproof 300 LED string curtain lights with 8 flashing modes for wedding backdrop and party decor.",
    priceCents: 69900,
    compareAtPriceCents: 99900,
    category: "Decorations",
    imageUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80",
    inventory: 40,
    prepTimeMinutes: 10,
    status: "active",
    featured: false,
    isBestseller: false,
    isVeg: true,
    approvalStatus: "approved",
  },
  {
    id: "prod_cake_custom_wedding",
    name: "3-Tier Floral Wedding Fondant Cake (3kg)",
    slug: "3-tier-floral-wedding-fondant-cake",
    description: "Custom handcrafted 3-tier wedding cake with sugar roses, red velvet tiers, and vanilla bean buttercream.",
    priceCents: 449900,
    compareAtPriceCents: 499900,
    category: "Cakes",
    imageUrl: "https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80",
    inventory: 10,
    prepTimeMinutes: 120,
    status: "active",
    featured: true,
    isBestseller: false,
    isVeg: true,
    approvalStatus: "approved",
  },
  {
    id: "prod_party_banner_hbd",
    name: "Acrylic Glitter Happy Birthday Cake Topper & Banner Combo",
    slug: "acrylic-glitter-happy-birthday-banner-combo",
    description: "Rose gold mirror finish acrylic cake topper with matching foil bunting banner.",
    priceCents: 29900,
    compareAtPriceCents: 49900,
    category: "Decorations",
    imageUrl: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=800&q=80",
    inventory: 75,
    prepTimeMinutes: 5,
    status: "active",
    featured: false,
    isBestseller: true,
    isVeg: true,
    approvalStatus: "approved",
  },
];

export async function seedProductsToDatabase() {
  try {
    for (const item of celebrationProducts) {
      const existing = await db.select().from(productsTable).where(eq(productsTable.id, item.id)).limit(1);
      if (existing.length === 0) {
        await db.insert(productsTable).values(item);
      }
    }
  } catch (err) {
    console.error("Failed to seed celebration products:", err);
  }
}

// Auto-seed on server boot if table is empty
export async function ensureProductsSeeded() {
  try {
    const existing = await db.select().from(productsTable).limit(1);
    if (existing.length === 0) {
      await seedProductsToDatabase();
    }
  } catch (err) {
    // Ignore in uninitialized DB environments
  }
}
