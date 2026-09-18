// Firebase Cloud Messaging background service worker.
//
// This file is served as-is from the site root (no build step processes
// service workers), so it can NOT use process.env - the values below are
// the Firebase web config, which is public by Firebase's own design (it
// identifies the project to the browser; it is not a secret), so hardcoding
// it here is the same pattern already used by the admin panel's
// public/firebase-messaging-sw.js. Must match the NEXT_PUBLIC_FIREBASE_*
// values in lib/pushService.ts exactly, or push tokens obtained on this
// site won't be deliverable by this worker.
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDyZG2VorbuXWW8LUdPGPrW-nH427pzHEk",
  authDomain: "bookmydarzi-3b472.firebaseapp.com",
  projectId: "bookmydarzi-3b472",
  storageBucket: "bookmydarzi-3b472.firebasestorage.app",
  messagingSenderId: "906446329135",
  appId: "1:906446329135:web:52ea699fadc7664134fdda",
});

const messaging = firebase.messaging();

// Fires only when this site's tab is closed or backgrounded - the
// foreground case is already handled by the existing WebSocket-driven
// order-update refresh (useNotificationsWS.ts), so no duplicate
// notification is shown there (see lib/pushService.ts's onMessage handler).
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "BookMyDarzi";
  const body = payload.notification?.body || payload.data?.body || "";

  self.registration.showNotification(title, {
    body,
    icon: "/icon.png",
    badge: "/icon.png",
    data: payload.data || {},
    tag: payload.data?.notification_id || undefined,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const orderId = event.notification.data?.order_id;
  const deepLinkKey = event.notification.data?.deep_link;
  // Same DeepLink/data.order_id convention app/services/notifications/policy.py
  // already produces for order-status events - "order_details" always
  // pairs with an order_id in data, so route straight to that order's page.
  const url = deepLinkKey === "order_details" && orderId ? `/orders/${orderId}` : "/orders";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    }),
  );
});
