"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { ServiceAddon } from "@/lib/types/catalog";
import type { SelectedAddon } from "@/lib/selectedAddons";

// Zomato-style "add extras to this item" checklist, shown between the
// price and the Add to Cart / Book Now buttons on a service detail page.
// Selection state lives here and is handed up to the parent via
// onChange - AddToCartButton/book-now both read it at submit time rather
// than this component calling any cart API itself, so it works identically
// whether the eventual add is a real POST (logged-in) or purely local
// (guest cart).
export default function AddonPicker({
  addons,
  onChange,
}: {
  addons: ServiceAddon[];
  onChange: (selected: SelectedAddon[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState<Record<number, string>>({});

  if (addons.length === 0) return null;

  const emit = (nextIds: Set<number>, nextNotes: Record<number, string>) => {
    const selected: SelectedAddon[] = addons
      .filter((a) => nextIds.has(a.id))
      .map((a) => ({
        addon_id: a.id,
        name: a.name,
        price: a.price,
        note: nextNotes[a.id]?.trim() || undefined,
      }));
    onChange(selected);
  };

  const toggle = (addon: ServiceAddon) => {
    const next = new Set(selectedIds);
    if (next.has(addon.id)) {
      next.delete(addon.id);
    } else {
      next.add(addon.id);
    }
    setSelectedIds(next);
    emit(next, notes);
  };

  const setNote = (addonId: number, value: string) => {
    const next = { ...notes, [addonId]: value };
    setNotes(next);
    emit(selectedIds, next);
  };

  return (
    <div className="mt-7">
      <p className="text-xs font-black uppercase tracking-wide text-gray-400">
        Add extras to this order
      </p>
      <div className="mt-3 space-y-2.5">
        {addons.map((addon) => {
          const checked = selectedIds.has(addon.id);
          return (
            <div
              key={addon.id}
              className={`rounded-2xl border-2 p-4 transition ${
                checked ? "border-ink bg-cream" : "border-black/5 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(addon)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 ${
                      checked ? "border-ink bg-ink text-white" : "border-black/15 text-transparent"
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{addon.name}</p>
                    {addon.description && (
                      <p className="mt-0.5 text-xs text-gray-500">{addon.description}</p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 whitespace-nowrap text-sm font-black text-gold-deep">
                  +₹{addon.price.toLocaleString("en-IN")}
                </span>
              </button>

              {checked && (
                <input
                  value={notes[addon.id] ?? ""}
                  onChange={(e) => setNote(addon.id, e.target.value)}
                  placeholder="Add a note (optional) - e.g. exact spot, size, preference"
                  className="mt-3 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs outline-none focus:border-ink"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
