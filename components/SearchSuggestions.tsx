"use client";

import Image from "next/image";
import Link from "next/link";
import type { SearchEntry } from "@/lib/services/searchIndex";

// Amazon/Facebook-style instant results dropdown: a short, ranked list that
// appears under a search box while typing, each row jumping straight to the
// product (not a results-list page) - the header search previously only
// ever redirected to /services?q=... on submit, with nothing shown while
// typing at all.
export default function SearchSuggestions({
  results,
  query,
  onSelect,
}: {
  results: SearchEntry[];
  query: string;
  onSelect: () => void;
}) {
  if (!query.trim()) return null;

  if (results.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full mt-2 rounded-2xl border border-black/10 bg-white p-4 text-sm text-gray-500 shadow-xl">
        No services match &ldquo;{query}&rdquo;.
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
      {results.map((entry) => (
        <Link
          key={entry.id}
          href={entry.href}
          onClick={onSelect}
          className="flex items-center gap-3 rounded-xl p-2.5 transition hover:bg-gray-50"
        >
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-stone-200 to-stone-300">
            {entry.imageUrl && (
              <Image src={entry.imageUrl} alt={entry.name} fill sizes="44px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{entry.name}</p>
            <p className="truncate text-xs text-gray-400">
              {entry.lineName ? `${entry.categoryName} · ${entry.lineName}` : entry.categoryName}
            </p>
          </div>
          {entry.price > 0 && (
            <span className="shrink-0 text-sm font-black text-gold-deep">
              ₹{entry.price.toLocaleString("en-IN")}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
