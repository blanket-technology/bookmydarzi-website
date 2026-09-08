"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, LogIn, MessageCircle, X } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { useChatStore } from "@/lib/chat/useChatStore";
import { useChatWS } from "@/lib/chat/useChatWS";
import { useChatOpenRequest } from "@/lib/chat/openChat";
import { uploadChatAttachment } from "@/lib/chat/chatService";
import { groupMessagesForDisplay } from "@/lib/chat/groupMessages";
import type { LocalChatMessage } from "@/lib/chat/types";
import StatusBanner from "./StatusBanner";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import ChatInput from "./ChatInput";
import CsatPrompt from "./CsatPrompt";

/** Floating support-chat launcher + panel, mounted once site-wide (see
 * app/layout.tsx). Wires the site to the real chat_v2 backend already used
 * in production by the mobile app - REST session bootstrap via
 * lib/chat/chatService.ts, WS lifecycle via lib/chat/useChatWS.ts. */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  const { user, checked, fetchSession } = useAuth();
  const {
    session,
    messages,
    loading,
    error,
    typingUsers,
    csatPrompt,
    agentName,
    peerReadUpToSeq,
    wsStatus,
    initSession,
    appendMessage,
    setCsatPrompt,
    submitCsat,
    requestHuman,
    reset,
  } = useChatStore();

  const sessionUuid = session?.uuid ?? null;
  const { sendMessage, sendTypingStart, sendTypingStop, sendReadReceipt, retryMessage, genClientId } =
    useChatWS(sessionUuid);
  const { request: openRequest, clearRequest } = useChatOpenRequest();

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  // Shrinks the closed launcher while the page is actively scrolling
  // (restoring on a short pause) - it's a fixed corner button that sits on
  // top of whatever content happens to scroll underneath it, and on
  // content-heavy pages (long FAQ/service-detail text, tall image grids)
  // that's confirmed to fully intercept taps meant for what's behind it.
  // Shrinking it mid-scroll doesn't remove the overlap entirely, but it
  // meaningfully reduces the collision window without hiding the launcher
  // (it's always visible and tappable at rest, which is when a user would
  // actually reach for it).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      setIsScrolling(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIsScrolling(false), 400);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Bootstrap the session the first time the panel is opened by a logged-in
  // user - general support, no order_id.
  useEffect(() => {
    if (open && user && !hasInitialized.current) {
      hasInitialized.current = true;
      initSession();
    }
  }, [open, user, initSession]);

  // An order-scoped entry point (e.g. an order-detail page's "Reschedule
  // pickup" button) requested the widget open, pinned to that order/issue -
  // see lib/chat/openChat.ts. Re-init even if a general session already
  // started, so the request lands on the right order-scoped session.
  useEffect(() => {
    if (!openRequest || !user) return;
    setOpen(true);
    hasInitialized.current = true;
    reset();
    initSession(openRequest.orderId, openRequest.issueCategory);
    clearRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRequest, user]);

  useEffect(() => {
    return () => reset();
    // Only ever reset on true unmount (widget lives for the whole app
    // lifetime, so this effectively never fires) - eslint-disable is not
    // needed since reset is a stable Zustand action reference.
  }, [reset]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (messages.length > 0) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  // Mark read up to the latest non-customer message whenever the visible
  // list grows - one frame per list change, not per message. Only while the
  // panel is actually open: this used to fire unconditionally, which meant
  // a reply arriving while the widget was closed/minimized was marked read
  // (and the "Read" tick shown to the agent) before the customer had ever
  // seen it, and made a real unread-count badge on the launcher impossible
  // to compute (everything looked perpetually "already read"). See
  // unreadWhileClosed below for what tracks the launcher badge instead.
  useEffect(() => {
    if (!open) return;
    const incoming = messages.filter((m) => m.sender_type !== "customer" && m.seq > 0);
    if (incoming.length === 0) return;
    const lastSeq = Math.max(...incoming.map((m) => m.seq));
    sendReadReceipt(lastSeq);
  }, [open, messages, sendReadReceipt]);

  // Launcher unread badge: count non-customer messages that arrived after
  // the panel was last open. lastSeenSeqRef holds the highest seq the
  // customer has actually looked at (updated whenever the panel opens);
  // anything from the agent/AI beyond that while closed counts as unread.
  const lastSeenSeqRef = useRef(0);
  const [unreadWhileClosed, setUnreadWhileClosed] = useState(0);

  useEffect(() => {
    if (open) {
      const incoming = messages.filter((m) => m.sender_type !== "customer" && m.seq > 0);
      const maxSeq = incoming.length > 0 ? Math.max(...incoming.map((m) => m.seq)) : 0;
      lastSeenSeqRef.current = Math.max(lastSeenSeqRef.current, maxSeq);
      setUnreadWhileClosed(0);
      return;
    }
    const unseen = messages.filter(
      (m) => m.sender_type !== "customer" && m.seq > lastSeenSeqRef.current,
    );
    setUnreadWhileClosed(unseen.length);
  }, [open, messages]);

  const handleSend = (text: string) => {
    if (!sessionUuid) return;
    const clientId = genClientId();
    const optimistic: LocalChatMessage = {
      id: -Date.now(),
      session_uuid: sessionUuid,
      seq: -1,
      sender_type: "customer",
      sender_id: null,
      body: text,
      message_type: "text",
      client_id: clientId,
      metadata: null,
      created_at: new Date().toISOString(),
      deliveryStatus: "pending",
    };
    appendMessage(optimistic, sessionUuid);
    sendMessage(text, clientId);
  };

  const handleSendImage = async (file: File) => {
    if (!sessionUuid) return;
    setUploading(true);
    try {
      const uploaded = await uploadChatAttachment(file);
      const clientId = genClientId();
      const optimistic: LocalChatMessage = {
        id: -Date.now(),
        session_uuid: sessionUuid,
        seq: -1,
        sender_type: "customer",
        sender_id: null,
        body: null,
        message_type: "image",
        client_id: clientId,
        metadata: { attachment_id: uploaded.url },
        created_at: new Date().toISOString(),
        deliveryStatus: "pending",
      };
      appendMessage(optimistic, sessionUuid);
      sendMessage("", clientId, "image", uploaded.url);
    } catch {
      // Upload itself failed (before any optimistic message existed) -
      // nothing to mark failed; the user can just retry the attach.
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = (message: LocalChatMessage) => {
    if (!message.client_id) return;
    retryMessage(message.body ?? "", message.client_id, message.message_type as "text" | "image", message.metadata?.attachment_id ?? undefined);
  };

  const sessionStatus = session?.status ?? "ai_handling";
  const isAiHandling = sessionStatus === "ai_handling" || sessionStatus === "open";
  const hasAiReplied = messages.some((m) => m.sender_type === "ai");
  const isClosed = sessionStatus === "resolved" || sessionStatus === "closed";
  const showAgentButton = isAiHandling && hasAiReplied;

  const statusLabel = useMemo(() => {
    if (isAiHandling) return "AI Assistant • replies instantly";
    if (sessionStatus === "pending_human") return "Finding an agent...";
    if (sessionStatus === "assigned") return agentName ?? "Support Agent";
    return "Resolved";
  }, [isAiHandling, sessionStatus, agentName]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] sm:bottom-6 sm:right-6">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={
            unreadWhileClosed > 0
              ? `Open support chat, ${unreadWhileClosed} unread message${unreadWhileClosed === 1 ? "" : "s"}`
              : "Open support chat"
          }
          // Smaller footprint on mobile (h-12) than desktop (h-14) - a
          // corner-anchored fixed button always risks sitting over
          // whatever content happens to be at that scroll position (the
          // FAQ accordion's tap targets were the confirmed case), and the
          // smaller a fixed overlay is, the smaller that collision zone.
          // Shrinks further and fades slightly while isScrolling is true.
          className={`group relative flex items-center justify-center rounded-full bg-ink text-white shadow-xl shadow-black/20 transition-all duration-200 hover:-translate-y-1 hover:bg-black active:translate-y-0 ${
            isScrolling ? "h-9 w-9 opacity-60 sm:h-10 sm:w-10" : "h-12 w-12 opacity-100 sm:h-14 sm:w-14"
          }`}
        >
          <MessageCircle size={isScrolling ? 16 : 20} className="transition-all group-hover:scale-110 sm:hidden" />
          <MessageCircle
            size={isScrolling ? 18 : 24}
            className="hidden transition-all group-hover:scale-110 sm:block"
          />
          {unreadWhileClosed > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white ring-2 ring-cream">
              {unreadWhileClosed > 9 ? "9+" : unreadWhileClosed}
            </span>
          )}
        </button>
      )}

      {open && (
        <div className="relative flex h-[min(600px,calc(100vh-6rem))] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-2xl shadow-black/25">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-black/5 bg-ink px-4 py-3.5 text-white">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold text-sm font-black text-ink">
              B
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black leading-tight">BMD Support</p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-semibold text-white/60">
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                    user ? "bg-emerald-400" : "bg-white/30"
                  }`}
                />
                {user ? statusLabel : "Sign in to chat with us"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          {!checked ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : !user ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream-deep">
                <LogIn size={20} className="text-gold-deep" />
              </span>
              <div>
                <p className="text-sm font-black text-ink">Log in to chat with us</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">
                  Sign in to your BookMyDarzi account to start a support conversation about your
                  orders, payments, or anything else.
                </p>
              </div>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                Log in
              </Link>
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 size={22} className="animate-spin text-gray-300" />
            </div>
          ) : error && !session ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                onClick={() => {
                  hasInitialized.current = false;
                  reset();
                  hasInitialized.current = true;
                  initSession();
                }}
                className="rounded-xl bg-ink px-5 py-2 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <StatusBanner status={sessionStatus} agentName={agentName} wsStatus={wsStatus} />
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3">
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                    <MessageCircle size={32} className="text-gray-200" />
                    <p className="text-sm font-black text-ink">Hi there! 👋</p>
                    <p className="text-xs leading-relaxed text-muted">
                      Ask us anything about your order, payment, or our services - we&apos;re
                      here to help instantly.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0.5">
                    {groupMessagesForDisplay(messages).map(({ message: m, showSenderLabel, dateLabel }) => (
                      <div key={`${m.id}-${m.client_id ?? ""}`}>
                        {dateLabel && (
                          <div className="my-2 flex items-center justify-center">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-muted">
                              {dateLabel}
                            </span>
                          </div>
                        )}
                        <MessageBubble
                          message={m}
                          isOwn={m.sender_type === "customer"}
                          isRead={m.sender_type === "customer" && m.seq <= peerReadUpToSeq}
                          onRetry={m.deliveryStatus === "failed" ? () => handleRetry(m) : undefined}
                          showSenderLabel={showSenderLabel}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {typingUsers.length > 0 && <TypingIndicator isAi={typingUsers.includes(-1)} />}
              </div>

              <ChatInput
                disabled={isClosed}
                uploading={uploading}
                showAgentButton={showAgentButton}
                onSend={handleSend}
                onSendImage={handleSendImage}
                onTypingStart={sendTypingStart}
                onTypingStop={sendTypingStop}
                onRequestAgent={requestHuman}
              />

              {csatPrompt && (
                <CsatPrompt onSubmit={submitCsat} onDismiss={() => setCsatPrompt(false)} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
