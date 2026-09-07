import { AlertTriangle, CheckCheck, CheckCircle2, Loader2 } from "lucide-react";
import type { ChatSessionStatus, ChatWsStatus } from "@/lib/chat/types";

/** Session-status banner shown atop the message list. Matches the states
 * and copy from react_app's SupportChatScreen StatusBanner exactly -
 * pending_human/assigned/resolved get a banner, ai_handling/open/closed
 * show nothing here (closed already blocks the input separately).
 *
 * wsStatus is tracked end-to-end (useChatWS updates it through every
 * connect/reconnect transition) but was never actually read by any
 * component - so a dropped socket (including the known production WS
 * routing issue) looked identical to a perfectly healthy chat: messages
 * just silently stopped arriving until the 10s ack-timeout marked a send
 * "failed", with no "reconnecting" affordance in between. Surface it here,
 * above the session-status banner, whenever the session itself isn't
 * already in a terminal state (no point telling someone their already-
 * resolved chat is "reconnecting"). */
export default function StatusBanner({
  status,
  agentName,
  wsStatus,
}: {
  status: ChatSessionStatus;
  agentName: string | null;
  wsStatus?: ChatWsStatus;
}) {
  const isTerminal = status === "resolved" || status === "closed";
  if (!isTerminal && wsStatus && wsStatus !== "connected") {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800">
        {wsStatus === "connecting" ? (
          <Loader2 size={14} className="shrink-0 animate-spin text-amber-600" />
        ) : (
          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
        )}
        {wsStatus === "connecting" ? "Connecting…" : "Reconnecting… messages will send once you're back online"}
      </div>
    );
  }
  if (status === "pending_human") {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800">
        <Loader2 size={14} className="shrink-0 animate-spin text-amber-600" />
        Finding you an agent - hold on...
      </div>
    );
  }
  if (status === "assigned") {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800">
        <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
        {agentName ? `${agentName} is here to help` : "A support agent has joined"}
      </div>
    );
  }
  if (status === "resolved" || status === "closed") {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-xl border border-black/10 bg-gray-100 px-3.5 py-2.5 text-xs font-bold text-muted">
        <CheckCheck size={14} className="shrink-0 text-gray-400" />
        Conversation resolved
      </div>
    );
  }
  return null;
}
