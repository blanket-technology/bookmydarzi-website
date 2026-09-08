import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import HoverZoomImage from "@/components/HoverZoomImage";
import { getCatalogTree } from "@/lib/services/catalog";
import AddToCartButton from "./AddToCartButton";

// Same data-source approach as the parent service-line page: no dedicated
// single-tier endpoint exists on the backend, so this locates the tier
// within the already-fetched catalog tree by its real service_id.
export default async function TierDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string; lineId: string; serviceId: string }>;
}) {
  const { categoryId, lineId, serviceId } = await params;
  const { categories } = await getCatalogTree();

  const category = categories.find((c) => String(c.id) === categoryId);
  const line = category?.service_lines.find((l) => String(l.id) === lineId);
  const tier = line?.stitching_types.find((t) => String(t.service_id) === serviceId);

  if (!category || !line || !tier) {
    notFound();
  }

  const otherTiers = line.stitching_types
    .filter((t) => t.service_id !== tier.service_id)
    .sort((a, b) => a.display_order - b.display_order);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
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

          <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Price</p>
              <p className="text-3xl font-black text-ink">
                ₹{tier.base_price.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-1.5 pb-1.5 text-sm font-semibold text-gray-600">
              <Clock3 size={16} className="text-gold-deep" />
              Delivered in {tier.estimated_delivery_days} day
              {tier.estimated_delivery_days === 1 ? "" : "s"}
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-3">
            <AddToCartButton
              serviceId={tier.service_id}
              name={tier.name}
              imageUrl={tier.image_url ?? null}
              basePrice={tier.base_price}
              categoryName={category.name}
              serviceLineName={line.name}
              estimatedDeliveryDays={tier.estimated_delivery_days}
            />
            <Link
              href={`/book-now?service_id=${tier.service_id}&name=${encodeURIComponent(tier.name)}${
                tier.image_url ? `&image=${encodeURIComponent(tier.image_url)}` : ""
              }`}
              className="inline-flex items-center rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
            >
              Book Now <ArrowRight className="ml-2" size={16} />
            </Link>
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
