"use client";

import { Loader2, X } from "lucide-react";

// Shared confirmation modal for a destructive, hard-to-undo action (remove
// a cart item, delete a saved address) - previously each such action fired
// immediately on click with zero confirmation, unlike order cancellation
// elsewhere on the site (see CancelOrderModal in app/orders/[id]/page.tsx),
// which already asks first. Same bottom-sheet-on-mobile/centered-on-desktop
// shell as that modal, generalized so it isn't duplicated per call site.
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  tone?: "danger" | "neutral";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-sm rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">{title}</h3>
          <button
            onClick={onCancel}
            disabled={loading}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {description && <p className="mt-3 text-sm leading-6 text-gray-600">{description}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-black/10 py-3 text-sm font-bold text-ink transition hover:bg-gray-50 disabled:opacity-50"
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition disabled:opacity-60 ${
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-ink hover:bg-black"
            }`}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
