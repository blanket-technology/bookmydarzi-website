"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { CatalogServiceLine } from "@/lib/types/catalog";

export interface FeaturedLine {
  line: CatalogServiceLine;
  categoryId: number;
}

const ROTATE_INTERVAL_MS = 5000;

// Auto-rotates through the featured lines the server picked (see
// pickFeaturedServiceLines in app/page.tsx) so the hero stays alive for a
// visitor sitting on the page, rather than a single static pick for the
// whole session. Client-only because it needs a timer; the actual line data
// still comes from the server-rendered catalog fetch, passed in as a prop -
// this component only owns which of those lines is currently showing.
export default function FeaturedHeroCard({ featured }: { featured: FeaturedLine[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (featured.length <= 1) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % featured.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [featured.length]);

  const current = featured[index];

  return (
    <div className="relative mx-auto w-full max-w-[520px]">
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c99a3d]/20 blur-2xl" />
      <div className="relative flex h-[420px] items-end overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#d7d0c5] via-[#a79e91] to-[#625d56] p-5 shadow-2xl md:h-[500px] md:p-7">
        {featured.map((f, i) => (
          f.line.image_url && (
            <Image
              key={f.line.id}
              src={f.line.image_url}
              alt={f.line.name}
              fill
              sizes="(min-width: 768px) 520px, 100vw"
              className={`object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
              priority={i === 0}
            />
          )
        ))}
        <div className="relative flex w-full items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Featured</p>
            <h2 className="text-lg font-black leading-tight">{current?.line.name ?? "Premium Stitching"}</h2>
            {current?.line.starting_price != null ? (
              <p className="mt-0.5 text-sm font-bold">
                <span className="mr-1 text-[10px] font-bold uppercase text-gray-400">From</span>
                ₹{current.line.starting_price.toLocaleString("en-IN")}
              </p>
            ) : (
              <p className="mt-0.5 text-sm font-bold">Price on request</p>
            )}
          </div>
          <Link
            href={current ? `/services/${current.categoryId}/${current.line.id}` : "/services"}
            className="shrink-0 rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-bold text-white"
          >
            Book now
          </Link>
        </div>
      </div>
      {featured.length > 1 && (
        <div className="mt-4 flex justify-center gap-1.5">
          {featured.map((f, i) => (
            <button
              key={f.line.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${f.line.name}`}
              aria-current={i === index}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-[#171717]" : "w-1.5 bg-black/15"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
