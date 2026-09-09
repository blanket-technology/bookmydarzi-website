"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faqJsonLd } from "@/lib/seo";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How does doorstep pickup work?",
    a: "After you book a service and choose a pickup slot, a member of our team comes to your address to collect your fabric and, where needed, take your measurements in person. There's no need to visit a shop.",
  },
  {
    q: "How are my measurements taken?",
    a: "Our team takes your measurements at your doorstep during pickup and saves them to your profile as a measurement profile. For future orders, you can simply reuse and edit an existing profile instead of getting measured again.",
  },
  {
    q: "Can I update my saved measurements?",
    a: "Yes. Existing measurement profiles can be viewed and edited any time from your Profile page. New profiles are created by our team the first time you get measured at pickup.",
  },
  {
    q: "How long does stitching take?",
    a: "Turnaround time depends on the service and how busy your assigned tailor is - you'll see an expected delivery date on your order once it's confirmed, and you can track its status at every stage from your Orders page.",
  },
  {
    q: "How is pricing calculated?",
    a: "Each service shows a starting price upfront on the Services page. Your final order total, including any applicable taxes and fees, is shown clearly before you confirm your booking at checkout.",
  },
  {
    q: "Can I cancel an order after booking it?",
    a: "Orders can be cancelled from your Orders page while they're still in an early stage of processing. Cancellation terms can vary depending on how far along your order is - contact support for details on your specific order.",
  },
  {
    q: "What if something doesn't fit right?",
    a: "If your finished garment doesn't match your saved measurements, contact support with your order details soon after delivery so we can help make it right.",
  },
  {
    q: "Which areas do you currently serve?",
    a: "Doorstep pickup and delivery are available in the serviceable areas shown when you enter your address at booking. If your area isn't covered yet, you'll see that at checkout.",
  },
  {
    q: "How do I track my order?",
    a: "Every order has a live status you can check from the Orders page - from order confirmation through tailor assignment, stitching and delivery - with detail on what's happening and what's next.",
  },
  {
    q: "How do I pay for an order?",
    a: "You can pay securely online at checkout. Accepted payment options are shown at the time of booking.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-bold md:text-base">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm leading-6 text-gray-600 md:text-[15px]">{a}</div>
      )}
    </div>
  );
}

export default function FaqPage() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(FAQS)) }}
      />
      <section className="bg-[#f8f6f1]">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">Help center</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Everything you need to know about booking, pickup, measurements and delivery.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-14 lg:px-8">
        <div className="space-y-3">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-gray-500">
          Still have questions?{" "}
          <a href="/contact" className="font-bold text-[#171717] hover:text-[#b4832e]">
            Get in touch with our team
          </a>
          .
        </p>
      </section>
    </main>
  );
}
