import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getCatalogTree } from "@/lib/services/catalog";
import type { CatalogServiceLine } from "@/lib/types/catalog";
import { getTestimonials } from "@/lib/services/testimonials";
import { TRUST_SIGNALS } from "@/lib/trustContent";
import ScrollReveal from "@/components/ScrollReveal";
import HeroPinned from "@/components/homepage-motion/HeroPinned";
import ProcessScrollytelling from "@/components/homepage-motion/ProcessScrollytelling";
import ParallaxImage from "@/components/homepage-motion/ParallaxImage";

export const metadata: Metadata = {
  title: "Doorstep Tailoring & Alterations in Delhi NCR",
  description:
    "Book professional tailoring and alteration services online. Fabric picked up from your home in Noida & Delhi NCR, stitched by a verified tailor, delivered back to your door.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "BookMyDarzi - Doorstep Tailoring & Alterations",
    description: "Fabric picked up, stitched by a verified tailor, delivered back to your door.",
    url: "/",
  },
};

const CARD_BACKGROUNDS = [
  "from-stone-200 to-stone-300",
  "from-slate-200 to-slate-300",
  "from-amber-100 to-stone-200",
];

interface FeaturedLine {
  line: CatalogServiceLine;
  categoryId: number;
}

// Business is launching on Custom Alterations only - the homepage should
// showcase that category specifically, not whatever category happens to
// sort first in the catalog tree (same "Custom Alterations" match used to
// gate grouping on the line page, app/services/[categoryId]/[lineId]/page.tsx).
// Falls back to the first category with any lines only if Custom Alterations
// isn't in the catalog yet, so the homepage never renders an empty section.
function getCustomAlterationsLines(
  categories: Awaited<ReturnType<typeof getCatalogTree>>["categories"],
): FeaturedLine[] {
  const category =
    categories.find((c) => c.name === "Custom Alterations" && c.service_lines.length > 0) ??
    categories.find((c) => c.service_lines.length > 0);
  if (!category) return [];
  const sorted = [...category.service_lines].sort((a, b) => a.display_order - b.display_order);
  // The hero uses featured[0] as a large photo card - a line with no
  // image_url leaves that card empty even though other lines in the same
  // category have real photos. Put an image-bearing line first so the hero
  // always has a photo to show when the catalog has one available at all;
  // the rest keep their normal display order behind it.
  const withImage = sorted.find((l) => l.image_url);
  const ordered = withImage ? [withImage, ...sorted.filter((l) => l !== withImage)] : sorted;
  return ordered.map((line) => ({ line, categoryId: category.id }));
}

export default async function Home() {
  const { categories } = await getCatalogTree();
  const alterationLines = getCustomAlterationsLines(categories);
  // Hero rotator stays small (image-crossfade + one dot per item) even
  // though the grid below now shows every Custom Alterations line.
  const featured = alterationLines.slice(0, 3);
  const testimonials = await getTestimonials();

  // ProcessScrollytelling crossfades through 5 real photos, one per step -
  // reuses the same image-bearing lines already fetched for the hero/grid
  // rather than a second catalog query. Cycles through whatever
  // image-bearing lines exist if there are fewer than 5 (always true today
  // given the current catalog), so the section never shows fewer photos
  // than steps.
  const imageBearing = alterationLines.filter((l) => l.line.image_url);
  const processImages =
    imageBearing.length > 0
      ? Array.from({ length: 5 }, (_, i) => {
          const l = imageBearing[i % imageBearing.length];
          return { url: l.line.image_url!, alt: l.line.name };
        })
      : [];

  return (
    <main>
      <HeroPinned featured={featured} />

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">
              Custom Alterations
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Repairs, resizing & restyling
            </h2>
          </div>
          <Link href="/services" className="hidden text-sm font-bold md:block">
            View all services <ArrowRight className="ml-1 inline" size={15} />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {alterationLines.map(({ line, categoryId }, i) => (
            <ScrollReveal key={line.id} delay={i * 90}>
            <Link
              href={`/services/${categoryId}/${line.id}`}
              className="hover-lift group block rounded-3xl border border-black/5 bg-white p-3 shadow-sm hover:shadow-xl"
            >
              {/* aspect-square + object-cover, not a fixed h-64 - the
                  catalog's photos are a genuine mix of portrait/landscape
                  shots (checked across the real data), so a fixed-height
                  wide box crops some of them oddly (e.g. a pair of trousers
                  shot portrait). Square is the best universal crop target
                  across that mix, same fix already applied on /services. */}
              {line.image_url ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                  <ParallaxImage strength={14} className="absolute inset-0 scale-110">
                    <Image
                      src={line.image_url}
                      alt={line.name}
                      fill
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </ParallaxImage>
                </div>
              ) : (
                <div
                  className={`flex aspect-square items-end rounded-2xl bg-gradient-to-br ${CARD_BACKGROUNDS[i % CARD_BACKGROUNDS.length]} p-5`}
                >
                  <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                    Popular
                  </span>
                </div>
              )}
              <div className="flex items-end justify-between p-4">
                <div>
                  <h3 className="text-xl font-black">{line.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {line.starting_price != null
                      ? `Starting from ₹${line.starting_price.toLocaleString("en-IN")}`
                      : "Price on request"}
                  </p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 transition-colors group-hover:bg-[#171717] group-hover:text-white">
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <ProcessScrollytelling images={processImages} />

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">
          Why BookMyDarzi
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          Built for trust, start to finish.
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_SIGNALS.map(({ icon: Icon, title, desc }, i) => (
            <ScrollReveal
              key={title}
              delay={i * 80}
              className="hover-lift rounded-3xl border border-black/5 bg-white p-6 shadow-sm hover:shadow-xl"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#171717] text-[#c99a3d]">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="bg-[#f8f6f1]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black tracking-[.1em] text-[#b4832e]">
            Real reviews, Delhi NCR
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            What our customers say
          </h2>
          {testimonials.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <ScrollReveal
                  key={`${t.name}-${i}`}
                  delay={i * 90}
                  className="hover-lift rounded-3xl border border-black/5 bg-white p-6 shadow-sm hover:shadow-lg"
                >
                  <p className="max-w-[32ch] text-sm leading-6 text-gray-600">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171717] text-sm font-black text-white">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      {t.location && <p className="text-xs text-gray-400">{t.location}</p>}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-3xl border border-dashed border-black/10 bg-white/60 p-8 text-center">
              <p className="text-sm font-semibold text-gray-600">
                We&apos;re just getting started - be one of our first reviews.
              </p>
              <p className="mt-1.5 text-xs text-gray-400">
                
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
