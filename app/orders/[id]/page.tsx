"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Download,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Ruler,
  Star,
  X,
} from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import {
  getOrderStatusMeta,
  ORDER_STATUS_SEQUENCE,
  STATUS_TONE_CLASSES,
  type OrderStatus,
} from "@/lib/orderStatus";
import type { CustomerOrderDetailsResponse, CustomerOrderLineItem } from "@/lib/types/account";
import type { CatalogCategoriesTreeResponse } from "@/lib/types/catalog";
import { useChatOpenRequest } from "@/lib/chat/openChat";
import IssueSelectorModal from "@/components/chat/IssueSelectorModal";
import {
  createBalancePaymentSession,
  createPaymentSession,
  isRazorpayScriptReady,
  resolveRazorpayKey,
  verifyPayment,
  type PaymentSessionResponse,
} from "@/lib/razorpayPayment";
import { diagnoseRazorpayLoadFailure } from "@/lib/razorpayDiagnostics";

// Mirrors react_app/app/order-details.tsx's onlineFailed/onlinePending gate
// (lines ~764-765) - "Pay now" only makes sense for a non-COD order sitting
// in a failed/pending online-payment state, not for COD orders (those are
// collected on delivery, not retried here) or already-settled orders.
const RETRYABLE_PAYMENT_STATUSES = new Set([
  "payment_failed",
  "advance_failed",
  "payment_pending",
  "advance_pending",
]);

// Mirrors react_app/app/order-details.tsx's codPayNowBlockedStatuses, which
// mirrors the backend's _BALANCE_BLOCKED_ORDER_STATES (payment_service.py) -
// once an order is delivered/cancelled/still-pending-payment there's no
// "pay now" window left, matching what POST /payments/balance will actually
// allow for a COD order.
const COD_PAY_NOW_BLOCKED_STATUSES = new Set([
  "cancelled",
  "delivered",
  "pending_payment",
  "payment_failed",
]);

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function money(value: number | null | undefined): string {
  if (value == null) return "₹0";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

// Same gradient fallback set as app/services/ServicesGrid.tsx's
// CARD_BACKGROUNDS, reused here so a service with no resolvable image (or a
// since-discontinued service_id) still renders a consistent card instead of
// a broken image icon or a fabricated stock photo.
const CARD_BACKGROUNDS = [
  "from-stone-200 to-stone-300",
  "from-slate-200 to-slate-300",
  "from-amber-100 to-stone-200",
  "from-zinc-200 to-neutral-300",
  "from-rose-100 to-stone-200",
  "from-neutral-200 to-stone-300",
];

// Mirrors backend's OrderStatus.CANCELLABLE_BY_CUSTOMER via
// react_app/src/services/cancellationService.ts's CUSTOMER_CANCELLABLE_STATUSES
// (the mobile app's single source of truth for this gate) - keep in lockstep.
const CUSTOMER_CANCELLABLE_STATUSES = new Set<OrderStatus>([
  "pending_payment",
  "order_placed",
  "order_accepted",
  "searching_tailor",
  "broadcasted",
  "tailor_assigned",
  "pickup_scheduled",
  "pickup_pending",
  "picked_up",
]);

// Mirrors react_app/src/constants/supportIssues.ts's PRE_PICKUP_STATUSES -
// pickup hasn't happened yet, so "reschedule pickup" is still a sensible
// request. Note this deliberately excludes "picked_up" (fabric already
// collected - nothing left to reschedule), unlike the cancellable set above.
const RESCHEDULABLE_STATUSES = new Set<OrderStatus>([
  "pending_payment",
  "order_placed",
  "order_accepted",
  "searching_tailor",
  "broadcasted",
  "tailor_assigned",
  "pickup_scheduled",
  "pickup_pending",
]);

// Mirrors app/api/v1/endpoints/customer_orders.py's RatingRequest/RatingResponse
// (GET/POST/PATCH /customer/orders/{order_id}/rating) - a rating may only be
// first submitted once an order is delivered, but can be EDITED any time
// after that with no time limit (PATCH), matching Amazon/Uber - there used
// to be no edit path at all, a resubmission attempt just hard-failed.
interface RatingResponse {
  order_id: number;
  rating: number;
  comment: string | null;
  already_rated: boolean;
  edited: boolean;
  updated_at: string | null;
}

// The backend only allows rating a delivered order (see get_order_rating /
// submit_order_rating in customer_orders.py). "delivered" and "completed"
// are both terminal, successfully-fulfilled states per lib/orderStatus.ts's
// ORDER_STATUS_META (completed.terminal === true, description confirms the
// order was delivered) - so both should surface the rating UI.
const RATEABLE_STATUSES = new Set<OrderStatus>(["delivered", "completed"]);

interface CancellationPreview {
  order_id: number;
  order_code: string;
  current_stage: string;
  display_stage: string;
  payment_type: "prepaid" | "postpaid";
  cancellation_allowed: boolean;
  contact_support: boolean;
  paid_amount: number;
  penalty_pct: number;
  penalty_amount: number;
  refund_pct: number;
  refund_amount: number;
  policy_description: string | null;
}

function StatusTimeline({ status }: { status: string }) {
  const meta = getOrderStatusMeta(status);
  const cancelled = meta.status === "cancelled" || meta.status === "order_rejected";

  if (cancelled) {
    return (
      <div className="rounded-2xl bg-red-50 p-5 text-sm font-semibold text-red-700">
        {meta.description}
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_SEQUENCE.indexOf(meta.status as OrderStatus);
  // Collapse into customer-facing milestones only, in sequence order.
  const milestones = ORDER_STATUS_SEQUENCE.filter(
    (s) => getOrderStatusMeta(s).customerFacing,
  );

  return (
    <div className="space-y-0">
      {milestones.map((s, i) => {
        const m = getOrderStatusMeta(s);
        const stepIndex = ORDER_STATUS_SEQUENCE.indexOf(s);
        const done = stepIndex < currentIndex || s === meta.status;
        const isCurrent = s === meta.status;
        const isLast = i === milestones.length - 1;
        return (
          <div key={s} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done ? "bg-[#171717] text-white" : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 size={16} /> : i + 1}
              </span>
              {!isLast && (
                <div className={`w-0.5 flex-1 ${done ? "bg-[#171717]" : "bg-gray-100"}`} style={{ minHeight: 28 }} />
              )}
            </div>
            <div className={`pb-7 ${isCurrent ? "" : "opacity-80"}`}>
              <p className={`text-sm font-bold ${done ? "text-[#171717]" : "text-gray-400"}`}>
                {m.customerLabel}
              </p>
              {isCurrent && (
                <p className="mt-1 text-xs leading-5 text-gray-500">{m.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** service_id -> resolved catalog image_url, built from stitching_types[] and
 * direct_services[] across the whole tree (a line item's service can be
 * either a tiered stitching type or a direct service). */
function buildServiceImageMap(tree: CatalogCategoriesTreeResponse): Map<number, string | null> {
  const map = new Map<number, string | null>();
  for (const category of tree.categories) {
    for (const line of category.service_lines) {
      for (const tier of line.stitching_types) {
        map.set(tier.service_id, tier.image_url ?? line.image_url ?? null);
      }
    }
    for (const direct of category.direct_services) {
      map.set(direct.service_id, direct.image_url ?? null);
    }
  }
  return map;
}

function ItemImage({
  imageUrl,
  bgIndex,
  className,
}: {
  imageUrl: string | null | undefined;
  bgIndex: number;
  className: string;
}) {
  if (imageUrl) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Image src={imageUrl} alt="" fill sizes="80px" className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${className} bg-gradient-to-br ${CARD_BACKGROUNDS[bgIndex % CARD_BACKGROUNDS.length]}`}
    />
  );
}

function CancelOrderModal({
  orderId,
  onClose,
  onCancelled,
}: {
  orderId: number;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [preview, setPreview] = useState<CancellationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<CancellationPreview>(`/orders/${orderId}/cancellation-preview`)
      .then((res) => {
        if (!cancelled) setPreview(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewError(
            err instanceof ClientApiError ? err.message : "Could not load cancellation details.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const confirmCancel = useCallback(async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await apiClient(`/orders/${orderId}/cancel`, { method: "POST", body: { reason: null } });
      onCancelled();
    } catch (err) {
      setCancelError(err instanceof ClientApiError ? err.message : "Cancellation failed. Please try again.");
    } finally {
      setCancelling(false);
    }
  }, [orderId, onCancelled]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-6 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">Cancel order?</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-gray-400 hover:bg-gray-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {loadingPreview && (
          <div className="mt-6 flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-gray-400" />
          </div>
        )}

        {!loadingPreview && previewError && (
          <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{previewError}</p>
        )}

        {!loadingPreview && preview && !preview.cancellation_allowed && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            This order can no longer be cancelled from here.
          </p>
        )}

        {!loadingPreview && preview && preview.contact_support && (
          <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            Please contact support to cancel this order.
          </p>
        )}

        {!loadingPreview && preview && preview.cancellation_allowed && !preview.contact_support && (
          <>
            <p className="mt-3 text-sm text-gray-500">This can&apos;t be undone.</p>

            {preview.payment_type === "prepaid" ? (
              <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Amount paid</span>
                  <span className="font-semibold">{money(preview.paid_amount)}</span>
                </div>
                {preview.penalty_amount > 0 && (
                  <div className="mt-2 flex justify-between text-red-600">
                    <span>Cancellation charges</span>
                    <span className="font-semibold">-{money(preview.penalty_amount)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-black/5 pt-2 text-base">
                  <span className="font-black">Refund amount</span>
                  <span className="font-black text-green-700">{money(preview.refund_amount)}</span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Refund will be processed to your original payment method within 5-7 business days.
                </p>
              </div>
            ) : preview.penalty_amount > 0 ? (
              <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                A cancellation charge of {money(preview.penalty_amount)} will be applicable on your next order.
              </div>
            ) : null}

            {preview.policy_description && (
              <p className="mt-4 text-xs leading-5 text-gray-400">{preview.policy_description}</p>
            )}

            {cancelError && (
              <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{cancelError}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                disabled={cancelling}
                className="flex-1 rounded-xl border border-black/10 py-3 text-sm font-bold hover:bg-gray-50 disabled:opacity-50"
              >
                Keep order
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {cancelling ? <Loader2 size={16} className="animate-spin" /> : "Yes, cancel"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StarRow({
  value,
  interactive = false,
  hoverValue,
  onHover,
  onSelect,
  size = 22,
}: {
  value: number;
  interactive?: boolean;
  hoverValue?: number;
  onHover?: (v: number | null) => void;
  onSelect?: (v: number) => void;
  size?: number;
}) {
  const display = interactive && hoverValue ? hoverValue : value;
  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined} aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onSelect?.(star)}
          onMouseEnter={() => onHover?.(star)}
          onMouseLeave={() => onHover?.(null)}
          className={interactive ? "transition-transform hover:scale-110" : "cursor-default"}
          aria-label={interactive ? `Rate ${star} star${star > 1 ? "s" : ""}` : undefined}
        >
          <Star
            size={size}
            className={star <= display ? "fill-[#c9992e] text-[#c9992e]" : "fill-transparent text-gray-300"}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

/** Self-contained rating section: fetches the customer's existing rating for
 * this order (GET /customer/orders/{id}/rating) and either shows the
 * read-only submitted rating (already_rated: true) or a submission form
 * (POST /customer/orders/{id}/rating). Matches CancelOrderModal's
 * fetch-its-own-data pattern above, but rendered inline rather than as a
 * modal since a rating prompt reads better as part of the page flow. */
function RatingCard({ orderId }: { orderId: number }) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [existing, setExisting] = useState<RatingResponse | null>(null);
  // True while showing the form - either for a first-time rating (no
  // existing rating yet) or because the customer tapped "Edit" on their
  // already-submitted one. PATCH has no time limit (Amazon/Uber-style),
  // unlike the old behavior where a rating was permanent the instant it
  // was submitted.
  const [editing, setEditing] = useState(false);

  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<RatingResponse>(`/customer/orders/${orderId}/rating`)
      .then((res) => {
        if (!cancelled) setExisting(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof ClientApiError ? err.message : "Couldn't load your rating.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const startEdit = () => {
    setSelectedRating(existing?.rating ?? 0);
    setComment(existing?.comment ?? "");
    setSubmitError(null);
    setEditing(true);
  };

  const handleSubmit = useCallback(async () => {
    if (selectedRating < 1) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient<RatingResponse>(`/customer/orders/${orderId}/rating`, {
        method: existing?.already_rated ? "PATCH" : "POST",
        body: { rating: selectedRating, comment: comment.trim() || null },
      });
      setExisting(res);
      setEditing(false);
    } catch (err) {
      setSubmitError(
        err instanceof ClientApiError ? err.message : "Couldn't submit your rating. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [orderId, selectedRating, comment, existing?.already_rated]);

  const showForm = editing || (!!existing && !existing.already_rated);

  return (
    <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">Your rating</h2>
        {!loading && !loadError && existing?.already_rated && !editing && (
          <button
            onClick={startEdit}
            className="text-xs font-bold text-gray-500 underline underline-offset-2 hover:text-black"
          >
            Edit
          </button>
        )}
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={16} className="animate-spin" /> Loading your rating…
        </div>
      )}

      {!loading && loadError && (
        <p className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{loadError}</p>
      )}

      {!loading && !loadError && existing?.already_rated && !editing && (
        <div className="mt-4">
          <StarRow value={existing.rating} />
          {existing.comment && (
            <p className="mt-3 text-sm leading-6 text-gray-600">&ldquo;{existing.comment}&rdquo;</p>
          )}
          <p className="mt-3 text-xs text-gray-400">
            {existing.edited ? "Updated - thanks for your feedback!" : "Thanks for your feedback!"}
          </p>
        </div>
      )}

      {!loading && !loadError && showForm && (
        <div className="mt-4">
          <p className="text-sm text-gray-500">How was your experience with this order?</p>
          <div className="mt-3">
            <StarRow
              value={selectedRating}
              interactive
              hoverValue={hoverRating ?? undefined}
              onHover={setHoverRating}
              onSelect={setSelectedRating}
              size={28}
            />
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Share more about your experience (optional)"
            className="mt-4 w-full resize-none rounded-2xl border border-black/10 p-3 text-sm outline-none focus:border-black/25"
          />
          {submitError && (
            <p className="mt-3 text-sm font-semibold text-red-600">{submitError}</p>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={handleSubmit}
              disabled={selectedRating < 1 || submitting}
              className="flex items-center gap-2 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-40"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
              {existing?.already_rated ? "Save changes" : "Submit rating"}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                disabled={submitting}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const requestChatOpen = useChatOpenRequest((s) => s.requestOpen);
  const [order, setOrder] = useState<CustomerOrderDetailsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imageMap, setImageMap] = useState<Map<number, string | null>>(new Map());

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showIssueSelector, setShowIssueSelector] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const [razorpayReady, setRazorpayReady] = useState(false);
  // See app/checkout/page.tsx's identical fix: next/script's onLoad simply
  // never fires if the script is blocked (ad-blocker/privacy extension) or a
  // network hiccup drops it - without this, "Pay now" stays disabled forever
  // with no explanation.
  const [razorpayLoadFailed, setRazorpayLoadFailed] = useState(false);
  const [razorpayRetryCount, setRazorpayRetryCount] = useState(0);
  const [payingNow, setPayingNow] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);

  // Only relevant when this order actually has a "Pay now" retry available -
  // on any other order (already paid, COD, etc.) there's nothing to pay for
  // here, so skip loading/watching the Razorpay script entirely rather than
  // showing a confusing "payment gateway unavailable" message with no Pay
  // button anywhere on the page to explain it. Computed inline from `order`
  // (not the later `canPayNow` const, which is declared after this
  // component's early-return guards and so can't be a hook dependency).
  const canPayNowForScript =
    !!order &&
    ((order.payment.payment_method !== "cod" &&
      RETRYABLE_PAYMENT_STATUSES.has(order.payment.payment_status)) ||
      (order.payment.payment_method === "cod" &&
        order.pricing.remaining_amount > 0 &&
        !COD_PAY_NOW_BLOCKED_STATUSES.has(order.order.status)));

  // A single 8s wait -> permanent failure was too brittle for something as
  // common as a slow first paint or a cold CDN edge: it made a customer
  // manually notice and click retry for hiccups that clear up in a couple
  // of seconds on their own. This silently retries the script load itself
  // (short, increasing backoff) up to MAX_AUTO_RETRIES times before ever
  // showing the customer anything - only a load that's still failing after
  // several real attempts is treated as an actual failure worth surfacing.
  const MAX_AUTO_RETRIES = 3;
  const RETRY_DELAYS_MS = [3000, 5000, 8000];

  useEffect(() => {
    if (!canPayNowForScript || razorpayReady) return;
    const delay = RETRY_DELAYS_MS[razorpayRetryCount] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
    const timer = setTimeout(() => {
      if (razorpayReady) return;
      // The script may have finished loading in the background even though
      // this specific onLoad callback (tied to an earlier <Script> mount)
      // never fired for us to see - checking window.Razorpay directly
      // catches that instead of retrying a load that's already succeeded.
      if (isRazorpayScriptReady()) {
        setRazorpayReady(true);
        return;
      }
      if (razorpayRetryCount < MAX_AUTO_RETRIES) {
        setRazorpayRetryCount((n) => n + 1);
        return;
      }
      console.warn(
        `[BMD] Razorpay script still not loaded after ${MAX_AUTO_RETRIES + 1} attempts.`,
        diagnoseRazorpayLoadFailure(),
      );
      setRazorpayLoadFailed(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [canPayNowForScript, razorpayReady, razorpayRetryCount]);

  const retryRazorpayLoad = () => {
    setRazorpayLoadFailed(false);
    setRazorpayReady(false);
    setRazorpayRetryCount(0);
  };

  const loadOrder = useCallback(() => {
    if (!orderId) return () => {};
    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient<CustomerOrderDetailsResponse>(`/customer/orders/${orderId}/details`)
      .then((res) => {
        if (!cancelled) setOrder(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ClientApiError && err.status === 403
              ? "You don't have access to this order."
              : err instanceof ClientApiError && err.status === 404
                ? "Order not found."
                : "Couldn't load this order.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => loadOrder(), [loadOrder]);

  // Resolve product images client-side once the order's line items are
  // known, against the public catalog tree (same client-side fetch pattern
  // as app/cart/page.tsx's guest-resolution flow: apiClient hitting
  // /catalog/categories/tree via the JSON proxy).
  useEffect(() => {
    if (!order) return;
    let cancelled = false;
    apiClient<CatalogCategoriesTreeResponse>("/catalog/categories/tree")
      .then((tree) => {
        if (!cancelled) setImageMap(buildServiceImageMap(tree));
      })
      .catch(() => {
        // Non-critical - falls back to gradient placeholders below.
      });
    return () => {
      cancelled = true;
    };
  }, [order]);

  const handleDownloadInvoice = useCallback(async () => {
    if (!orderId) return;
    setDownloadingInvoice(true);
    setInvoiceError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? `Could not download invoice (${res.status}).`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^"]+)"?/.exec(disposition);
      const filename = match?.[1] ?? `invoice-${orderId}.pdf`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setInvoiceError(err instanceof Error ? err.message : "Could not download invoice.");
    } finally {
      setDownloadingInvoice(false);
    }
  }, [orderId]);

  const heroImageUrl = useMemo(() => {
    if (!order) return null;
    const primaryServiceId = order.service.service_id ?? order.line_items[0]?.service_id ?? null;
    if (primaryServiceId == null) return null;
    return imageMap.get(primaryServiceId) ?? null;
  }, [order, imageMap]);

  // Retry payment on an existing order stuck payment_pending/payment_failed -
  // mirrors react_app/app/order-details.tsx's handlePayNow: create a fresh
  // Razorpay session for this order_id (POST /payments/create is itself
  // idempotent per order via `resumed`, so retrying is safe) and open
  // Checkout, verifying on success exactly like the checkout page's online
  // flow (lib/razorpayPayment.ts).
  const handlePayNow = useCallback(async () => {
    if (!order || payingNow) return;
    setPaymentError(null);
    setPaymentNotice(null);
    setPayingNow(true);

    try {
      // Must match what the backend actually validates against
      // (order.BookingAmount, the advance-booking fee due at checkout) - NOT
      // final_amount, the order's full total. Mirrors react_app's handlePayNow
      // priority exactly: pricing.advance_amount first (the authoritative
      // source - see get_order_details in customer_order_history_service.py),
      // then payment.amount (a prior payment attempt's own recorded amount),
      // then final_amount only as a last resort for an order shape with no
      // advance concept at all (e.g. COD).
      const amount = order.pricing.advance_amount || order.payment.amount || order.pricing.final_amount;
      const session = await createPaymentSession({ order_id: order.order.order_id, amount });
      const razorpayKeyId = resolveRazorpayKey(session);
      if (!razorpayKeyId || !session.razorpay_order_id) {
        throw new Error("Could not start payment. Please try again.");
      }
      if (!isRazorpayScriptReady() || !window.Razorpay) {
        throw new Error("Payment gateway is still loading. Please try again in a moment.");
      }

      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: session.amount_paise ?? session.amountPaise,
        currency: session.currency || "INR",
        name: "BookMyDarzi",
        description: order.order.order_code
          ? `Order #${order.order.order_code}`
          : `Order #${order.order.order_id}`,
        order_id: session.razorpay_order_id,
        prefill: {
          name: session.prefill?.name ?? undefined,
          email: session.prefill?.email ?? undefined,
          contact: session.prefill?.contact ?? undefined,
        },
        theme: { color: "#171717" },
        handler: (response) => {
          void handlePaymentVerify(session, response);
        },
        modal: {
          ondismiss: () => {
            setPayingNow(false);
            setPaymentNotice("Payment was not completed. You can try again anytime.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setPayingNow(false);
        setPaymentError(
          response?.error?.description
            ? `Payment failed: ${response.error.description}. Please try again.`
            : "Payment failed. Please try again.",
        );
      });

      razorpay.open();
    } catch (err) {
      setPayingNow(false);
      setPaymentError(err instanceof Error ? err.message : "Could not start payment. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, payingNow]);

  // Pay the full amount online for a COD order instead of waiting to pay
  // cash on delivery - mirrors react_app/app/order-details.tsx's
  // handlePayBalance. POST /payments/balance already supports this exact
  // case server-side (create_balance_payment detects the order's COD
  // Payment row and allows it despite PaymentStatus never having reached
  // advance_paid) - this reuses that same endpoint and the same Razorpay
  // Checkout + verify flow as handlePayNow above, just a different session
  // creation call.
  const handlePayCodBalance = useCallback(async () => {
    if (!order || payingNow) return;
    setPaymentError(null);
    setPaymentNotice(null);
    setPayingNow(true);

    try {
      const session = await createBalancePaymentSession(order.order.order_id);
      const razorpayKeyId = resolveRazorpayKey(session);
      if (!razorpayKeyId || !session.razorpay_order_id) {
        throw new Error("Could not start payment. Please try again.");
      }
      if (!isRazorpayScriptReady() || !window.Razorpay) {
        throw new Error("Payment gateway is still loading. Please try again in a moment.");
      }

      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: session.amount_paise ?? session.amountPaise,
        currency: session.currency || "INR",
        name: "BookMyDarzi",
        description: order.order.order_code
          ? `Order #${order.order.order_code}`
          : `Order #${order.order.order_id}`,
        order_id: session.razorpay_order_id,
        prefill: {
          name: session.prefill?.name ?? undefined,
          email: session.prefill?.email ?? undefined,
          contact: session.prefill?.contact ?? undefined,
        },
        theme: { color: "#171717" },
        handler: (response) => {
          void handlePaymentVerify(session, response);
        },
        modal: {
          ondismiss: () => {
            setPayingNow(false);
            setPaymentNotice("Payment was not completed. You can pay online again anytime, or pay cash on delivery.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setPayingNow(false);
        setPaymentError(
          response?.error?.description
            ? `Payment failed: ${response.error.description}. Please try again.`
            : "Payment failed. Please try again.",
        );
      });

      razorpay.open();
    } catch (err) {
      setPayingNow(false);
      setPaymentError(err instanceof Error ? err.message : "Could not start payment. Please try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, payingNow]);

  const handlePaymentVerify = async (
    session: PaymentSessionResponse,
    response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
  ) => {
    try {
      await verifyPayment({
        payment_code: session.payment_code,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      setPaymentNotice("Payment successful! Updating your order...");
      loadOrder();
    } catch (err) {
      // Razorpay already reported success here - the payment may well have
      // gone through even though our verify call failed. Never say "nothing
      // happened" in this case; point them to a safe way to confirm.
      setPaymentError(
        (err instanceof Error ? err.message : "Could not confirm your payment.") +
          " If money was deducted, it will reflect here shortly - contact support if it doesn't.",
      );
    } finally {
      setPayingNow(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-4 h-10 w-64 animate-pulse rounded-lg bg-gray-100" />
        <div className="mt-8 h-64 animate-pulse rounded-3xl bg-gray-100" />
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
        <p className="text-lg font-bold text-red-600">{error ?? "Something went wrong."}</p>
        <Link href="/orders" className="mt-6 inline-flex items-center gap-1 text-sm font-bold hover:text-[#b4832e]">
          <ArrowLeft size={15} /> Back to orders
        </Link>
      </main>
    );
  }

  const meta = getOrderStatusMeta(order.order.status);
  const addr = order.delivery_address;
  const pricing = order.pricing;
  const lineItems: CustomerOrderLineItem[] | null = order.line_items.length > 0 ? order.line_items : null;

  const canCancel = CUSTOMER_CANCELLABLE_STATUSES.has(meta.status as OrderStatus);
  const canReschedule = RESCHEDULABLE_STATUSES.has(meta.status as OrderStatus);
  const invoiceAvailable = meta.status === "delivered";
  const canRate = RATEABLE_STATUSES.has(meta.status as OrderStatus);
  const canPayNow =
    order.payment.payment_method !== "cod" &&
    RETRYABLE_PAYMENT_STATUSES.has(order.payment.payment_status);
  const canPayCodBalance =
    order.payment.payment_method === "cod" &&
    pricing.remaining_amount > 0 &&
    !COD_PAY_NOW_BLOCKED_STATUSES.has(order.order.status);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 lg:px-8">
      {(canPayNow || canPayCodBalance) && (
        <Script
          key={razorpayRetryCount}
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="afterInteractive"
          onLoad={() => {
            setRazorpayReady(true);
            setRazorpayLoadFailed(false);
          }}
          onError={() => setRazorpayLoadFailed(true)}
        />
      )}
      <Link href="/orders" className="flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-[#171717]">
        <ArrowLeft size={15} /> Back to orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ItemImage
            imageUrl={heroImageUrl}
            bgIndex={order.order.order_id}
            className="h-20 w-20 shrink-0 rounded-2xl"
          />
          <div>
            <p className="text-xs font-bold text-gray-400">
              {order.order.order_code ?? `ORD${order.order.order_id}`}
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">
              {order.service.service_name ?? "Tailoring service"}
            </h1>
            {order.service.category_name && (
              <p className="mt-1 text-sm text-gray-500">{order.service.category_name}</p>
            )}
          </div>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-bold ${STATUS_TONE_CLASSES[meta.tone]}`}>
          {meta.customerLabel}
        </span>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-5">
        <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm md:col-span-3">
          <h2 className="text-lg font-black">Order status</h2>
          <p className="mt-1 text-sm text-gray-500">{meta.description}</p>
          <div className="mt-6">
            <StatusTimeline status={order.order.status} />
          </div>
          {order.order.pickup_partner && (
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-[#f8f6f1] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#171717] text-sm font-black text-white">
                {order.order.pickup_partner.name.charAt(0)}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{order.order.pickup_partner.name}</p>
                <p className="text-xs text-gray-500">Your pickup partner</p>
              </div>
              {order.order.pickup_partner.mobile && (
                <a
                  href={`tel:${order.order.pickup_partner.mobile}`}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#171717] shadow-sm"
                  aria-label="Call pickup partner"
                >
                  <Phone size={15} />
                </a>
              )}
            </div>
          )}
        </section>

        <div className="space-y-6 md:col-span-2">
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">Pricing</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Item total</dt>
                <dd className="font-semibold">{money(pricing.base_amount)}</dd>
              </div>
              {pricing.discount_amount > 0 && (
                <div className="flex justify-between text-green-700">
                  <dt>Discount</dt>
                  <dd className="font-semibold">-{money(pricing.discount_amount)}</dd>
                </div>
              )}
              {pricing.service_fee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Service fee</dt>
                  <dd className="font-semibold">{money(pricing.service_fee)}</dd>
                </div>
              )}
              {pricing.gst_amount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">GST</dt>
                  <dd className="font-semibold">{money(pricing.gst_amount)}</dd>
                </div>
              )}
              {pricing.penalty_amount > 0 && (
                <div className="flex justify-between text-red-600">
                  <dt>Penalty</dt>
                  <dd className="font-semibold">{money(pricing.penalty_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-black/5 pt-2.5 text-base">
                <dt className="font-black">Total</dt>
                <dd className="font-black">{money(pricing.final_amount)}</dd>
              </div>
              {/* There is no advance/remaining split for online orders anymore
                  (compute_billing sets advance_amount == final_amount always) -
                  this row is only meaningful for the legacy case where they
                  still genuinely differ (a handful of pre-refactor orders). */}
              {pricing.advance_amount > 0 && pricing.advance_amount !== pricing.final_amount && (
                <div className="flex justify-between text-xs text-gray-400">
                  <dt>Advance paid</dt>
                  <dd>{money(pricing.advance_amount)}</dd>
                </div>
              )}
              {pricing.remaining_amount > 0 && (
                <div className="flex justify-between text-xs text-gray-400">
                  <dt>Balance due</dt>
                  <dd>{money(pricing.remaining_amount)}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4 text-xs">
              <span className="text-gray-400">Payment</span>
              <span className="font-bold capitalize">
                {order.payment.payment_method ?? "-"} · {order.payment.payment_status.replace(/_/g, " ")}
              </span>
            </div>
          </section>

          {addr && (
            <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-gray-500">
                <MapPin size={14} /> Delivery address
              </h2>
              <p className="mt-3 text-sm font-bold">{addr.name ?? "-"}</p>
              {addr.mobile && <p className="text-sm text-gray-500">{addr.mobile}</p>}
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {[addr.address_line_1, addr.address_line_2, addr.city, addr.state, addr.pincode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </section>
          )}
        </div>
      </div>

      {lineItems && (
        <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-black">Items in this order</h2>
          <div className="mt-4 divide-y divide-black/5">
            {lineItems.map((item, i) => (
              <div key={item.order_item_id ?? i} className="flex flex-wrap items-start justify-between gap-4 py-4">
                <div className="flex items-start gap-4">
                  <ItemImage
                    imageUrl={item.service_id != null ? imageMap.get(item.service_id) : null}
                    bgIndex={item.order_item_id ?? i}
                    className="h-14 w-14 shrink-0 rounded-xl"
                  />
                  <div>
                    <p className="font-bold">{item.service_name ?? "Service"}</p>
                    {item.category_name && <p className="text-xs text-gray-500">{item.category_name}</p>}
                    {item.person_name && (
                      <p className="mt-1 text-xs text-gray-400">For {item.person_name}</p>
                    )}
                    {item.measurement && (
                      <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                        <Ruler size={12} />
                        {item.measurement.profile_name ?? "Measurement"}
                        {item.measurement.fit ? ` · ${item.measurement.fit} fit` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-400">Qty {item.quantity}</p>
                  <p className="font-black">{money(item.line_total)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {order.order.customization_notes && (
        <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">Notes</h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">{order.order.customization_notes}</p>
        </section>
      )}

      {canRate && <RatingCard orderId={order.order.order_id} />}

      <section className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">
            Manage this order
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => setShowIssueSelector(true)}
              className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 py-2.5 text-sm font-bold text-teal-800 hover:bg-teal-100"
            >
              <MessageCircle size={15} /> Get help with this order
            </button>
            {canPayNow && !razorpayLoadFailed && (
              <button
                onClick={handlePayNow}
                disabled={payingNow || !razorpayReady}
                className="flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
              >
                {payingNow ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                {razorpayReady ? "Pay now" : "Pay now (loading…)"}
              </button>
            )}
            {canPayCodBalance && !razorpayLoadFailed && (
              <button
                onClick={handlePayCodBalance}
                disabled={payingNow || !razorpayReady}
                className="flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
              >
                {payingNow ? <Loader2 size={15} className="animate-spin" /> : <CreditCard size={15} />}
                {razorpayReady ? `Pay ${money(pricing.remaining_amount)} now` : "Pay online (loading…)"}
              </button>
            )}
            {/* An online order genuinely needs this payment to complete, so a
                failed script load stays a real, actionable warning. A COD
                order's "pay early" option is a convenience on top of an
                otherwise-fine order (cash on delivery still works) - it gets
                a quiet retry link instead of a same-weight warning button
                sitting next to Reschedule/Cancel, and no raw diagnostic text
                (kept in the console for debugging, see retryRazorpayLoad). */}
            {canPayNow && razorpayLoadFailed && (
              <button
                onClick={retryRazorpayLoad}
                className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-5 py-2.5 text-sm font-bold text-amber-800 hover:bg-amber-100"
              >
                Payment gateway unavailable - retry
              </button>
            )}
            {canPayCodBalance && !canPayNow && razorpayLoadFailed && (
              <button
                onClick={retryRazorpayLoad}
                className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50"
              >
                <CreditCard size={15} /> Pay online — tap to retry
              </button>
            )}
            {invoiceAvailable && (
              <button
                onClick={handleDownloadInvoice}
                disabled={downloadingInvoice}
                className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold hover:bg-gray-50 disabled:opacity-60"
              >
                {downloadingInvoice ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Download invoice
              </button>
            )}
            {canReschedule && (
              <button
                onClick={() =>
                  requestChatOpen({ orderId: order.order.order_id, issueCategory: "reschedule_pickup" })
                }
                className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-5 py-2.5 text-sm font-bold hover:bg-gray-50"
              >
                <CalendarClock size={15} /> Reschedule pickup
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100"
              >
                Cancel order
              </button>
            )}
          </div>
          {invoiceError && (
            <p className="mt-3 text-sm font-semibold text-red-600">{invoiceError}</p>
          )}
          {paymentError && (
            <p className="mt-3 text-sm font-semibold text-red-600">{paymentError}</p>
          )}
          {paymentNotice && (
            <p className="mt-3 text-sm font-semibold text-gray-600">{paymentNotice}</p>
          )}
          {/* razorpayLoadMessage carries the technical diagnosis (ad-blocker
              vs. slow connection, see lib/razorpayDiagnostics.ts) - useful in
              the console (already logged there in the load-timeout effect
              above) but too developer-facing for a customer to read here.
              Online orders get a real, specific instruction since paying
              matters; COD orders get one calm line since the order is fine
              either way. */}
          {canPayNow && razorpayLoadFailed && (
            <p className="mt-3 text-sm font-semibold text-amber-700">
              We couldn&apos;t load the payment screen. Please check your connection and tap retry, or try again in a moment.
            </p>
          )}
          {canPayCodBalance && !canPayNow && razorpayLoadFailed && (
            <p className="mt-3 text-xs text-gray-400">
              Online payment isn&apos;t available right now — you can still pay cash on delivery as usual.
            </p>
          )}
        </section>

      {showCancelModal && (
        <CancelOrderModal
          orderId={order.order.order_id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={() => {
            setShowCancelModal(false);
            loadOrder();
          }}
        />
      )}

      {showIssueSelector && (
        <IssueSelectorModal
          orderId={order.order.order_id}
          orderCode={order.order.order_code}
          orderStatus={order.order.status}
          onClose={() => setShowIssueSelector(false)}
        />
      )}
    </main>
  );
}
