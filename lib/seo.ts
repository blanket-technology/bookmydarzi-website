// Site-wide SEO constants and structured-data (JSON-LD) builders.
//
// SITE_URL is the single source of truth for every canonical URL, sitemap
// entry, and absolute OG/Twitter image URL on the site - set
// NEXT_PUBLIC_SITE_URL once the production domain is live (falls back to a
// placeholder so nothing breaks before then, but sitemap.ts/robots.ts and
// every generateMetadata below all read from here, so fixing the domain in
// one place fixes it everywhere).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookmydarzi.com"
).replace(/\/$/, "");

export const SITE_NAME = "BookMyDarzi";
export const SITE_TAGLINE = "Perfect Fit, Delivered";

// Real, currently-served area only (see app/contact/page.tsx's own note) -
// never claim a wider footprint than what's actually live. Used both in
// on-page copy defaults and the LocalBusiness structured data below.
export const SERVICE_AREA = "Noida, Delhi NCR";
export const SERVICE_CITY = "Noida";
export const SERVICE_REGION = "Uttar Pradesh";
export const SERVICE_COUNTRY = "IN";

// No dedicated 1200x630 OG banner exists yet (only the square logo) - using
// the logo avoids referencing a file that doesn't exist, which would
// silently break every social-share preview. Swap this for a real wide OG
// image (add it to /public and point here) whenever one is designed - a
// square logo gets awkwardly cropped by most OG image renderers.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logo.png`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * LocalBusiness structured data - tells Google this is a real, local
 * service business (not a generic e-commerce store), which is what powers
 * the Knowledge Panel / local-pack eligibility for "tailor near me" type
 * queries. Rendered once on the homepage.
 */
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#business`,
    name: SITE_NAME,
    description:
      "Doorstep tailoring and alteration service - fabric picked up from your home, stitched by a verified tailor, and delivered back to your door.",
    url: SITE_URL,
    image: DEFAULT_OG_IMAGE,
    priceRange: "₹₹",
    areaServed: {
      "@type": "City",
      name: SERVICE_CITY,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: SERVICE_CITY,
      addressRegion: SERVICE_REGION,
      addressCountry: SERVICE_COUNTRY,
    },
  };
}

/**
 * BreadcrumbList structured data - lets Google render the breadcrumb trail
 * directly in search results instead of a raw URL, and reinforces the
 * category -> service line -> tier hierarchy for crawling.
 */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Service structured data for a bookable tailoring service/tier - lets
 * Google show price + provider directly in results for a specific service
 * page (e.g. "Designer Blazer Stitching").
 */
export function serviceJsonLd(opts: {
  name: string;
  description: string;
  path: string;
  imageUrl?: string | null;
  price: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: opts.name,
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    image: opts.imageUrl || undefined,
    areaServed: {
      "@type": "City",
      name: SERVICE_CITY,
    },
    provider: {
      "@type": "LocalBusiness",
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: {
      "@type": "Offer",
      price: opts.price,
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
  };
}

/**
 * FAQPage structured data - qualifies the FAQ page for a rich "People also
 * ask"-style result. Pass the same Q&A list already rendered on the page.
 */
export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}
