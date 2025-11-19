import "tsconfig-paths/register.js";
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import dotenv from "dotenv";
import { sentryVitePlugin } from "@sentry/vite-plugin";

console.info("[vite-config] Loading configuration...");

// Ensure env variables are loaded before any other modules access them
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
console.info("[vite-config] Environment loaded.");

function buildPlugins(mode: string) {
  console.info("[vite-config] Building plugins for mode:", mode);
  const plugins: Plugin[] = [react(), expressPlugin()];

  const hasSentryUpload = Boolean(
    process.env.SENTRY_AUTH_TOKEN &&
      process.env.SENTRY_ORG &&
      process.env.SENTRY_PROJECT,
  );

  if (hasSentryUpload) {
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
  } else if (mode === "production") {
    console.info(
      "Sentry source map upload skipped: set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT to enable it.",
    );
  }

  return plugins;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
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
  plugins: buildPlugins(mode),
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
      const { createServer } = await import(
        /* @vite-ignore */ "./server/index.ts"
      );
      const app = createServer();
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
