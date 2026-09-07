"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "./useChatStore";
import type { ChatMessage, ChatServerFrame } from "./types";

/** How long to wait for the backend to echo back a sent message (as a
 * message_created frame carrying the same client_id) before marking it
 * failed. Mirrors react_app/src/hooks/useChatWS.ts's SEND_ACK_TIMEOUT_MS. */
const SEND_ACK_TIMEOUT_MS = 10000;
const HEARTBEAT_INTERVAL_MS = 20000;
const AI_TYPING_FALLBACK_MS = 8000;
const RECONNECT_MAX_DELAY_MS = 30000;

function genClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * WebSocket lifecycle for one chat session: connect, send the post-open
 * auth frame, heartbeat, exponential-backoff reconnect, optimistic-send
 * ack tracking, typing indicators and read receipts. Mirrors
 * react_app/src/hooks/useChatWS.ts's real, production behavior exactly -
 * see that file for the mobile reference this was ported from.
 *
 * The access token is fetched once per connect attempt from
 * /api/chat/ws-token (server reads it from the httpOnly cookie - see
 * app/api/chat/ws-token/route.ts) and held only in a local variable for the
 * socket's lifetime; it is never written to localStorage/sessionStorage.
 */
export function useChatWS(sessionUuid: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(1000);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const connectSeq = useRef(0);
  // client_id -> ack timer, so a late/duplicate ack or a resend can clear
  // the right timer without racing a stale one from a previous attempt.
  const pendingAcks = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Fallback "AI stopped typing" timer - reset on every ai_typing event,
  // cleared immediately once the AI's actual reply arrives.
  const aiTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    appendMessage,
    markMessageStatus,
    setTypingUsers,
    setWsStatus,
    setSession,
    setAgentName,
    setCsatPrompt,
    setPeerReadUpToSeq,
  } = useChatStore();

  const clearAckTimer = useCallback((clientId: string) => {
    const timer = pendingAcks.current.get(clientId);
    if (timer) {
      clearTimeout(timer);
      pendingAcks.current.delete(clientId);
    }
  }, []);

  const handleFrame = useCallback(
    (frame: ChatServerFrame) => {
      if (!sessionUuid) return;
      switch (frame.event) {
        case "message_created": {
          const msg = frame.message as ChatMessage;
          if (msg.client_id) clearAckTimer(msg.client_id);
          if (msg.sender_type === "ai" && aiTypingTimer.current) {
            clearTimeout(aiTypingTimer.current);
            aiTypingTimer.current = null;
            setTypingUsers([]);
          }
          appendMessage(msg, sessionUuid);
          break;
        }

        case "ai_typing":
          if (aiTypingTimer.current) clearTimeout(aiTypingTimer.current);
          setTypingUsers([-1]);
          aiTypingTimer.current = setTimeout(() => {
            aiTypingTimer.current = null;
            setTypingUsers([]);
          }, AI_TYPING_FALLBACK_MS);
          break;

        case "typing_indicator": {
          // The backend broadcasts to every subscriber of the session,
          // including the sender - filtering own frames here requires
          // knowing our own user id, which this widget doesn't track
          // client-side (see useChatStore/useAuth). We instead rely on the
          // fact that a customer never sees their own typing_start echo
          // rendered against themselves in the UI (only non-customer
          // indicators are shown) - see ChatWidget's TypingIndicator usage,
          // which never fires from the customer's own send path.
          setTypingUsers(frame.is_typing ? [frame.user_id] : []);
          break;
        }

        case "read_receipt_updated":
          // Own read_receipt echoes back too; without a self-id we can't
          // filter it out client-side, but applying it just widens
          // peerReadUpToSeq, which is monotonic (setPeerReadUpToSeq takes
          // the max) and only affects "Read" styling on our own bubbles -
          // never incorrect, at worst a half-beat early.
          if (typeof frame.last_read_seq === "number") setPeerReadUpToSeq(frame.last_read_seq);
          break;

        case "session_status_changed":
          if (frame.status) setSession({ status: frame.status }, sessionUuid);
          break;

        case "session_assigned":
          setSession({ status: "assigned" }, sessionUuid);
          if (frame.agent_name) setAgentName(frame.agent_name);
          break;

        case "session_resolved":
          setSession({ status: "resolved" }, sessionUuid);
          if (frame.csat_prompt) setCsatPrompt(true);
          break;

        case "send_failed":
          if (frame.client_id) {
            clearAckTimer(frame.client_id);
            markMessageStatus(frame.client_id, "failed");
          }
          break;

        case "rate_limited": {
          // No client_id on this frame - fail whichever message is still
          // pending so its Retry affordance becomes available instead of
          // silently sitting there until the ack timeout.
          const pending = useChatStore.getState().messages.find((m) => m.deliveryStatus === "pending");
          if (pending?.client_id) {
            clearAckTimer(pending.client_id);
            markMessageStatus(pending.client_id, "failed");
          }
          break;
        }

        case "pong":
          break;
      }
    },
    [sessionUuid, appendMessage, clearAckTimer, markMessageStatus, setTypingUsers, setSession, setAgentName, setCsatPrompt, setPeerReadUpToSeq],
  );

  // Sends over the current socket if open, tracking pending/failed status
  // in the store either way - shared by sendMessage() and the
  // auto-resend-on-reconnect path in connect()'s onopen handler below.
  const dispatchSend = useCallback(
    (body: string, clientId: string, messageType: "text" | "image" = "text", attachmentId?: string) => {
      clearAckTimer(clientId);
      markMessageStatus(clientId, "pending");

      const isOpen = ws.current?.readyState === WebSocket.OPEN;
      if (isOpen && sessionUuid) {
        ws.current!.send(
          JSON.stringify({
            event: "send_message",
            session_uuid: sessionUuid,
            body,
            client_id: clientId,
            message_type: messageType,
            ...(attachmentId ? { attachment_id: attachmentId } : {}),
          }),
        );
      }

      // Always arm the ack timer, even when the socket isn't open right
      // now - a message must never sit "pending" forever.
      const timer = setTimeout(() => {
        pendingAcks.current.delete(clientId);
        markMessageStatus(clientId, "failed");
      }, SEND_ACK_TIMEOUT_MS);
      pendingAcks.current.set(clientId, timer);
      return isOpen;
    },
    [sessionUuid, clearAckTimer, markMessageStatus],
  );

  const connect = useCallback(async () => {
    if (!sessionUuid || !mounted.current) return;
    const mySeq = ++connectSeq.current;

    setWsStatus("connecting");

    let token: string;
    let wsBase: string;
    try {
      const res = await fetch("/api/chat/ws-token", { cache: "no-store" });
      if (!res.ok) throw new Error("no session");
      const data = (await res.json()) as { token: string; wsBase: string };
      token = data.token;
      wsBase = data.wsBase;
    } catch {
      // Not logged in, or the fetch failed - don't attempt a connection.
      // A reconnect attempt will retry this on the next scheduled cycle.
      return;
    }

    // A newer connect() may have started while this token fetch was in
    // flight (e.g. sessionUuid changed) - abandon this stale attempt.
    if (!mounted.current || mySeq !== connectSeq.current) return;

    const url = `${wsBase}/api/v1/ws/chat/${sessionUuid}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      if (!mounted.current || mySeq !== connectSeq.current) return;
      try {
        socket.send(JSON.stringify({ type: "auth", token }));
      } catch {
        // ignore - onclose/onerror will handle the dead socket
      }
      reconnectDelay.current = 1000;
      setWsStatus("connected");

      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ event: "ping", ts: Date.now() }));
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Auto-resend anything that never got acked before the connection
      // dropped (in flight when the socket died, or queued while offline).
      const { messages } = useChatStore.getState();
      for (const m of messages) {
        if ((m.deliveryStatus === "pending" || m.deliveryStatus === "failed") && m.client_id) {
          dispatchSend(m.body ?? "", m.client_id, m.message_type as "text" | "image", m.metadata?.attachment_id);
        }
      }
    };

    socket.onmessage = (e) => {
      try {
        handleFrame(JSON.parse(e.data) as ChatServerFrame);
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
      setWsStatus("disconnected");
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX_DELAY_MS);
        connect();
      }, reconnectDelay.current);
    };

    socket.onerror = () => {
      socket.close();
    };
  }, [sessionUuid, handleFrame, setWsStatus, dispatchSend]);

  useEffect(() => {
    mounted.current = true;
    if (sessionUuid) connect();
    return () => {
      mounted.current = false;
      connectSeq.current += 1;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
      ws.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUuid]);

  const sendMessage = useCallback(
    (body: string, clientId: string, messageType: "text" | "image" = "text", attachmentId?: string) =>
      dispatchSend(body, clientId, messageType, attachmentId),
    [dispatchSend],
  );

  const sendTypingStart = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && sessionUuid)
      ws.current.send(JSON.stringify({ event: "typing_start", session_uuid: sessionUuid }));
  }, [sessionUuid]);

  const sendTypingStop = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && sessionUuid)
      ws.current.send(JSON.stringify({ event: "typing_stop", session_uuid: sessionUuid }));
  }, [sessionUuid]);

  const sendReadReceipt = useCallback(
    (lastSeq: number) => {
      if (ws.current?.readyState === WebSocket.OPEN && sessionUuid)
        ws.current.send(JSON.stringify({ event: "read_receipt", session_uuid: sessionUuid, last_read_seq: lastSeq }));
    },
    [sessionUuid],
  );

  // Explicit user-triggered retry for a failed message - same underlying
  // send as the automatic reconnect resend, just triggered on demand.
  const retryMessage = useCallback(
    (body: string, clientId: string, messageType: "text" | "image" = "text", attachmentId?: string) =>
      dispatchSend(body, clientId, messageType, attachmentId),
    [dispatchSend],
  );

  useEffect(() => {
    const acks = pendingAcks.current;
    return () => {
      acks.forEach((timer) => clearTimeout(timer));
      acks.clear();
      if (aiTypingTimer.current) clearTimeout(aiTypingTimer.current);
    };
  }, []);

  return { sendMessage, sendTypingStart, sendTypingStop, sendReadReceipt, retryMessage, genClientId };
}
