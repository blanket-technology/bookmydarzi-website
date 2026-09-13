import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="mt-20 bg-[#171717] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="BookMyDarzi" width={36} height={36} className="h-9 w-9 object-contain" />
            <div className="text-xl font-black">BookMy<span className="text-[#c99a3d]">Darzi</span></div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/50">
            Professional tailoring services, made simple. Book from home and get the perfect fit.
          </p>
        </div>
        <div>
          <p className="font-bold">Explore</p>
          <div className="mt-4 space-y-3 text-sm text-white/55">
            <Link className="block hover:text-white" href="/services">Services</Link>
            <Link className="block hover:text-white" href="/orders">My Orders</Link>
            <Link className="block hover:text-white" href="/profile">Profile</Link>
          </div>
        </div>
        <div>
          <p className="font-bold">Support</p>
          <div className="mt-4 space-y-3 text-sm text-white/55">
            <Link className="block w-fit transition-colors hover:text-white" href="/faq">Help Center</Link>
            <Link className="block w-fit transition-colors hover:text-white" href="/contact">Contact Us</Link>
            <Link className="block w-fit transition-colors hover:text-white" href="/about">About Us</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 text-center text-xs text-white/35 sm:flex-row sm:justify-between sm:text-left">
          <p>© 2026 Blanket Technologies Pvt. Ltd. All rights reserved. BookMyDarzi is a Blanket Technologies product.</p>
          <div className="flex items-center gap-4">
            <Link className="transition-colors hover:text-white/70" href="/privacy">Privacy Policy</Link>
            <Link className="transition-colors hover:text-white/70" href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
