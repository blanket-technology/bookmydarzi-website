"use client";

/**
 * Browser push notifications, via Firebase Cloud Messaging - ported from
 * the admin panel's src/services/pushService.js (same Firebase project,
 * same backend endpoints, same DeviceToken table keyed by platform="web").
 * Additive to the existing WebSocket-driven order-update refresh
 * (useNotificationsWS.ts) - push exists purely to reach customers who have
 * closed the tab or backgrounded the browser, which a WebSocket connection
 * cannot do. While the tab is open and focused, the existing WS
 * "NOTIFICATION" event already delivers the same update, so the foreground
 * FCM handler below intentionally does not show a second, duplicate
 * notification.
 *
 * Progressive enhancement: if Firebase isn't configured or the browser
 * doesn't support the required APIs (e.g. iOS Safari outside a home-screen
 * PWA install), every function here is a safe no-op - nothing else in the
 * app depends on push succeeding.
 */

import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from "firebase/messaging";
import { apiClient } from "@/lib/apiClient";

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
const FIREBASE_VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const isPushConfigured = Boolean(
  FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.messagingSenderId &&
    FIREBASE_CONFIG.appId &&
    FIREBASE_VAPID_KEY,
);

const DEVICE_TOKEN_STORAGE_KEY = "bmd_fcm_token";

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

async function getMessagingInstance() {
  if (!isPushConfigured) return null;
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;

  const supported = await isSupported().catch(() => false);
  if (!supported) return null;

  if (messagingInstance) return messagingInstance;

  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG as Record<string, string>);
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

/** Current permission state, safe to call on the server (returns "default"). */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "default";
  return Notification.permission;
}

export type PushRegistrationResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "unsupported" | "permission_denied" | "error" };

/**
 * Request notification permission and register this browser's push token
 * with the backend. Must be called from a real user gesture (a button
 * click), not automatically on page load - browsers now suppress or flag
 * permission prompts with no user gesture behind them. Safe to call
 * repeatedly - a no-op once already granted+registered, and the backend
 * upserts by token so re-registration is harmless.
 */
export async function requestPushPermission(): Promise<PushRegistrationResult> {
  try {
    if (!isPushConfigured) {
      // Missing NEXT_PUBLIC_FIREBASE_*/VAPID env vars on this deploy - a
      // real, distinct failure mode from "browser doesn't support push",
      // worth surfacing separately since it's fixable by redeploying with
      // the right env vars, not something the customer's browser controls.
      console.warn("Push not configured - missing NEXT_PUBLIC_FIREBASE_* env vars");
      return { ok: false, reason: "not_configured" };
    }

    const messaging = await getMessagingInstance();
    if (!messaging) return { ok: false, reason: "unsupported" };

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return { ok: false, reason: "permission_denied" };
    } else if (Notification.permission !== "granted") {
      return { ok: false, reason: "permission_denied" };
    }

    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await getToken(messaging, {
      vapidKey: FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return { ok: false, reason: "error" };

    await apiClient("/notifications/device-tokens", {
      method: "POST",
      body: { token, platform: "web" },
    });
    sessionStorage.setItem(DEVICE_TOKEN_STORAGE_KEY, token);

    // Foreground messages: the WS-driven order-update refresh already
    // covers this case (tab open + focused), so this handler intentionally
    // does nothing beyond registering - it exists so the SDK doesn't warn
    // about an unhandled foreground message.
    onMessage(messaging, () => {});

    return { ok: true };
  } catch (err) {
    console.warn("Push registration failed", err);
    return { ok: false, reason: "error" };
  }
}

/** Unregister this browser's push token from the backend. */
export async function unregisterPush(): Promise<void> {
  const token = typeof window !== "undefined" ? sessionStorage.getItem(DEVICE_TOKEN_STORAGE_KEY) : null;
  if (!token) return;

  try {
    await apiClient("/notifications/device-tokens", {
      method: "DELETE",
      body: { token, platform: "web" },
    });
  } catch (err) {
    console.warn("Push unregistration (backend) failed", err);
  }

  try {
    const messaging = await getMessagingInstance();
    if (messaging) await deleteToken(messaging);
  } catch (err) {
    console.warn("Push unregistration (FCM) failed", err);
  }

  sessionStorage.removeItem(DEVICE_TOKEN_STORAGE_KEY);
}
