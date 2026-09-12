import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import router from "./routes";
import { logger } from "./lib/logger";
import { securityConfig } from "./lib/security-config";
import { CLERK_PROXY_PATH, clerkProxyMiddleware, getClerkProxyHost } from "./middlewares/clerkProxyMiddleware";
import { isAllowedOrigin, secureGateway } from "./middlewares/security";
import { requestIdMiddleware } from "./middlewares/request-id";
import { globalErrorHandler } from "./middlewares/error-handler";

const app: Express = express();

// ── Request ID (first, so every log line and error response has it) ──
app.use(requestIdMiddleware);

// ── Request logging ─────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    // Use the request-id middleware's value for log correlation
    genReqId: (req) => (req as any).id,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Clerk proxy passthrough ─────────────────────────────────
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// ── Security gateway (helmet + global rate limiter) ─────────
app.use(secureGateway);

// ── CORS ────────────────────────────────────────────────────
app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
  }),
);

// ── Clerk session middleware (optional) ─────────────────────
if (process.env.CLERK_SECRET_KEY) {
  app.use(
    clerkMiddleware((req) => ({
      publishableKey: publishableKeyFromHost(
        getClerkProxyHost(req) ?? "",
        process.env.CLERK_PUBLISHABLE_KEY,
      ),
    })),
  );
}

// ── Body parsers with configurable size limits ──────────────
app.use(express.json({ limit: securityConfig.bodySizeLimit }));
app.use(express.urlencoded({ limit: securityConfig.bodySizeLimit, extended: true }));

// ── API routes ──────────────────────────────────────────────
app.use("/api", router);

// ── Global error handler (MUST be last) ─────────────────────
app.use(globalErrorHandler);

export default app;
