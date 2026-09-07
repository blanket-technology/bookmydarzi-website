import { BadgeCheck, Clock3, ShieldCheck, Truck } from "lucide-react";

// Shared trust-signal and testimonial copy, reused across the home, about
// and services pages so the same claims and voice appear everywhere a new
// customer might land - not just on the homepage.

export const TRUST_SIGNALS = [
  {
    icon: BadgeCheck,
    title: "Verified tailors",
    desc: "Every tailor is background-checked and skill-vetted before joining the platform.",
  },
  {
    icon: Truck,
    title: "Doorstep pickup",
    desc: "We collect your fabric and measurements right from your home, no showroom visits.",
  },
  {
    icon: Clock3,
    title: "On-time delivery",
    desc: "Track your order at every stage, from cutting to final stitching to delivery.",
  },
  {
    icon: ShieldCheck,
    title: "Secure payments",
    desc: "Bank-grade encryption on every transaction, with cash on delivery always available.",
  },
];

// Real testimonials now come from lib/services/testimonials.ts
// (GET /home/testimonials, genuine ORDER_RATINGS only) - this file
// previously hardcoded fake names/quotes attributed to cities BookMyDarzi
// has never served (Bengaluru, Hyderabad). See that module instead.
