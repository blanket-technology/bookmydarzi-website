"use client";

import { create } from "zustand";

// Lets any page request the floating ChatWidget (mounted once in
// app/layout.tsx) open itself, optionally scoped to a specific order/issue -
// e.g. an order-detail page's "Reschedule pickup" button. The widget reads
// this on mount/update and starts (or resumes) the matching chat session via
// useChatStore.initSession(orderId, issueCategory) - see ChatWidget.tsx.
interface ChatOpenRequest {
  orderId?: number;
  issueCategory?: string;
  /** Bumped on every call so the widget's effect re-fires even if the same
   * orderId/issueCategory is requested twice in a row (e.g. clicking the
   * button again after closing the panel). */
  nonce: number;
}

interface ChatOpenState {
  request: ChatOpenRequest | null;
  requestOpen: (opts?: { orderId?: number; issueCategory?: string }) => void;
  clearRequest: () => void;
}

export const useChatOpenRequest = create<ChatOpenState>((set) => ({
  request: null,
  requestOpen: (opts) =>
    set((s) => ({
      request: { orderId: opts?.orderId, issueCategory: opts?.issueCategory, nonce: (s.request?.nonce ?? 0) + 1 },
    })),
  clearRequest: () => set({ request: null }),
}));
