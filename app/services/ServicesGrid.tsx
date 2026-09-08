"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, ArrowRight } from "lucide-react";
import ZoomableImage from "@/components/ZoomableImage";
import type { CatalogCategory, CatalogServiceLine } from "@/lib/types/catalog";

const CARD_BACKGROUNDS = [
  "from-stone-200 to-stone-300",
  "from-slate-200 to-slate-300",
  "from-amber-100 to-stone-200",
  "from-zinc-200 to-neutral-300",
  "from-rose-100 to-stone-200",
  "from-neutral-200 to-stone-300",
];

interface FlatLine {
  line: CatalogServiceLine;
  categoryId: number;
  categoryName: string;
}

export default function ServicesGrid({ categories }: { categories: CatalogCategory[] }) {
  const searchParams = useSearchParams();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  // Seed the search box from ?q= when arriving via the header search (e.g.
  // /services?q=blouse) - only on mount, so it doesn't fight the user's own
  // typing afterwards.
  useEffect(() => {
    const initial = searchParams.get("q");
    if (initial) setQ(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flatLines = useMemo<FlatLine[]>(
    () =>
      categories.flatMap((category) =>
        [...category.service_lines]
          .sort((a, b) => a.display_order - b.display_order)
          .map((line) => ({ line, categoryId: category.id, categoryName: category.name })),
      ),
    [categories],
  );

  const categoryNames = useMemo(
    () => ["All", ...categories.map((c) => c.name)],
    [categories],
  );

  const filtered = flatLines.filter(
    (x) =>
      (cat === "All" || x.categoryName === cat) &&
      x.line.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <div className="mt-8 max-w-2xl">
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3">
          <Search size={18} className="text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search services..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {categoryNames.map((name) => (
          <button
            key={name}
            onClick={() => setCat(name)}
            className={`rounded-full px-5 py-2.5 text-sm font-bold ${
              cat === name ? "bg-[#171717] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <SlidersHorizontal className="mr-1 inline" size={14} />
            {name}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-sm text-gray-500">
          No services match your search.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {filtered.map(({ line, categoryId, categoryName }, i) => (
            <ServiceCard
              key={line.id}
              line={line}
              categoryId={categoryId}
              categoryName={categoryName}
              index={i}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ServiceCard({
  line,
  categoryId,
  categoryName,
  index,
}: {
  line: CatalogServiceLine;
  categoryId: number;
  categoryName: string;
  index: number;
}) {
  // A handful of catalog rows have an image_url pointing at a backend
  // /static/ asset that was never actually uploaded (confirmed 404s on
  // e.g. mens-sherwani.png) - previously this silently rendered as a
  // broken-image icon with no fallback, unlike every other card without
  // an image_url at all, which gets the branded gradient placeholder.
  const [imgError, setImgError] = useState(false);
  const showImage = line.image_url && !imgError;

  return (
    <Link
      href={`/services/${categoryId}/${line.id}`}
      className="group overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl sm:rounded-3xl"
    >
      {showImage ? (
        <div className="relative m-2 h-28 w-[calc(100%-1rem)] overflow-hidden rounded-xl sm:m-3 sm:h-52 sm:w-[calc(100%-1.5rem)] sm:rounded-2xl">
          <ZoomableImage
            src={line.image_url!}
            alt={line.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 50vw"
            className="object-cover"
            loading={index < 4 ? "eager" : "lazy"}
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div
          className={`m-2 flex h-28 items-end rounded-xl bg-gradient-to-br ${CARD_BACKGROUNDS[index % CARD_BACKGROUNDS.length]} p-2.5 sm:m-3 sm:h-52 sm:rounded-2xl sm:p-4`}
        >
          <span className="rounded-full bg-white/90 px-2 py-1 text-[9px] font-black uppercase tracking-wider sm:px-3 sm:py-1.5 sm:text-[10px]">
            {categoryName}
          </span>
        </div>
      )}
      <div className="p-3 pt-1.5 sm:p-5 sm:pt-2">
        <h2 className="text-sm font-black leading-tight sm:text-xl">{line.name}</h2>
        <p className="mt-1 hidden text-sm leading-6 text-gray-500 sm:mt-2 sm:block sm:min-h-12">
          {line.description || `Professional ${line.name.toLowerCase()} with custom measurements.`}
        </p>
        <div className="mt-2 flex items-center justify-between sm:mt-5">
          <div>
            {line.starting_price != null ? (
              <>
                <p className="text-[8px] font-bold uppercase tracking-wide text-gray-400 sm:text-[10px]">
                  From
                </p>
                <span className="text-base font-black sm:text-2xl">
                  ₹{line.starting_price.toLocaleString("en-IN")}
                </span>
              </>
            ) : (
              <span className="text-sm font-black sm:text-2xl">On request</span>
            )}
          </div>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gray-100 group-hover:bg-[#171717] group-hover:text-white sm:h-10 sm:w-10">
            <ArrowRight size={14} className="sm:hidden" />
            <ArrowRight size={17} className="hidden sm:block" />
          </span>
        </div>
      </div>
    </Link>
  );
}
