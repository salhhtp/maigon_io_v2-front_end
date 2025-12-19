import { Helmet } from "react-helmet-async";
import { buildAbsoluteUrl, DEFAULT_SITE_NAME } from "@/utils/seo";

type JsonLd = Record<string, unknown>;

export function StructuredData({ data }: { data: JsonLd | JsonLd[] }) {
  const payload = Array.isArray(data) ? data : [data];

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(payload)}
      </script>
    </Helmet>
  );
}

type FAQItem = { question: string; answer: string };

export function buildFaqSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildOrganizationSchema({
  name = DEFAULT_SITE_NAME,
  url,
  logo,
  sameAs = [],
}: {
  name?: string;
  url: string;
  logo?: string;
  sameAs?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url: buildAbsoluteUrl(url),
    logo: logo ? buildAbsoluteUrl(logo) : undefined,
    sameAs: sameAs.filter(Boolean),
  };
}

export function buildProductSchema({
  name,
  description,
  url,
  logo,
  brand = DEFAULT_SITE_NAME,
}: {
  name: string;
  description: string;
  url: string;
  logo?: string;
  brand?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    brand,
    url: buildAbsoluteUrl(url),
    image: logo ? buildAbsoluteUrl(logo) : undefined,
  };
}

export function buildArticleSchema({
  headline,
  description,
  url,
  image,
  datePublished,
  dateModified,
  authorName = DEFAULT_SITE_NAME,
  publisherName = DEFAULT_SITE_NAME,
  publisherLogo,
}: {
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  publisherName?: string;
  publisherLogo?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url: buildAbsoluteUrl(url),
    image: image ? buildAbsoluteUrl(image) : undefined,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: publisherName,
      logo: publisherLogo
        ? {
            "@type": "ImageObject",
            url: buildAbsoluteUrl(publisherLogo),
          }
        : undefined,
    },
  };
}

export function buildBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.url),
    })),
  };
}

export function buildHowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: Array<{ name: string; url?: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step) => ({
      "@type": "HowToStep",
      name: step.name,
      url: step.url ? buildAbsoluteUrl(step.url) : undefined,
    })),
  };
}
