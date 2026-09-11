"use client";

import { ChevronDown, ChevronUp, Loader2, Tag } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import type { ApiOffer } from "@/lib/appliedOffer";

// Extracted from app/cart/page.tsx (the only place this previously lived)
// so app/book-now/page.tsx can offer the same "browse pre-listed offers or
// type a code" experience without a second, drifting copy. Both pages drive
// this purely by offer_id + callbacks - each keeps its own state shape
// (cart uses sessionStorage-backed AppliedOffer, book-now uses local state).

interface OffersListResponse {
  offers: ApiOffer[];
  total: number;
}

export function formatOfferDiscount(offer: ApiOffer): string {
  return offer.discount_type === "flat"
    ? `₹${Math.round(offer.discount_amount ?? 0).toLocaleString("en-IN")} off`
    : `${offer.discount_percent}% off`;
}

// Filters to valid, non-expired offers with a real discount of either type -
// mirrors react_app/app/(tabs)/cart.tsx's validOffers useMemo. There is no
// ValidFrom on this endpoint's response schema (OfferResponse in
// app/schemas/home.py), unlike the DB model, so that check is intentionally
// omitted here.
export function useValidOffers(offers: ApiOffer[]): ApiOffer[] {
  return useMemo(() => {
    const now = Date.now();
    return offers.filter(
      (o) =>
        (o.discount_type === "flat" ? (o.discount_amount ?? 0) > 0 : o.discount_percent > 0) &&
        (!o.valid_until || new Date(o.valid_until).getTime() > now),
    );
  }, [offers]);
}

/** How much more the customer needs to add to their order for this offer to
 * become eligible - 0 if already eligible or the offer has no minimum.
 * Mirrors the same comparison checkout_service.py/direct_order_service.py
 * make server-side (billing_base.total_amount >= offer.MinOrderValue), so
 * "locked" here always matches what checkout would actually accept. */
export function amountToUnlock(offer: ApiOffer, orderTotal: number): number {
  const min = offer.min_order_value ?? 0;
  return min > 0 ? Math.max(0, Math.round(min - orderTotal)) : 0;
}

/** Fetches GET /offers once and returns the valid subset - both pages that
 * browse offers (as opposed to only typing a code) need this same list. */
export function useOffersList(enabled: boolean): ApiOffer[] {
  const [offers, setOffers] = useState<ApiOffer[]>([]);

  useMemo(() => {
    if (!enabled) return;
    apiClient<OffersListResponse>("/offers")
      .then((res) => setOffers(res.offers))
      .catch(() => {
        // Non-fatal - the offers section simply stays empty.
      });
    // Intentionally runs once per `enabled` flip, not on every render -
    // useMemo here is a fire-and-forget side effect trigger, not a real memo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return offers;
}

function CouponCodeInput({
  appliedOfferId,
  orderTotal,
  onApply,
}: {
  appliedOfferId: number | null;
  orderTotal: number;
  onApply: (offer: ApiOffer) => void;
}) {
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed || checking) return;
    setChecking(true);
    setError(null);
    setSuccess(null);
    try {
      const offer = await apiClient<ApiOffer>(`/offers/validate?code=${encodeURIComponent(trimmed)}`);
      // /offers/validate only checks code validity + one-time-use (it has no
      // order total to compare against) - the minimum-order check has to
      // happen here instead, using the same shortfall math the offer cards
      // show, so typing a code doesn't bypass the same rule tapping "Apply"
      // enforces. Checkout still re-validates server-side regardless.
      const shortfall = amountToUnlock(offer, orderTotal);
      if (shortfall > 0) {
        setError(`Add ₹${shortfall.toLocaleString("en-IN")} more to your order to use this coupon.`);
        return;
      }
      onApply(offer);
      setSuccess(`"${offer.title}" applied - ${formatOfferDiscount(offer)}`);
      setCode("");
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 404) {
        setError("That coupon code is invalid or has expired.");
      } else if (err instanceof ClientApiError && err.status === 409) {
        setError("You've already used this coupon.");
      } else {
        setError("Couldn't check that code right now - try again in a moment.");
      }
    } finally {
      setChecking(false);
    }
  }, [code, checking, onApply, orderTotal]);

  return (
    <div className="mt-5 border-t border-black/5 pt-5">
      <label htmlFor="coupon-code" className="text-xs font-bold text-muted">
        Have a coupon code?
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="coupon-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
            setSuccess(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="Enter code"
          className="min-w-0 flex-1 rounded-xl border-2 border-black/10 px-3.5 py-2.5 text-sm font-bold uppercase tracking-wide outline-none focus:border-ink"
          disabled={checking}
          maxLength={50}
        />
        <button
          onClick={submit}
          disabled={checking || !code.trim()}
          className="shrink-0 rounded-xl border-2 border-ink bg-ink px-4 py-2.5 text-xs font-bold text-white transition disabled:opacity-40"
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-bold text-red-600">{error}</p>}
      {success && appliedOfferId && <p className="mt-2 text-xs font-bold text-emerald-600">{success}</p>}
    </div>
  );
}

// ─── Available offers (selectable cards) + manual code entry ────────────────
export function OfferPicker({
  offers,
  appliedOfferId,
  orderTotal,
  onApply,
  onRemove,
}: {
  offers: ApiOffer[];
  appliedOfferId: number | null;
  /** Current cart/order subtotal, used only to show offers below their
   * MinOrderValue as locked (with "Add ₹X more" instead of a live Apply
   * button) rather than letting them look applicable when they aren't -
   * matches Zomato/Myntra's convention. This is a display aid only; the
   * backend is what actually rejects an ineligible offer_id at checkout
   * regardless of what this prop is passed as. */
  orderTotal: number;
  onApply: (offer: ApiOffer) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? offers : offers.slice(0, 2);

  return (
    <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
          <Tag size={17} />
        </span>
        <div>
          <h2 className="font-black">Available offers</h2>
          <p className="text-xs text-muted">Apply one offer to this order</p>
        </div>
      </div>

      {offers.length === 0 && (
        <p className="mt-4 text-xs text-gray-500">No offers available right now - got a code? Enter it below.</p>
      )}

      {offers.length > 0 && (
        <div className="mt-5 space-y-3">
          {visible.map((offer) => {
            const applied = appliedOfferId === offer.offer_id;
            const shortfall = amountToUnlock(offer, orderTotal);
            const locked = shortfall > 0;
            return (
              <div
                key={offer.offer_id}
                className={`flex items-start justify-between gap-3 rounded-2xl border-2 p-4 transition ${
                  applied ? "border-ink bg-cream" : locked ? "border-black/5 opacity-60" : "border-black/5"
                }`}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 rounded-lg px-2 py-1 text-[11px] font-black text-white ${
                      locked ? "bg-gray-400" : "bg-ink"
                    }`}
                  >
                    {formatOfferDiscount(offer)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{offer.title}</p>
                    {offer.description && (
                      <p className="mt-0.5 truncate text-xs text-gray-500">{offer.description}</p>
                    )}
                    {locked && (
                      <p className="mt-0.5 text-xs font-bold text-amber-700">
                        Add ₹{shortfall.toLocaleString("en-IN")} more to unlock
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => (applied ? onRemove() : onApply(offer))}
                  disabled={locked}
                  className={`shrink-0 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition ${
                    applied
                      ? "border-ink bg-ink text-white"
                      : locked
                        ? "cursor-not-allowed border-black/10 text-gray-400"
                        : "border-ink text-ink hover:bg-cream"
                  }`}
                >
                  {applied ? "Applied" : locked ? "Locked" : "Apply"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {offers.length > 2 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-bold text-ink hover:underline"
        >
          {expanded ? "Show less" : `View all (${offers.length})`}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      <CouponCodeInput appliedOfferId={appliedOfferId} orderTotal={orderTotal} onApply={onApply} />
    </section>
  );
}
