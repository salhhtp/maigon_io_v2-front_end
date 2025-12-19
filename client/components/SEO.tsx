import { Helmet } from "react-helmet-async";
import { buildAbsoluteUrl, DEFAULT_OG_IMAGE, DEFAULT_SITE_NAME } from "@/utils/seo";

type SEOProps = {
  title: string;
  description?: string;
  canonicalPath?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  noindex?: boolean;
};

const DEFAULT_ROBOTS = "index, follow";
const NOINDEX_ROBOTS = "noindex, nofollow";

export function SEO({
  title,
  description,
  canonicalPath,
  ogImage,
  ogType = "website",
  noindex = false,
}: SEOProps) {
  const canonicalUrl = canonicalPath ? buildAbsoluteUrl(canonicalPath) : undefined;
  const absoluteOgImage = buildAbsoluteUrl(ogImage ?? DEFAULT_OG_IMAGE);
  const robots = noindex ? NOINDEX_ROBOTS : DEFAULT_ROBOTS;

  return (
    <Helmet>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
      <meta name="robots" content={robots} />
      {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}

      <meta property="og:site_name" content={DEFAULT_SITE_NAME} />
      <meta property="og:title" content={title} />
      {description ? <meta property="og:description" content={description} /> : null}
      {canonicalUrl ? <meta property="og:url" content={canonicalUrl} /> : null}
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={absoluteOgImage} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      {description ? (
        <meta name="twitter:description" content={description} />
      ) : null}
      <meta name="twitter:image" content={absoluteOgImage} />
    </Helmet>
  );
}
