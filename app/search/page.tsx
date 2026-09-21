"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SearchX, Loader2 } from "lucide-react";
import { useSearchIndex } from "@/lib/services/useSearchIndex";
import { searchEntries } from "@/lib/services/searchIndex";
import { useRecentSearches } from "@/lib/recentSearches";

// Dedicated results page (Amazon/Flipkart/Blinkit land you on a real page
// after you hit Enter, not a dropdown that vanishes on the next click) -
// shares the exact same ranked, typo-tolerant index as the header's live
// suggestions (lib/services/searchIndex.ts), so what you see while typing
// and what you land on after submitting never disagree.
function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";
  const [q, setQ] = useState(initialQuery);
  const searchIndex = useSearchIndex();
  const addRecentSearch = useRecentSearches((s) => s.add);

  const loading = searchIndex.length === 0;
  // Full result set, not the 8-row dropdown cap - a results page should
  // actually show everything that matches, not just the top handful.
  const results = useMemo(
    () => searchEntries(searchIndex, q, 200),
    [searchIndex, q],
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) addRecentSearch(trimmed);
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
      <form onSubmit={handleSubmit} className="mx-auto flex max-w-2xl items-center gap-2 rounded-full border border-black/10 bg-gray-50 px-4 py-2.5 transition-colors focus-within:border-[#171717] focus-within:bg-white focus-within:shadow-sm">
        <Search size={18} className="shrink-0 text-gray-400" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for shirt alteration, blouse stitching…"
          aria-label="Search services"
          autoComplete="off"
          className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
        />
        <button
          type="submit"
          aria-label="Submit search"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white hover:bg-black"
        >
          <Search size={15} />
        </button>
      </form>

      <div className="mt-8">
        {q.trim() && (
          <p className="mb-5 text-sm text-gray-500">
            {loading
              ? "Searching…"
              : `${results.length} result${results.length === 1 ? "" : "s"} for “${q.trim()}”`}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-24 text-gray-400">
            <Loader2 size={22} className="animate-spin" />
            <p className="text-sm">Loading services…</p>
          </div>
        ) : !q.trim() ? (
          <p className="py-24 text-center text-sm text-gray-400">
            Search for a service to get started.
          </p>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <SearchX size={28} className="text-gray-300" />
            <p className="text-sm font-semibold text-gray-600">
              No services match &ldquo;{q.trim()}&rdquo;
            </p>
            <p className="max-w-xs text-xs text-gray-400">
              Try a different word or check the spelling, or{" "}
              <Link href="/services" className="font-semibold text-[#c99a3d] underline">
                browse all services
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {results.map((entry) => (
              <Link
                key={entry.id}
                href={entry.href}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-stone-200 to-stone-300">
                  {entry.imageUrl && (
                    <Image
                      src={entry.imageUrl}
                      alt={entry.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
                    {entry.lineName ? `${entry.categoryName} · ${entry.lineName}` : entry.categoryName}
                  </p>
                  <h2 className="mt-0.5 text-sm font-black leading-tight sm:text-base">{entry.name}</h2>
                  {entry.price > 0 && (
                    <span className="mt-auto pt-2 text-sm font-black text-gold-deep sm:text-base">
                      ₹{entry.price.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchResults />
    </Suspense>
  );
}
