import { Worker } from "bullmq";
import { getRedisClient } from "./redis";
import { logger } from "./logger";
import { sendVerificationOtpEmail, sendPasswordRecoveryEmail } from "../utils/mailer";
import type { EmailJobData } from "./email-queue";

let workerInstance: Worker | null = null;

/**
 * Starts the BullMQ email worker that processes queued email jobs.
 * This is designed to be called either:
 * 1. At server startup (for persistent processes)
 * 2. From a Vercel Cron Job endpoint (for serverless)
 */
export function startEmailWorker(): Worker | null {
  if (workerInstance) return workerInstance;

  const redis = getRedisClient();
  if (!redis) {
    logger.warn("Redis unavailable — email worker not started");
    return null;
  }

  try {
    workerInstance = new Worker<EmailJobData>(
      "email",
      async (job) => {
        const { type, to, userName, otpCode, resetToken, resetUrl } = job.data;
        logger.info({ jobId: job.id, type, to }, "Processing email job");

        switch (type) {
          case "verification-otp": {
            if (!otpCode) throw new Error("Missing otpCode for verification email");
            const result = await sendVerificationOtpEmail(to, userName, otpCode);
            if (!result.success) throw new Error("Failed to send verification OTP email");
            break;
          }
          case "password-recovery": {
            if (!resetToken || !resetUrl) throw new Error("Missing resetToken/resetUrl for recovery email");
            const result = await sendPasswordRecoveryEmail(to, userName, resetToken, resetUrl);
            if (!result.success) throw new Error("Failed to send password recovery email");
            break;
          }
          default:
            throw new Error(`Unknown email job type: ${type}`);
        }

        logger.info({ jobId: job.id, type, to }, "Email job completed");
      },
      {
        connection: {
          host: redis.options.host,
          port: redis.options.port,
          password: redis.options.password,
          username: redis.options.username ?? "default",
          tls: redis.options.tls ? {} : undefined,
        },
        concurrency: 3,
        limiter: {
          max: 10,
          duration: 60_000, // max 10 emails per minute
        },
      },
    );

    workerInstance.on("failed", (job, err) => {
      logger.error(
        { jobId: job?.id, type: job?.data?.type, to: job?.data?.to, err },
        "Email job failed",
      );
    });

    workerInstance.on("completed", (job) => {
      logger.info({ jobId: job.id, type: job.data.type, to: job.data.to }, "Email job succeeded");
    });

    logger.info("BullMQ email worker started");
    return workerInstance;
  } catch (err) {
    logger.error({ err }, "Failed to start email worker");
    return null;
  }
}

/**
 * Gracefully stop the email worker.
 */
export async function stopEmailWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
}
