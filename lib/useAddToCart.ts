"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useGuestCart, type GuestCartDisplayInfo } from "@/lib/guestCart";
import { useCartCount } from "@/lib/cartCount";
import { apiClient } from "@/lib/apiClient";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { useToast } from "@/lib/toast";
import type { SelectedAddon } from "@/lib/selectedAddons";

// Client-side "Add to Cart" that stays on the current page - no navigation
// to /cart, matching react_app/src/store/useCartStore.ts's addToCart()
// (adds silently, shows a toast, lets the customer keep browsing). Mirrors
// the two paths already used by app/cart/page.tsx's ?add= handlers (real
// server cart for logged-in users, local guestCart store for guests) so
// both stay in sync with whatever the cart page itself does.
export function useAddToCart() {
  const { user, checked } = useAuth();
  const guestAddItem = useGuestCart((s) => s.addItem);
  const show = useToast((s) => s.show);
  const [addingId, setAddingId] = useState<number | null>(null);

  const addToCart = async (
    serviceId: number,
    displayInfo: GuestCartDisplayInfo,
    quantity = 1,
    selectedAddons?: SelectedAddon[],
  ) => {
    if (!checked || addingId != null) return;

    setAddingId(serviceId);
    try {
      if (user) {
        await apiClient("/cart/service-entry", {
          method: "POST",
          body: {
            service_id: serviceId,
            quantity,
            addons: selectedAddons?.length
              ? selectedAddons.map((a) => ({ addon_id: a.addon_id, note: a.note }))
              : undefined,
          },
          idempotencyKey: generateIdempotencyKey(),
        });
        // Bump the header badge immediately rather than re-fetching the
        // whole cart just to learn a number we already know the delta
        // for - the POST above already succeeded, so `quantity` more
        // items are now in the cart.
        useCartCount.getState().setCount(useCartCount.getState().count + quantity);
      } else {
        guestAddItem(serviceId, quantity, displayInfo, selectedAddons);
      }
      show("Added to cart");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not add to cart.", "error");
    } finally {
      setAddingId(null);
    }
  };

  // Adds a primary item plus N extra tiers as separate cart lines in one
  // action (each is a full, independently priced/bookable service, not a
  // ServiceAddon extra) - see the "Add more work to this garment" checkbox
  // list on the tier detail page. Calls are fired sequentially, each with
  // its own fresh idempotency key (same as addToCart), so cart state stays
  // consistent call-by-call; a tier that fails partway through does not
  // roll back ones that already succeeded - those are valid lines the
  // customer would still want, and they're told exactly which one failed.
  const addMultipleToCart = async (
    items: { serviceId: number; displayInfo: GuestCartDisplayInfo }[],
  ) => {
    if (!checked || items.length === 0) return;
    const primary = items[0];
    setAddingId(primary.serviceId);
    const failedNames: string[] = [];
    try {
      for (const item of items) {
        try {
          if (user) {
            await apiClient("/cart/service-entry", {
              method: "POST",
              body: { service_id: item.serviceId, quantity: 1 },
              idempotencyKey: generateIdempotencyKey(),
            });
            useCartCount.getState().setCount(useCartCount.getState().count + 1);
          } else {
            guestAddItem(item.serviceId, 1, item.displayInfo);
          }
        } catch {
          failedNames.push(item.displayInfo.name);
        }
      }
      if (failedNames.length > 0) {
        show(`Added to cart, but couldn't add: ${failedNames.join(", ")}. Try again from the cart.`, "error");
      } else {
        show(items.length > 1 ? `Added ${items.length} items to cart` : "Added to cart");
      }
    } finally {
      setAddingId(null);
    }
  };

  return { addToCart, addMultipleToCart, addingId };
}
