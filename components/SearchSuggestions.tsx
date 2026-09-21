"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Loader2, SearchX, X } from "lucide-react";
import type { SearchEntry } from "@/lib/services/searchIndex";

// Amazon/Flipkart/Blinkit-style instant results panel: ranked results while
// typing, a "recent searches" view when the box is focused but empty, real
// loading/empty states, and full keyboard navigation (the parent owns
// highlightedIndex/onHighlight since arrow-key handling lives on the
// <input>, not in here).
export default function SearchSuggestions({
  results,
  query,
  loading,
  recentSearches,
  highlightedIndex,
  onHighlight,
  onSelect,
  onSelectRecent,
  onRemoveRecent,
}: {
  results: SearchEntry[];
  query: string;
  loading: boolean;
  recentSearches: string[];
  highlightedIndex: number;
  onHighlight: (index: number) => void;
  onSelect: () => void;
  onSelectRecent: (query: string) => void;
  onRemoveRecent: (query: string) => void;
}) {
  const trimmed = query.trim();

  // Nothing typed yet - show recent searches (if any), same as focusing the
  // Amazon/Flipkart search box with an empty query.
  if (!trimmed) {
    if (recentSearches.length === 0) return null;
    return (
      <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
        <div className="flex items-center justify-between px-4 pt-3.5">
          <p className="text-[11px] font-black uppercase tracking-wide text-gray-400">
            Recent searches
          </p>
        </div>
        <div className="p-2">
          {recentSearches.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onSelectRecent(q)}
              className="group flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-gray-50"
            >
              <Clock size={15} className="shrink-0 text-gray-300" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{q}</span>
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveRecent(q);
                }}
                className="shrink-0 rounded-full p-1 text-gray-300 opacity-0 transition hover:bg-gray-200 hover:text-gray-600 group-hover:opacity-100"
                aria-label={`Remove "${q}" from recent searches`}
              >
                <X size={13} />
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="absolute left-0 right-0 top-full z-40 mt-2 flex items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white py-10 text-sm text-gray-400 shadow-xl">
        <Loader2 size={16} className="animate-spin" />
        Searching…
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="absolute left-0 right-0 top-full z-40 mt-2 flex flex-col items-center gap-2 rounded-2xl border border-black/10 bg-white px-6 py-10 text-center shadow-xl">
        <SearchX size={22} className="text-gray-300" />
        <p className="text-sm font-semibold text-gray-600">
          No services match &ldquo;{trimmed}&rdquo;
        </p>
        <p className="text-xs text-gray-400">Try a different word, or browse all services.</p>
      </div>
    );
  }

  return (
    <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
      {results.map((entry, i) => {
        const highlighted = i === highlightedIndex;
        return (
          <Link
            key={entry.id}
            href={entry.href}
            onClick={onSelect}
            onMouseEnter={() => onHighlight(i)}
            className={`flex items-center gap-3 rounded-xl p-2.5 transition ${
              highlighted ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
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
        );
      })}
    </div>
  );
}
