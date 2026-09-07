"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Headset, ImagePlus, Loader2, Send } from "lucide-react";

const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface Props {
  disabled: boolean;
  uploading: boolean;
  showAgentButton: boolean;
  onSend: (text: string) => void;
  onSendImage: (file: File) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  onRequestAgent: () => void;
}

export default function ChatInput({
  disabled,
  uploading,
  showAgentButton,
  onSend,
  onSendImage,
  onTypingStart,
  onTypingStop,
  onRequestAgent,
}: Props) {
  const [text, setText] = useState("");
  const typingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if (e.target.value && !typingRef.current) {
      typingRef.current = true;
      onTypingStart();
    } else if (!e.target.value && typingRef.current) {
      typingRef.current = false;
      onTypingStop();
    }
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    if (typingRef.current) {
      typingRef.current = false;
      onTypingStop();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) return;
    onSendImage(file);
  };

  return (
    <div className="border-t border-black/5 bg-white">
      {showAgentButton && (
        <button
          onClick={onRequestAgent}
          className="flex w-full items-center gap-2 border-b border-black/5 bg-cream-deep/60 px-4 py-2.5 text-xs font-bold text-gold-deep transition hover:bg-cream-deep"
        >
          <Headset size={14} />
          Not satisfied? Talk to a human agent
        </button>
      )}
      <div className="flex items-end gap-2 p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MIME.join(",")}
          className="hidden"
          onChange={handleFilePick}
        />
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach image"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-gray-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
        </button>
        <textarea
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? "This conversation is closed" : "Type a message..."}
          className="max-h-24 flex-1 resize-none rounded-2xl border border-black/10 bg-cream px-4 py-2.5 text-sm outline-none transition focus:border-ink focus:shadow-[0_0_0_3px_rgba(23,23,23,0.06)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || !text.trim()}
          aria-label="Send message"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-30"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
