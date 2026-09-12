import { Queue } from "bullmq";
import { getRedisClient } from "./redis";
import { logger } from "./logger";

export interface EmailJobData {
  type: "verification-otp" | "password-recovery";
  to: string;
  userName: string;
  /** For OTP emails */
  otpCode?: string;
  /** For password recovery emails */
  resetToken?: string;
  resetUrl?: string;
}

let emailQueueInstance: Queue<EmailJobData> | null = null;

/**
 * Returns the BullMQ email queue (lazy-initialised).
 * Returns null if Redis is unavailable — callers should fall back to
 * synchronous email sending.
 */
export function getEmailQueue(): Queue<EmailJobData> | null {
  if (emailQueueInstance) return emailQueueInstance;

  const redis = getRedisClient();
  if (!redis) {
    logger.warn("Redis unavailable — email queue disabled, emails will be sent synchronously");
    return null;
  }

  try {
    emailQueueInstance = new Queue<EmailJobData>("email", {
      connection: {
        host: redis.options.host,
        port: redis.options.port,
        password: redis.options.password,
        username: redis.options.username ?? "default",
        tls: redis.options.tls ? {} : undefined,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000, // 1s → 4s → 16s
        },
        removeOnComplete: { count: 100 }, // keep last 100 completed
        removeOnFail: { count: 500 },     // keep last 500 failed for inspection
      },
    });

    logger.info("BullMQ email queue initialised");
    return emailQueueInstance;
  } catch (err) {
    logger.error({ err }, "Failed to create BullMQ email queue");
    return null;
  }
}

/**
 * Enqueue an email job. Falls back to direct sending if queue is unavailable.
 */
export async function enqueueEmail(data: EmailJobData): Promise<boolean> {
  const queue = getEmailQueue();
  if (!queue) return false; // caller should fall back to sync send

  try {
    await queue.add(data.type, data, {
      jobId: `${data.type}_${data.to}_${Date.now()}`,
    });
    logger.info({ type: data.type, to: data.to }, "Email job enqueued");
    return true;
  } catch (err) {
    logger.error({ err, type: data.type, to: data.to }, "Failed to enqueue email job");
    return false;
  }
}
