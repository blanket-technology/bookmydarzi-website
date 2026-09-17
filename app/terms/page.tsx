import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { SITE_NAME, SERVICE_AREA } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${SITE_NAME}.`,
  alternates: { canonical: "/terms" },
};

// Same grounding rule as app/privacy/page.tsx: describes the real service
// (doorstep pickup, tailor stitching, delivery, Razorpay payments, in-app
// chat support) as it actually works today. Cancellation/refund specifics
// are deliberately NOT hardcoded with numbers here (e.g. "50% penalty
// after X hours") since that policy is admin-configurable server-side
// (app/services/cancellation/policy_service.py) and could drift out of
// sync with a static page - this points to the order-flow UI, which always
// shows the current live terms before a customer cancels.
const SECTIONS = [
  {
    title: "1. The service",
    body: [
      `${SITE_NAME} is operated by Blanket Technologies Pvt Ltd. ("we", "us", "our"), a company registered in Noida, Uttar Pradesh, India. Blanket Technologies Pvt Ltd. is the parent company of ${SITE_NAME}.`,
      `${SITE_NAME} is a doorstep tailoring platform. We connect you with verified tailors, arrange fabric pickup from your home, and deliver the finished garment back to you - currently serving ${SERVICE_AREA}.`,
      "By creating an account or placing an order, you agree to these terms. You must be at least 18 years old, or using the service under the supervision of a parent or legal guardian, to place an order.",
    ],
  },
  {
    title: "2. Placing an order",
    body: [
      "You're responsible for providing accurate measurements, fabric, and delivery address details. We're not responsible for a fit issue caused by measurements you provided incorrectly, though our tailors and support team will always try to help resolve it.",
      "An order is confirmed once payment is completed and you receive an order confirmation with an order code.",
      "Prices shown at checkout are final for that order; any applicable coupon or discount is validated at the time of payment.",
    ],
  },
  {
    title: "3. Pickup and delivery",
    body: [
      "You'll choose a pickup slot when booking. Our team will collect your fabric and take measurements (where needed) at the scheduled time and address.",
      "Delivery timelines shown on your order are estimates based on the service and current tailor workload - we'll notify you of any change through the app.",
    ],
  },
  {
    title: "4. Payments",
    body: [
      "All online payments are processed securely through Razorpay. We do not store your card, UPI, or bank account details.",
      "Where cash-on-delivery is offered for a service, payment is collected at the time of delivery by our staff.",
    ],
  },
  {
    title: "5. Cancellations and refunds",
    body: [
      "You can cancel an order from the Orders page, subject to our current cancellation policy, which is shown to you at the time of cancellation and may vary depending on how far along the order is.",
      "Refunds for eligible cancellations are processed back to your original payment method through Razorpay, typically within a few business days.",
    ],
  },
  {
    title: "6. Your account",
    body: [
      "You're responsible for keeping your account password confidential and for all activity under your account.",
      "We may suspend or close an account used for fraud, abuse of our staff or tailors, or repeated policy violations.",
    ],
  },
  {
    title: "7. Quality and disputes",
    body: [
      "If a finished garment doesn't match what was ordered or has a genuine quality issue, contact us through in-app chat with your order code - we review these case by case and may offer a redo, partial refund, or other resolution depending on the situation.",
    ],
  },
  {
    title: "8. Limitation of liability",
    body: [
      `${SITE_NAME} facilitates tailoring services through independent, verified tailors. While we vet and monitor quality, we are not liable for indirect or consequential losses arising from delays or issues beyond our reasonable control.`,
    ],
  },
  {
    title: "9. Governing law and jurisdiction",
    body: [
      "These terms are governed by the laws of India. Any dispute arising out of or relating to these terms will be subject to the exclusive jurisdiction of the courts in Noida, Uttar Pradesh.",
    ],
  },
  {
    title: "10. Changes to these terms",
    body: [
      "We may update these terms as the service evolves. Continuing to use the platform after an update means you accept the revised terms.",
    ],
  },
];

export default function TermsPage() {
  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
            <FileText size={22} />
          </span>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Legal</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Terms of Service</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">
            Last updated: September 2026. Please read these terms before using {SITE_NAME}.
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
            Questions about these terms? Reach us through the{" "}
            <Link href="/contact" className="font-bold text-ink underline underline-offset-2">
              Contact page
            </Link>{" "}
            or the chat widget on any page. See also our{" "}
            <Link href="/privacy" className="font-bold text-ink underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
