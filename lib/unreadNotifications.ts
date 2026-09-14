"use client";

import { create } from "zustand";
import { apiClient } from "@/lib/apiClient";

// Single source of truth for the notification-bell badge count, shared
// between components/Header.tsx (renders the badge) and
// app/notifications/page.tsx (marks items read). Previously each held its
// own local unreadCount state with no way to tell the other "I just changed
// this" - marking all read on the notifications page updated that page's
// own state fine, but the Header's badge had no signal to refetch and kept
// showing the stale pre-mark-all-read count until an unrelated live
// notification or a full reload happened to trigger its own refetch.
interface UnreadNotificationsState {
  count: number;
  setCount: (count: number) => void;
  refetch: () => Promise<void>;
}

export const useUnreadNotifications = create<UnreadNotificationsState>((set) => ({
  count: 0,
  setCount: (count) => set({ count: Math.max(0, count) }),
  refetch: async () => {
    try {
      const res = await apiClient<{ unread_count: number }>("/notifications/unread-count");
      set({ count: Math.max(0, res.unread_count ?? 0) });
    } catch {
      // Leave the current count as-is on a transient failure - Header.tsx's
      // own mount-time fetch already has its own retry/backoff for the
      // initial load; this shared refetch is for post-action reconciliation
      // where silently keeping the last-known value is safer than zeroing it.
    }
  },
}));
