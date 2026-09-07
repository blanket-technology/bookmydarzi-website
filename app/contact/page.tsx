"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Clock3,
  HelpCircle,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useChatOpenRequest } from "@/lib/chat/openChat";

// Real, currently-served area only (verified earlier this project: BMD
// operates Delhi-NCR, specifically Noida) - never claim a wider footprint
// than what's actually live.
const SERVICE_AREA = "Delhi-NCR (Noida & surrounding areas)";

// Every "department" below routes to the same single real channel (chat) -
// deliberately not split into separate inboxes that don't exist. Framing it
// as departments still helps a visitor self-select what they need before
// they start typing, which is the actual value professional contact pages
// provide - it isn't only about having more channels.
const CONTACT_ROUTES = [
  {
    icon: Smartphone,
    title: "Order support",
    desc: "Pickup, delivery, measurements, or anything about a booking in progress. Have your order code ready.",
  },
  {
    icon: Briefcase,
    title: "Partnerships & business",
    desc: "Tailor onboarding, bulk/corporate orders, or a partnership proposal for the Delhi-NCR region.",
  },
  {
    icon: HelpCircle,
    title: "General questions",
    desc: "Not sure where it fits, or found something on the website that needs fixing? Tell us and we'll route it.",
  },
];

const TRUST_POINTS = [
  {
    icon: Clock3,
    title: "Support hours",
    desc: "Our team responds to messages every day - expect a reply within one business day.",
  },
  {
    icon: ShieldCheck,
    title: "Order help",
    desc: "For anything about an existing booking, include your order code so we can help faster.",
  },
  {
    icon: MapPin,
    title: "Where we operate",
    desc: `Currently serving ${SERVICE_AREA} - doorstep pickup and delivery only within this area.`,
  },
];

// Registered office address - no API key required for a static embed
// (google.com/maps?output=embed), unlike the JS Maps SDK used for address
// pickers elsewhere on the site (which does need a billing-enabled key).
const OFFICE_ADDRESS = "G-172, Sector 63, Noida, Uttar Pradesh 201301";
const MAPS_EMBED_SRC = `https://www.google.com/maps?q=${encodeURIComponent(OFFICE_ADDRESS)}&output=embed`;
const MAPS_DIRECTIONS_HREF = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(OFFICE_ADDRESS)}`;

// No standalone contact/feedback endpoint exists on the backend today -
// verified against app/api/v1/endpoints/ (bmd repo): support.py only exposes
// ticket + threaded-message endpoints (POST /support/tickets and friends,
// requires an authenticated user), and no contact/feedback router is
// registered in app/api/v1/router.py. Rather than fake a submission or
// half-build an authenticated ticket flow this page doesn't own, route
// everyone to the real chat widget already wired site-wide (see
// components/chat/ChatWidget.tsx, mounted in app/layout.tsx) via the same
// requestOpen() call app/orders/[id]/page.tsx uses for "Reschedule pickup".
//
// Deliberately no fabricated email address, phone number, registration
// number (CIN/GSTIN), or social media handles - none of those exist for
// this business yet, and a professional contact page with fake details is
// worse than one with fewer, all-real details.
export default function ContactPage() {
  const requestChatOpen = useChatOpenRequest((s) => s.requestOpen);

  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-4xl px-5 py-16 text-center lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Contact us</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">We&apos;d love to hear from you.</h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-gray-600">
            Questions, feedback, or something not quite right with an order - chat with our team and
            we&apos;ll help you right away.
          </p>
        </div>
      </section>

      {/* ── What can we help with ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <h2 className="text-center text-2xl font-black tracking-tight">What can we help with?</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-gray-500">
          Pick what best matches your reason for reaching out - it helps us get you the right answer faster.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {CONTACT_ROUTES.map(({ icon: Icon, title, desc }) => (
            <button
              key={title}
              onClick={() => requestChatOpen()}
              className="group rounded-3xl border border-black/5 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold transition group-hover:bg-black">
                <Icon size={20} />
              </span>
              <h3 className="mt-5 text-base font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-gold-deep">
                Start a chat <MessageCircle size={13} />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Primary chat CTA + trust points ──────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-16 lg:px-8">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-3">
            <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-white p-8 text-center shadow-sm md:p-10">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-ink text-gold">
                <MessageCircle size={28} />
              </span>
              <h2 className="mt-6 text-2xl font-black">Chat with us</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-500">
                Our support chat is the fastest way to reach us - an AI assistant replies instantly and
                can hand you off to a live agent whenever you need one.
              </p>
              <button
                onClick={() => requestChatOpen()}
                className="mt-7 flex items-center gap-2 rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5"
              >
                <MessageCircle size={15} /> Start a chat
              </button>
              <p className="mt-4 text-xs font-semibold text-gray-400">
                You&apos;ll need to be signed in to chat with our team.
              </p>
            </div>

            <Link
              href="/faq"
              className="mt-4 flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cream text-gold-deep">
                  <HelpCircle size={18} />
                </span>
                <div>
                  <p className="text-sm font-black">Looking for a quick answer?</p>
                  <p className="text-xs text-gray-500">Check our Help Center before you chat - it might already be there.</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-bold text-gold-deep">View FAQs →</span>
            </Link>
          </div>

          <div className="space-y-4 md:col-span-2">
            {TRUST_POINTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 text-base font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Registered office ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-5 pb-20 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
          <div className="grid md:grid-cols-5">
            <div className="space-y-6 p-8 md:col-span-2 md:p-10">
              <div>
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink text-gold">
                  <Building2 size={18} />
                </span>
                <h2 className="mt-4 text-lg font-black">Registered office</h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Blanket Technologies Pvt. Ltd.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-gold-deep" />
                <p className="text-sm leading-6 text-gray-600">
                  G-172, Sector 63,
                  <br />
                  Noida, Uttar Pradesh 201301
                  <br />
                  India
                </p>
              </div>

              <div className="flex items-center gap-3">
                <MessageCircle size={18} className="shrink-0 text-gold-deep" />
                <button onClick={() => requestChatOpen()} className="text-sm font-bold text-ink hover:underline">
                  Chat with us for the fastest response
                </button>
              </div>

              <a
                href={MAPS_DIRECTIONS_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-ink px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-cream"
              >
                <MapPin size={14} /> Get directions
              </a>
            </div>

            <div className="min-h-[320px] md:col-span-3">
              <iframe
                title="Blanket Technologies Pvt. Ltd. - G-172, Sector 63, Noida"
                src={MAPS_EMBED_SRC}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 320 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
