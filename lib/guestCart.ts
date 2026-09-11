"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SelectedAddon } from "@/lib/selectedAddons";

// Client-only "browse before login" cart, modeled on Amazon/Flipkart/Myntra:
// a logged-out visitor can add/remove/adjust items freely with zero server
// involvement, and only needs to log in at the final "Place Order" step.
//
// There is NO server-side guest/anonymous cart - every endpoint under
// /cart/* requires require_roles(UserRole.USER) (see
// app/api/v1/endpoints/cart.py in the backend repo). So this store is the
// entire guest cart: persisted to localStorage via zustand's persist
// middleware, and synced line-by-line to the real server cart only after a
// successful login (see lib/useAuth.ts's login/verifyMobileOtp).

export interface GuestCartDisplayInfo {
  /** CatalogStitchingType.name at add-time - see lib/types/catalog.ts. */
  name: string;
  image_url: string | null;
  /** CatalogStitchingType.base_price - the guest cart never sees live
   * server-computed pricing (billing/discounts/platform fee), so totals
   * shown to guests are an estimate from catalog base_price only. */
  base_price: number;
  category_name: string;
  service_line_name: string;
  estimated_delivery_days: number;
}

export interface GuestCartItem extends GuestCartDisplayInfo {
  service_id: number;
  quantity: number;
  /** Extras selected at add-time (e.g. Button Replacement) - a guest can
   * only add one line per service_id (see addItem's merge-by-id below), so
   * re-adding the same service with a different addon selection just bumps
   * quantity and keeps whatever addons were chosen first, same limitation
   * quantity itself already had here. */
  selected_addons?: SelectedAddon[];
}

interface GuestCartState {
  items: GuestCartItem[];
  addItem: (
    service_id: number,
    quantity: number,
    displayInfo: GuestCartDisplayInfo,
    selectedAddons?: SelectedAddon[],
  ) => void;
  updateQuantity: (service_id: number, quantity: number) => void;
  removeItem: (service_id: number) => void;
  clear: () => void;
}

export const useGuestCart = create<GuestCartState>()(
  persist(
    (set) => ({
      items: [],

      addItem: (service_id, quantity, displayInfo, selectedAddons) =>
        set((state) => {
          const existing = state.items.find((i) => i.service_id === service_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.service_id === service_id ? { ...i, quantity: i.quantity + quantity } : i,
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { service_id, quantity, ...displayInfo, selected_addons: selectedAddons },
            ],
          };
        }),

      updateQuantity: (service_id, quantity) =>
        set((state) => {
          if (quantity < 1) return state;
          return {
            items: state.items.map((i) => (i.service_id === service_id ? { ...i, quantity } : i)),
          };
        }),

      removeItem: (service_id) =>
        set((state) => ({ items: state.items.filter((i) => i.service_id !== service_id) })),

      clear: () => set({ items: [] }),
    }),
    {
      name: "bmd:guest-cart",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

// ─── Selectors ────────────────────────────────────────────────────────────
export function useGuestCartCount(): number {
  return useGuestCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));
}

export function useGuestCartHasItems(): boolean {
  return useGuestCart((s) => s.items.length > 0);
}

export function guestCartEstimatedTotal(items: GuestCartItem[]): number {
  return items.reduce((sum, i) => {
    const addonsTotal = (i.selected_addons ?? []).reduce((s, a) => s + a.price, 0);
    return sum + (i.base_price + addonsTotal) * i.quantity;
  }, 0);
}

// ─── Login-sync ───────────────────────────────────────────────────────────
// Called right after a successful login (see lib/useAuth.ts). Best-effort:
// one POST /cart/service-entry per guest line item, never blocks remaining
// syncs if one fails, then clears the guest store regardless so a guest
// cart never resurrects itself or duplicates on a later login.
export async function syncGuestCartToServer(): Promise<void> {
  const items = useGuestCart.getState().items;
  if (items.length === 0) return;

  // Local imports (not top-level) to avoid a circular import between
  // useAuth.ts and this module pulling in apiClient/idempotency at module
  // init time - both are lightweight client-only utilities so this is just
  // a lazy require, not a real cycle risk, but keeps load order obvious.
  const [{ apiClient }, { generateIdempotencyKey }] = await Promise.all([
    import("./apiClient"),
    import("./idempotency"),
  ]);

  await Promise.allSettled(
    items.map((item) =>
      apiClient("/cart/service-entry", {
        method: "POST",
        body: {
          service_id: item.service_id,
          quantity: item.quantity,
          addons: item.selected_addons?.length
            ? item.selected_addons.map((a) => ({ addon_id: a.addon_id, note: a.note }))
            : undefined,
        },
        idempotencyKey: generateIdempotencyKey(),
      }),
    ),
  );

  useGuestCart.getState().clear();
}
