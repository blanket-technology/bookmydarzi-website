"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Small "recent searches" memory, same localStorage-persisted zustand
// pattern as lib/guestCart.ts - shown when the search box is focused with
// no query typed yet, matching Amazon/Flipkart/Blinkit's own search UX.
const MAX_RECENT = 6;

interface RecentSearchesState {
  queries: string[];
  add: (query: string) => void;
  remove: (query: string) => void;
  clear: () => void;
}

export const useRecentSearches = create<RecentSearchesState>()(
  persist(
    (set) => ({
      queries: [],
      add: (query) =>
        set((state) => {
          const trimmed = query.trim();
          if (!trimmed) return state;
          const deduped = state.queries.filter(
            (q) => q.toLowerCase() !== trimmed.toLowerCase(),
          );
          return { queries: [trimmed, ...deduped].slice(0, MAX_RECENT) };
        }),
      remove: (query) =>
        set((state) => ({ queries: state.queries.filter((q) => q !== query) })),
      clear: () => set({ queries: [] }),
    }),
    { name: "bmd:recent-searches" },
  ),
);
