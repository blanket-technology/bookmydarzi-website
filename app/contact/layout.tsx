import type { Metadata } from "next";

// app/contact/page.tsx is a client component ("use client", for the chat
// open handler) - see app/faq/layout.tsx for why metadata lives here instead.
export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with BookMyDarzi's support team - questions about orders, pickup, or our doorstep tailoring service in Noida & Delhi NCR.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact BookMyDarzi", url: "/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
