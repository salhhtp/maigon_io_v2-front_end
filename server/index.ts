// Ensure server loads environment from project .env even when cwd differs
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env") });
import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import { handleDemo } from "./routes/demo";
import { ingestionRouter } from "./routes/ingest";
import { classifyRouter } from "./routes/classify";
import { profileRouter } from "./routes/profile";
import { agentRouter } from "./routes/agent";
import { orgRouter } from "./routes/org";
import { adminRouter } from "./routes/admin";
import { publicRouter } from "./routes/public";
import { billingRouter, billingWebhookHandler } from "./routes/billing";
import { adminDashboardRouter } from "./routes/adminDashboard";
import { enterpriseDashboardRouter } from "./routes/enterpriseDashboard";
import { exportRouter } from "./routes/export";

let sentryInitialized = false;

function initializeSentry() {
  if (sentryInitialized) {
    return Sentry.getCurrentHub().getClient() !== undefined;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    return false;
  }

  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });

  sentryInitialized = true;
  return true;
}

export function createServer() {
  const app = express();
  const hasSentry = initializeSentry();

  if (hasSentry && Sentry.Handlers) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // Middleware
  app.use(cors());
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    billingWebhookHandler,
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.use("/api/ingest", ingestionRouter);
  app.use("/api/classify", classifyRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/agent", agentRouter);
  app.use("/api/admin/dashboard", adminDashboardRouter);
  app.use("/api/org", orgRouter);
  app.use("/api/enterprise/dashboard", enterpriseDashboardRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/export", exportRouter);

  if (hasSentry && Sentry.Handlers) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // Fallback error handler to ensure responses are sent
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error("Server error:", err);
      const status =
        err instanceof Error && (err as any).status ? (err as any).status : 500;
      res.status(status).json({
        error: "Internal server error",
        requestId: res.getHeader("x-request-id") ?? null,
      });
    },
  );

  return app;
}
