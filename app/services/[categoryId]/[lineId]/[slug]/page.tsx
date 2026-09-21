import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import HoverZoomImage from "@/components/HoverZoomImage";
import { getCatalogTree, getServiceAddons } from "@/lib/services/catalog";
import { breadcrumbJsonLd, jsonLdScript, serviceJsonLd } from "@/lib/seo";
import { fallbackTierDescription, formatDeliveryEta } from "@/lib/services/fallbackDescription";
import {
  GROUP_DESCRIPTIONS,
  groupAlterationTiers,
  type AlterationGroupKey,
} from "@/lib/services/alterationGroups";
import ServiceActions from "./ServiceActions";

type SlugPageParams = { categoryId: string; lineId: string; slug: string };

const GROUP_KEYS: AlterationGroupKey[] = ["repair", "resize", "restyle", "other"];

async function findLineAndCategory(categoryId: string, lineId: string) {
  const { categories } = await getCatalogTree();
  const category = categories.find((c) => String(c.id) === categoryId);
  const line = category?.service_lines.find((l) => String(l.id) === lineId);
  return { category, line };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<SlugPageParams>;
}): Promise<Metadata> {
  const { categoryId, lineId, slug } = await params;
  const { category, line } = await findLineAndCategory(categoryId, lineId);
  if (!category || !line) return {};

  if (GROUP_KEYS.includes(slug as AlterationGroupKey)) {
    const groups = groupAlterationTiers(line.stitching_types);
    const group = groups.find((g) => g.key === slug);
    if (!group) return {};
    const title = `${group.label} - ${line.name}`;
    const path = `/services/${category.id}/${line.id}/${group.key}`;
    return {
      title,
      description: `${GROUP_DESCRIPTIONS[group.key]} Doorstep pickup in Noida & Delhi NCR, stitched by a verified tailor.`,
      alternates: { canonical: path },
      openGraph: { title: `${title} | BookMyDarzi`, url: path },
    };
  }

  const tier = line.stitching_types.find((t) => String(t.service_id) === slug);
  if (!tier) return {};

  const title = `${tier.name} - ₹${tier.base_price.toLocaleString("en-IN")}`;
  const description =
    tier.description ||
    `Book ${tier.name.toLowerCase()} online - ₹${tier.base_price.toLocaleString("en-IN")}, delivered in ${formatDeliveryEta(tier.estimated_delivery_days, tier.estimated_delivery_hours)}. Doorstep pickup in Noida & Delhi NCR, stitched by a verified tailor.`;
  const path = `/services/${category.id}/${line.id}/${tier.service_id}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${tier.name} | BookMyDarzi`,
      description,
      url: path,
      images: tier.image_url ? [{ url: tier.image_url }] : undefined,
    },
  };
}

// This one dynamic segment ([slug]) serves two different pages, since
// Next.js's App Router requires every route at a given path position to
// share one param name - can't have sibling [groupKey] and [serviceId]
// folders. Disambiguated by value: a known AlterationGroupKey renders the
// group-listing view below; anything else is treated as a real service_id
// and renders the existing tier detail view (unchanged from before this
// dedicated-group-page feature).
export default async function SlugPage({
  params,
}: {
  params: Promise<SlugPageParams>;
}) {
  const { categoryId, lineId, slug } = await params;
  const { category, line } = await findLineAndCategory(categoryId, lineId);

  if (!category || !line) {
    notFound();
  }

  if (GROUP_KEYS.includes(slug as AlterationGroupKey)) {
    return (
      <GroupListingPage
        category={category}
        line={line}
        groupKey={slug as AlterationGroupKey}
      />
    );
  }

  return <TierDetailPage category={category} line={line} serviceId={slug} />;
}

// ─── Group listing (Repair/Resize/Restyle) ──────────────────────────────────

async function GroupListingPage({
  category,
  line,
  groupKey,
}: {
  category: NonNullable<Awaited<ReturnType<typeof findLineAndCategory>>["category"]>;
  line: NonNullable<Awaited<ReturnType<typeof findLineAndCategory>>["line"]>;
  groupKey: AlterationGroupKey;
}) {
  const groups = groupAlterationTiers(line.stitching_types);
  const group = groups.find((g) => g.key === groupKey);

  if (!group) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript([
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
              { name: line.name, path: `/services/${category.id}/${line.id}` },
              { name: group.label, path: `/services/${category.id}/${line.id}/${group.key}` },
            ]),
          ]),
        }}
      />
      <nav className="text-xs font-semibold text-gray-500">
        <Link href="/services" className="hover:text-gold-deep">
          Services
        </Link>{" "}
        /{" "}
        <Link href={`/services/${category.id}/${line.id}`} className="hover:text-gold-deep">
          {line.name}
        </Link>{" "}
        / <span className="text-ink">{group.label}</span>
      </nav>

      <div className="mt-6">
        <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
          {line.name}
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">{group.label}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
          {GROUP_DESCRIPTIONS[group.key]}
        </p>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xl font-black tracking-tight">Available options</h2>
          <span className="text-xs font-semibold text-gray-400">
            {group.tiers.length} option{group.tiers.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {group.tiers.map((tier) => (
            <TierCard key={tier.service_id} tier={tier} categoryId={category.id} lineId={line.id} />
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── Tier detail (unchanged behavior) ───────────────────────────────────────

async function TierDetailPage({
  category,
  line,
  serviceId,
}: {
  category: NonNullable<Awaited<ReturnType<typeof findLineAndCategory>>["category"]>;
  line: NonNullable<Awaited<ReturnType<typeof findLineAndCategory>>["line"]>;
  serviceId: string;
}) {
  const tier = line.stitching_types.find((t) => String(t.service_id) === serviceId);

  if (!tier) {
    notFound();
  }

  const addons = await getServiceAddons(tier.service_id);

  const otherTiers = line.stitching_types
    .filter((t) => t.service_id !== tier.service_id)
    .sort((a, b) => a.display_order - b.display_order);

  const heroImage =
    tier.image_url ??
    otherTiers.find((t) => t.image_url)?.image_url ??
    line.image_url ??
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
              { name: line.name, path: `/services/${category.id}/${line.id}` },
              { name: tier.name, path: `/services/${category.id}/${line.id}/${tier.service_id}` },
            ]),
            serviceJsonLd({
              name: tier.name,
              description: tier.description || `Book ${tier.name} in Noida & Delhi NCR.`,
              path: `/services/${category.id}/${line.id}/${tier.service_id}`,
              imageUrl: heroImage,
              price: tier.base_price,
            }),
          ]),
        }}
      />
      <nav className="text-xs font-semibold text-gray-500">
        <Link href="/services" className="hover:text-gold-deep">
          Services
        </Link>{" "}
        /{" "}
        <Link href={`/services/${category.id}/${line.id}`} className="hover:text-gold-deep">
          {line.name}
        </Link>{" "}
        / <span className="text-ink">{tier.name}</span>
      </nav>

      <div className="mt-6 grid gap-6 md:grid-cols-2 md:items-start md:gap-10">
        <div>
          {heroImage ? (
            <HoverZoomImage
              src={heroImage}
              alt={tier.name}
              priority
              className="aspect-square w-full max-w-md rounded-3xl border border-black/5"
            />
          ) : (
            <div className="flex aspect-square w-full max-w-md items-end rounded-3xl bg-gradient-to-br from-stone-200 to-stone-300 p-6">
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                {line.name}
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">{line.name}</p>
          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-4xl font-black tracking-tight">{tier.name}</h1>
            {tier.is_premium && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gold">
                <Sparkles size={12} /> Premium
              </span>
            )}
          </div>

          <p className="mt-4 text-base leading-7 text-gray-600">
            {tier.description ||
              fallbackTierDescription({
                name: tier.name,
                basePrice: tier.base_price,
                estimatedDeliveryDays: tier.estimated_delivery_days,
                estimatedDeliveryHours: tier.estimated_delivery_hours,
                categoryName: category.name,
              })}
          </p>

          <ServiceActions
            serviceId={tier.service_id}
            name={tier.name}
            imageUrl={tier.image_url ?? null}
            basePrice={tier.base_price}
            categoryName={category.name}
            serviceLineName={line.name}
            estimatedDeliveryDays={tier.estimated_delivery_days}
            estimatedDeliveryHours={tier.estimated_delivery_hours}
            addons={addons}
            otherTiers={category.name === "Custom Alterations" ? otherTiers : undefined}
          />

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

      {otherTiers.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-black tracking-tight">Other options in {line.name}</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {otherTiers.map((t) => (
              <Link
                key={t.service_id}
                href={`/services/${category.id}/${line.id}/${t.service_id}`}
                className="group flex items-center gap-4 rounded-3xl border border-black/5 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-stone-200 to-stone-300">
                  {t.image_url && (
                    <Image src={t.image_url} alt={t.name} fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{t.name}</p>
                  <p className="mt-0.5 text-sm font-bold text-gold-deep">
                    ₹{t.base_price.toLocaleString("en-IN")}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className="shrink-0 text-gray-300 transition group-hover:translate-x-1 group-hover:text-ink"
                />
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TierCard({
  tier,
  categoryId,
  lineId,
}: {
  tier: import("@/lib/types/catalog").CatalogStitchingType;
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

        <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
          {tier.description && tier.description.trim().length >= 20
            ? tier.description
            : fallbackTierDescription({
                name: tier.name,
                basePrice: tier.base_price,
                estimatedDeliveryDays: tier.estimated_delivery_days,
                estimatedDeliveryHours: tier.estimated_delivery_hours,
                categoryName: tier.category_name,
              })}
        </p>

        <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
          <Clock3 size={13} />
          Delivered in {formatDeliveryEta(tier.estimated_delivery_days, tier.estimated_delivery_hours)}
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
