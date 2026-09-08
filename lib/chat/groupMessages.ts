import type { LocalChatMessage } from "@/lib/chat/types";

const GROUP_WINDOW_MS = 3 * 60 * 1000;

export interface DisplayItem {
  message: LocalChatMessage;
  showSenderLabel: boolean;
  /** A date-separator label to render immediately before this message, or
   * null if it falls on the same calendar day as the previous message. */
  dateLabel: string | null;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

/** Collapses consecutive messages from the same sender within a short time
 * window (hides the repeated sender label, tightens vertical spacing - see
 * MessageBubble's showSenderLabel) and inserts a date-separator label
 * whenever a message falls on a different calendar day than the one before
 * it. Pure function over the full message list - cheap enough to recompute
 * on every render for a chat panel's message count. */
export function groupMessagesForDisplay(messages: LocalChatMessage[]): DisplayItem[] {
  return messages.map((message, i) => {
    const prev = messages[i - 1];
    const sameDayAsPrev = prev ? dayLabel(prev.created_at) === dayLabel(message.created_at) : false;

    const withinWindow =
      !!prev &&
      prev.sender_type === message.sender_type &&
      prev.sender_type !== "system" &&
      message.sender_type !== "system" &&
      Math.abs(new Date(message.created_at).getTime() - new Date(prev.created_at).getTime()) < GROUP_WINDOW_MS &&
      sameDayAsPrev;

    return {
      message,
      showSenderLabel: !withinWindow,
      dateLabel: sameDayAsPrev ? null : dayLabel(message.created_at),
    };
  });
}
