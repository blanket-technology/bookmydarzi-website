"use client";

import { useEffect, useState } from "react";
import type { SearchEntry } from "@/lib/services/searchIndex";

// Fetched once per browser session (module-level cache, not per-component
// state) - the same small index backs both the header's live dropdown and
// the /services results page, and the catalog barely changes minute to
// minute, so there's no reason for every mounted search box to refetch it.
let cachedIndex: SearchEntry[] | null = null;
let inFlight: Promise<SearchEntry[]> | null = null;

function fetchIndex(): Promise<SearchEntry[]> {
  if (cachedIndex) return Promise.resolve(cachedIndex);
  if (inFlight) return inFlight;
  const promise: Promise<SearchEntry[]> = fetch("/api/catalog/search")
    .then((res) => (res.ok ? res.json() : { index: [] }))
    .then((data: { index?: SearchEntry[] }) => {
      const result = data.index ?? [];
      cachedIndex = result;
      return result;
    })
    .catch(() => [] as SearchEntry[])
    .finally(() => {
      inFlight = null;
    });
  inFlight = promise;
  return promise;
}

export function useSearchIndex(): SearchEntry[] {
  const [index, setIndex] = useState<SearchEntry[]>(cachedIndex ?? []);

  useEffect(() => {
    if (cachedIndex) return;
    fetchIndex().then(setIndex);
  }, []);

  return index;
}
