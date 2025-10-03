import * as Sentry from "@sentry/react";

let isInitialized = false;

function parseSampleRate(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return parsed;
  }
  return fallback;
}

export function initClientSentry() {
  if (isInitialized) {
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info("Sentry DSN missing; client instrumentation disabled.");
    }
    return;
  }

  const environment =
    import.meta.env.VITE_APP_ENV || import.meta.env.MODE || "development";
  const release =
    import.meta.env.VITE_SENTRY_RELEASE || import.meta.env.VITE_COMMIT_SHA;

  const tracesSampleRate = parseSampleRate(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
    0.1,
  );

  const sessionSampleRate = parseSampleRate(
    import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    0.1,
  );

  const errorSampleRate = parseSampleRate(
    import.meta.env.VITE_SENTRY_REPLAYS_ERROR_SAMPLE_RATE,
    1,
  );

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate,
    replaysSessionSampleRate: sessionSampleRate,
    replaysOnErrorSampleRate: errorSampleRate,
    autoSessionTracking: true,
  });

  isInitialized = true;
}

export function captureException(
  error: unknown,
  context?: Record<string, any>,
) {
  const client = Sentry.getCurrentHub().getClient();
  if (!client) {
    return;
  }

  Sentry.captureException(error, context ? { extra: context } : undefined);
}
