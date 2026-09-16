import { getRedisClient } from "./redis";
import { logger } from "./logger";
import { db, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface ReservationItem {
  productId: string;
  quantity: number;
}

export interface ReservationResult {
  success: boolean;
  error?: string;
  failedProductId?: string;
  availableStock?: number;
}

/**
 * Two-stage inventory locking using Redis TTL with DB fallback.
 * Stage 1: Temporary reservation during checkout initiation (default 15 mins).
 * Stage 2: Commit (permanent decrement in DB) on verified payment, OR release on abort/failure.
 */

const HOLD_PREFIX = "inventory:hold:";
const ORDER_RES_PREFIX = "inventory:res:";

export async function reserveInventory(
  orderId: string,
  items: ReservationItem[],
  ttlSeconds = 900
): Promise<ReservationResult> {
  const redis = getRedisClient();

  // 1. Fetch current live DB inventory for all requested items
  for (const item of items) {
    const [product] = await db
      .select({ id: productsTable.id, inventory: productsTable.inventory, name: productsTable.name })
      .from(productsTable)
      .where(eq(productsTable.id, item.productId))
      .limit(1);

    if (!product) {
      return {
        success: false,
        error: `Product not found`,
        failedProductId: item.productId,
        availableStock: 0,
      };
    }

    let heldQuantity = 0;
    if (redis) {
      try {
        const held = await redis.get(`${HOLD_PREFIX}${item.productId}`);
        heldQuantity = held ? parseInt(held, 10) : 0;
      } catch (err) {
        logger.warn({ err }, "Redis read failed for inventory hold, continuing without cache lock");
      }
    }

    const available = product.inventory - heldQuantity;
    if (available < item.quantity) {
      return {
        success: false,
        error: `Insufficient stock for "${product.name}". Available: ${Math.max(0, available)}, Requested: ${item.quantity}`,
        failedProductId: item.productId,
        availableStock: Math.max(0, available),
      };
    }
  }

  // 2. If all items pass stock check, place Redis hold locks
  if (redis) {
    try {
      for (const item of items) {
        const key = `${HOLD_PREFIX}${item.productId}`;
        await redis.incrby(key, item.quantity);
        // Ensure hold key expires after TTL so abandoned carts auto-release
        const currentTtl = await redis.ttl(key);
        if (currentTtl < 0 || currentTtl < ttlSeconds) {
          await redis.expire(key, ttlSeconds);
        }
      }

      // Record reservation summary for this order
      await redis.set(
        `${ORDER_RES_PREFIX}${orderId}`,
        JSON.stringify(items),
        "EX",
        ttlSeconds
      );
    } catch (err) {
      logger.error({ err, orderId }, "Failed to persist Redis inventory reservation, falling back to DB only");
    }
  }

  return { success: true };
}

export async function commitInventoryReservation(
  orderId: string,
  items: ReservationItem[]
): Promise<void> {
  const redis = getRedisClient();

  // 1. Permanently decrement inventory in PostgreSQL
  for (const item of items) {
    try {
      await db
        .update(productsTable)
        .set({
          inventory: sql`GREATEST(0, ${productsTable.inventory} - ${item.quantity})`,
          updatedAt: new Date(),
        })
        .where(eq(productsTable.id, item.productId));
    } catch (err) {
      logger.error({ err, productId: item.productId }, "Failed to permanently decrement product inventory in DB");
    }
  }

  // 2. Release Redis hold lock for this order
  if (redis) {
    try {
      for (const item of items) {
        const key = `${HOLD_PREFIX}${item.productId}`;
        const newHold = await redis.decrby(key, item.quantity);
        if (newHold <= 0) {
          await redis.del(key);
        }
      }
      await redis.del(`${ORDER_RES_PREFIX}${orderId}`);
    } catch (err) {
      logger.warn({ err, orderId }, "Failed to clean up Redis inventory hold on commit");
    }
  }
}

export async function releaseInventoryReservation(
  orderId: string,
  items?: ReservationItem[]
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    let itemsToRelease = items;
    if (!itemsToRelease) {
      const cached = await redis.get(`${ORDER_RES_PREFIX}${orderId}`);
      if (cached) {
        itemsToRelease = JSON.parse(cached);
      }
    }

    if (itemsToRelease && itemsToRelease.length > 0) {
      for (const item of itemsToRelease) {
        const key = `${HOLD_PREFIX}${item.productId}`;
        const newHold = await redis.decrby(key, item.quantity);
        if (newHold <= 0) {
          await redis.del(key);
        }
      }
    }
    await redis.del(`${ORDER_RES_PREFIX}${orderId}`);
  } catch (err) {
    logger.warn({ err, orderId }, "Failed to release Redis inventory reservation");
  }
}
