import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatWidget from "@/components/chat/ChatWidget";
import Toast from "@/components/Toast";

export const metadata = {
  title: "BookMyDarzi - Perfect Fit, Delivered",
  description: "Book professional tailoring services online."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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