import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { getCatalogTree } from "@/lib/services/catalog";
import type { CatalogServiceLine } from "@/lib/types/catalog";
import { getTestimonials } from "@/lib/services/testimonials";
import { TRUST_SIGNALS } from "@/lib/trustContent";

const CARD_BACKGROUNDS = [
  "from-stone-200 to-stone-300",
  "from-slate-200 to-slate-300",
  "from-amber-100 to-stone-200",
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
      <section className="overflow-hidden bg-[#f8f6f1]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 md:items-center md:px-8 md:py-24">
          <div>
            <h1 className="max-w-xl text-5xl font-black leading-[1.03] tracking-[-.05em] md:text-7xl">
              The perfect fit starts <span className="text-[#b4832e]">here.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-gray-600 md:text-lg">
              Get professionally tailored clothes without the hassle. Pick a service, book in
              minutes and let our experts handle the rest.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/services"
                className="rounded-xl bg-[#171717] px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5"
              >
                Book a Service <ArrowRight className="ml-2 inline" size={16} />
              </Link>
              <Link
                href="/orders"
                className="rounded-xl border border-black/10 bg-white px-6 py-3.5 text-sm font-bold hover:bg-gray-50"
              >
                Track Order
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-5 text-xs font-semibold text-gray-500">
              <span>
                <CheckCircle2 className="mr-1 inline text-[#b4832e]" size={15} />
                Verified tailors
              </span>
              <span>
                <Clock3 className="mr-1 inline text-[#b4832e]" size={15} />
                On-time service
              </span>
              <span>
                <ShieldCheck className="mr-1 inline text-[#b4832e]" size={15} />
                Secure booking
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[520px]">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c99a3d]/20 blur-2xl" />
            <div className="relative flex h-[420px] items-end overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#d7d0c5] via-[#a79e91] to-[#625d56] p-5 shadow-2xl md:h-[500px] md:p-7">
                {featured[0]?.line.image_url && (
                  <Image
                    src={featured[0].line.image_url}
                    alt={featured[0].line.name}
                    fill
                    sizes="(min-width: 768px) 520px, 100vw"
                    className="object-cover"
                    priority
                  />
                )}
                <div className="relative flex w-full items-center justify-between gap-3 rounded-2xl bg-white/90 px-4 py-3 backdrop-blur">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                      Featured
                    </p>
                    <h2 className="text-lg font-black leading-tight">
                      {featured[0]?.line.name ?? "Premium Stitching"}
                    </h2>
                    {featured[0]?.line.starting_price != null ? (
                      <p className="mt-0.5 text-sm font-bold">
                        <span className="mr-1 text-[10px] font-bold uppercase text-gray-400">From</span>
                        ₹{featured[0].line.starting_price.toLocaleString("en-IN")}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm font-bold">Price on request</p>
                    )}
                  </div>
                  <Link
                    href={
                      featured[0]
                        ? `/services/${featured[0].categoryId}/${featured[0].line.id}`
                        : "/services"
                    }
                    className="shrink-0 rounded-xl bg-[#171717] px-4 py-2.5 text-xs font-bold text-white"
                  >
                    Book now
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">
              Our services
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
              Tailored for you
            </h2>
          </div>
          <Link href="/services" className="hidden text-sm font-bold md:block">
            View all <ArrowRight className="ml-1 inline" size={15} />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featured.map(({ line, categoryId }, i) => (
            <Link
              href={`/services/${categoryId}/${line.id}`}
              key={line.id}
              className="group rounded-3xl border border-black/5 bg-white p-3 shadow-sm hover:-translate-y-1 hover:shadow-xl"
            >
              {line.image_url ? (
                <div className="relative h-64 w-full overflow-hidden rounded-2xl">
                  <Image
                    src={line.image_url}
                    alt={line.name}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className={`flex h-64 items-end rounded-2xl bg-gradient-to-br ${CARD_BACKGROUNDS[i % CARD_BACKGROUNDS.length]} p-5`}
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
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 group-hover:bg-[#171717] group-hover:text-white">
                  <ArrowRight size={17} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#171717] text-white">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="max-w-xl">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#d2aa5c]">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              From browsing to your doorstep.
            </h2>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
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
              <div key={step.title} className="border-t border-white/15 pt-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c99a3d] text-[#171717]">
                    <step.icon size={16} />
                  </span>
                  <span className="text-xs font-bold text-[#d2aa5c]">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">
          Why BookMyDarzi
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          Built for trust, start to finish.
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_SIGNALS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#171717] text-[#c99a3d]">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#f8f6f1]">
        <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">
            Real reviews, Delhi NCR
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            What our customers say
          </h2>
          {testimonials.length > 0 ? (
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <div
                  key={`${t.name}-${i}`}
                  className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm"
                >
                  <p className="text-sm leading-6 text-gray-600">&ldquo;{t.quote}&rdquo;</p>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#171717] text-sm font-black text-white">
                      {t.name.charAt(0)}
                    </span>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      {t.location && <p className="text-xs text-gray-400">{t.location}</p>}
                    </div>
                  </div>
                </div>
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
