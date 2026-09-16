"use client";

import { create } from "zustand";
import { apiClient } from "@/lib/apiClient";

// Live item count for a LOGGED-IN user's real server cart (GET /cart) -
// same shared-store pattern as lib/unreadNotifications.ts's notification
// badge, and the counterpart to lib/guestCart.ts's useGuestCartCount() for
// a not-logged-in visitor. The header previously showed no cart badge at
// all for a logged-in user: there was no shared store for the server
// cart's count, only per-page local useState on /cart itself, so the
// header (and every other page) had no way to know it changed.
//
// Kept deliberately dumb - just a number - rather than mirroring the full
// cart contents here. A mutation that already knows its own delta (adding
// N items) calls setCount directly instead of paying for a full re-fetch;
// refetch() exists for the one case that genuinely needs a real fetch:
// the header on mount/login, when nothing else has told it what the count
// is yet.
interface CartCountState {
  count: number;
  setCount: (count: number) => void;
  refetch: () => Promise<void>;
}

export const useCartCount = create<CartCountState>((set) => ({
  count: 0,
  setCount: (count) => set({ count: Math.max(0, count) }),
  refetch: async () => {
    try {
      const cart = await apiClient<{ service_entries?: { quantity: number }[] }>("/cart");
      const count = (cart.service_entries ?? []).reduce((sum, e) => sum + (e.quantity || 0), 0);
      set({ count: Math.max(0, count) });
    } catch {
      // No cart yet (brand new account) or a transient failure - leave the
      // current count as-is rather than forcing a misleading 0 on a real
      // network error. A subsequent mutation or page load retries.
    }
  },
}));
