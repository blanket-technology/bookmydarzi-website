import type { MetadataRoute } from "next";
import { getCatalogTree } from "@/lib/services/catalog";
import { SITE_URL } from "@/lib/seo";

// Static, low-value-churn pages. Auth-gated/transactional pages (login,
// signup, checkout, cart, orders, profile, notifications) are deliberately
// excluded - nothing for a search engine to rank there, and indexing a
// checkout/cart URL just wastes crawl budget.
const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/services", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Best-effort: the catalog tree is a live backend call, and a transient
  // failure here must not break the whole sitemap (and therefore crawling
  // of the static pages above) - fall back to just the static routes.
  try {
    const { categories } = await getCatalogTree();
    for (const category of categories) {
      for (const line of category.service_lines) {
        entries.push({
          url: `${SITE_URL}/services/${category.id}/${line.id}`,
          changeFrequency: "weekly",
          priority: 0.8,
        });
        for (const tier of line.stitching_types) {
          if (!tier.is_active) continue;
          entries.push({
            url: `${SITE_URL}/services/${category.id}/${line.id}/${tier.service_id}`,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    // Static routes above still get returned.
  }

  return entries;
}
