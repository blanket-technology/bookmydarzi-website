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
  },
}));
