import type { CatalogCategory } from "@/lib/types/catalog";

// Flat, rankable search index built once from the already-fetched catalog
// tree - no extra network call, no new backend endpoint. Every tier and
// every direct service becomes one indexed entry pointing at its real
// product page, since that's what a search result should actually land on
// (not the parent line/category, which is one click short of bookable).
export interface SearchEntry {
  id: string;
  name: string;
  categoryName: string;
  lineName: string | null;
  description: string;
  price: number;
  imageUrl: string | null;
  href: string;
}

export function buildSearchIndex(categories: CatalogCategory[]): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const category of categories) {
    for (const line of category.service_lines) {
      for (const tier of line.stitching_types) {
        entries.push({
          id: `tier-${tier.service_id}`,
          name: tier.name,
          categoryName: category.name,
          lineName: line.name,
          description: tier.description ?? "",
          price: tier.base_price,
          imageUrl: tier.image_url ?? line.image_url ?? null,
          href: `/services/${category.id}/${line.id}/${tier.service_id}`,
        });
      }
      // A line with no tiers yet (still being catalogued) is still a real,
      // navigable product page - index it too so search never goes silent
      // on a category that's mid-setup.
      if (line.stitching_types.length === 0) {
        entries.push({
          id: `line-${line.id}`,
          name: line.name,
          categoryName: category.name,
          lineName: null,
          description: line.description ?? "",
          price: line.starting_price ?? 0,
          imageUrl: line.image_url ?? null,
          href: `/services/${category.id}/${line.id}`,
        });
      }
    }
    for (const service of category.direct_services) {
      entries.push({
        id: `direct-${service.service_id}`,
        name: service.name,
        categoryName: category.name,
        lineName: null,
        description: service.description ?? "",
        price: service.base_price,
        imageUrl: service.image_url ?? null,
        href: `/services/${category.id}/${service.service_id}`,
      });
    }
  }

  return entries;
}

// Amazon/Facebook-style ranking, not a plain substring filter: an exact
// name match beats a name-prefix match, which beats a name-contains match,
// which beats a hit only in the description/category/line text - so typing
// "kurta" surfaces the Kurta tiers before some unrelated line whose long
// description happens to mention "kurta" once in passing.
export function searchEntries(index: SearchEntry[], rawQuery: string, limit = 8): SearchEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const scored: { entry: SearchEntry; score: number }[] = [];

  for (const entry of index) {
    const name = entry.name.toLowerCase();
    const haystack = `${entry.categoryName} ${entry.lineName ?? ""} ${entry.description}`.toLowerCase();

    let score = 0;
    if (name === query) score = 100;
    else if (name.startsWith(query)) score = 80;
    else if (name.includes(query)) score = 60;
    else if (haystack.includes(query)) score = 20;
    else {
      // Token-level match: "cotton kurta" should still find "Kurta - Cotton"
      // even though neither string contains the other as a substring.
      const queryTokens = query.split(/\s+/).filter(Boolean);
      const nameTokens = name.split(/\s+/);
      const hitCount = queryTokens.filter((qt) => nameTokens.some((nt) => nt.startsWith(qt))).length;
      if (hitCount > 0 && hitCount === queryTokens.length) score = 40;
    }

    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((s) => s.entry);
}
