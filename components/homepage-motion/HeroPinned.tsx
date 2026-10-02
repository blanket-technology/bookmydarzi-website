"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import PincodeServiceabilityCheck from "@/components/PincodeServiceabilityCheck";
import FeaturedHeroCard, { type FeaturedLine } from "@/components/FeaturedHeroCard";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Replaces the static two-column hero with a pinned one: the featured
 * product card stays centered while the headline/CTA column fades and lifts
 * out as the visitor scrolls past, revealing the page underneath - the
 * actual Apple-marketing-page mechanic (pin a visual, scrub text past it)
 * rather than a generic parallax. On prefers-reduced-motion, GSAP's own
 * matchMedia guard below skips the pin/scrub entirely and the section just
 * sits static, same as before this redesign. */
export default function HeroPinned({ featured }: { featured: FeaturedLine[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const text = textRef.current;
    if (!section || !text) return;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
        isMobile: "(max-width: 767px) and (prefers-reduced-motion: no-preference)",
      },
      (context) => {
        const { isMobile } = context.conditions as { isMobile: boolean };

        // Full pin on desktop; on mobile, scroll-hijacking a pinned section
        // reads as "the page is stuck" against touch-momentum scroll, so
        // mobile gets the scrub (garment still morphs/rotates with scroll)
        // without the pin itself - shorter, no fixed-in-place feel.
        const trigger = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: isMobile ? "+=60%" : "+=120%",
            pin: !isMobile,
            scrub: 1,
          },
        });

        trigger.to(text, { opacity: 0, y: -40, ease: "none" }, 0);

        return () => trigger.scrollTrigger?.kill();
      },
    );

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#f8f6f1]">
      <div className="mx-auto grid min-h-[90vh] max-w-7xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:px-8">
        <div ref={textRef}>
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
              className="group rounded-xl bg-[#171717] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
            >
              Book a Service{" "}
              <ArrowRight className="ml-2 inline transition-transform duration-300 group-hover:translate-x-1" size={16} />
            </Link>
            <Link
              href="/orders"
              className="rounded-xl border border-black/10 bg-white px-6 py-3.5 text-sm font-bold transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-50 hover:shadow-md"
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
          <PincodeServiceabilityCheck />
        </div>

        <div className="relative mx-auto h-[420px] w-full max-w-[520px] md:h-[560px]">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#c99a3d]/20 blur-2xl" />
          <FeaturedHeroCard featured={featured} />
        </div>
      </div>
    </section>
  );
}
