"use client";

import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, CheckCircle2, Loader2, MapPin, Plus, Wallet, Zap } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { buildPickupTimeSlots } from "@/lib/pickupPrefs";
import { estimateOfferDiscount, type AppliedOffer, type ApiOffer } from "@/lib/appliedOffer";
import { InlineAddressForm, formatAddressLine } from "@/components/InlineAddressForm";
import { OfferPicker, useOffersList, useValidOffers } from "@/components/OfferPicker";
import type { Address, AddressListResponse } from "@/lib/types/account";
import {
  createPaymentSession,
  isRazorpayScriptReady,
  resolveRazorpayKey,
  verifyPayment,
  type PaymentSessionResponse,
} from "@/lib/razorpayPayment";

// Direct/single-service checkout ("Book Now" on a service page) - bypasses
// the cart entirely, mirroring react_app/app/buy-now-review.tsx exactly:
// GET /orders/billing-estimate for pricing, POST /orders/direct to place
// the order. Distinct backend code path from /cart + /checkout (see
// app/services/orders/direct_order_service.py) - it never touches the
// CART/CART_ENTRIES tables, so there is nothing to reconcile with the cart
// if a customer has both a cart and a direct order in flight.
interface BillingEstimate {
  service_id: number;
  quantity: number;
  item_total: number;
  platform_fee: number;
  cgst_amount: number;
  sgst_amount: number;
  gst_amount: number;
  penalty_amount: number;
  total_amount: number;
  advance_amount: number;
  remaining_amount: number;
  item_total_display: string;
  platform_fee_display: string;
  gst_display: string;
  total_amount_display: string;
  advance_amount_display: string;
  remaining_amount_display: string;
}

interface DirectOrderResult {
  order_id: number;
  order_code?: string;
  status?: string;
  final_amount?: number;
  total_amount_display?: string;
  advance_amount?: number;
  message?: string;
}

type PaymentMethod = "cod" | "online";

const PICKUP_TIME_SLOTS = buildPickupTimeSlots();

function formatInr(n: number | undefined): string {
  if (n === undefined) return "";
  return `₹${n.toLocaleString("en-IN")}`;
}

function BookNowContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, checked, fetchSession } = useAuth();

  const serviceId = Number(params.get("service_id"));
  // Passed through from the service page purely so the summary card has
  // something to show before the billing estimate loads - never trusted for
  // the actual charge, which always comes from GET /orders/billing-estimate.
  const serviceName = params.get("name") || "Service";
  const serviceImage = params.get("image");

  const [estimate, setEstimate] = useState<BillingEstimate | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(true);

  const [pickupType, setPickupType] = useState<"instant" | "scheduled">("instant");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const [appliedOffer, setAppliedOffer] = useState<AppliedOffer | null>(null);
  const offers = useOffersList(checked && !!user);
  const validOffers = useValidOffers(offers);
  const applyOffer = useCallback((offer: ApiOffer) => {
    setAppliedOffer({
      offer_id: offer.offer_id,
      title: offer.title,
      discount_type: offer.discount_type === "flat" ? "flat" : "percentage",
      discount_value: offer.discount_type === "flat" ? (offer.discount_amount ?? 0) : offer.discount_percent,
    });
  }, []);
  const removeOffer = useCallback(() => setAppliedOffer(null), []);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<DirectOrderResult | null>(null);

  const [razorpayReady, setRazorpayReady] = useState(false);
  const [razorpayRetryCount, setRazorpayRetryCount] = useState(0);
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating_order" | "creating_session" | "razorpay_pending" | "verifying"
  >("idle");
  const pendingOnlineOrderRef = useRef<{ orderId: number; orderCode?: string; amount: number } | null>(null);

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  // Mirrors app/checkout/page.tsx's own retry effect exactly: <Script>'s
  // onLoad only fires for the mount that actually loads the tag - a
  // customer who visited /cart or /checkout earlier this session already has
  // window.Razorpay set, so onLoad here never fires and "Pay & book" stayed
  // permanently disabled. Poll window.Razorpay directly instead of relying
  // on onLoad alone.
  const RAZORPAY_RETRY_DELAYS_MS = [500, 1500, 3000];
  useEffect(() => {
    if (razorpayReady) return;
    if (isRazorpayScriptReady()) {
      setRazorpayReady(true);
      return;
    }
    const delay =
      RAZORPAY_RETRY_DELAYS_MS[razorpayRetryCount] ??
      RAZORPAY_RETRY_DELAYS_MS[RAZORPAY_RETRY_DELAYS_MS.length - 1];
    const timer = setTimeout(() => {
      if (isRazorpayScriptReady()) {
        setRazorpayReady(true);
      } else {
        setRazorpayRetryCount((n) => n + 1);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [razorpayReady, razorpayRetryCount]);

  useEffect(() => {
    if (!checked || !user || !serviceId) return;
    apiClient<BillingEstimate>(`/orders/billing-estimate?service_id=${serviceId}&quantity=1`)
      .then(setEstimate)
      .catch((err) =>
        setEstimateError(err instanceof ClientApiError ? err.message : "Could not load pricing for this service."),
      );
  }, [checked, user, serviceId]);

  const loadAddresses = useCallback(async () => {
    setAddressesLoading(true);
    try {
      const res = await apiClient<AddressListResponse>("/users/addresses");
      setAddresses(res.addresses);
      const preferred =
        res.addresses.find((a) => a.id === res.default_address_id) ?? res.addresses[0] ?? null;
      if (preferred) setSelectedAddressId(preferred.id);
      setShowAddAddress(res.addresses.length === 0);
    } catch {
      // Non-fatal - the picker just shows "add a new address" instead.
      setShowAddAddress(true);
    } finally {
      setAddressesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!checked || !user) return;
    void loadAddresses();
  }, [checked, user, loadAddresses]);

  const buildOrderPayload = () => {
    // Same local (non-UTC) datetime construction as app/cart/page.tsx's
    // pickup-prefs effect - the backend's DirectOrderRequest.scheduled_pickup_at
    // expects "YYYY-MM-DDTHH:mm:00", not a UTC-suffixed ISO string.
    let scheduledPickupAt: string | undefined;
    const slot = PICKUP_TIME_SLOTS.find((s) => s.label === scheduledSlot);
    if (pickupType === "scheduled" && scheduledDate && slot) {
      const dt = new Date(`${scheduledDate}T00:00:00`);
      dt.setHours(slot.hour, slot.minute, 0, 0);
      scheduledPickupAt = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
        dt.getDate(),
      ).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:00`;
    }
    return {
      service_id: serviceId,
      quantity: 1,
      address_id: selectedAddressId,
      pickup_type: pickupType,
      ...(pickupType === "scheduled" && scheduledPickupAt
        ? { scheduled_pickup_at: scheduledPickupAt, pickup_time_slot: scheduledSlot }
        : {}),
      ...(appliedOffer ? { offer_id: appliedOffer.offer_id } : {}),
    };
  };

  const runDirectOrder = (method: PaymentMethod) =>
    apiClient<DirectOrderResult>("/orders/direct", {
      method: "POST",
      body: { ...buildOrderPayload(), payment_method: method },
      idempotencyKey: generateIdempotencyKey(),
    });

  const placeOrder = async () => {
    if (!selectedAddressId) {
      setError("Please select a delivery address.");
      return;
    }
    if (pickupType === "scheduled" && (!scheduledDate || !scheduledSlot)) {
      setError("Please choose a pickup date and time slot.");
      return;
    }
    if (paymentMethod === "online") {
      await startOnlinePayment();
      return;
    }
    setPlacingOrder(true);
    setError(null);
    try {
      const result = await runDirectOrder("cod");
      setOrderResult(result);
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Could not place your order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Mirrors app/checkout/page.tsx's startOnlinePayment exactly, just backed
  // by POST /orders/direct instead of POST /cart/checkout.
  const startOnlinePayment = async () => {
    setError(null);
    try {
      let orderId: number;
      let orderCode: string | undefined;
      let amount: number;

      if (pendingOnlineOrderRef.current) {
        ({ orderId, orderCode, amount } = pendingOnlineOrderRef.current);
      } else {
        setPlacingOrder(true);
        setPaymentStage("creating_order");
        const result = await runDirectOrder("online");
        orderId = result.order_id;
        orderCode = result.order_code;
        amount = result.final_amount ?? estimate?.total_amount ?? 0;
        pendingOnlineOrderRef.current = { orderId, orderCode, amount };
      }

      setPaymentStage("creating_session");
      const session = await createPaymentSession({ order_id: orderId, amount });

      const razorpayKeyId = resolveRazorpayKey(session);
      if (!razorpayKeyId || !session.razorpay_order_id) {
        throw new Error("Could not start payment. Please try again or choose Cash on Delivery.");
      }
      if (!isRazorpayScriptReady() || !window.Razorpay) {
        throw new Error("Payment gateway is still loading. Please try again in a moment.");
      }

      setPaymentStage("razorpay_pending");

      const razorpay = new window.Razorpay({
        key: razorpayKeyId,
        amount: session.amount_paise ?? session.amountPaise,
        currency: session.currency || "INR",
        name: "BookMyDarzi",
        description: orderCode ? `Order #${orderCode}` : `Order #${orderId}`,
        order_id: session.razorpay_order_id,
        prefill: {
          name: session.prefill?.name ?? user?.full_name ?? undefined,
          email: session.prefill?.email ?? user?.email ?? undefined,
          contact: session.prefill?.contact ?? user?.mobile ?? undefined,
        },
        theme: { color: "#171717" },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          void handleRazorpaySuccess(session, orderId, orderCode, response);
        },
        modal: {
          ondismiss: () => {
            setPaymentStage("idle");
            setPlacingOrder(false);
            setError("Payment was not completed. You can try again or switch to Cash on Delivery.");
          },
        },
      });

      razorpay.on("payment.failed", (response: { error?: { description?: string } }) => {
        setPaymentStage("idle");
        setPlacingOrder(false);
        setError(
          response?.error?.description
            ? `Payment failed: ${response.error.description}. Please try again.`
            : "Payment failed. Please try again.",
        );
      });

      razorpay.open();
    } catch (err) {
      setPaymentStage("idle");
      setPlacingOrder(false);
      setError(err instanceof Error ? err.message : "Could not start payment. Please try again.");
    }
  };

  const handleRazorpaySuccess = async (
    session: PaymentSessionResponse,
    orderId: number,
    orderCode: string | undefined,
    response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string },
  ) => {
    setPaymentStage("verifying");
    try {
      const verified = await verifyPayment({
        payment_code: session.payment_code,
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });
      const verifiedStatus = verified.status?.toLowerCase() ?? "";
      if (verifiedStatus.includes("fail")) {
        throw new Error("Payment verification failed. Please try again or contact support.");
      }
      pendingOnlineOrderRef.current = null;
      setPlacingOrder(false);
      setOrderResult({
        order_id: orderId,
        order_code: verified.order_code ?? orderCode,
        status: verified.status,
        message: "Payment successful.",
      });
    } catch (err) {
      setPaymentStage("idle");
      setPlacingOrder(false);
      setError(
        err instanceof ClientApiError
          ? `Payment may have been received, but we could not confirm it (${err.message}). Please check your orders page or contact support before trying again.`
          : "Payment may have been received, but we could not confirm it due to a connection issue. Please check your orders page or contact support before trying again.",
      );
    }
  };

  // Client-side estimate only, clearly labeled as such - create_direct_order
  // recomputes and validates the real discount server-side from offer_id
  // (same "the backend is authoritative" contract as app/cart/page.tsx).
  const estimatedDiscount = estimateOfferDiscount(appliedOffer, estimate?.total_amount ?? 0);

  if (!checked) {
    return (
      <main className="mx-auto flex max-w-6xl items-center justify-center px-5 py-24 lg:px-8">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center lg:px-8">
        <h1 className="text-3xl font-black">Log in to book this service</h1>
        <p className="mt-2 text-gray-500">Sign in to choose a delivery address and place your order.</p>
        <Link
          href={`/login?redirect=/book-now?service_id=${serviceId}%26name=${encodeURIComponent(serviceName)}`}
          className="mt-8 inline-block rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-black"
        >
          Log in
        </Link>
      </main>
    );
  }

  if (!serviceId) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center lg:px-8">
        <h1 className="text-3xl font-black">Nothing to book</h1>
        <p className="mt-2 text-gray-500">Pick a service first, then tap Book Now.</p>
        <Link
          href="/services"
          className="mt-8 inline-block rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-black"
        >
          Browse services
        </Link>
      </main>
    );
  }

  if (orderResult) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center lg:px-8">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100">
          <CheckCircle2 className="text-green-600" size={30} />
        </span>
        <h1 className="mt-6 text-3xl font-black">Order placed!</h1>
        <p className="mt-2 text-gray-500">
          {orderResult.order_code ? `Order #${orderResult.order_code}` : `Order #${orderResult.order_id}`} has been
          confirmed. {orderResult.message}
        </p>
        <Link
          href="/orders"
          className="mt-8 inline-block rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-black"
        >
          View my orders
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
      />
      <div className="mb-10">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">Book now</p>
        <h1 className="mt-2 text-4xl font-black">Confirm your booking</h1>
        <p className="mt-2 text-sm text-gray-500">
          No cart needed - book this service and we&apos;ll have someone collect it from you.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* ── Delivery address ─────────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                <MapPin size={17} />
              </span>
              <div>
                <h2 className="font-black">Delivery address</h2>
                <p className="text-xs text-muted">Where should we pick up your garments?</p>
              </div>
            </div>

            {addressesLoading ? (
              <div className="mt-5 flex justify-center py-6">
                <Loader2 className="animate-spin text-gray-400" size={22} />
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition ${
                      selectedAddressId === addr.id ? "border-ink bg-cream" : "border-black/5 hover:border-black/15"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold capitalize">
                          {addr.address_type} {addr.is_default && <span className="text-gold-deep">· Default</span>}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{formatAddressLine(addr)}</p>
                      </div>
                      {selectedAddressId === addr.id && <CheckCircle2 className="shrink-0 text-ink" size={18} />}
                    </div>
                  </button>
                ))}

                {!showAddAddress && (
                  <button
                    onClick={() => setShowAddAddress(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-black/10 py-3 text-xs font-bold text-muted hover:border-black/20"
                  >
                    <Plus size={14} /> Add a new address
                  </button>
                )}

                {showAddAddress && (
                  <InlineAddressForm
                    showCancel={addresses.length > 0}
                    onCancel={() => setShowAddAddress(false)}
                    onSaved={async (addr) => {
                      await loadAddresses();
                      setSelectedAddressId(addr.id);
                      setShowAddAddress(false);
                    }}
                  />
                )}
              </div>
            )}
          </section>

          {/* ── Pickup type ───────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                <Calendar size={17} />
              </span>
              <div>
                <h2 className="font-black">Pickup type</h2>
                <p className="text-xs text-muted">When should we collect your garments?</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPickupType("instant")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition ${
                  pickupType === "instant" ? "border-ink bg-cream text-ink" : "border-black/5 text-muted hover:border-black/15"
                }`}
              >
                <Zap size={16} className={pickupType === "instant" ? "text-gold-deep" : ""} /> Instant
              </button>
              <button
                onClick={() => setPickupType("scheduled")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition ${
                  pickupType === "scheduled" ? "border-ink bg-cream text-ink" : "border-black/5 text-muted hover:border-black/15"
                }`}
              >
                <Calendar size={16} className={pickupType === "scheduled" ? "text-gold-deep" : ""} /> Scheduled
              </button>
            </div>

            {pickupType === "scheduled" && (
              <div className="mt-5 space-y-4 rounded-2xl bg-cream p-5">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted">Pickup date</label>
                  <input
                    type="date"
                    min={today}
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink sm:w-64"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-muted">Time slot (9 AM – 9 PM)</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {PICKUP_TIME_SLOTS.map((slot) => (
                      <button
                        key={slot.label}
                        onClick={() => setScheduledSlot(slot.label)}
                        className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition ${
                          scheduledSlot === slot.label
                            ? "border-ink bg-ink text-white"
                            : "border-black/10 bg-white text-muted hover:border-black/25"
                        }`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Payment method ────────────────────────────────────────────── */}
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                <Wallet size={17} />
              </span>
              <div>
                <h2 className="font-black">Payment method</h2>
                <p className="text-xs text-muted">How would you like to pay?</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod("cod")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition ${
                  paymentMethod === "cod" ? "border-[#171717]" : "border-black/5 hover:border-black/15"
                }`}
              >
                Cash on Delivery {paymentMethod === "cod" && <CheckCircle2 className="text-[#b4832e]" size={18} />}
              </button>
              <button
                onClick={() => setPaymentMethod("online")}
                className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition ${
                  paymentMethod === "online" ? "border-[#171717]" : "border-black/5 hover:border-black/15"
                }`}
              >
                Pay Online {paymentMethod === "online" && <CheckCircle2 className="text-[#b4832e]" size={18} />}
              </button>
            </div>
          </section>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-6">
          <OfferPicker
            offers={validOffers}
            appliedOfferId={appliedOffer?.offer_id ?? null}
            onApply={applyOffer}
            onRemove={removeOffer}
          />

          <div className="rounded-3xl bg-cream p-6">
            <h2 className="text-lg font-black">Order summary</h2>
            <div className="mt-5 flex items-center gap-3">
              {serviceImage ? (
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={serviceImage} alt={serviceName} fill sizes="56px" className="object-cover" />
                </div>
              ) : (
                <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-to-br from-stone-200 to-stone-300" />
              )}
              <p className="min-w-0 truncate text-sm font-bold">{serviceName}</p>
            </div>

            <div className="my-5 border-t border-black/10" />

            {estimateError && <p className="text-sm font-semibold text-red-600">{estimateError}</p>}

            {!estimateError && (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{estimate?.item_total_display ?? <Loader2 className="animate-spin" size={14} />}</span>
                </div>
                {estimate && estimate.platform_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Platform fee</span>
                    <span>{estimate.platform_fee_display}</span>
                  </div>
                )}
                {estimate && estimate.gst_amount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>GST</span>
                    <span>{estimate.gst_display}</span>
                  </div>
                )}
                {estimatedDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Offer discount (est.)</span>
                    <span>&minus;{formatInr(estimatedDiscount)}</span>
                  </div>
                )}
                {estimate && estimate.penalty_amount > 0 && (
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Cancellation charge</span>
                    <span>{formatInr(estimate.penalty_amount)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="my-5 border-t border-black/10" />
            <div className="flex justify-between text-lg font-black">
              <span>Total</span>
              <span>
                {estimatedDiscount > 0 && estimate
                  ? formatInr(Math.max(estimate.total_amount - estimatedDiscount, 1))
                  : estimate?.total_amount_display ?? "—"}
              </span>
            </div>
            {estimatedDiscount > 0 && (
              <p className="mt-2 text-[11px] text-gray-500">
                Estimated - the exact discount is confirmed when you place the order.
              </p>
            )}
          </div>

          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

          <button
            onClick={placeOrder}
            disabled={placingOrder || !selectedAddressId || (paymentMethod === "online" && !razorpayReady)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#171717] px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {placingOrder ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {paymentStage === "razorpay_pending" || paymentStage === "verifying"
                  ? "Confirming payment..."
                  : "Placing order..."}
              </>
            ) : paymentMethod === "online" ? (
              "Pay & book"
            ) : (
              "Confirm booking"
            )}
          </button>
        </aside>
      </div>
    </main>
  );
}

export default function BookNowPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-6xl items-center justify-center px-5 py-24 lg:px-8">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </main>
      }
    >
      <BookNowContent />
    </Suspense>
  );
}
