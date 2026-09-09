import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import Toast from "@/components/Toast";
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_TAGLINE, SITE_URL, localBusinessJsonLd } from "@/lib/seo";

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd()) }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <ChatWidget />
        <Toast />
      </body>
    </html>
  );
}
