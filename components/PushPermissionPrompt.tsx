"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { getNotificationPermission, requestPushPermission, unregisterPush } from "@/lib/pushService";
import { useToast } from "@/lib/toast";

// Reusable enable/disable control for browser push notifications - used
// both as an inline "want a heads-up when this order updates?" card right
// after checkout, and as a persistent toggle in profile settings for
// anyone who dismissed it or wants to change their mind later. Requesting
// permission must happen on a real click (see pushService.ts), never
// automatically on mount, so this only ever calls requestPushPermission()
// from the button's own onClick.
export function PushPermissionPrompt({ variant = "card" }: { variant?: "card" | "toggle" }) {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const show = useToast((s) => s.show);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  if (typeof window !== "undefined" && !("Notification" in window)) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await requestPushPermission();
      setPermission(getNotificationPermission());
      show(ok ? "Notifications enabled" : "Could not enable notifications", ok ? "success" : "error");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await unregisterPush();
      show("Notifications turned off");
    } finally {
      setBusy(false);
    }
  };

  // Browser itself blocked it - the only way back is the browser's own
  // site-settings UI, so don't re-show our own prompt (it would just be
  // ignored/re-blocked) - point at the fact it's blocked instead.
  if (permission === "denied") {
    return variant === "toggle" ? (
      <div className="flex items-center gap-3 rounded-2xl border border-black/5 bg-cream px-4 py-3">
        <BellOff size={18} className="shrink-0 text-gray-400" />
        <p className="text-xs text-gray-500">
          Notifications are blocked in your browser. Enable them from your browser&apos;s site settings to
          get order updates here.
        </p>
      </div>
    ) : null;
  }

  if (permission === "granted") {
    if (variant !== "toggle") return null;
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-cream px-4 py-3">
        <div className="flex items-center gap-3">
          <BellRing size={18} className="shrink-0 text-gold-deep" />
          <p className="text-xs font-semibold text-ink">Order update notifications are on</p>
        </div>
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="shrink-0 text-xs font-bold text-gray-500 underline hover:text-ink disabled:opacity-50"
        >
          Turn off
        </button>
      </div>
    );
  }

  if (variant === "toggle") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-cream px-4 py-3">
        <div className="flex items-center gap-3">
          <Bell size={18} className="shrink-0 text-gray-400" />
          <p className="text-xs font-semibold text-ink">Get notified when your order status changes</p>
        </div>
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-black disabled:opacity-50"
        >
          Enable
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-cream px-5 py-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-gold-deep">
          <Bell size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-ink">Want a heads-up on this order?</p>
          <p className="text-xs text-gray-500">Get notified the moment its status changes.</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleEnable}
        disabled={busy}
        className="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-black disabled:opacity-50"
      >
        Enable
      </button>
    </div>
  );
}
