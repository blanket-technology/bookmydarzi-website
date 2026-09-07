import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  PackageCheck,
  Quote,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import { getCatalogTree } from "@/lib/services/catalog";
import type { CatalogServiceLine } from "@/lib/types/catalog";
import { getTestimonials } from "@/lib/services/testimonials";
import { TRUST_SIGNALS } from "@/lib/trustContent";

const CARD_BACKGROUNDS = [
  "from-stone-200 to-stone-300",
  "from-amber-100 to-stone-200",
  "from-slate-200 to-slate-300",
];

const CRAFT_MARKS = [
  "Hand-finished seams",
  "Bespoke measurements",
  "Doorstep pickup",
  "Verified tailors",
  "48-hour turnaround",
  "Premium fabrics",
];

interface FeaturedLine {
  line: CatalogServiceLine;
  categoryId: number;
}

function pickFeaturedServiceLines(
  categories: Awaited<ReturnType<typeof getCatalogTree>>["categories"],
): FeaturedLine[] {
  const category = categories.find((c) => c.service_lines.length > 0);
  if (!category) return [];
  return [...category.service_lines]
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 3)
    .map((line) => ({ line, categoryId: category.id }));
}

export default async function Home() {
  const { categories } = await getCatalogTree();
  const featured = pickFeaturedServiceLines(categories);
  const testimonials = await getTestimonials();

  return (
    <main>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-charcoal text-white">
        {/* Ambient gold glow, kept subtle so the section still reads as
            "dark atelier," not "nightclub." */}
        <div className="pointer-events-none absolute -left-32 top-0 h-[520px] w-[520px] rounded-full bg-gold/10 blur-[120px]" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-[420px] w-[420px] rounded-full bg-gold/[0.07] blur-[110px]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-16 pt-14 sm:px-6 md:grid-cols-[1.05fr_1fr] md:items-center md:px-8 md:pb-24 md:pt-20 lg:gap-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-gold-pale">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Doorstep tailoring, done properly
            </p>

            <h1 className="mt-6 max-w-xl font-display text-[2.75rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.25rem]">
              Clothes cut to
              <br />
              <span className="italic text-gold-pale">your</span> measure.
            </h1>

            <p className="mt-6 max-w-md text-[15px] leading-7 text-white/60 sm:text-base">
              India&apos;s premium doorstep tailoring service. Verified master tailors,
              measured at your home, stitched to perfection, delivered back to you.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/services"
                className="group inline-flex items-center gap-2 rounded-full bg-gold px-7 py-3.5 text-sm font-bold text-charcoal shadow-[0_8px_30px_-8px_rgba(201,154,61,0.55)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_12px_36px_-6px_rgba(201,154,61,0.6)]"
              >
                Book a service
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/orders"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:border-white/40 hover:bg-white/5"
              >
                Track an order
              </Link>
            </div>

            <div className="mt-11 flex flex-wrap gap-x-8 gap-y-3">
              {[
                { icon: BadgeCheck, label: "Background-verified tailors" },
                { icon: Clock3, label: "On-time, every time" },
                { icon: ShieldCheck, label: "Secure, insured orders" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="flex items-center gap-2 text-xs font-medium text-white/45"
                >
                  <Icon size={15} className="text-gold-pale" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Layered visual: a large primary card with a second, offset
              card peeking from behind it - reads as depth/craft rather
              than a single flat photo panel. */}
          <div className="relative mx-auto w-full max-w-[480px]">
            {featured[1]?.line.image_url && (
              <div className="absolute -right-6 -top-8 hidden aspect-[4/5] w-[62%] overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl sm:block">
                <Image
                  src={featured[1].line.image_url}
                  alt=""
                  fill
                  sizes="280px"
                  className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-charcoal/30" />
              </div>
            )}

            <div className="relative aspect-[4/5] w-[86%] overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.65)]">
              {featured[0]?.line.image_url ? (
                <Image
                  src={featured[0].line.image_url}
                  alt={featured[0].line.name}
                  fill
                  sizes="(min-width: 640px) 420px, 86vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[#3a352f] to-[#1c1a1f]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/0 to-charcoal/0" />

              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3.5 backdrop-blur">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gold-deep">
                    Featured
                  </p>
                  <h2 className="truncate font-display text-lg font-medium leading-tight text-ink">
                    {featured[0]?.line.name ?? "Premium Stitching"}
                  </h2>
                  {featured[0]?.line.starting_price != null ? (
                    <p className="mt-0.5 text-sm font-bold text-ink">
                      <span className="mr-1 text-[10px] font-bold uppercase text-gray-400">
                        From
                      </span>
                      ₹{featured[0].line.starting_price.toLocaleString("en-IN")}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-sm font-bold text-ink">Price on request</p>
                  )}
                </div>
                <Link
                  href={
                    featured[0]
                      ? `/services/${featured[0].categoryId}/${featured[0].line.id}`
                      : "/services"
                  }
                  className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-ink-soft"
                >
                  Book now
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scrolling craft-marks strip - a quiet, editorial texture detail
            rather than another stat block (we deliberately don't fabricate
            "10,000+ customers" style numbers on a young platform). */}
        <div className="relative overflow-hidden border-t border-white/10 py-4">
          <div className="animate-marquee flex w-max shrink-0 gap-10 pr-10">
            {[...CRAFT_MARKS, ...CRAFT_MARKS].map((mark, i) => (
              <span
                key={`${mark}-${i}`}
                className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold uppercase tracking-[.14em] text-white/35"
              >
                {mark}
                <span className="text-gold/50">✦</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Featured services ────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
              Our services
            </p>
            <h2 className="mt-3 max-w-lg font-display text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
              Tailored for you, stitch by stitch.
            </h2>
          </div>
          <Link
            href="/services"
            className="group hidden items-center text-sm font-bold text-ink md:flex"
          >
            View all services
            <ArrowRight
              className="ml-1.5 transition-transform group-hover:translate-x-0.5"
              size={15}
            />
          </Link>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map(({ line, categoryId }, i) => (
            <Link
              href={`/services/${categoryId}/${line.id}`}
              key={line.id}
              className="group overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              {line.image_url ? (
                <div className="relative h-72 w-full overflow-hidden">
                  <Image
                    src={line.image_url}
                    alt={line.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0" />
                </div>
              ) : (
                <div
                  className={`flex h-72 items-end bg-gradient-to-br ${CARD_BACKGROUNDS[i % CARD_BACKGROUNDS.length]} p-5`}
                >
                  <span className="rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider">
                    Popular
                  </span>
                </div>
              )}
              <div className="flex items-end justify-between gap-3 p-5">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-medium leading-snug">{line.name}</h3>
                  <p className="mt-1.5 text-sm text-gray-500">
                    {line.starting_price != null
                      ? `Starting from ₹${line.starting_price.toLocaleString("en-IN")}`
                      : "Price on request"}
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cream-deep text-ink transition-colors group-hover:bg-ink group-hover:text-white">
                  <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <Link
          href="/services"
          className="mt-8 flex items-center justify-center gap-1.5 text-sm font-bold text-ink md:hidden"
        >
          View all services <ArrowRight size={15} />
        </Link>
      </section>

      {/* ─── How it works ────────────────────────────────────────────── */}
      <section className="bg-charcoal text-white">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[.2em] text-gold-pale">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
              From browsing to your doorstep.
            </h2>
          </div>

          {/* Connected process rail: a single horizontal line threads
              through every step's icon, so the sequence reads as one
              continuous journey rather than five disconnected cards. */}
          <div className="relative mt-14">
            <div
              className="absolute left-0 right-0 top-[22px] hidden h-px bg-gradient-to-r from-white/0 via-white/15 to-white/0 lg:block"
              aria-hidden
            />
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
              {[
                {
                  icon: ShoppingBag,
                  title: "Browse & choose",
                  desc: "Pick your garment, finish and quantity from our services.",
                },
                {
                  icon: Ruler,
                  title: "Share measurements",
                  desc: "Use saved measurements, or book a home measurement at pickup.",
                },
                {
                  icon: Truck,
                  title: "Schedule pickup",
                  desc: "Choose a doorstep pickup slot that suits you - instant or scheduled.",
                },
                {
                  icon: Clock3,
                  title: "We craft your order",
                  desc: "A verified tailor gets to work while you track every stage in real time.",
                },
                {
                  icon: PackageCheck,
                  title: "Delivered to you",
                  desc: "Your perfectly-stitched garment is delivered straight back to your door.",
                },
              ].map((step, i) => (
                <div key={step.title} className="relative">
                  <span className="relative z-10 grid h-11 w-11 place-items-center rounded-full bg-gold text-charcoal shadow-[0_0_0_5px_rgba(28,26,31,1)]">
                    <step.icon size={17} />
                  </span>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-[.14em] text-gold-pale">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1.5 font-display text-lg font-medium leading-snug">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/45">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust signals ───────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
          Why BookMyDarzi
        </p>
        <h2 className="mt-3 max-w-lg font-display text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
          Built for trust, start to finish.
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_SIGNALS.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="group rounded-3xl border border-black/5 bg-white p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-gold/30 hover:shadow-xl"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-deep text-gold-deep transition-colors group-hover:bg-ink group-hover:text-gold-pale">
                <Icon size={20} />
              </span>
              <p className="mt-5 text-[11px] font-bold text-gray-300">0{i + 1}</p>
              <h3 className="mt-1 font-display text-lg font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ────────────────────────────────────────────── */}
      <section className="bg-cream">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
            Real reviews, Delhi NCR
          </p>
          <h2 className="mt-3 font-display text-3xl font-medium leading-[1.1] tracking-tight sm:text-4xl">
            What our customers say
          </h2>

          {testimonials.length > 0 ? (
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="flex flex-col rounded-3xl border border-black/5 bg-white p-7 shadow-sm"
                >
                  <Quote className="text-gold-pale" size={26} strokeWidth={2.5} />
                  <div className="mt-4 flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star
                        key={star}
                        size={13}
                        className={star < t.rating ? "fill-gold text-gold" : "fill-gray-200 text-gray-200"}
                      />
                    ))}
                  </div>
                  <p className="mt-3 flex-1 text-[15px] leading-7 text-gray-700">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-6 flex items-center gap-3 border-t border-black/5 pt-5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink font-display text-sm font-medium text-gold-pale">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">{t.name}</p>
                      {t.location && <p className="text-xs text-gray-400">{t.location}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-3xl border border-dashed border-black/10 bg-white/60 p-10 text-center">
              <p className="text-sm font-semibold text-gray-600">
                We&apos;re just getting started - be one of our first reviews.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ─── Closing CTA ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-charcoal text-white">
        <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-gold/[0.08] blur-[120px]" />
        <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-medium leading-[1.15] tracking-tight sm:text-5xl">
            Your next perfectly-fitted garment
            <br className="hidden sm:block" /> is a few taps away.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/55">
            Book a service, share your measurements, and let a verified tailor take it from there.
          </p>
          <Link
            href="/services"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-gold px-8 py-4 text-sm font-bold text-charcoal shadow-[0_8px_30px_-8px_rgba(201,154,61,0.55)] transition-transform hover:-translate-y-0.5"
          >
            Book a service
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
