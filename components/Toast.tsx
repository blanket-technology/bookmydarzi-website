"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/lib/toast";

export default function Toast() {
  const { message, variant } = useToast();

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-20 z-[200] flex justify-center px-4"
    >
      <div
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full px-4 py-3 text-sm font-bold text-white shadow-2xl shadow-black/20 animate-[fadeInUp_0.25s_ease_both] ${
          variant === "success" ? "bg-ink" : "bg-red-600"
        }`}
      >
        {variant === "success" ? (
          <CheckCircle2 size={17} className="text-gold shrink-0" />
        ) : (
          <XCircle size={17} className="shrink-0" />
        )}
        {message}
      </div>
    </div>
  );
}
