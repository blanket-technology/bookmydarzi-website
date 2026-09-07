"use client";

import { create } from "zustand";

// Lightweight global toast store - matches the mobile app's useToastStore
// pattern (react_app/src/store/useToastStore.ts): a single active message,
// auto-dismissed, no queue. Used for "Added to Cart" style confirmations
// that shouldn't interrupt navigation.
export interface ToastState {
  message: string | null;
  variant: "success" | "error";
  show: (message: string, variant?: "success" | "error") => void;
  clear: () => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

export const useToast = create<ToastState>((set) => ({
  message: null,
  variant: "success",
  show: (message, variant = "success") => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message, variant });
    hideTimer = setTimeout(() => set({ message: null }), 2200);
  },
  clear: () => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message: null });
  },
}));
