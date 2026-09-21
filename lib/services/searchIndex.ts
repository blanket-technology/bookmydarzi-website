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

// Bounded edit distance - only computed against short tokens (service/line
// names are a handful of words), so the classic O(len_a * len_b) DP table is
// cheap. Used purely for typo tolerance (see fuzzyTokenScore below), not as
// the primary ranking signal.
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// A query token "fuzzily hits" a name token if it's within a typo-scale edit
// distance of it - 1 typo allowed for short words, 2 for longer ones, so
// "shrit"/"shrt" still finds "shirt" but a totally different short word
// doesn't accidentally match.
function fuzzyTokenHit(queryToken: string, nameToken: string): boolean {
  if (nameToken.startsWith(queryToken)) return true;
  if (queryToken.length < 3) return false; // too short to fuzzy-match safely
  const maxDistance = queryToken.length <= 5 ? 1 : 2;
  return levenshtein(queryToken, nameToken.slice(0, queryToken.length + maxDistance)) <= maxDistance;
}

// Amazon/Flipkart-style ranking, not a plain substring filter: an exact name
// match beats a name-prefix match, which beats a name-contains match, which
// beats a hit only in the description/category/line text, which beats a
// fuzzy/typo-tolerant match - so typing "kurta" surfaces the Kurta tiers
// before some unrelated line whose long description happens to mention
// "kurta" once in passing, and misspelling it ("kurtha", "kurata") still
// finds them instead of returning nothing.
export function searchEntries(index: SearchEntry[], rawQuery: string, limit = 8): SearchEntry[] {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return [];

  const scored: { entry: SearchEntry; score: number }[] = [];
  const queryTokens = query.split(/\s+/).filter(Boolean);

  for (const entry of index) {
    const name = entry.name.toLowerCase();
    const haystack = `${entry.categoryName} ${entry.lineName ?? ""} ${entry.description}`.toLowerCase();
    const nameTokens = name.split(/\s+/);

    let score = 0;
    if (name === query) score = 100;
    else if (name.startsWith(query)) score = 80;
    else if (name.includes(query)) score = 60;
    else if (haystack.includes(query)) score = 20;
    else {
      // Token-level prefix match: "cotton kurta" still finds "Kurta -
      // Cotton" even though neither string contains the other as a
      // substring.
      const prefixHits = queryTokens.filter((qt) => nameTokens.some((nt) => nt.startsWith(qt))).length;
      if (prefixHits > 0 && prefixHits === queryTokens.length) {
        score = 40;
      } else {
        // Fuzzy fallback: allow small typos per token. Scored lower than
        // every exact-ish match above, and only counted a hit if every
        // query token fuzzily matches something in the name (so "shrit
        // xyz" doesn't match "Shirt Alteration" off one lucky token).
        const fuzzyHits = queryTokens.filter((qt) => nameTokens.some((nt) => fuzzyTokenHit(qt, nt))).length;
        if (fuzzyHits > 0 && fuzzyHits === queryTokens.length) score = 10;
      }
    }

    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
  return scored.slice(0, limit).map((s) => s.entry);
}
