"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Site-wide inertial/smooth scroll, driving GSAP's ticker so every
 * ScrollTrigger-based animation (pinned sections, scrubbed timelines) reads
 * scroll position from the same smoothed value the user actually sees, not
 * native (possibly step-y, OS-dependent) scroll events.
 *
 * Respects prefers-reduced-motion: Lenis is never instantiated at all for a
 * user who's asked for reduced motion, so scrolling stays native/instant and
 * nothing here fights that preference - same courtesy ScrollReveal already
 * gives via its own prefers-reduced-motion check. */
export default function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove(lenis.raf);
    };
  }, []);

  return <>{children}</>;
}
