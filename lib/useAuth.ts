"use client";

import { create } from "zustand";
import { useGuestCart, syncGuestCartToServer } from "./guestCart";

export interface WebUser {
  id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  mobile?: string;
  [key: string]: unknown;
}

interface AuthState {
  user: WebUser | null;
  loading: boolean;
  checked: boolean;
  fetchSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  requestMobileOtp: (mobile: string) => Promise<{ ok: boolean; message?: string }>;
  verifyMobileOtp: (mobile: string, otp: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

// Holds only the display-safe user object, fetched from this site's own
// /api/auth/session route - the JWT itself lives in an httpOnly cookie this
// store never sees (see lib/session.ts).
export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: false,
  checked: false,

  fetchSession: async () => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      const data = await res.json();
      set({ user: data.user ?? null, loading: false, checked: true });
      // Edge case: an already-logged-in user (verified here, e.g. on app
      // load) who also has local guest-cart items - e.g. their session
      // expired mid-browse in another tab, they logged back in there, and
      // this tab is only now confirming the session. Same sync-then-clear
      // logic applies; POST /cart/service-entry just adds more lines to
      // their existing server cart, no special merge needed.
      if (data.user && useGuestCart.getState().items.length > 0) {
        void syncGuestCartToServer();
      }
    } catch {
      set({ user: null, loading: false, checked: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false });
        return { ok: false, message: data.message ?? "Login failed." };
      }
      set({ user: data.user ?? null, loading: false, checked: true });
      if (data.user && useGuestCart.getState().items.length > 0) {
        // Best-effort, non-blocking - never delay login completion on this.
        void syncGuestCartToServer();
      }
      return { ok: true };
    } catch {
      set({ loading: false });
      return { ok: false, message: "Network error. Please try again." };
    }
  },

  requestMobileOtp: async (mobile) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/mobile-otp-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      set({ loading: false });
      if (!res.ok) return { ok: false, message: data.message ?? "Could not send OTP." };
      return { ok: true };
    } catch {
      set({ loading: false });
      return { ok: false, message: "Network error. Please try again." };
    }
  },

  verifyMobileOtp: async (mobile, otp) => {
    set({ loading: true });
    try {
      const res = await fetch("/api/auth/mobile-otp-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        set({ loading: false });
        return { ok: false, message: data.message ?? "OTP verification failed." };
      }
      set({ user: data.user ?? null, loading: false, checked: true });
      if (data.user && useGuestCart.getState().items.length > 0) {
        void syncGuestCartToServer();
      }
      return { ok: true };
    } catch {
      set({ loading: false });
      return { ok: false, message: "Network error. Please try again." };
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
    // The guest cart lives in localStorage, not scoped to any account -
    // without clearing it here, logging out on a shared/kiosk device left
    // this user's cart items sitting there for the next person who opens
    // the site logged out to see (GuestCartView renders straight from this
    // store). A still-logged-in user's own items already live in the real
    // server cart, unaffected by this.
    useGuestCart.getState().clear();
    // The header switches its badge to the guest count the instant `user`
    // is null (see components/Header.tsx), so this doesn't change what's
    // displayed - just avoids leaving this session's stale server-cart
    // count sitting in memory for no reason.
    const { useCartCount } = await import("./cartCount");
    useCartCount.getState().setCount(0);
  },
}));
