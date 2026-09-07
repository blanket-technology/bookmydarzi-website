import "./globals.css";
import { Fraunces, Inter } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import Toast from "@/components/Toast";

// Fraunces: a warm, editorial serif for headlines - carries the "atelier"
// feel the plain sans couldn't. Inter stays for body/UI text (already used
// throughout the app's forms/tables, so switching it would be a much larger
// change). Both self-hosted via next/font, zero runtime request to Google.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "BookMyDarzi - Perfect Fit, Delivered",
  description: "Book professional tailoring services online."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
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