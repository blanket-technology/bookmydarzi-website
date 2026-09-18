import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Hammer,
  RefreshCcw,
  Ruler,
  Sparkles,
  ShieldCheck,
  Truck,
  Wand2,
} from "lucide-react";
import HoverZoomImage from "@/components/HoverZoomImage";
import { getCatalogTree } from "@/lib/services/catalog";
import type { CatalogStitchingType } from "@/lib/types/catalog";
import { breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from "@/lib/seo";
import { fallbackTierDescription } from "@/lib/services/fallbackDescription";
import {
  GROUP_DESCRIPTIONS,
  groupAlterationTiers,
  type AlterationGroup,
} from "@/lib/services/alterationGroups";

type LinePageParams = { categoryId: string; lineId: string };

async function findLine(categoryId: string, lineId: string) {
  const { categories } = await getCatalogTree();
  const category = categories.find((c) => String(c.id) === categoryId);
  const line = category?.service_lines.find((l) => String(l.id) === lineId);
  return { category, line };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LinePageParams>;
}): Promise<Metadata> {
  const { categoryId, lineId } = await params;
  const { category, line } = await findLine(categoryId, lineId);
  if (!category || !line) return {};

  const title = `${line.name} - ${category.name}`;
  const description =
    line.description ||
    `Book ${line.name.toLowerCase()} in Noida & Delhi NCR. Fabric picked up from your door, stitched by a verified tailor${
      line.starting_price != null ? `, starting from ₹${line.starting_price.toLocaleString("en-IN")}` : ""
    }.`;
  const path = `/services/${category.id}/${line.id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      images: line.image_url ? [{ url: line.image_url }] : undefined,
    },
  };
}

// No dedicated single-service-line endpoint exists on the backend (verified
// against app/api/v1/endpoints/catalog.py) - only /categories/tree and
// /categories/{id}. Fetching the tree and locating the line by id matches
// what the tree already gives us and keeps this in one round trip.
export default async function ServiceLineDetailPage({
  params,
}: {
  params: Promise<LinePageParams>;
}) {
  const { categoryId, lineId } = await params;
  const { category, line } = await findLine(categoryId, lineId);

  if (!category || !line) {
    notFound();
  }

  const stitchingTypes = [...line.stitching_types].sort(
    (a, b) => a.display_order - b.display_order,
  );
  const cheapest = stitchingTypes.reduce<CatalogStitchingType | null>(
    (min, t) => (min === null || t.base_price < min.base_price ? t : min),
    null,
  );
  const fastestDays = stitchingTypes.length
    ? Math.min(...stitchingTypes.map((t) => t.estimated_delivery_days))
    : null;
  // Only group by type on a genuine Custom Alterations line, and only when
  // grouping actually produces more than one bucket - a single-group result
  // (or a plain stitching line like "Shirts" under Men Clothing, whose tiers
  // are "Normal Stitching"/"Designer Stitching", not repair/resize work)
  // would just add a redundant header over the same flat list.
  const alterationGroups =
    category.name === "Custom Alterations" ? groupAlterationTiers(stitchingTypes) : [];
  const showGroups = alterationGroups.length > 1;
  // Fall through to any real photo we have for this product, rather than
  // showing the branded placeholder just because this specific line has no
  // image of its own - a sibling line/service in the same category almost
  // always has a representative shot, and that's a better hero than a
  // gradient card with the category name on it.
  const heroImage =
    line.image_url ??
    stitchingTypes.find((t) => t.image_url)?.image_url ??
    category.service_lines.find((l) => l.image_url)?.image_url ??
    category.direct_services.find((s) => s.image_url)?.image_url ??
    category.image_url ??
    null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: category.name, path: `/services/${category.id}/${line.id}` },
            ]),
            serviceJsonLd({
              name: line.name,
              description: line.description || `Book ${line.name} in Noida & Delhi NCR.`,
              path: `/services/${category.id}/${line.id}`,
              imageUrl: heroImage,
              price: cheapest?.base_price ?? line.starting_price ?? 0,
            }),
          ]),
        }}
      />
      <nav className="text-xs font-semibold text-gray-500">
        <Link href="/services" className="hover:text-gold-deep">
          Services
        </Link>{" "}
        / <span className="text-gray-400">{category.name}</span> /{" "}
        <span className="text-ink">{line.name}</span>
      </nav>

      <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
        <div>
          {heroImage ? (
            // Catalog product photography is genuinely mixed - some shots
            // are portrait, most are wide landscape (checked across the
            // real catalog: ratios from 0.67 to 2.21). No single fixed
            // ratio fills every photo with zero margin; a square box
            // minimizes the average empty space across that mix better
            // than either extreme.
            <HoverZoomImage
              src={heroImage}
              alt={line.name}
              priority
              className="aspect-square w-full max-w-md rounded-3xl border border-black/5"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-md items-end rounded-3xl bg-gradient-to-br from-stone-200 to-stone-300 p-6">
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                {category.name}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
            {category.name}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{line.name}</h1>
          {line.description ? (
            <p className="mt-4 text-base leading-7 text-gray-600">{line.description}</p>
          ) : (
            <p className="mt-4 text-base leading-7 text-gray-600">
              Professional {line.name.toLowerCase()}, stitched to your exact measurements by a
              verified tailor and delivered back to your door.
            </p>
          )}

          {(cheapest || fastestDays != null) && (
            <div className="mt-6 flex items-stretch divide-x divide-black/10 overflow-hidden rounded-3xl border border-black/5 bg-cream">
              {cheapest && (
                <div className="flex-1 px-6 py-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Starting from
                  </p>
                  <p className="mt-1 text-4xl font-black tracking-tight text-ink">
                    ₹{cheapest.base_price.toLocaleString("en-IN")}
                  </p>
                </div>
              )}
              {fastestDays != null && (
                <div className="flex flex-1 flex-col justify-center gap-1.5 px-6 py-5">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-gold-deep">
                    <Clock3 size={16} />
                  </span>
                  <p className="text-sm font-bold text-ink">
                    {fastestDays} day{fastestDays === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs font-semibold text-gray-500">Fastest delivery</p>
                </div>
              )}
            </div>
          )}

          {/* Below pricing (not above it) - reassurance signals a buyer
              checks after seeing the price, matching the tier detail
              page's layout for the same 4 cards. */}
          <div className="mt-8 border-t border-black/5 pt-6">
            <p className="text-xs font-black uppercase tracking-wide text-gray-400">
              What's included
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-start gap-2.5 rounded-2xl border border-black/5 bg-cream p-4">
                <Truck size={16} className="mt-0.5 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-xs font-black">Free pickup</p>
                  <p className="text-[11px] text-gray-500">Fabric collected from your door</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-black/5 bg-cream p-4">
                <BadgeCheck size={16} className="mt-0.5 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-xs font-black">Verified tailor</p>
                  <p className="text-[11px] text-gray-500">Background-checked & skill-vetted</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-black/5 bg-cream p-4">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-xs font-black">Tracked order</p>
                  <p className="text-[11px] text-gray-500">Status updates at every stage</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-2xl border border-black/5 bg-cream p-4">
                <RefreshCcw size={16} className="mt-0.5 shrink-0 text-gold-deep" />
                <div>
                  <p className="text-xs font-black">Cancellation protection</p>
                  <p className="text-[11px] text-gray-500">Covered by our refund policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-black tracking-tight">Choose your alteration type</h2>
        <p className="mt-2 text-sm text-gray-500">
          {showGroups
            ? "Pick the kind of work your garment needs - we'll show you the exact options next."
            : "Every option is stitched to your exact measurements by a verified tailor. Measurements are taken by our team at pickup - no guesswork on your end."}
        </p>

        {/* On a Custom Alterations line with more than one group, this page
            shows group cards (Repair/Resize/Restyle) that link to their own
            page - a deliberate real click before the tier list, not an
            in-page section (see alterationGroups.ts's header comment for
            why). Falls back to the plain flat tier grid for every other
            line (e.g. a stitching line whose tiers are "Normal Stitching"/
            "Designer Stitching", not repair/resize work). */}
        {showGroups ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            {alterationGroups.map((group) => (
              <GroupCard
                key={group.key}
                group={group}
                categoryId={category.id}
                lineId={line.id}
              />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {stitchingTypes.map((tier) => (
              <TierCard key={tier.service_id} tier={tier} categoryId={category.id} lineId={line.id} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-16 rounded-[2rem] bg-cream-deep p-7 md:p-10">
        <h2 className="text-xl font-black tracking-tight">How this order works</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", title: "Book & schedule pickup", desc: "Choose a tier and pick a pickup slot that works for you." },
            { step: "2", title: "We collect & measure", desc: "Our team collects your fabric/garment and takes measurements at your door." },
            { step: "3", title: "Verified tailor stitches it", desc: "Track cutting, stitching and quality-check in real time." },
            { step: "4", title: "Delivered to you", desc: "Your finished order is delivered straight back to your address." },
          ].map((s) => (
            <div key={s.step}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-black text-gold">
                {s.step}
              </span>
              <h3 className="mt-3 text-sm font-black">{s.title}</h3>
              <p className="mt-1 text-xs leading-5 text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const GROUP_ICONS = {
  repair: Hammer,
  resize: Ruler,
  restyle: Wand2,
  other: Sparkles,
} as const;

function GroupCard({
  group,
  categoryId,
  lineId,
}: {
  group: AlterationGroup;
  categoryId: number;
  lineId: number;
}) {
  const Icon = GROUP_ICONS[group.key];
  const cheapest = group.tiers.reduce(
    (min, t) => (min === null || t.base_price < min ? t.base_price : min),
    null as number | null,
  );
  return (
    <Link
      href={`/services/${categoryId}/${lineId}/${group.key}`}
      className="group flex flex-col rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream text-gold-deep">
        <Icon size={22} />
      </span>
      <h3 className="mt-4 text-lg font-black">{group.label}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
        {GROUP_DESCRIPTIONS[group.key]}
      </p>
      <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {group.tiers.length} option{group.tiers.length === 1 ? "" : "s"}
          </p>
          {cheapest != null && (
            <p className="text-sm font-black">from ₹{cheapest.toLocaleString("en-IN")}</p>
          )}
        </div>
        <span className="inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition group-hover:-translate-y-0.5 group-hover:bg-black">
          View options <ArrowRight className="ml-1.5" size={14} />
        </span>
      </div>
    </Link>
  );
}

function TierCard({
  tier,
  categoryId,
  lineId,
}: {
  tier: CatalogStitchingType;
  categoryId: number;
  lineId: number;
}) {
  return (
    <Link
      href={`/services/${categoryId}/${lineId}/${tier.service_id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      {tier.image_url && (
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src={tier.image_url}
            alt={tier.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-black">{tier.name}</h3>
          {tier.is_premium && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gold">
              <Sparkles size={11} /> Premium
            </span>
          )}
        </div>

        {/* Same threshold-based fallback as the services grid card - a
            short backend label (e.g. "Suit") next to a full sentence on a
            sibling tier reads as unfinished. */}
        <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
          {tier.description && tier.description.trim().length >= 20
            ? tier.description
            : fallbackTierDescription({
                name: tier.name,
                basePrice: tier.base_price,
                estimatedDeliveryDays: tier.estimated_delivery_days,
                categoryName: tier.category_name,
              })}
        </p>

        <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <Clock3 size={13} />
          Delivered in {tier.estimated_delivery_days} day
          {tier.estimated_delivery_days === 1 ? "" : "s"}
        </p>

        <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
          <span className="text-xl font-black">₹{tier.base_price.toLocaleString("en-IN")}</span>
          <span className="inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition group-hover:-translate-y-0.5 group-hover:bg-black">
            View details <ArrowRight className="ml-1.5" size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
