// TypeScript types for the chat_v2 support chat system - REST payloads and
// WebSocket frame shapes. Field/event names are pinned exactly to the real
// backend contract already used in production by react_app (see
// react_app/src/services/chatV2Service.ts, useChatWS.ts,
// useSupportChatStore.ts) - do not rename or add fields speculatively.

export type ChatSessionStatus =
  | "ai_handling"
  | "open"
  | "pending_human"
  | "assigned"
  | "resolved"
  | "closed";

export interface ChatSession {
  uuid: string;
  user_id: number;
  customer_name?: string | null;
  order_id: number | null;
  order_code?: string | null;
  issue_category?: string | null;
  status: ChatSessionStatus;
  assigned_agent_id: number | null;
  ai_handled: boolean;
  unread_count?: number;
  last_message_at: string | null;
  created_at: string;
}

export type ChatSenderType = "customer" | "agent" | "ai" | "system";
export type ChatMessageType = "text" | "image" | "order_card" | "quick_reply" | "system_event";

export interface ChatMessageMetadata {
  attachment_id?: string;
  [key: string]: unknown;
}

export interface ChatMessage {
  id: number;
  session_uuid: string;
  seq: number;
  sender_type: ChatSenderType;
  sender_id: number | null;
  body: string | null;
  message_type: ChatMessageType;
  client_id: string | null;
  metadata: ChatMessageMetadata | null;
  created_at: string;
}

export interface ChatMessagesResponse {
  session_uuid: string;
  messages: ChatMessage[];
  count: number;
}

export interface ChatUploadResult {
  url: string;
  file_id: string;
  mime_type: string;
}

export interface RequestAgentResponse {
  status: "escalated" | "already_escalated";
  session_status: ChatSessionStatus;
}

/** Local-only delivery state for an optimistically-appended message. Never
 * sent by the backend - set/cleared entirely on the client, mirroring
 * react_app's useSupportChatStore. */
export type ChatDeliveryStatus = "pending" | "sent" | "failed";

export type LocalChatMessage = ChatMessage & {
  deliveryStatus?: ChatDeliveryStatus;
};

// ── WebSocket frames ────────────────────────────────────────────────────────

/** First frame sent immediately on socket open - not an `event` frame, uses
 * `type` instead. Server waits up to 10s for this; failure closes 4001. */
export interface ChatWsAuthFrame {
  type: "auth";
  token: string;
}

export type ChatClientFrame =
  | { event: "ping"; ts: number }
  | { event: "typing_start"; session_uuid: string }
  | { event: "typing_stop"; session_uuid: string }
  | { event: "read_receipt"; session_uuid: string; last_read_seq: number }
  | {
      event: "send_message";
      session_uuid: string;
      body: string;
      client_id: string;
      message_type: "text" | "image";
      attachment_id?: string;
    };

export type ChatServerFrame =
  | { event: "message_created"; message: ChatMessage }
  | { event: "ai_typing"; session_uuid: string }
  | { event: "typing_indicator"; user_id: number; is_typing: boolean }
  | { event: "read_receipt_updated"; user_id: number; last_read_seq: number }
  | { event: "session_status_changed"; status: ChatSessionStatus; session_uuid: string }
  | { event: "session_assigned"; agent_name: string; session_uuid: string }
  | { event: "session_resolved"; resolved_by: "agent"; csat_prompt: boolean }
  | { event: "send_failed"; client_id: string; message: string }
  | { event: "rate_limited"; message: string }
  | { event: "pong"; ts: number };

export type ChatWsStatus = "disconnected" | "connecting" | "connected";
