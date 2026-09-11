// Selected-offer handoff between /cart and /checkout, mirroring
// lib/pickupPrefs.ts's sessionStorage pattern exactly: the cart page is the
// only place an offer is browsed/selected (see GET /offers -
// app/api/v1/endpoints/services.py), checkout only reads what was chosen
// and forwards `offer_id` on POST /cart/checkout (app/schemas/cart.py's
// CartCheckoutSchema.offer_id) - the backend recomputes and validates the
// discount server-side; nothing here is authoritative pricing.
export const APPLIED_OFFER_STORAGE_KEY = "bmd:applied-offer";

// Shared response shape for GET /offers (list) and GET /offers/validate
// (manual code entry) - mirrors app/services/catalog/service_discovery_service.py's
// _offer_payload() exactly (snake_case dict).
export interface ApiOffer {
  offer_id: number;
  tailor_id?: number | null;
  title: string;
  description?: string | null;
  discount_type?: "percentage" | "flat" | null;
  discount_percent: number;
  discount_amount?: number | null;
  /** Cart/order subtotal must be at least this much for the offer to be
   * eligible - 0/undefined means no minimum. Enforced server-side at
   * checkout regardless of what the UI shows (checkout_service.py /
   * direct_order_service.py). */
  min_order_value?: number | null;
  image_url?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
}

export interface AppliedOffer {
  offer_id: number;
  /** Cached only for display (e.g. checkout's "Offer applied: {title}" readout). */
  title: string;
  discount_type: "flat" | "percentage";
  /** DiscountAmount when flat, DiscountPercent when percentage - see OfferResponse. */
  discount_value: number;
}

export function readAppliedOffer(): AppliedOffer | null {
  try {
    const raw = sessionStorage.getItem(APPLIED_OFFER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppliedOffer;
  } catch {
    return null;
  }
}

export function writeAppliedOffer(offer: AppliedOffer | null): void {
  try {
    if (offer) {
      sessionStorage.setItem(APPLIED_OFFER_STORAGE_KEY, JSON.stringify(offer));
    } else {
      sessionStorage.removeItem(APPLIED_OFFER_STORAGE_KEY);
    }
  } catch {
    // sessionStorage unavailable (private mode etc.) - non-fatal, offer
    // selection just won't carry through to checkout.
  }
}

// Client-side discount estimate for display only; the backend is
// authoritative (checkout only ever sends offer_id, and recomputes the real
// discount server-side). Applied on the full bill (after GST + platform
// fee), same base the backend discounts from, and capped at the bill total
// so a flat discount larger than the order can never show a negative "you
// pay" amount. Mirrors react_app/app/(tabs)/cart.tsx's estimatedDiscount.
export function estimateOfferDiscount(offer: AppliedOffer | null, totalAmount: number): number {
  if (!offer || offer.discount_value <= 0 || totalAmount <= 0) return 0;
  if (offer.discount_type === "flat") {
    return Math.min(Math.round(offer.discount_value), totalAmount);
  }
  return Math.round(totalAmount * (offer.discount_value / 100) * 100) / 100;
}
