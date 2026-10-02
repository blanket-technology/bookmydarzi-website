"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { LucideIcon } from "lucide-react";
import { Clock3, PackageCheck, Ruler, ShoppingBag, Truck } from "lucide-react";
import GarmentSceneLazy from "./GarmentSceneLazy";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface Step {
  icon: LucideIcon;
  title: string;
  desc: string;
}

const STEPS: Step[] = [
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
];

/** The process section, redone as scrollytelling: the garment scene pins on
 * the left (desktop) and its fold-state scrubs from "relaxed drape" to
 * "finished/taut" as the visitor scrolls through the 5 steps on the right,
 * each step highlighting in turn. Mobile drops the pin (same reasoning as
 * HeroPinned) and shows a lighter per-step reveal instead, still with the
 * scene scrubbing in the background. */
export default function ProcessScrollytelling() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef(0);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const steps = stepRefs.current.filter(Boolean) as HTMLDivElement[];
      if (steps.length === 0) return;

      gsap.set(steps.slice(1), { opacity: 0.35 });

      const trigger = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: `+=${steps.length * 50}%`,
          pin: true,
          scrub: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
          },
        },
      });

      steps.forEach((step, i) => {
        if (i > 0) {
          trigger.to(step, { opacity: 1, duration: 0.15 }, i * 0.2);
          trigger.to(steps[i - 1], { opacity: 0.35, duration: 0.15 }, i * 0.2);
        }
      });

      return () => trigger.scrollTrigger?.kill();
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative bg-[#171717] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:min-h-screen md:grid-cols-2 md:items-center md:px-8">
        <div className="relative order-2 h-[320px] md:order-1 md:h-[460px]">
          <GarmentSceneLazy progress={progressRef} className="h-full w-full opacity-80" />
        </div>

        <div className="order-1 md:order-2">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#d2aa5c]">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">
            From browsing to your doorstep.
          </h2>

          <div className="mt-10 flex flex-col gap-8">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="border-t border-white/15 pt-5 transition-opacity md:transition-none"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c99a3d] text-[#171717]">
                    <step.icon size={16} />
                  </span>
                  <span className="text-sm font-black uppercase tracking-wide text-[#d2aa5c]">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-bold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/50">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
