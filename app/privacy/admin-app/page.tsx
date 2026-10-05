import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Privacy Policy - Admin & Staff App",
  description: `How the ${SITE_NAME} Admin app collects, uses, and protects staff and customer information.`,
  alternates: { canonical: "/privacy/admin-app" },
};

// Privacy policy for the BookMyDarzi Admin app (the internal staff/tailor/
// Bridge-partner app, package com.bookmydarzi.admin) - distinct from the
// customer-facing policy at /privacy, which this app's own account holders
// are not the primary subject of. Mirrors the in-app privacy-policy screen
// (bmdadmin's src/app/(drawer)/privacy-policy.tsx) and additionally covers
// location and biometric-lock data points that screen omitted, since this
// page (not the in-app screen) is what satisfies Play Console's public
// privacy-policy-URL requirement.
const SECTIONS = [
  {
    title: "1. Who we are",
    body: [
      `The ${SITE_NAME} Admin app is operated by Blanket Technologies Pvt Ltd. ("we", "us", "our"), a company registered in Noida, Uttar Pradesh, India - the same operator as the ${SITE_NAME} customer app and website. This policy covers the ${SITE_NAME} Admin app specifically, used by our staff, delivery/pickup partners ("Bridge partners"), and tailors.`,
    ],
  },
  {
    title: "2. Who can use this app",
    body: [
      "This app has no public sign-up. Every account is created and removed by a BookMyDarzi administrator for an employee, Bridge delivery/pickup partner, or onboarded tailor. If you believe you have an account you did not request, reach us through the Contact page.",
    ],
  },
  {
    title: "3. Information we collect",
    body: [
      "Your account details: name, mobile number, email address, and role, used to sign you in and apply the correct permissions.",
      "Location: with your permission, this app uses your device's precise or approximate location to match you to nearby pickup/delivery jobs, show your live position to dispatch while a job is active, and let you go online/offline for new work. Location is not collected when you are signed out or marked offline.",
      "Biometric unlock: if you enable Face ID/fingerprint app-lock, your device's own operating system handles the biometric match - we never receive or store your fingerprint or face data ourselves.",
      "Customer data needed to do your job: depending on your role, this includes a customer's delivery address, order details, measurements, progress photos, and support chat messages for orders assigned to you.",
      "Actions you take in the app - accepting an order, updating its status, uploading a progress photo - are recorded in an audit log for support and accountability.",
    ],
  },
  {
    title: "4. How we use your information",
    body: [
      "To sign you in, apply your role's permissions, and route the right jobs to you based on your location, specialization, and availability.",
      "To let dispatch and support see where an active job stands, and to resolve disputes or support tickets about an order.",
      "To improve how jobs are matched and routed, and to fix bugs.",
      "We do not sell your personal information, and we do not use it for advertising.",
    ],
  },
  {
    title: "5. Who we share it with",
    body: [
      "Customer information visible in this app (address, contact number, order details) is shared only as needed within BookMyDarzi to fulfil that customer's order, and only with the staff/partner/tailor actually assigned to it.",
      "Your own location, while a job is active, is visible to dispatch/support staff coordinating that job, and - for a pickup/delivery in progress - may be shown to the customer so they can track their order.",
      "We do not share staff, partner, or tailor information with advertisers or data brokers.",
    ],
  },
  {
    title: "6. Data retention",
    body: [
      "Order records, chat messages, progress photos, and audit logs are retained for as long as needed for operational and legal record-keeping, consistent with Indian tax and consumer-protection law.",
      "Location data tied to a specific job is retained as part of that job's delivery history; we do not keep a continuous location trail once you go offline.",
      "When your account is deactivated by an administrator, you are signed out and can no longer access the app; retained order/audit records tied to your account follow the retention above.",
    ],
  },
  {
    title: "7. Your choices",
    body: [
      "You can grant or revoke location permission for this app at any time from your device's system settings; declining it will prevent job-matching features from working.",
      "You can enable or disable biometric app-lock from the app's Settings screen at any time.",
      "To review, correct, or request removal of your account data, contact your BookMyDarzi administrator, or reach us through the Contact page.",
    ],
  },
  {
    title: "8. Security",
    body: [
      "Passwords are stored using industry-standard one-way hashing, never in plain text.",
      "We use HTTPS/TLS encryption for all data transmitted between your device and our servers.",
      "Access to customer and order data within this app is role-based - only staff who need a piece of data to do their job can see it, and access is logged.",
    ],
  },
  {
    title: "9. Governing law",
    body: ["This policy is governed by the laws of India, with the courts of Noida, Uttar Pradesh having exclusive jurisdiction over any related dispute."],
  },
  {
    title: "10. Changes to this policy",
    body: [
      "If this policy changes in a way that affects how we handle your data, we'll update this page and, for material changes, notify you through the app.",
    ],
  },
];

export default function AdminAppPrivacyPolicyPage() {
  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
            <ShieldCheck size={22} />
          </span>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Privacy Policy - Admin &amp; Staff App
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">
            Last updated: October 2026. This explains what information the {SITE_NAME} Admin app
            collects from staff, Bridge partners, and tailors, and how it is used.
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
            Looking for the customer privacy policy instead?{" "}
            <Link href="/privacy" className="font-bold text-ink underline underline-offset-2">
              View it here
            </Link>
            . Questions about this policy? Reach us through the{" "}
            <Link href="/contact" className="font-bold text-ink underline underline-offset-2">
              Contact page
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
