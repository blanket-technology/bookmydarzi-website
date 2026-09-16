import "server-only";
import { BMD_API_V1 } from "@/lib/config";

// Real customer reviews only - GET /home/testimonials only ever returns a
// genuine ORDER_RATINGS row (4-5 stars, has a written comment), never
// fabricated copy. Replaces the old lib/trustContent.ts TESTIMONIALS array,
// which hardcoded fake names and quotes attributed to cities (Bengaluru,
// Hyderabad) BookMyDarzi has never actually served - a real trust problem,
// not just a content nit. Public endpoint - safe to call from any Server
// Component.
//
// Deliberately does NOT go through lib/api.ts's bmdFetch, which always
// sets cache: "no-store" (correct for authenticated/user-specific data,
// which must never be shared across users) - this data is genuinely
// public and identical for every visitor, so no-store was forcing every
// page that renders testimonials (About, Get Started) to opt out of
// static generation entirely and re-fetch on every single request,
// hurting response time and Next.js's build-time prerendering for no
// real benefit. A 10-minute revalidation window is fine for testimonials -
// a brand-new 5-star review being invisible for up to 10 minutes is a
// non-issue, unlike stale auth/cart/order data.
export interface Testimonial {
  name: string;
  location: string | null;
  quote: string;
  rating: number;
}

interface TestimonialsResponse {
  testimonials: Testimonial[];
  total: number;
}

export async function getTestimonials(limit = 6): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${BMD_API_V1}/home/testimonials?limit=${limit}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`testimonials fetch failed: ${res.status}`);
    const data = (await res.json()) as TestimonialsResponse;
    return data.testimonials;
  } catch (err) {
    // A platform this new can genuinely have zero qualifying reviews some
    // days - never let a slow/failed backend call break the homepage; the
    // caller renders its own empty-state instead of a testimonials section.
    // Logged (server-side only, via `next dev`'s terminal - never sent to
    // the browser) so a real fetch failure (e.g. this dev server's own
    // DNS/network reaching the backend) is distinguishable from the
    // legitimate "no reviews yet" case, which previously looked identical.
    console.error("[BMD] Failed to load testimonials:", err);
    return [];
  }
}
