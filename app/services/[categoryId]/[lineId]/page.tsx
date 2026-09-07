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
import { getCatalogTree } from "@/lib/services/catalog";
import type { CatalogStitchingType } from "@/lib/types/catalog";

// No dedicated single-service-line endpoint exists on the backend (verified
// against app/api/v1/endpoints/catalog.py) - only /categories/tree and
// /categories/{id}. Fetching the tree and locating the line by id matches
// what the tree already gives us and keeps this in one round trip.
export default async function ServiceLineDetailPage({
  params,
}: {
  params: Promise<{ categoryId: string; lineId: string }>;
}) {
  const { categoryId, lineId } = await params;
  const { categories } = await getCatalogTree();

  const category = categories.find((c) => String(c.id) === categoryId);
  const line = category?.service_lines.find((l) => String(l.id) === lineId);

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
  const heroImage = line.image_url ?? stitchingTypes.find((t) => t.image_url)?.image_url ?? null;

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <nav className="text-xs font-semibold text-gray-500">
        <Link href="/services" className="hover:text-gold-deep">
          Services
        </Link>{" "}
        / <span className="text-gray-400">{category.name}</span> /{" "}
        <span className="text-ink">{line.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 md:grid-cols-2 md:items-start">
        <div>
          {heroImage ? (
            <div className="relative h-80 w-full overflow-hidden rounded-3xl border border-black/5 md:h-[420px]">
              <Image
                src={heroImage}
                alt={line.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            </div>
          ) : (
            <div className="flex h-80 items-end rounded-3xl bg-gradient-to-br from-stone-200 to-stone-300 p-6 md:h-[420px]">
              <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                {category.name}
              </span>
            </div>
          )}

          {/* What's included - every order on the platform, not per-product
              claims, so this stays honest even when a tier has no copy of
              its own in the catalog. */}
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

          <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-3">
            {cheapest && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Starting from</p>
                <p className="text-3xl font-black text-ink">
                  ₹{cheapest.base_price.toLocaleString("en-IN")}
                </p>
              </div>
            )}
            {fastestDays != null && (
              <div className="flex items-center gap-1.5 pb-1.5 text-sm font-semibold text-gray-600">
                <Clock3 size={16} className="text-gold-deep" />
                Delivered in as little as {fastestDays} day{fastestDays === 1 ? "" : "s"}
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wide text-gray-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-gold-deep" /> {stitchingTypes.length} tier
              {stitchingTypes.length === 1 ? "" : "s"} to choose from
            </span>
          </div>
        </div>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-black tracking-tight">Choose your tier</h2>
        <p className="mt-2 text-sm text-gray-500">
          Every tier is stitched to your exact measurements by a verified tailor. Measurements
          are taken by our team at pickup - no guesswork on your end.
        </p>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {stitchingTypes.map((tier) => (
            <Link
              key={tier.service_id}
              href={`/services/${category.id}/${line.id}/${tier.service_id}`}
              className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              {tier.image_url && (
                <div className="relative h-40 w-full overflow-hidden">
                  <Image
                    src={tier.image_url}
                    alt={tier.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                    className="object-cover"
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

                <p className="mt-2 min-h-10 text-sm leading-6 text-gray-500">
                  {tier.description ||
                    `Professional ${tier.name.toLowerCase()}, finished by a verified tailor and quality-checked before dispatch.`}
                </p>

                <ul className="mt-4 space-y-1.5">
                  {(tier.highlights.length > 0
                    ? tier.highlights
                    : ["Verified tailor", "Quality-checked before dispatch", "Doorstep delivery"]
                  ).map((h) => (
                    <li key={h} className="flex items-start gap-2 text-xs text-gray-600">
                      <CheckCircle2 className="mt-0.5 shrink-0 text-gold-deep" size={13} />
                      {h}
                    </li>
                  ))}
                </ul>

                <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                  <Clock3 size={13} />
                  Delivered in {tier.estimated_delivery_days} day
                  {tier.estimated_delivery_days === 1 ? "" : "s"}
                </p>

                <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                  <span className="text-xl font-black">
                    ₹{tier.base_price.toLocaleString("en-IN")}
                  </span>
                  <span className="inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition group-hover:-translate-y-0.5 group-hover:bg-black">
                    View details <ArrowRight className="ml-1.5" size={14} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
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
