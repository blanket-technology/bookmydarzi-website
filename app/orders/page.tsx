"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Lock } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import OrdersPanel from "@/components/OrdersPanel";

export default function OrdersPage() {
  const { user, checked, fetchSession } = useAuth();

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  if (checked && !user) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-20 text-center lg:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100">
          <Lock size={26} className="text-gray-400" />
        </span>
        <h1 className="mt-6 text-3xl font-black">Sign in to view your orders</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
          Track pickups, stitching progress and deliveries once you&apos;re signed in.
        </p>
        <Link
          href="/login?redirect=/orders"
          className="mt-8 inline-flex rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5"
        >
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Account</p>
      <h1 className="mt-2 text-4xl font-black">My orders</h1>
      <div className="mt-8">{!user && !checked ? null : <OrdersPanel />}</div>
    </main>
  );
}
