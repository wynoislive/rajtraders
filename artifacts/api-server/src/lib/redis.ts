import Redis from "ioredis";
import { logger } from "./logger";

let redisInstance: Redis | null = null;

/**
 * Returns a singleton Redis client connected to Redis Cloud.
 * Falls back to null if REDIS_URL is not set (local dev without Redis).
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) return redisInstance;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.warn("REDIS_URL not set — Redis features disabled (sessions will use in-memory fallback)");
    return null;
  }

  try {
    redisInstance = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        logger.info({ attempt: times, delayMs: delay }, "Redis reconnecting…");
        return delay;
      },
      reconnectOnError(err) {
        const targetErrors = ["READONLY", "ECONNRESET", "ETIMEDOUT"];
        return targetErrors.some((e) => err.message.includes(e));
      },
      lazyConnect: false,
      enableReadyCheck: true,
      connectTimeout: 10_000,
    });

    redisInstance.on("connect", () => logger.info("Redis Cloud connected"));
    redisInstance.on("error", (err) => logger.error({ err }, "Redis Cloud error"));
    redisInstance.on("close", () => logger.warn("Redis Cloud connection closed"));

    return redisInstance;
  } catch (err) {
    logger.error({ err }, "Failed to create Redis client");
    return null;
  }
}

/**
 * Gracefully disconnect Redis (for shutdown hooks).
 */
export async function disconnectRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
}
