"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Lightweight "animate in on scroll" wrapper - no animation library, just an
// IntersectionObserver toggling the .reveal/.is-visible CSS transition
// defined in globals.css. Kept dependency-free deliberately: this only
// needs to run once per element (not a scroll-linked/looping animation), so
// a full animation library would be paying bundle weight for nothing this
// site actually uses.
//
// `delay` staggers a group of siblings (e.g. a grid of cards) so they don't
// all pop in simultaneously - pass increasing values (0, 80, 160, ...) when
// mapping over a list.
export default function ScrollReveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Already-visible-on-load elements (e.g. deep in a long page a bot
    // renders without scrolling) still need to end up visible - fire
    // immediately if IntersectionObserver isn't available at all rather
    // than leaving the element permanently at opacity:0.
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("is-visible");
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const Component = Tag as "div";
  return (
    <Component
      ref={ref}
      className={`reveal ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Component>
  );
}
