const FALLBACK_DEV_URL = "http://localhost:5173";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/$/, "");
}

export function getSiteUrl(): string {
  const envUrl =
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_APP_ORIGIN ||
    import.meta.env.VITE_PUBLIC_APP_URL ||
    "";

  if (envUrl && typeof envUrl === "string") {
    return normalizeBaseUrl(envUrl);
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin);
  }

  return FALLBACK_DEV_URL;
}

export function buildAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) {
    return getSiteUrl();
  }

  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`;

  return `${getSiteUrl()}${normalizedPath}`;
}

export const DEFAULT_OG_IMAGE = "/maigon-logo_3.png";
export const DEFAULT_SITE_NAME = "Maigon";
