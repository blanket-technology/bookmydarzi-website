import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth-gated/transactional flows - nothing to rank, and letting
      // crawlers wander into checkout/cart wastes crawl budget on pages
      // that 404/redirect for an unauthenticated visitor anyway.
      disallow: [
        "/checkout",
        "/cart",
        "/orders",
        "/profile",
        "/notifications",
        "/login",
        "/signup",
        "/get-started",
        "/book-now",
        "/api/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
