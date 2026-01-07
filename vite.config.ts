import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dotenv from "dotenv";
import type { PluginOption } from "vite";

console.info("[vite-config] Loading configuration...");

// Ensure env variables are loaded before any other modules access them
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
console.info("[vite-config] Environment loaded.");

async function buildPlugins(mode: string): Promise<PluginOption[]> {
  console.info("[vite-config] Building plugins for mode:", mode);
  const plugins: PluginOption[] = [react()];

  const embedApi = process.env.SKIP_EMBEDDED_API !== "1";
  if (embedApi) {
    plugins.push(expressPlugin());
  } else {
    console.info(
      "[vite-config] SKIP_EMBEDDED_API=1 detected. Skipping embedded Express server for faster frontend-only dev.",
    );
  }

  const hasSentryUpload = Boolean(
    process.env.SENTRY_AUTH_TOKEN &&
      process.env.SENTRY_ORG &&
      process.env.SENTRY_PROJECT,
  );

  if (hasSentryUpload && mode === "production") {
    try {
      const { sentryVitePlugin } = await import("@sentry/vite-plugin");
      plugins.push(
        sentryVitePlugin({
          org: process.env.SENTRY_ORG!,
          project: process.env.SENTRY_PROJECT!,
          authToken: process.env.SENTRY_AUTH_TOKEN!,
          release: process.env.SENTRY_RELEASE || process.env.VITE_COMMIT_SHA,
          include: "./dist",
          telemetry: false,
          sourcemaps: {
            assets: "./dist/**",
          },
        }),
      );
    } catch (error) {
      console.warn("[vite-config] Sentry plugin import failed; skipping.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else if (mode === "production") {
    console.info(
      "Sentry source map upload skipped: set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT to enable it.",
    );
  }

  return plugins;
}

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => ({
  server: {
    // Prefer IPv4 binding to avoid browsers hanging on IPv6-only localhost resolution
    host: "0.0.0.0",
    port: 8080,
    watch: {
      // Supabase CLI mutates `.env` frequently; ignore it to avoid
      // endless restarts that leave the dev server in a bad state.
      ignored: [
        "**/.env",
        "**/.env.*",
        "**/supabase/**",
        "**/server/**",
        "**/logs/**",
        "**/tmp/**",
        // Sentry plugin watches dist; avoid recursive triggers.
        "dist/**",
      ],
    },
    fs: {
      allow: [
        path.resolve(__dirname, "./client"),
        path.resolve(__dirname, "./shared"),
        path.resolve(__dirname, "./"),
      ],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: await buildPlugins(mode),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      console.info("[vite-config] Creating embedded Express server...");
      let app: any = null;
      try {
        const serverModule = await server.ssrLoadModule(
          "/server/index.ts",
        ) as { createServer?: () => any };
        if (typeof serverModule?.createServer !== "function") {
          throw new Error("createServer export missing from server/index.ts");
        }
        app = serverModule.createServer();
      } catch (error) {
        console.error("[vite-config] Failed to load embedded Express server.", {
          error: error instanceof Error ? error.message : String(error),
        });
        return;
      }
      const isApiRequest = (url: string | undefined | null) => {
        if (!url) return false;
        return url === "/api" || url.startsWith("/api/") || url.startsWith("/api?");
      };

      // Add Express app as middleware to Vite dev server
      server.middlewares.use((req, res, next) => {
        if (isApiRequest(req.url)) {
          return app(req, res, next);
        }
        return next();
      });
      console.info("[vite-config] Express server attached.");
    },
  };
}
