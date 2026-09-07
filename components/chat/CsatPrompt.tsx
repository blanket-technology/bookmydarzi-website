"use client";

import { useState } from "react";
import { Star, X } from "lucide-react";

export default function CsatPrompt({
  onSubmit,
  onDismiss,
}: {
  onSubmit: (score: number) => void;
  onDismiss: () => void;
}) {
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!score || submitting) return;
    setSubmitting(true);
    await onSubmit(score);
    setSubmitting(false);
  };

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-xs animate-[fadeInUp_0.3s_ease_both] rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <p className="text-xs font-black uppercase tracking-[.15em] text-gold-deep">
            How did we do?
          </p>
          <button onClick={onDismiss} aria-label="Dismiss" className="text-gray-400 hover:text-ink">
            <X size={16} />
          </button>
        </div>
        <p className="mt-1.5 text-sm font-bold text-ink">Rate your support experience</p>

        <div className="mt-4 flex justify-center gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-0.5 transition hover:scale-110"
            >
              <Star
                size={26}
                className={(hovered || score) >= n ? "fill-gold text-gold" : "text-gray-200"}
              />
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!score || submitting}
          className="mt-5 w-full rounded-xl bg-ink py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {submitting ? "Submitting..." : "Submit rating"}
        </button>
      </div>
    </div>
  );
}
