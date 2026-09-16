import { Router, type Request, type Response } from "express";
import { db, customerCartsTable, productsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { getUserIdFromToken } from "./customer-auth";
import { getRedisClient } from "../lib/redis";
import { z } from "zod";

const router: Router = Router();

const CartItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().optional(),
  priceCents: z.number().int().nonnegative().optional(),
  imageUrl: z.string().optional(),
  quantity: z.number().int().positive(),
  category: z.string().optional(),
});

const UpdateCartBodySchema = z.object({
  items: z.array(CartItemSchema),
});

const MergeCartBodySchema = z.object({
  guestItems: z.array(CartItemSchema),
});

const CART_REDIS_TTL = 30 * 24 * 60 * 60; // 30 days

// ── GET /v1/customer/cart ───────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }

  const redis = getRedisClient();
  const redisKey = `cart:customer:${userId}`;

  // 1. Try Redis cache
  if (redis) {
    try {
      const cached = await redis.get(redisKey);
      if (cached) {
        const items = JSON.parse(cached);
        res.status(200).json({ success: true, items });
        return;
      }
    } catch (err) {
      req.log?.warn({ err }, "Redis error reading cart");
    }
  }

  // 2. Fallback to PostgreSQL
  try {
    const [row] = await db
      .select()
      .from(customerCartsTable)
      .where(eq(customerCartsTable.userId, userId))
      .limit(1);

    const items = row ? JSON.parse(row.itemsJson) : [];

    // Repopulate Redis
    if (redis && row) {
      await redis.set(redisKey, row.itemsJson, "EX", CART_REDIS_TTL).catch(() => {});
    }

    res.status(200).json({ success: true, items });
  } catch (err: unknown) {
    req.log?.error({ err }, "Failed to fetch customer cart from DB");
    res.status(500).json({ error: "Failed to retrieve cart" });
  }
});

// ── PUT /v1/customer/cart ───────────────────────────────────
router.put("/", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }

  const parsed = UpdateCartBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid cart payload", details: parsed.error.issues });
    return;
  }

  const { items } = parsed.data;
  const itemsJson = JSON.stringify(items);
  const redis = getRedisClient();
  const redisKey = `cart:customer:${userId}`;

  try {
    // 1. Update PostgreSQL
    await db
      .insert(customerCartsTable)
      .values({
        userId,
        itemsJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customerCartsTable.userId,
        set: {
          itemsJson,
          updatedAt: new Date(),
        },
      });

    // 2. Update Redis
    if (redis) {
      await redis.set(redisKey, itemsJson, "EX", CART_REDIS_TTL).catch(() => {});
    }

    res.status(200).json({ success: true, items });
  } catch (err: unknown) {
    req.log?.error({ err }, "Failed to persist cart");
    res.status(500).json({ error: "Failed to save cart" });
  }
});

// ── POST /v1/customer/cart/merge ────────────────────────────
router.post("/merge", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }

  const parsed = MergeCartBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid merge payload", details: parsed.error.issues });
    return;
  }

  const { guestItems } = parsed.data;

  try {
    // Fetch current user cart from DB
    const [row] = await db
      .select()
      .from(customerCartsTable)
      .where(eq(customerCartsTable.userId, userId))
      .limit(1);

    const existingItems: Array<z.infer<typeof CartItemSchema>> = row ? JSON.parse(row.itemsJson) : [];
    const itemMap = new Map<string, z.infer<typeof CartItemSchema>>();

    for (const item of existingItems) {
      itemMap.set(item.productId, { ...item });
    }

    // Merge guest items: sum quantities
    for (const guestItem of guestItems) {
      if (itemMap.has(guestItem.productId)) {
        const current = itemMap.get(guestItem.productId)!;
        current.quantity += guestItem.quantity;
      } else {
        itemMap.set(guestItem.productId, { ...guestItem });
      }
    }

    const mergedItems = Array.from(itemMap.values());

    // Fetch live inventory to clamp quantities to maximum stock
    if (mergedItems.length > 0) {
      const productIds = mergedItems.map((i) => i.productId);
      const liveProducts = await db
        .select({ id: productsTable.id, inventory: productsTable.inventory })
        .from(productsTable)
        .where(inArray(productsTable.id, productIds));

      const stockMap = new Map<string, number>(liveProducts.map((p: any) => [p.id, Number(p.inventory)]));

      for (const item of mergedItems) {
        const maxStock = stockMap.get(item.productId);
        if (typeof maxStock === "number" && !isNaN(maxStock) && maxStock >= 0) {
          item.quantity = Math.max(1, Math.min(item.quantity, maxStock));
        }
      }
    }

    const itemsJson = JSON.stringify(mergedItems);

    // Save to PostgreSQL
    await db
      .insert(customerCartsTable)
      .values({
        userId,
        itemsJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customerCartsTable.userId,
        set: {
          itemsJson,
          updatedAt: new Date(),
        },
      });

    // Update Redis
    const redis = getRedisClient();
    if (redis) {
      await redis.set(`cart:customer:${userId}`, itemsJson, "EX", CART_REDIS_TTL).catch(() => {});
    }

    res.status(200).json({ success: true, items: mergedItems });
  } catch (err: unknown) {
    req.log?.error({ err }, "Failed to merge customer cart");
    res.status(500).json({ error: "Failed to merge cart" });
  }
});

// ── DELETE /v1/customer/cart ────────────────────────────────
router.delete("/", async (req: Request, res: Response) => {
  const userId = await getUserIdFromToken(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }

  try {
    await db.delete(customerCartsTable).where(eq(customerCartsTable.userId, userId));
    const redis = getRedisClient();
    if (redis) {
      await redis.del(`cart:customer:${userId}`).catch(() => {});
    }
    res.status(200).json({ success: true, message: "Cart cleared successfully" });
  } catch (err: unknown) {
    req.log?.error({ err }, "Failed to clear cart");
    res.status(500).json({ error: "Failed to clear cart" });
  }
});

export default router;
