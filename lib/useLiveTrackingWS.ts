"use client";

import { useEffect, useRef } from "react";

// Live Bridge-partner location + ETA, mirroring useNotificationsWS.ts's
// connection/reconnect logic exactly (same ws-token route, same heartbeat,
// same visibility/focus/online reconnect-if-dead handling) but subscribed
// to "PARTNER_LOCATION_UPDATE" instead of "NOTIFICATION" - kept as its own
// hook rather than overloading useNotificationsWS, since that hook's name
// and shape are specifically about the generic Notification feed.

const HEARTBEAT_INTERVAL_MS = 25_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

export interface PartnerLocationFrame {
  order_id: number;
  order_code?: string;
  status?: string;
  partner_name?: string;
  partner_latitude: number;
  partner_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  distance_km: number;
  eta_minutes: number;
  eta_label: string;
}

/** Subscribes to live PARTNER_LOCATION_UPDATE events for the signed-in
 * user. `enabled` should be true only while the order being viewed is
 * actually on a trackable leg - the hook no-ops (and tears down any
 * existing connection) when false. */
export function useLiveTrackingWS(enabled: boolean, onUpdate: (frame: PartnerLocationFrame) => void) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const connectSeq = useRef(0);
  const handlerRef = useRef(onUpdate);
  handlerRef.current = onUpdate;

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
        return;
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
          const frame = JSON.parse(e.data as string) as { event?: string; data?: PartnerLocationFrame };
          if (frame.event === "PARTNER_LOCATION_UPDATE" && frame.data) handlerRef.current(frame.data);
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

    const reconnectIfDead = () => {
      if (!mounted.current) return;
      if (ws.current && ws.current.readyState === WebSocket.OPEN) return;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      reconnectDelay.current = 1000;
      connect();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reconnectIfDead();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", reconnectIfDead);
    window.addEventListener("online", reconnectIfDead);

    return () => {
      mounted.current = false;
      connectSeq.current += 1;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", reconnectIfDead);
      window.removeEventListener("online", reconnectIfDead);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      ws.current?.close();
      ws.current = null;
    };
  }, [enabled]);
}
