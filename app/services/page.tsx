import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeCheck, MapPin, ShieldCheck, Truck } from "lucide-react";
import { getCatalogTree } from "@/lib/services/catalog";
import { TRUST_SIGNALS } from "@/lib/trustContent";
import { breadcrumbJsonLd } from "@/lib/seo";
import ServicesGrid from "./ServicesGrid";

export const metadata: Metadata = {
  title: "All Tailoring Services",
  description:
    "Browse every stitching and alteration service BookMyDarzi offers in Noida & Delhi NCR - blouses, suits, kurtas, alterations and more, with upfront pricing and doorstep pickup.",
  alternates: { canonical: "/services" },
  openGraph: { title: "All Tailoring Services | BookMyDarzi", url: "/services" },
};

// Server Component: fetches the real catalog tree server-side (fast, SEO
// friendly, public endpoint - no auth needed) and hands it to the client
// component for search/filter interactivity.
export default async function ServicesPage() {
  const { categories } = await getCatalogTree();

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", path: "/" },
              { name: "Services", path: "/services" },
            ]),
          ),
        }}
      />
      <div className="mx-auto max-w-7xl px-5 pt-10 lg:px-8">
        <div className="rounded-[2rem] bg-cream p-7 md:p-10">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">BookMyDarzi</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">Find your service</h1>
          <p className="mt-3 max-w-xl text-gray-600">
            Choose from our professional tailoring and alteration services - fabric picked up,
            stitched by a verified tailor, and delivered back to your door.
          </p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            <span className="flex items-center gap-1.5">
              <BadgeCheck size={15} className="text-gold-deep" /> Verified tailors only
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-gold-deep" /> Every order tracked
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin size={15} className="text-gold-deep" /> Free doorstep pickup
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Suspense fallback={null}>
          <ServicesGrid categories={categories} />
        </Suspense>
      </div>

      <section className="mt-20 bg-cream-deep">
        <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">
            Why book through BookMyDarzi
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Every service, backed the same way.
          </h2>
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

      <section className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-cream">
          <Truck size={20} className="text-gold-deep" />
        </span>
        <h2 className="mt-4 text-2xl font-black tracking-tight md:text-3xl">
          Not sure which service fits?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
          Reach out and our team will help you pick the right tailoring or alteration service for
          what you need.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-flex rounded-xl bg-ink px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
        >
          Talk to us
        </Link>
      </section>
    </main>
  );
}
