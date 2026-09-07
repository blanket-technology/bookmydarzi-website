"use client";

import { create } from "zustand";
import * as chatService from "./chatService";
import type { ChatMessage, ChatSession, ChatWsStatus, LocalChatMessage } from "./types";

interface ChatState {
  /** The session this store's state currently belongs to. Every mutating
   * action triggered from a WS frame or an async response must check this
   * against the uuid it was scoped to before applying, so a previous
   * session's late-arriving event never writes into a newer session's
   * state. Bumped by initSession()/reset() only - mirrors
   * react_app's useSupportChatStore. */
  sessionUuid: string | null;
  session: ChatSession | null;
  messages: LocalChatMessage[];
  loading: boolean;
  wsStatus: ChatWsStatus;
  typingUsers: number[]; // -1 = AI typing
  error: string | null;
  csatPrompt: boolean;
  agentName: string | null;
  /** Highest seq the agent/staff side has read up to (from
   * read_receipt_updated) - used to render "Read" vs "Delivered" on the
   * customer's own messages. */
  peerReadUpToSeq: number;

  initSession: (orderId?: number, issueCategory?: string) => Promise<ChatSession | null>;
  appendMessage: (msg: ChatMessage, forSessionUuid: string) => void;
  markMessageStatus: (clientId: string, status: LocalChatMessage["deliveryStatus"]) => void;
  setTypingUsers: (users: number[]) => void;
  setWsStatus: (status: ChatWsStatus) => void;
  setCsatPrompt: (show: boolean) => void;
  setSession: (patch: Partial<ChatSession>, forSessionUuid: string) => void;
  setAgentName: (name: string) => void;
  setPeerReadUpToSeq: (seq: number) => void;
  requestHuman: () => Promise<void>;
  submitCsat: (score: number) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessionUuid: null,
  session: null,
  messages: [],
  loading: false,
  wsStatus: "disconnected",
  typingUsers: [],
  error: null,
  csatPrompt: false,
  agentName: null,
  peerReadUpToSeq: 0,

  initSession: async (orderId, issueCategory) => {
    set({ loading: true, error: null, messages: [], agentName: null, sessionUuid: null, peerReadUpToSeq: 0 });
    try {
      const session = await chatService.getOrCreateSession(orderId, issueCategory);
      const { messages } = await chatService.getMessages(session.uuid, 50);
      // Another initSession() may have started and finished while this one
      // was in flight (rapid open/close) - only apply if nothing newer has
      // already taken over.
      if (get().sessionUuid !== null && get().sessionUuid !== session.uuid) return get().session;
      set({ session, messages, loading: false, sessionUuid: session.uuid });
      return session;
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Failed to start chat" });
      return null;
    }
  },

  appendMessage: (msg, forSessionUuid) => {
    if (get().sessionUuid !== forSessionUuid) return;
    set((state) => {
      const exists = state.messages.some(
        (m) => m.id === msg.id || (msg.client_id && m.client_id === msg.client_id),
      );
      if (exists) {
        return {
          messages: state.messages.map((m) =>
            m.client_id && m.client_id === msg.client_id
              ? { ...m, ...msg, deliveryStatus: "sent" as const }
              : m,
          ),
        };
      }
      return { messages: [...state.messages, msg] };
    });
  },

  markMessageStatus: (clientId, status) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.client_id === clientId ? { ...m, deliveryStatus: status } : m)),
    }));
  },

  setTypingUsers: (users) => set({ typingUsers: users }),
  setWsStatus: (status) => set({ wsStatus: status }),
  setCsatPrompt: (show) => set({ csatPrompt: show }),

  setSession: (patch, forSessionUuid) => {
    if (get().sessionUuid !== forSessionUuid) return;
    set((state) => ({
      session: state.session ? { ...state.session, ...patch } : state.session,
    }));
  },

  setAgentName: (name) => set({ agentName: name }),
  setPeerReadUpToSeq: (seq) => set((state) => ({ peerReadUpToSeq: Math.max(state.peerReadUpToSeq, seq) })),

  requestHuman: async () => {
    const { session } = get();
    if (!session) return;
    try {
      await chatService.requestHuman(session.uuid);
      // Status update arrives via WS session_status_changed event.
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Could not connect to agent" });
    }
  },

  submitCsat: async (score) => {
    const { session } = get();
    if (!session) return;
    try {
      await chatService.rateSession(session.uuid, score);
      set({ csatPrompt: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to submit rating" });
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      sessionUuid: null,
      session: null,
      messages: [],
      loading: false,
      wsStatus: "disconnected",
      typingUsers: [],
      error: null,
      csatPrompt: false,
      agentName: null,
      peerReadUpToSeq: 0,
    }),
}));
