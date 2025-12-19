import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const PRIVATE_PATTERNS: RegExp[] = [
  /^\/signin/i,
  /^\/signup/i,
  /^\/forgot-password/i,
  /^\/reset-password/i,
  /^\/change-password/i,
  /^\/email-verification/i,
  /^\/profile/i,
  /^\/settings/i,
  /^\/dashboard/i,
  /^\/pricing$/i,
  /^\/demo-login/i,
  /^\/user-/i,
  /^\/contract-review/i,
  /^\/upload/i,
  /^\/admin/i,
  /^\/enterprise-dashboard/i,
  /^\/org-admin/i,
  /^\/invite/i,
];

const NOINDEX_CONTENT = "noindex, nofollow";

export function SeoDefaults() {
  const location = useLocation();
  const isPrivate = PRIVATE_PATTERNS.some((pattern) =>
    pattern.test(location.pathname),
  );

  if (!isPrivate) return null;

  return (
    <Helmet>
      <meta name="robots" content={NOINDEX_CONTENT} />
    </Helmet>
  );
}
