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

// Bug fix: Custom Alterations rendered as one undifferentiated list -
// gender/garment-type was only ever a free-text prefix in each line's own
// Name ("Men Shirt Alteration", "Women Blouse Alteration"), never a real
// structural grouping the frontend could key off. GroupLabel (added on
// ServiceLine specifically for this) gives a real field to group by -
// ungrouped lines (group_label null) are kept together under "More
// Services" at the end rather than silently dropped, since admin hasn't
// necessarily labeled every line yet.
const UNGROUPED_LABEL = "More Services";
function groupLinesByLabel(lines: FeaturedLine[]): { label: string; lines: FeaturedLine[] }[] {
  const order: string[] = [];
  const byLabel = new Map<string, FeaturedLine[]>();
  for (const item of lines) {
    const label = item.line.group_label?.trim() || UNGROUPED_LABEL;
    if (!byLabel.has(label)) {
      order.push(label);
      byLabel.set(label, []);
    }
    byLabel.get(label)!.push(item);
  }
  // Ungrouped lines render last regardless of where they first appeared in
  // display_order, so a handful of not-yet-labeled lines don't fragment the
  // grouped sections around them.
  const labels = [...order.filter((l) => l !== UNGROUPED_LABEL), ...(byLabel.has(UNGROUPED_LABEL) ? [UNGROUPED_LABEL] : [])];
  return labels.map((label) => ({ label, lines: byLabel.get(label)! }));
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
  const alterationGroups = groupLinesByLabel(alterationLines);
  // Hero rotator stays small (image-crossfade + one dot per item) even
  // though the grid below now shows every Custom Alterations line.
  const featured = alterationLines.slice(0, 3);
  const testimonials = await getTestimonials();


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
        {alterationGroups.map((group, groupIndex) => (
          <div key={group.label} className={groupIndex > 0 ? "mt-10" : "mt-8"}>
            {alterationGroups.length > 1 ? (
              <h3 className="mb-4 text-lg font-black text-ink">{group.label}</h3>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {group.lines.map(({ line, categoryId }, i) => (
                <ScrollReveal key={line.id} delay={i * 90}>
                <Link
                  href={`/services/${categoryId}/${line.id}`}
                  className="hover-lift group block rounded-3xl border border-black/5 bg-white p-3 shadow-sm hover:shadow-xl"
                >
                  {/* Bug fix: this was changed to aspect-[3/2] on the incorrect
                      assumption that uploaded catalog images are 3:2, not
                      square - every image actually checked (1254x1254,
                      1433x1433) is a clean 1:1 square, which the admin
                      catalog-image upload tool enforces via a mandatory 1:1
                      crop step (final/src/components/common/ImageCropModal.jsx,
                      aspect={1}) specifically so every surface renders the same
                      square framing. Matches the admin tool's actual output
                      instead of a guess at it; kept in sync with the same fix
                      on /services' ServicesGrid.tsx.

                      Also dropped ParallaxImage's scale-110 wrapper here: that
                      10% overscan (headroom for the vertical parallax tween to
                      shift the image without revealing empty space at the
                      edges) was itself clipping these specific images, which
                      are two-panel garment-photo + numbered-instructions
                      composites that fill their square canvas edge to edge -
                      unlike a typical photo, there's no slack to crop into
                      here. A still image shows the catalog accurately; the
                      parallax effect was never load-bearing on these cards. */}
                  {line.image_url ? (
                    <div className="relative aspect-square w-full overflow-hidden rounded-2xl">
                      <Image
                        src={line.image_url}
                        alt={line.name}
                        fill
                        sizes="(min-width: 768px) 33vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div
                      className={`flex aspect-[3/2] items-end rounded-2xl bg-gradient-to-br ${CARD_BACKGROUNDS[i % CARD_BACKGROUNDS.length]} p-5`}
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
          </div>
        ))}
      </section>

      <ProcessScrollytelling />

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
