import { useState } from "react";
import { AlertCircle, Check, CheckCheck, RotateCw, ZoomIn } from "lucide-react";
import type { LocalChatMessage } from "@/lib/chat/types";
import { formatMessageBody } from "./formatMessageBody";
import ImageLightbox from "./ImageLightbox";

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

const SENDER_LABEL: Record<string, string> = {
  agent: "Support Agent",
  ai: "BMD Assistant",
  system: "System",
};

export default function MessageBubble({
  message,
  isOwn,
  isRead,
  onRetry,
  showSenderLabel = true,
}: {
  message: LocalChatMessage;
  isOwn: boolean;
  isRead: boolean;
  onRetry?: () => void;
  /** False for a message that's grouped under a preceding one from the same
   * sender within the grouping window - see groupMessagesForDisplay. */
  showSenderLabel?: boolean;
}) {
  const [zoomed, setZoomed] = useState(false);

  if (message.sender_type === "system") {
    return (
      <div className="flex justify-center py-1.5">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-muted">
          {message.body}
        </span>
      </div>
    );
  }

  const attachmentUrl = message.metadata?.attachment_id;
  const isFailed = message.deliveryStatus === "failed";
  const isPending = message.deliveryStatus === "pending";

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} gap-1 ${showSenderLabel ? "py-0.5 mt-2" : "py-0"}`}>
      {!isOwn && showSenderLabel && (
        <span className="px-1 text-[11px] font-bold text-muted">
          {SENDER_LABEL[message.sender_type] ?? "Support"}
        </span>
      )}
      <div
        className={`max-w-[78%] rounded-2xl text-sm leading-relaxed ${
          message.message_type === "image" && attachmentUrl ? "p-1" : "px-3.5 py-2.5"
        } ${
          isOwn
            ? `bg-ink text-white ${isFailed ? "opacity-60" : ""}`
            : message.sender_type === "ai"
              ? "bg-cream-deep text-ink"
              : "bg-gray-100 text-ink"
        }`}
      >
        {message.message_type === "image" && attachmentUrl ? (
          <>
            <button
              type="button"
              onClick={() => setZoomed(true)}
              aria-label="View image full size"
              className="group relative block overflow-hidden rounded-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachmentUrl}
                alt="Attachment"
                className="max-h-56 w-full object-cover transition group-hover:brightness-90"
              />
              <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white">
                  <ZoomIn size={16} />
                </span>
              </span>
            </button>
            {zoomed && <ImageLightbox src={attachmentUrl} onClose={() => setZoomed(false)} />}
          </>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.body ? formatMessageBody(message.body) : ""}</p>
        )}
      </div>
      <div className={`flex items-center gap-1.5 px-1 text-[10px] font-semibold text-gray-400`}>
        {isFailed ? (
          <button
            onClick={onRetry}
            className="flex items-center gap-1 font-bold text-red-600 hover:text-red-700"
          >
            <AlertCircle size={11} /> Failed - tap to retry
            <RotateCw size={11} />
          </button>
        ) : (
          <>
            <span>{formatTime(message.created_at)}</span>
            {isOwn && !isPending && (
              <CheckCheck size={12} className={isRead ? "text-sky-500" : "text-gray-300"} />
            )}
            {isOwn && isPending && <Check size={12} className="text-gray-300" />}
          </>
        )}
      </div>
    </div>
  );
}
