import "dotenv/config";
import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import { handleDemo } from "./routes/demo";

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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

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
