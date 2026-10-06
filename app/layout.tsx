import type { Metadata } from "next";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import Toast from "@/components/Toast";
import SmoothScrollProvider from "@/components/homepage-motion/SmoothScrollProvider";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_TAGLINE, SITE_URL, jsonLdScript, localBusinessJsonLd } from "@/lib/seo";

// Both read from env so nothing breaks (or sends fake/placeholder data to
// Google) before real values are set in production:
//   NEXT_PUBLIC_GA_MEASUREMENT_ID - from analytics.google.com (GA4 property
//     -> Admin -> Data Streams -> your web stream -> "G-XXXXXXXXXX")
//   GOOGLE_SITE_VERIFICATION - from search.google.com/search-console ->
//     Settings -> Ownership verification -> HTML tag method -> the
//     content="..." value only (not the whole <meta> tag)
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const GOOGLE_SITE_VERIFICATION = process.env.GOOGLE_SITE_VERIFICATION;

// metadataBase makes every relative openGraph/twitter image URL in every
// page's generateMetadata resolve to a real absolute URL automatically -
// without it, Next warns and social crawlers get a broken image path.
// title.template applies "<page title> | BookMyDarzi" to every page that
// sets its own title, while title.default covers any page that doesn't
// (so nothing ever falls back to a blank <title>).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Doorstep tailoring and alteration service in Delhi NCR. Fabric picked up from your home, stitched by a verified tailor, delivered back to your door.",
  keywords: [
    "tailor near me",
    "doorstep tailoring",
    "online tailor booking",
    "alterations Noida",
    "custom stitching Delhi NCR",
    "blouse stitching",
    "suit alteration",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: "Doorstep tailoring and alteration service in Delhi NCR.",
    url: SITE_URL,
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - ${SITE_TAGLINE}`,
    description: "Doorstep tailoring and alteration service in Delhi NCR.",
    images: [DEFAULT_OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  // No explicit `icons` entry - app/icon.png already exists as a Next.js
  // file-convention favicon (auto-detected, no metadata config needed);
  // declaring it again here would just duplicate/conflict with that.
  // `verification.google` renders the Search Console ownership <meta> tag
  // automatically when set - omitted entirely (not an empty string) when
  // unset, so Next doesn't emit a broken meta tag with no content.
  ...(GOOGLE_SITE_VERIFICATION ? { verification: { google: GOOGLE_SITE_VERIFICATION } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          // Site-wide LocalBusiness identity - safe to include on every
          // page (not just "/"), since Google associates it with the whole
          // site's @id rather than re-declaring a new business per page.
          dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessJsonLd()) }}
        />
      </head>
      <body>
        <SmoothScrollProvider>
          <Header />
          {children}
          <Footer />
          <ChatWidget />
          <Toast />
        </SmoothScrollProvider>
        {/* @next/third-parties' GoogleAnalytics lazy-loads gtag.js via
            next/script's "afterInteractive" strategy under the hood - it
            doesn't block initial page render/LCP the way a naive <script>
            tag in <head> would. Renders nothing (not even an empty script
            tag) when GA_MEASUREMENT_ID is unset. */}
        {GA_MEASUREMENT_ID ? <GoogleAnalytics gaId={GA_MEASUREMENT_ID} /> : null}
      </body>
    </html>
  );
}
