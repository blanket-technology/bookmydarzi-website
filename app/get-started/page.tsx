import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Star, Truck } from "lucide-react";
import { getTestimonials } from "@/lib/services/testimonials";

export const metadata = {
  title: "Book Your First Stitch - BookMyDarzi",
  description: "Doorstep tailoring, done right. Book your first stitch today.",
};

const STEPS = [
  { n: "01", title: "Pick a service", desc: "Choose stitching, alterations or custom tailoring in under a minute." },
  { n: "02", title: "We come to you", desc: "Fabric pickup and measurements, right at your doorstep." },
  { n: "03", title: "Get it delivered", desc: "Track your order and get it delivered, perfectly fitted." },
];

export default async function GetStartedPage() {
  const testimonials = await getTestimonials();
  return (
    <main className="bg-[#0e0e0e] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#c99a3d]/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#c99a3d]/10 blur-[120px]" />

        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center md:py-28 lg:px-8">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#c99a3d]/30 bg-[#c99a3d]/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#e0b25e]">
            <Sparkles size={14} /> India&apos;s doorstep tailoring platform
          </div>
          <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-black leading-[1.02] tracking-[-.04em] md:text-7xl">
            The perfect fit,<br />
            <span className="text-[#e0b25e]">delivered to your door.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/60">
            Skip the shop visits. Book professional tailoring, get picked up at home, and receive
            your perfectly stitched garment - fully tracked, start to finish.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4">
            <Link
              href="/services"
              className="group inline-flex items-center gap-2 rounded-2xl bg-[#e0b25e] px-9 py-4 text-base font-black text-[#171717] shadow-[0_0_40px_rgba(224,178,94,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_0_60px_rgba(224,178,94,0.5)]"
            >
              Book Your First Stitch
              <ArrowRight className="transition group-hover:translate-x-1" size={20} />
            </Link>
            <p className="text-xs font-semibold text-white/40">No shop visit needed · Pay securely online</p>
          </div>
        </div>
      </section>

      {/* Offer hook */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto max-w-4xl px-5 py-12 text-center lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#e0b25e]">First order</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Special pricing for new customers.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/55">
            First-time customers get preferential pricing on their opening booking - see your
            exact price the moment you pick a service.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-5 py-20 lg:px-8">
        <p className="text-center text-xs font-black uppercase tracking-[.25em] text-[#e0b25e]">
          How it works
        </p>
        <h2 className="mt-3 text-center text-3xl font-black tracking-tight md:text-4xl">
          Three steps. Zero hassle.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
              <span className="text-4xl font-black text-white/10">{s.n}</span>
              <h3 className="mt-4 text-xl font-black">{s.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/55">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust row */}
      <section className="border-y border-white/10 bg-white/[0.03]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-5 py-8 text-sm font-bold text-white/70 lg:px-8">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#e0b25e]" /> Verified tailors
          </span>
          <span className="flex items-center gap-2">
            <Truck size={16} className="text-[#e0b25e]" /> Doorstep pickup &amp; delivery
          </span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#e0b25e]" /> Secure online payment
          </span>
        </div>
      </section>

      {/* Social proof */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <p className="text-center text-xs font-black uppercase tracking-[.25em] text-[#e0b25e]">
          Real reviews, Delhi NCR
        </p>
        <h2 className="mt-3 text-center text-3xl font-black tracking-tight md:text-4xl">
          Real fits. Real customers.
        </h2>
        {testimonials.length > 0 ? (
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={`${t.name}-${i}`} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <div className="flex gap-0.5 text-[#e0b25e]">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} size={14} fill="currentColor" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-6 text-white/70">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e0b25e] text-sm font-black text-[#171717]">
                    {t.name.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{t.name}</p>
                    {t.location && <p className="text-xs text-white/40">{t.location}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-12 rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm font-semibold text-white/70">
              We&apos;re just getting started - be one of our first reviews.
            </p>
          </div>
        )}
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden border-t border-white/10">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-[#c99a3d]/20 blur-[100px]" />
        <div className="relative mx-auto max-w-3xl px-5 py-20 text-center lg:px-8">
          <h2 className="text-4xl font-black tracking-tight md:text-5xl">
            Your perfect fit is one tap away.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base text-white/55">
            Book now and get your first pickup scheduled today.
          </p>
          <Link
            href="/services"
            className="mt-9 inline-flex items-center gap-2 rounded-2xl bg-[#e0b25e] px-9 py-4 text-base font-black text-[#171717] shadow-[0_0_40px_rgba(224,178,94,0.35)] transition hover:-translate-y-0.5"
          >
            Book Your First Stitch <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </main>
  );
}
