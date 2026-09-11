"use client";

import { useState } from "react";
import { PlusCircle, Check } from "lucide-react";
import type { ServiceAddon } from "@/lib/types/catalog";
import type { SelectedAddon } from "@/lib/selectedAddons";

// Zomato-style "add extras to this item" section, shown between the price
// and the Add to Cart / Book Now buttons on a service detail page. Matches
// OfferPicker.tsx's section-card language (circular icon badge, bold
// heading, rounded-3xl card) so the page doesn't carry two different
// visual conventions for "a list of selectable priced things."
//
// Selection state lives here and is handed up to the parent via onChange -
// AddToCartButton/book-now both read it at submit time rather than this
// component calling any cart API itself, so it works identically whether
// the eventual add is a real POST (logged-in) or purely local (guest cart).
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

  const selectedTotal = addons
    .filter((a) => selectedIds.has(a.id))
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <section className="mt-7 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white">
            <PlusCircle size={17} />
          </span>
          <div>
            <h2 className="font-black">Add extras</h2>
            <p className="text-xs text-muted">Extend this order with optional work</p>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <span className="shrink-0 rounded-full bg-cream px-3 py-1.5 text-xs font-black text-gold-deep transition-all">
            +₹{selectedTotal.toLocaleString("en-IN")}
          </span>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {addons.map((addon) => {
          const checked = selectedIds.has(addon.id);
          return (
            <div
              key={addon.id}
              className={`overflow-hidden rounded-2xl border-2 transition-all duration-200 ${
                checked ? "border-ink bg-cream" : "border-black/5 bg-white hover:border-black/15"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(addon)}
                aria-pressed={checked}
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-150 ${
                      checked
                        ? "scale-100 border-ink bg-ink text-white"
                        : "scale-95 border-black/15 text-transparent"
                    }`}
                  >
                    <Check size={13} strokeWidth={3} />
                  </span>
                  <div>
                    <p className="text-sm font-bold">{addon.name}</p>
                    {addon.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-gray-500">
                        {addon.description}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-black transition-colors ${
                    checked ? "bg-ink text-white" : "bg-cream text-gold-deep"
                  }`}
                >
                  +₹{addon.price.toLocaleString("en-IN")}
                </span>
              </button>

              <div
                className={`grid transition-all duration-200 ease-out ${
                  checked ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4">
                    <input
                      value={notes[addon.id] ?? ""}
                      onChange={(e) => setNote(addon.id, e.target.value)}
                      placeholder="Add a note (optional) - e.g. exact spot, size, preference"
                      className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs outline-none focus:border-ink"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
