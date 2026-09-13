import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} collects, uses, and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

// Written to describe what this platform actually does with data, verified
// against the real data model/flows (app/models/user.py, address.py,
// measurement.py, and the Razorpay payment integration in
// app/integrations/razorpay/), not a generic boilerplate template. No
// company registration number, legal entity name, or dedicated privacy
// email is stated here - none of those exist for this business yet (see
// app/contact/page.tsx's own note on this), so "contact us about this"
// language below routes to the same real chat channel every other page
// uses, rather than inventing an address nobody can reply to.
const SECTIONS = [
  {
    title: "1. Information we collect",
    body: [
      "Account details you provide directly: name, email address, mobile number, and a password (stored as a one-way hash - we never see or store your actual password).",
      "Service information: delivery addresses, garment measurements, fabric/style notes, and photos you choose to upload for a custom order.",
      "Order and payment information: what you ordered, order status history, and payment status. Card, UPI, and bank details are handled entirely by Razorpay, our payment processor - we never receive or store your full card number, CVV, or UPI PIN.",
      "Support and communication: messages you send through in-app chat, so our team can help with an order.",
      "Usage information collected automatically: device type, browser, and pages visited, used only to keep the site working correctly and to diagnose problems.",
    ],
  },
  {
    title: "2. How we use your information",
    body: [
      "To create and manage your account, and to process and fulfil your orders (assigning a tailor, scheduling pickup/delivery, and tracking status).",
      "To communicate with you about an order - confirmations, status updates, and support responses.",
      "To process payments securely through Razorpay and to detect and prevent fraud.",
      "To improve the service - understanding which features are used, and fixing bugs.",
      "We do not sell your personal information to anyone, for any reason.",
    ],
  },
  {
    title: "3. Who we share information with",
    body: [
      "The tailor assigned to your order sees only what's needed to complete it (garment type, measurements, delivery pincode/area) - never your full address, phone number, or payment details.",
      "Our delivery/pickup staff see your address and contact number only for orders assigned to them, only for as long as needed to complete that pickup or delivery.",
      "Razorpay processes your payment directly; we share only what's required to charge and confirm payment for an order.",
      "We do not share your information with advertisers or data brokers.",
    ],
  },
  {
    title: "4. Data retention",
    body: [
      "We keep your account and order history for as long as your account is active, so you can view past orders and reorder easily.",
      "If you ask us to delete your account, we remove your personal information from active use, retaining only what we're legally required to keep (such as transaction records for tax purposes).",
    ],
  },
  {
    title: "5. Your choices",
    body: [
      "You can review and update your name, email, mobile number, and saved addresses at any time from your Profile page.",
      "You can request a copy of your data, or ask us to delete your account, by reaching out through the chat widget available on every page, or via the Contact page.",
    ],
  },
  {
    title: "6. Security",
    body: [
      "Passwords are stored using industry-standard one-way hashing, never in plain text. Payment details are handled entirely by Razorpay's PCI-DSS-compliant infrastructure - they never pass through our servers in a readable form.",
      "We use HTTPS encryption for all data transmitted between your device and our servers.",
    ],
  },
  {
    title: "7. Changes to this policy",
    body: [
      "If this policy changes in a way that affects how we handle your data, we'll update this page and, for material changes, notify you through the app or via email.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
            <ShieldCheck size={22} />
          </span>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Privacy Policy</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">
            Last updated: September 2026. This explains what information {SITE_NAME} collects, how
            we use it, and the choices you have.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-black tracking-tight">{section.title}</h2>
              <ul className="mt-3 space-y-2.5">
                {section.body.map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-7 text-gray-600">
                    <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gold-deep" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 rounded-3xl border border-black/5 bg-cream p-6 text-center">
          <p className="text-sm text-gray-600">
            Questions about this policy or your data? Reach us through the{" "}
            <Link href="/contact" className="font-bold text-ink underline underline-offset-2">
              Contact page
            </Link>{" "}
            or the chat widget on any page.
          </p>
        </div>
      </section>
    </main>
  );
}
