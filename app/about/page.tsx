import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  Eye,
  Headset,
  PackageCheck,
  RefreshCcw,
  Ruler,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { TRUST_SIGNALS } from "@/lib/trustContent";
import { getTestimonials } from "@/lib/services/testimonials";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "BookMyDarzi is Delhi NCR's doorstep tailoring platform - verified tailors, fabric pickup from your home, and every order tracked from pickup to delivery.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About BookMyDarzi", url: "/about" },
};

const HOW_IT_WORKS = [
  {
    icon: ClipboardList,
    title: "Book a service",
    desc: "Choose from stitching, alterations and custom tailoring, and pick a pickup slot that works for you.",
  },
  {
    icon: Ruler,
    title: "We take your measurements",
    desc: "Our team collects your fabric and measurements at your doorstep, so nothing gets lost in translation.",
  },
  {
    icon: Truck,
    title: "Your tailor gets to work",
    desc: "A verified tailor is assigned to your order, and you can track every stage of the stitching process.",
  },
  {
    icon: PackageCheck,
    title: "Delivered back to you",
    desc: "Once quality-checked, your finished garment is delivered straight to your address.",
  },
];

const COMMITMENTS = [
  {
    icon: Eye,
    title: "Nothing happens off-screen",
    desc: "Every order status change - pickup, cutting, stitching, quality check, dispatch - is visible to you in real time. No black box between drop-off and delivery.",
  },
  {
    icon: RefreshCcw,
    title: "Cancellation & refund protection",
    desc: "If something goes wrong on our end, our cancellation and refund policy has you covered - not a vague promise, an actual process built into every order.",
  },
  {
    icon: Headset,
    title: "A real support team",
    desc: "Questions about an order, a fit issue, a delivery delay - you reach a person, through in-app chat or the contact page, not a script.",
  },
];

export default async function AboutPage() {
  const testimonials = await getTestimonials();
  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-5xl px-5 py-16 text-center md:py-24 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">About us</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-.03em] md:text-6xl">
            Tailoring, built around your <span className="text-gold-deep">doorstep.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-gray-600 md:text-lg">
            BookMyDarzi exists to make professional tailoring as easy as ordering anything else
            online - without giving up the craftsmanship of a trusted, skilled tailor.
          </p>
          <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-8 gap-y-4 text-xs font-bold uppercase tracking-wide text-gray-500">
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={15} className="text-gold-deep" /> Verified tailors only
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-gold-deep" /> Tracked, protected orders
            </span>
            <span className="flex items-center gap-1.5">
              <Truck size={15} className="text-gold-deep" /> Doorstep, start to finish
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Our story</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Why we built this</h2>
        <div className="mt-6 space-y-5 text-base leading-7 text-gray-600">
          <p>
            Getting clothes tailored well in India has always meant the same routine: find a
            darzi you trust, visit their shop, get measured, come back for fittings, and hope the
            fit is right the first time. It works, but it takes time most people don&apos;t have -
            and finding a tailor you can rely on when you move cities or need something urgently
            is its own challenge.
          </p>
          <p>
            BookMyDarzi brings that same craftsmanship to your doorstep. You book a service, we
            pick up your fabric and take your measurements at home, a verified tailor stitches
            your garment, and it comes back to you - with visibility into every step along the
            way instead of a black box between drop-off and pickup.
          </p>
          <p>
            We&apos;re not trying to replace the neighbourhood tailor - we&apos;re trying to make
            professional tailoring accessible, trackable and convenient, for people who want a
            great fit without rearranging their day around it.
          </p>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold">How it works</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">From booking to delivery.</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(({ icon: Icon, title, desc }, i) => (
              <div key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold text-ink">
                  <Icon size={20} />
                </span>
                <p className="mt-4 text-xs font-bold text-gold">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Our promise to you</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          What makes us different from a one-off tailor.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {COMMITMENTS.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold">
                <Icon size={20} />
              </span>
              <h3 className="mt-4 text-lg font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-cream-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
            What you can count on
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Built on trust.</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_SIGNALS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold">
                  <Icon size={20} />
                </span>
                <h3 className="mt-4 text-lg font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">In their words</p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Customers, not case studies.</h2>
        {testimonials.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={`${t.name}-${i}`} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                <p className="text-sm leading-6 text-gray-600">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-xs font-black text-white">
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
          </div>
        )}
      </section>

      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">Ready for your first stitch?</h2>
          <p className="mt-4 text-base text-gray-600">
            Book a service and get pickup scheduled in minutes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/services"
              className="inline-flex items-center rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              Explore services <ArrowRight className="ml-2" size={16} />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center rounded-xl border border-black/10 bg-white px-6 py-3.5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-gray-50"
            >
              Talk to us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
