import Link from "next/link";

// Shown for any route that doesn't match (or calls notFound(), e.g. the
// catalog detail pages for a stale/mistyped service URL) - without this,
// Next.js falls back to its own generic "404" page with no branding.
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-5 text-center">
      <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">404</p>
      <h1 className="mt-3 text-3xl font-black">Page not found</h1>
      <p className="mt-3 text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-xl bg-ink px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-black"
        >
          Back to home
        </Link>
        <Link
          href="/services"
          className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-black text-ink transition hover:-translate-y-0.5 hover:border-gray-300"
        >
          Browse services
        </Link>
      </div>
    </div>
  );
}
