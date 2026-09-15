"use client";

import { useEffect } from "react";
import Link from "next/link";

// App Router error boundary - catches any render/render-phase exception
// thrown by a page or layout below the root layout (a bad API response
// shape, a null-deref, etc.) and shows this branded state instead of
// Next.js's generic unstyled crash screen. Does NOT catch errors thrown
// from the root layout itself - see global-error.tsx for that.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[BMD] Unhandled page error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">
        Something went wrong
      </p>
      <h1 className="mt-3 text-3xl font-black">This page hit a snag</h1>
      <p className="mt-3 text-gray-600">
        We couldn&apos;t load this page. Your order, cart, and account are safe -
        try again, or head back home.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-ink px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-black text-ink transition hover:-translate-y-0.5 hover:border-gray-300"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
