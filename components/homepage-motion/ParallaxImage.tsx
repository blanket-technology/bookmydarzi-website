"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Subtle vertical parallax on a single element as it crosses the
 * viewport - cheap (no pin, no scene, just a transform scrub) compared to
 * HeroPinned/ProcessScrollytelling, meant for the catalog grid and
 * testimonial cards rather than a centerpiece moment. No-ops entirely under
 * prefers-reduced-motion. */
export default function ParallaxImage({
  children,
  strength = 24,
  className = "",
}: {
  children: React.ReactNode;
  /** Max px of vertical travel across the element's scroll-through. */
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tween = gsap.fromTo(
        el,
        { y: -strength },
        {
          y: strength,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
      return () => tween.scrollTrigger?.kill();
    });

    return () => mm.revert();
  }, [strength]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
