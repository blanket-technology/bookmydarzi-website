import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import HoverZoomImage from "@/components/HoverZoomImage";
import { getCatalogTree, getServiceAddons } from "@/lib/services/catalog";
import { breadcrumbJsonLd, serviceJsonLd } from "@/lib/seo";
import ServiceActions from "./ServiceActions";

type TierPageParams = { categoryId: string; lineId: string; serviceId: string };

async function findTier(categoryId: string, lineId: string, serviceId: string) {
  const { categories } = await getCatalogTree();
  const category = categories.find((c) => String(c.id) === categoryId);
  const line = category?.service_lines.find((l) => String(l.id) === lineId);
  const tier = line?.stitching_types.find((t) => String(t.service_id) === serviceId);
  return { category, line, tier };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<TierPageParams>;
}): Promise<Metadata> {
  const { categoryId, lineId, serviceId } = await params;
  const { category, line, tier } = await findTier(categoryId, lineId, serviceId);
  if (!category || !line || !tier) return {};

  const title = `${tier.name} - ₹${tier.base_price.toLocaleString("en-IN")}`;
  const description =
    tier.description ||
    `Book ${tier.name.toLowerCase()} online - ₹${tier.base_price.toLocaleString("en-IN")}, delivered in ${tier.estimated_delivery_days} day${tier.estimated_delivery_days === 1 ? "" : "s"}. Doorstep pickup in Noida & Delhi NCR, stitched by a verified tailor.`;
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

// Same data-source approach as the parent service-line page: no dedicated
// single-tier endpoint exists on the backend, so this locates the tier
// within the already-fetched catalog tree by its real service_id.
export default async function TierDetailPage({
  params,
}: {
  params: Promise<TierPageParams>;
}) {
  const { categoryId, lineId, serviceId } = await params;
  const { category, line, tier } = await findTier(categoryId, lineId, serviceId);

  if (!category || !line || !tier) {
    notFound();
  }

  const addons = await getServiceAddons(tier.service_id);

  const otherTiers = line.stitching_types
    .filter((t) => t.service_id !== tier.service_id)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
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
              imageUrl: tier.image_url,
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

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          {tier.image_url ? (
            // Same square-box fix as the category page's hero - see that
            // file's comment for why (catalog photos are a genuine mix of
            // portrait/landscape, a square box minimizes average margin).
            <HoverZoomImage
              src={tier.image_url}
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

          <div className="mt-6 grid grid-cols-2 gap-3">
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
              `Professional ${tier.name.toLowerCase()}, finished by a verified tailor and quality-checked before dispatch.`}
          </p>

          <ul className="mt-5 space-y-2">
            {(tier.highlights.length > 0
              ? tier.highlights
              : ["Verified tailor", "Quality-checked before dispatch", "Doorstep delivery"]
            ).map((h) => (
              <li key={h} className="flex items-start gap-2 text-sm text-gray-600">
                <CheckCircle2 className="mt-0.5 shrink-0 text-gold-deep" size={15} />
                {h}
              </li>
            ))}
          </ul>

          <ServiceActions
            serviceId={tier.service_id}
            name={tier.name}
            imageUrl={tier.image_url ?? null}
            basePrice={tier.base_price}
            categoryName={category.name}
            serviceLineName={line.name}
            estimatedDeliveryDays={tier.estimated_delivery_days}
            addons={addons}
          />
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
