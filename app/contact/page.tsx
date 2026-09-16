"use client";

import { ArrowUpRight, Building2, Clock3, MapPin, MessageCircle } from "lucide-react";
import { useChatOpenRequest } from "@/lib/chat/openChat";

// Real, currently-served area only (verified earlier this project: BMD
// operates Delhi-NCR, specifically Noida) - never claim a wider footprint
// than what's actually live.
const SERVICE_AREA = "Delhi-NCR (Noida & surrounding areas)";

// Registered office address - no API key required for a static embed
// (google.com/maps?output=embed), unlike the JS Maps SDK used for address
// pickers elsewhere on the site (which does need a billing-enabled key).
const OFFICE_ADDRESS = "G-172, Sector 63, Noida, Uttar Pradesh 201301";
const MAPS_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(OFFICE_ADDRESS)}&output=embed`;
const MAPS_DIRECTIONS_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`;

// Modeled on how Stripe/Linear/Vercel structure a contact page: a
// confident, uncluttered hero, then a clean two-column split (the one
// real way to reach us, and where we're based) instead of a wall of
// stacked sections. No fabricated "departments" grid, no duplicated FAQ
// preview, no separate trust-points column - previous version stacked
// five sections for what's actually a two-fact answer.
//
// No standalone contact/feedback endpoint exists on the backend today -
// verified against app/api/v1/endpoints/ (bmd repo): support.py only
// exposes ticket + threaded-message endpoints (requires an authenticated
// user), and no contact/feedback router is registered in
// app/api/v1/router.py. Route everyone to the real chat widget already
// wired site-wide instead of half-building an authenticated ticket flow
// this page doesn't own.
//
// Deliberately no fabricated email address, phone number, registration
// number (CIN/GSTIN), or social media handles - none of those exist for
// this business yet, and a contact page with fake details is worse than
// one with fewer, all-real ones.
export default function ContactPage() {
  const requestChatOpen = useChatOpenRequest((s) => s.requestOpen);

  return (
    <main>
      <section className="border-b border-black/5">
        <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Contact</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black leading-[1.05] tracking-[-.03em] md:text-6xl">
            Let&apos;s talk.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-gray-600 md:text-lg">
            Questions about an order, feedback, or a partnership idea - our team reads and
            replies to every message.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-black/5 bg-black/5 md:grid-cols-2">
          {/* ── Chat ─────────────────────────────────────────────────────── */}
          <button
            onClick={() => requestChatOpen()}
            className="group flex flex-col items-start bg-white p-8 text-left transition hover:bg-cream md:p-12"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
              <MessageCircle size={22} />
            </span>
            <h2 className="mt-6 text-2xl font-black tracking-tight">Chat with us</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
              The fastest way to reach us. An assistant replies instantly and can bring in a
              teammate whenever you need one.
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink">
              Start a chat
              <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-6 flex items-center gap-1.5 border-t border-black/5 pt-5 text-xs font-semibold text-gray-400">
              <Clock3 size={13} /> Replies within 1 business day
            </span>
          </button>

          {/* ── Office ───────────────────────────────────────────────────── */}
          <a
            href={MAPS_DIRECTIONS_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-start bg-white p-8 text-left transition hover:bg-cream md:p-12"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
              <Building2 size={22} />
            </span>
            <h2 className="mt-6 text-2xl font-black tracking-tight">Our office</h2>
            <p className="mt-2 text-sm font-bold text-ink">Blanket Technologies Pvt. Ltd.</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-gray-500">
              G-172, Sector 63, Noida, Uttar Pradesh 201301, India
            </p>
            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-ink">
              Get directions
              <ArrowUpRight size={15} className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
            <span className="mt-6 flex items-center gap-1.5 border-t border-black/5 pt-5 text-xs font-semibold text-gray-400">
              <MapPin size={13} /> Currently serving {SERVICE_AREA}
            </span>
          </a>
        </div>

        <div className="mt-px overflow-hidden rounded-3xl border border-black/5">
          <iframe
            title="Blanket Technologies Pvt. Ltd. - G-172, Sector 63, Noida"
            src={MAPS_EMBED_SRC}
            width="100%"
            height="320"
            style={{ border: 0, display: "block" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </main>
  );
}
