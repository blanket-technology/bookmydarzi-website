import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Delete Your Account - Admin App",
  description: `How to request deletion of your ${SITE_NAME} Admin app account and what happens to your data afterward.`,
  alternates: { canonical: "/delete-account/admin-app" },
};

// Public, unauthenticated page describing account deletion for the
// BookMyDarzi Admin app (com.bookmydarzi.admin) - required by Google
// Play's Data Safety "Delete account URL" field. Unlike the customer app's
// /delete-account (self-service, DELETE /users/me), this app provisions
// and removes accounts only through an administrator - there is no
// self-service deletion action in the app itself (see bmdadmin's
// src/app/(drawer)/privacy-policy.tsx "Accounts" section). The steps below
// reflect that reality rather than claiming an in-app flow that doesn't
// exist.
const STEPS = [
  "Contact your BookMyDarzi administrator directly, or reach us through the Contact page below.",
  "Confirm your identity (name, role, and the email/phone used for your account).",
  "An administrator deactivates your account - you are signed out on every device and can no longer sign in.",
];

const RETAINED = [
  "Order, dispatch, and audit records tied to actions you took (orders accepted, status updates, progress photos) - kept for operational and legal record-keeping, consistent with Indian tax and consumer-protection law.",
  "Records needed to investigate a dispute, fraud, or abuse already in progress.",
];

const REMOVED = [
  "Your login access - every active session is revoked and you can no longer sign in.",
  "Push notifications to your device stop immediately.",
  "Your visibility into customer orders, addresses, and chat - no longer accessible once your account is deactivated.",
];

export default function DeleteAdminAppAccountPage() {
  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
            <ShieldAlert size={22} />
          </span>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Account &amp; Data</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Delete Your Admin App Account
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">
            Accounts on the {SITE_NAME} Admin app are provisioned by an administrator, so account
            deletion is requested through your administrator rather than a self-service action in
            the app.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-black tracking-tight">How to request deletion</h2>
            <ol className="mt-3 space-y-2.5">
              {STEPS.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm leading-7 text-gray-600">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-bold text-gold">
                    {i + 1}
                  </span>
                  {line}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight">What&apos;s removed</h2>
            <ul className="mt-3 space-y-2.5">
              {REMOVED.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm leading-7 text-gray-600">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gold-deep" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight">What we retain, and why</h2>
            <ul className="mt-3 space-y-2.5">
              {RETAINED.map((line, i) => (
                <li key={i} className="flex gap-3 text-sm leading-7 text-gray-600">
                  <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-gold-deep" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              Full details of what data we collect and how long we keep it are in the{" "}
              <Link href="/privacy/admin-app" className="font-bold text-ink underline underline-offset-2">
                Admin App Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mt-14 rounded-3xl border border-black/5 bg-cream p-6 text-center">
          <p className="text-sm text-gray-600">
            Need your account deactivated or have questions about this process? Reach us through
            the{" "}
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
