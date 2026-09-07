"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { useGuestCart, type GuestCartDisplayInfo } from "@/lib/guestCart";
import { apiClient } from "@/lib/apiClient";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { useToast } from "@/lib/toast";

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
  ) => {
    if (!checked || addingId != null) return;

    setAddingId(serviceId);
    try {
      if (user) {
        await apiClient("/cart/service-entry", {
          method: "POST",
          body: { service_id: serviceId, quantity },
          idempotencyKey: generateIdempotencyKey(),
        });
      } else {
        guestAddItem(serviceId, quantity, displayInfo);
      }
      show("Added to cart");
    } catch (err) {
      show(err instanceof Error ? err.message : "Could not add to cart.", "error");
    } finally {
      setAddingId(null);
    }
  };

  return { addToCart, addingId };
}
