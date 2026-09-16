import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Delete Your Account",
  description: `How to delete your ${SITE_NAME} account and what happens to your data afterward.`,
  alternates: { canonical: "/delete-account" },
};

// Public, unauthenticated page describing account/data deletion - required
// by Google Play's Data Safety section independently of the in-app
// self-service action (Profile > Account details > Danger zone on both the
// website and the mobile app). Must stay in sync with what deletion
// actually does: DELETE /users/me soft-deletes the User row (IsDeleted/
// IsActive flags) - it does not cascade-delete orders, addresses,
// measurements, or chat history, and there is no separate hard-delete/
// purge job. Overstating this as instant full erasure would be an
// inaccurate compliance claim - see app/privacy/page.tsx's "Data retention"
// section for the same wording used there.
const STEPS = [
  "Log in to your account on the BookMyDarzi website or mobile app.",
  "Go to Profile, then open the Account details tab.",
  "Scroll to the \"Danger zone\" section and select \"Delete my account\".",
  "Confirm twice - this is a deliberate, permanent action.",
];

const RETAINED = [
  "Order history, invoices, and payment records - kept for the period required by Indian tax and consumer-protection law.",
  "Records needed to investigate fraud, abuse, or a dispute already in progress.",
];

const REMOVED = [
  "Your login access - you're signed out on every device immediately, and can no longer sign back in.",
  "Visibility of your profile, saved addresses, and measurement profiles - no longer shown to you or to our staff.",
  "Your account no longer appears in customer search or reporting used for day-to-day operations.",
];

export default function DeleteAccountPage() {
  return (
    <main>
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-5 py-16 text-center lg:px-8">
          <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink text-gold">
            <ShieldAlert size={22} />
          </span>
          <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Account &amp; Data</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Delete Your Account</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-gray-500">
            You can permanently delete your {SITE_NAME} account yourself, at any time, from the
            website or the mobile app - no need to contact support.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 lg:px-8">
        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-black tracking-tight">How to delete your account</h2>
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
            <p className="mt-4 text-sm leading-6 text-gray-500">
              Already signed in?{" "}
              <Link href="/profile" className="font-bold text-ink underline underline-offset-2">
                Go to your account
              </Link>{" "}
              to delete it now.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight">What&apos;s removed immediately</h2>
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
              Full details of what data we collect and how long we keep it are in our{" "}
              <Link href="/privacy" className="font-bold text-ink underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black tracking-tight">Can&apos;t log in, or need help?</h2>
            <p className="mt-3 text-sm leading-7 text-gray-600">
              If you can&apos;t access your account (lost your number, etc.) and want it deleted,
              reach out through the{" "}
              <Link href="/contact" className="font-bold text-ink underline underline-offset-2">
                Contact page
              </Link>{" "}
              or the chat widget on any page - our team can verify your identity and delete the
              account on your behalf.
            </p>
          </div>
        </div>

        <div className="mt-14 rounded-3xl border border-black/5 bg-cream p-6 text-center">
          <p className="text-sm text-gray-600">
            Questions about this process or your data? Reach us through the{" "}
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
