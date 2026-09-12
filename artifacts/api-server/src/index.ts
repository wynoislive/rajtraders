import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { seedStoreData } from "./lib/seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  await seedStoreData();
  app.listen(port, "0.0.0.0", (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port, host: "0.0.0.0" }, "Server listening");
  });
}

start().catch((err: unknown) => {
  logger.error({ err }, "Unable to start server");
  process.exit(1);
});
