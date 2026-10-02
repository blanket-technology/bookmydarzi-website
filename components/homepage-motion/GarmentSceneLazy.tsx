"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const GarmentScene = dynamic(() => import("./GarmentScene"), { ssr: false });

/** Mounts the Three.js canvas only once it's actually near the viewport
 * (IntersectionObserver, same pattern as ScrollReveal) and never at all for
 * prefers-reduced-motion - a static gradient card takes its place instead,
 * so a motion-sensitive visitor gets a calm page, not a canvas that just
 * never moves. This also keeps the WebGL context (real GPU/CPU cost) from
 * ever being created on a page load where the visitor never scrolls that
 * far - the 3D bundle itself is still only fetched on first real use via
 * the dynamic() import above, not blocking initial page load either way. */
export default function GarmentSceneLazy({
  progress,
  className = "",
}: {
  progress: React.RefObject<number>;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const el = wrapRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div ref={wrapRef} className={className}>
      {reducedMotion ? (
        <div className="h-full w-full rounded-[2rem] bg-gradient-to-br from-[#d7d0c5] via-[#a79e91] to-[#625d56]" />
      ) : shouldMount ? (
        <GarmentScene progress={progress} />
      ) : (
        <div className="h-full w-full animate-pulse rounded-[2rem] bg-gradient-to-br from-[#d7d0c5] via-[#a79e91] to-[#625d56]" />
      )}
    </div>
  );
}
