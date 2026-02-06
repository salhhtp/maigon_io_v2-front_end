import React, { createContext, useContext, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "@/contexts/SupabaseUserContext";

type BrandingSource = "route" | "org" | "default";

export interface BrandingState {
  logoUrl: string | null;
  footerTagline: string | null;
  playbookKey: string | null;
  playbookSlug: string | null;
  source: BrandingSource;
}

const DEFAULT_BRANDING: BrandingState = {
  logoUrl: null,
  footerTagline: null,
  playbookKey: null,
  playbookSlug: null,
  source: "default",
};

const PLAYBOOK_BRANDING: Record<
  string,
  Pick<BrandingState, "footerTagline" | "playbookKey" | "logoUrl">
> = {
  alfalaval: {
    footerTagline: "Provided by ALFA LAVAL. Powered by MAIGON.",
    playbookKey: "alfalaval-nda",
    logoUrl: null,
  },
};

const BrandingContext = createContext<BrandingState>(DEFAULT_BRANDING);

function extractPlaybookSlug(pathname: string): string | null {
  const match = pathname.match(/^\/nda\/([^/]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function resolveRouteBranding(pathname: string): BrandingState | null {
  const slug = extractPlaybookSlug(pathname);
  if (!slug) return null;
  const entry = PLAYBOOK_BRANDING[slug];
  if (!entry) return null;
  return {
    logoUrl: entry.logoUrl ?? null,
    footerTagline: entry.footerTagline ?? null,
    playbookKey: entry.playbookKey ?? null,
    playbookSlug: slug,
    source: "route",
  };
}

function resolveOrgBranding(
  metadata: Record<string, unknown> | null | undefined,
  email?: string | null,
): BrandingState | null {
  if (!metadata) return null;

  const logoUrl =
    typeof metadata.logoUrl === "string" ? metadata.logoUrl : null;
  const footerTagline =
    typeof metadata.footerTagline === "string"
      ? metadata.footerTagline
      : null;
  const playbookKey =
    typeof metadata.playbookKey === "string"
      ? metadata.playbookKey
      : null;

  const domainsRaw = metadata.domains;
  const domains = Array.isArray(domainsRaw)
    ? domainsRaw.filter((value): value is string => typeof value === "string")
    : [];

  if (!logoUrl && !footerTagline && !playbookKey) {
    return null;
  }

  if (domains.length === 0) {
    return {
      logoUrl,
      footerTagline,
      playbookKey,
      playbookSlug: null,
      source: "org",
    };
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const emailDomain = email?.split("@").pop()?.toLowerCase() ?? "";
  const matchesDomain = domains.some((domain) => {
    const normalized = domain.toLowerCase();
    return (
      normalized === host.toLowerCase() ||
      (host && host.toLowerCase().endsWith(`.${normalized}`)) ||
      (emailDomain && emailDomain === normalized)
    );
  });

  if (!matchesDomain) {
    return null;
  }

  return {
    logoUrl,
    footerTagline,
    playbookKey,
    playbookSlug: null,
    source: "org",
  };
}

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const location = useLocation();
  const { user } = useUser();

  const branding = useMemo(() => {
    const routeBranding = resolveRouteBranding(location.pathname);
    if (routeBranding) return routeBranding;

    const orgBranding = resolveOrgBranding(
      (user?.organization?.metadata as Record<string, unknown>) ?? null,
      user?.email ?? null,
    );
    if (orgBranding) return orgBranding;

    return DEFAULT_BRANDING;
  }, [location.pathname, user]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
};

export function useBranding() {
  return useContext(BrandingContext);
}

