import type { NextConfig } from "next";

// Enables next/image's automatic responsive srcset + lazy-loading + modern
// format (AVIF/WebP) conversion for the two hosts every product/service
// photo actually comes from (see app/api/v1/services and catalog
// endpoints): ImageKit for uploaded catalog/lookbook assets, and the
// backend's own /static/... path for a handful of built-in category icons.
// Without this file, next/image throws for any external host at request
// time - every image on the site was a raw <img> tag as a result, which
// skips all of that optimization and hurts mobile load time the most on
// image-heavy pages (the services grid alone renders ~34 photos).
// Content-Security-Policy allowlist, kept in one place so it's obvious what
// each entry is for and doesn't silently drift from what the site actually
// loads. Razorpay's checkout widget needs its own script + iframe origins;
// everything else (fonts, analytics, ad pixels) is deliberately absent -
// nothing here loads them today, so don't pre-allow them speculatively.
// Next's dev-mode React Refresh/HMR runtime evaluates code via eval() /
// new Function() - blocking that with a strict script-src silently breaks
// EVERY client component in dev (they fail to hydrate at all, with only a
// CSP violation in the console to explain why - caught this the hard way
// via ScrollReveal never running). Production doesn't need it.
const isDev = process.env.NODE_ENV !== "production";

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' is required for Next.js's own hydration/RSC bootstrap
  // scripts (no nonce plumbing exists yet); Razorpay's checkout.js is
  // loaded on the checkout/book-now/order-detail payment screens.
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}https://checkout.razorpay.com`,
  // Next.js injects some critical CSS inline; nothing else does.
  "style-src 'self' 'unsafe-inline'",
  // Catalog/lookbook photos (ImageKit), the backend's built-in category
  // icons, and data: URIs for small inline assets (e.g. blur placeholders).
  "img-src 'self' data: https://ik.imagekit.io https://web-production-efff7.up.railway.app",
  // API calls to the backend, plus the site's own WebSocket connection for
  // live order-status updates (wss: covers both same-origin and the
  // backend's own ws endpoint since Next rewrites/proxies aren't used here).
  "connect-src 'self' https://web-production-efff7.up.railway.app wss://web-production-efff7.up.railway.app",
  // Razorpay's checkout renders inside an iframe it injects itself; the
  // Contact page embeds a Google Maps iframe for the office location.
  "frame-src https://checkout.razorpay.com https://api.razorpay.com https://www.google.com",
  "font-src 'self' data:",
  // Nobody should be able to load this site inside a hidden iframe
  // elsewhere (clickjacking) - redundant with the X-Frame-Options header
  // below for browsers that only honor one or the other.
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
      {
        protocol: "https",
        hostname: "web-production-efff7.up.railway.app",
        pathname: "/static/**",
      },
    ],
  },
  // Production-grade security headers, applied to every route. None of
  // these change behavior for a legitimate visitor - they only close off
  // classes of attack (clickjacking, MIME-sniffing, referrer leakage,
  // protocol downgrade) that a site with zero configured headers is
  // otherwise fully exposed to.
  async headers() {
    return [
      // apple-app-site-association has no file extension, so Next serves it
      // with a default content type unless told otherwise - iOS requires
      // application/json (or it silently fails Universal Links
      // verification with no visible error anywhere in the app).
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
          // Only meaningful over HTTPS (which production already is, behind
          // Vercel/whatever host terminates TLS) - browsers ignore it on
          // plain HTTP, so this is safe to send unconditionally.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
