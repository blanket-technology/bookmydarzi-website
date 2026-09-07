"use client";

import { useEffect, useRef } from "react";

// Real-time notification delivery over the backend's generic authenticated
// channel (app/api/v1/endpoints/ws.py: ws(s)://<host>/api/v1/ws, joins
// "user:{id}" automatically from the auth frame's JWT). Every notification
// in the system funnels through notification_service.create_notification,
// which fires a "NOTIFICATION" event on this exact channel - see that
// function's docstring ("single place that needs to fire the event for the
// whole product to get instant notification delivery"). Before this hook,
// the website only ever fetched notifications once on page load (Header's
// unread badge, notifications/page.tsx's list) with no live channel at all,
// unlike the chat widget (lib/chat/useChatWS.ts) or the mobile app
// (src/services/wsService.ts, the reference this is ported from).
//
// Reuses /api/chat/ws-token's token+wsBase Route Handler - despite the path,
// that endpoint is not chat-specific, it just hands back a short-lived
// access token to a caller already holding a valid httpOnly session cookie
// (see that route's own comment) - exactly what any authenticated browser
// socket needs, not something to duplicate per feature.

const HEARTBEAT_INTERVAL_MS = 25_000; // keep Railway's proxy from closing an idle connection (~60s)
const RECONNECT_MAX_DELAY_MS = 30_000;

interface NotificationFrame {
  id?: number;
  title: string;
  body: string;
  type: string;
  priority: string;
  deep_link: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string | null;
}

/** Subscribes to live "NOTIFICATION" events for the signed-in user.
 * `enabled` should be the truthy signed-in-user check - the hook no-ops
 * (and tears down any existing connection) when false, so it's safe to
 * call unconditionally from a component that renders for guests too. */
export function useNotificationsWS(enabled: boolean, onNotification: (n: NotificationFrame) => void) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const connectSeq = useRef(0);
  // Always call the latest handler without re-running the connect effect
  // every time the caller passes a fresh inline callback.
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    mounted.current = true;
    if (!enabled) return;

    const connect = async () => {
      const mySeq = ++connectSeq.current;

      let token: string;
      let wsBase: string;
      try {
        const res = await fetch("/api/chat/ws-token", { cache: "no-store" });
        if (!res.ok) throw new Error("no session");
        const data = (await res.json()) as { token: string; wsBase: string };
        token = data.token;
        wsBase = data.wsBase;
      } catch {
        return; // not logged in, or the fetch failed - next scheduled reconnect retries
      }

      if (!mounted.current || mySeq !== connectSeq.current) return;

      const socket = new WebSocket(`${wsBase}/api/v1/ws`);
      ws.current = socket;

      socket.onopen = () => {
        if (!mounted.current || mySeq !== connectSeq.current) return;
        try {
          socket.send(JSON.stringify({ type: "auth", token }));
        } catch {
          // ignore - onclose/onerror handles the dead socket
        }
        reconnectDelay.current = 1000;

        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        heartbeatTimer.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ event: "ping" }));
          }
        }, HEARTBEAT_INTERVAL_MS);
      };

      socket.onmessage = (e) => {
        if (!mounted.current || mySeq !== connectSeq.current) return;
        try {
          const frame = JSON.parse(e.data as string) as { event?: string; data?: NotificationFrame };
          if (frame.event === "NOTIFICATION" && frame.data) handlerRef.current(frame.data);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        if (heartbeatTimer.current) {
          clearInterval(heartbeatTimer.current);
          heartbeatTimer.current = null;
        }
        if (!mounted.current || mySeq !== connectSeq.current) return;
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 1.5, RECONNECT_MAX_DELAY_MS);
          connect();
        }, reconnectDelay.current);
      };

      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      mounted.current = false;
      connectSeq.current += 1;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [enabled]);
}
