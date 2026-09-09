import type { Metadata } from "next";

// app/faq/page.tsx is a client component ("use client", for the accordion
// toggle state) - a page/layout marked "use client" cannot export
// `metadata` (that's a server-only export), so this sibling server layout
// carries it instead. Next merges layout + page metadata automatically.
export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to common questions about BookMyDarzi's doorstep tailoring service - measurements, pricing, turnaround time, and cancellations.",
  alternates: { canonical: "/faq" },
  openGraph: { title: "FAQ | BookMyDarzi", url: "/faq" },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
