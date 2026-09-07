import "server-only";
import { bmdFetch } from "@/lib/api";

// Real customer reviews only - GET /home/testimonials only ever returns a
// genuine ORDER_RATINGS row (4-5 stars, has a written comment), never
// fabricated copy. Replaces the old lib/trustContent.ts TESTIMONIALS array,
// which hardcoded fake names and quotes attributed to cities (Bengaluru,
// Hyderabad) BookMyDarzi has never actually served - a real trust problem,
// not just a content nit. Public endpoint - safe to call from any Server
// Component.
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
    const res = await bmdFetch<TestimonialsResponse>(`/home/testimonials?limit=${limit}`, {
      skipAuth: true,
    });
    return res.testimonials;
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
