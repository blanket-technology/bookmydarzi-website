"use client";

// Client-side REST calls for the chat_v2 support system, routed through
// this site's own /api/proxy/* pass-through (see lib/apiClient.ts) so the
// JWT stays server-side. Mirrors react_app/src/services/chatV2Service.ts's
// endpoints exactly - same base path, same query params, same response
// shapes - since both clients hit the same backend.
import { apiClient } from "@/lib/apiClient";
import type {
  ChatMessagesResponse,
  ChatSession,
  ChatUploadResult,
  RequestAgentResponse,
} from "./types";

const BASE = "/chat/v2";

export async function getOrCreateSession(
  orderId?: number,
  issueCategory?: string,
): Promise<ChatSession> {
  const params = new URLSearchParams();
  if (orderId) params.set("order_id", String(orderId));
  if (issueCategory) params.set("issue_category", issueCategory);
  const qs = params.toString();
  return apiClient<ChatSession>(`${BASE}/sessions${qs ? `?${qs}` : ""}`, { method: "POST" });
}

export async function getSession(sessionUuid: string): Promise<ChatSession> {
  return apiClient<ChatSession>(`${BASE}/sessions/${sessionUuid}`);
}

export async function getMessages(
  sessionUuid: string,
  limit = 50,
  beforeSeq?: number,
): Promise<ChatMessagesResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (beforeSeq) params.set("before_seq", String(beforeSeq));
  return apiClient<ChatMessagesResponse>(`${BASE}/sessions/${sessionUuid}/messages?${params}`);
}

export async function requestHuman(sessionUuid: string): Promise<RequestAgentResponse> {
  return apiClient<RequestAgentResponse>(`${BASE}/sessions/${sessionUuid}/request-agent`, {
    method: "POST",
  });
}

export async function rateSession(sessionUuid: string, score: number): Promise<void> {
  await apiClient(`${BASE}/sessions/${sessionUuid}/rate?score=${score}`, { method: "POST" });
}

/**
 * Uploads an image via this site's dedicated multipart route (see
 * app/api/chat/upload/route.ts - the generic /api/proxy pass-through can't
 * carry FormData). Does NOT create a chat message itself; the caller sends
 * the returned `url` as `attachment_id` in a WS send_message frame
 * (see lib/chat/useChatWS.ts), matching the mobile app's real behavior.
 */
export async function uploadChatAttachment(file: File): Promise<ChatUploadResult> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch("/api/chat/upload", { method: "POST", body: form });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && String(data.message)) ||
      `Upload failed (${res.status})`;
    throw new Error(message);
  }
  return data as ChatUploadResult;
}
