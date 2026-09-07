"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, CreditCard, Loader2, MapPin, Wallet } from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { generateIdempotencyKey } from "@/lib/idempotency";
import { readPickupPrefs } from "@/lib/pickupPrefs";
import { readAppliedOffer, estimateOfferDiscount } from "@/lib/appliedOffer";
import { useGuestCart, guestCartEstimatedTotal } from "@/lib/guestCart";
import {
  createPaymentSession,
  isRazorpayScriptReady,
  resolveRazorpayKey,
  verifyPayment,
  type PaymentSessionResponse,
} from "@/lib/razorpayPayment";
import { diagnoseRazorpayLoadFailure } from "@/lib/razorpayDiagnostics";

// Address already linked to the cart server-side via PUT /cart/address
// (done on /cart, the only page with the actual address picker). Mirrors
// app/schemas/cart.py's CartAddressSchema exactly - GET /cart's `.address`
// returns this full object (or null), not just an id.
// Backend's assert_serviceable (app/services/location/serviceability_service.py)
// raises this exact message when the address on file has no latitude/
// longitude - always a pre-existing address saved before location capture
// was added, since new/edited addresses can't be saved without a pin
// anymore. Detected here so the checkout error state can offer a direct fix
// (deep-link to editing that exact address) instead of just showing the
// raw backend sentence with no way forward.
const MISSING_LOCATION_ERROR_PATTERN = /needs a precise location/i;

interface CartAddress {
  id: number;
  full_name: string;
  mobile: string;
  address_line_1: string;
  address_line_2?: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark?: string | null;
  address_type: string;
  is_default: boolean;
  full_address: string;
}

// Same cart shape as app/cart/page.tsx (kept local - the two pages read
// slightly different subsets of the same GET /cart response). Mirrors
// app/schemas/cart.py's CartBillingSchema.
interface CartBilling {
  item_total?: number;
  platform_fee?: number;
  discount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  gst_amount?: number;
  // A pending cancellation charge from an earlier COD order, already folded
  // into total_amount server-side (see _cart_billing in cart_service.py) -
  // shown as its own line so the customer sees it before paying, not just
  // after the order is placed.
  penalty_amount?: number;
  total_amount?: number;
  item_total_display?: string;
  platform_fee_display?: string;
  cgst_display?: string;
  sgst_display?: string;
  gst_display?: string;
  total_amount_display?: string;
}

interface CartServiceEntry {
  entry_id?: number;
  id?: number;
  service_name: string;
  quantity: number;
  line_total_display?: string;
  line_total?: number;
}

interface ApiCart {
  id: number;
  total_amount?: number;
  total_amount_display?: string;
  billing?: CartBilling;
  service_entries?: CartServiceEntry[];
  // Address already linked server-side via PUT /cart/address on the cart
  // page (app/schemas/cart.py's CartAddressSchema) - checkout only reads
  // and displays this; the actual picker lives on /cart.
  address?: CartAddress | null;
}

// POST /cart/checkout response - react_app/src/services/cartService.ts's
// mapCheckoutResult / CartCheckoutResult.
interface CheckoutResult {
  order_id: number;
  order_code?: string;
  status?: string;
  final_amount?: number;
  total_amount_display?: string;
  advance_amount?: number;
  message?: string;
}

type PaymentMethod = "cod" | "online";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, checked, fetchSession } = useAuth();
  const guestItems = useGuestCart((s) => s.items);

  const [cart, setCart] = useState<ApiCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Read-only readout of the pickup choice made on /cart - this page never
  // re-decides pickup_type/date/slot, only displays what will be sent.
  const [pickupSummary, setPickupSummary] = useState<{
    type: "instant" | "scheduled";
    dateLabel?: string;
    slot?: string;
  } | null>(null);

  useEffect(() => {
    const prefs = readPickupPrefs();
    if (!prefs) {
      setPickupSummary({ type: "instant" });
      return;
    }
    if (prefs.pickup_type === "scheduled" && prefs.scheduled_date) {
      const dateLabel = new Date(`${prefs.scheduled_date}T00:00:00`).toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      setPickupSummary({ type: "scheduled", dateLabel, slot: prefs.pickup_time_slot });
    } else {
      setPickupSummary({ type: "instant" });
    }
  }, []);

  // Offer selected on /cart (the only page with the offer picker) - this
  // page only reads and displays it, and forwards offer_id on
  // POST /cart/checkout; the backend recomputes and validates the discount
  // server-side (app/schemas/cart.py's CartCheckoutSchema.offer_id).
  const [appliedOffer] = useState(() => (typeof window !== "undefined" ? readAppliedOffer() : null));

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderResult, setOrderResult] = useState<CheckoutResult | null>(null);

  // Online-payment flow state. Distinct stages so the button/UI never looks
  // frozen during any of the three network round trips (checkout -> create
  // session -> verify). "razorpay_pending" covers both "Checkout popup is
  // open" and the brief gap before it opens once the session is ready.
  const [paymentStage, setPaymentStage] = useState<
    "idle" | "creating_order" | "creating_session" | "razorpay_pending" | "verifying"
  >("idle");
  const [razorpayReady, setRazorpayReady] = useState(false);
  // The Razorpay script can fail to load silently (network hiccup, an
  // ad-blocker/privacy extension blocking checkout.razorpay.com, a slow
  // connection) - next/script's onLoad simply never fires in that case, with
  // no error of its own. Without this, "Pay Online" stays disabled forever
  // with no explanation and no way to recover except reloading the page.
  const [razorpayLoadFailed, setRazorpayLoadFailed] = useState(false);
  const [razorpayRetryCount, setRazorpayRetryCount] = useState(0);
  // Set once a Razorpay success handler has actually fired but the /verify
  // call then failed or errored - real money may have moved. Rendered as a
  // dedicated, non-dismissable-by-retry banner; never conflated with a
  // plain "something went wrong, try again" error.
  const [verifyRiskNotice, setVerifyRiskNotice] = useState<{
    orderCode?: string;
    orderId: number;
  } | null>(null);
  // Order already created (payment-pending) once the customer reaches
  // Razorpay - kept so a popup dismissal / failure lets them retry payment
  // for the SAME order rather than re-running /cart/checkout and creating a
  // second one.
  const pendingOnlineOrderRef = useRef<{ orderId: number; orderCode?: string; amount: number } | null>(
    null,
  );
  const pendingSessionRef = useRef<PaymentSessionResponse | null>(null);

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  // A single 8s wait -> permanent failure was too brittle for something as
  // common as a slow first paint or a cold CDN edge: it made a customer
  // manually notice and click retry (or give up and switch to COD) for
  // hiccups that clear up in a couple of seconds on their own. This
  // silently retries the script load itself (short, increasing backoff) up
  // to MAX_AUTO_RETRIES times before ever showing the customer anything -
  // only a load that's still failing after several real attempts is
  // treated as an actual failure worth surfacing.
  const RAZORPAY_MAX_AUTO_RETRIES = 3;
  const RAZORPAY_RETRY_DELAYS_MS = [3000, 5000, 8000];

  useEffect(() => {
    if (razorpayReady) return;
    const delay =
      RAZORPAY_RETRY_DELAYS_MS[razorpayRetryCount] ??
      RAZORPAY_RETRY_DELAYS_MS[RAZORPAY_RETRY_DELAYS_MS.length - 1];
    const timer = setTimeout(() => {
      if (razorpayReady) return;
      // The script may have finished loading in the background even though
      // this specific onLoad callback never fired for us to see - checking
      // window.Razorpay directly catches that instead of retrying a load
      // that's already succeeded.
      if (isRazorpayScriptReady()) {
        setRazorpayReady(true);
        return;
      }
      if (razorpayRetryCount < RAZORPAY_MAX_AUTO_RETRIES) {
        setRazorpayRetryCount((n) => n + 1);
        return;
      }
      console.warn(
        `[BMD] Razorpay script still not loaded after ${RAZORPAY_MAX_AUTO_RETRIES + 1} attempts.`,
        diagnoseRazorpayLoadFailure(),
      );
      setRazorpayLoadFailed(true);
    }, delay);
    return () => clearTimeout(timer);
  }, [razorpayReady, razorpayRetryCount]);

  const retryRazorpayLoad = () => {
    setRazorpayLoadFailed(false);
    setRazorpayReady(false);
    setRazorpayRetryCount(0);
  };

  useEffect(() => {
    if (!checked || !user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const cartData = await apiClient<ApiCart>("/cart");
        setCart(cartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load checkout details.");
      } finally {
        setLoading(false);
      }
    })();
  }, [checked, user]);

  // Shared by both payment methods - pickup/address selection already lives
  // on the cart page (see comments below); only payment_method differs.
  const runCartCheckout = (method: "cod" | "online") => {
    const pickupPrefs = readPickupPrefs();
    return apiClient<CheckoutResult>("/cart/checkout", {
      method: "POST",
      body: {
        payment_method: method,
        pickup_type: pickupPrefs?.pickup_type ?? "instant",
        ...(pickupPrefs?.pickup_type === "scheduled" && pickupPrefs.scheduled_pickup_at
          ? {
              scheduled_pickup_at: pickupPrefs.scheduled_pickup_at,
              pickup_time_slot: pickupPrefs.pickup_time_slot,
            }
          : {}),
        ...(appliedOffer ? { offer_id: appliedOffer.offer_id } : {}),
      },
      idempotencyKey: generateIdempotencyKey(),
    });
  };

  const placeOrder = async () => {
    if (!cart?.address) {
      setError("Please select a delivery address on your cart before checking out.");
      return;
    }
    if (paymentMethod === "online") {
      await startOnlinePayment();
      return;
    }
    setPlacingOrder(true);
    setError(null);
    setNotice(null);
    try {
      // Pickup type/date/slot are chosen once, on the cart page - read that
      // selection here rather than re-deciding it, so the two pages never
      // show contradictory pickup state (see lib/pickupPrefs.ts). The
      // delivery address is likewise chosen once, on the cart page, and
      // persisted server-side via PUT /cart/address - address_id is
      // intentionally omitted here so checkout falls back to that saved
      // address (app/schemas/cart.py's CartCheckoutSchema.address_id).
      const result = await runCartCheckout("cod");
      setOrderResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place your order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  /**
   * Online-payment flow: POST /cart/checkout (payment_method="online") to
   * create the real order -> POST /payments/create for a Razorpay session
   * -> open Razorpay Checkout.js -> on success, POST /payments/verify ->
   * navigate to the same order-placed screen the COD path uses.
   *
   * If the customer already has a payment-pending order from a previous
   * attempt on this page load (Razorpay dismissed/failed), reuse it instead
   * of checking out a second time.
   */
  const startOnlinePayment = async () => {
    setError(null);
    setNotice(null);
    setVerifyRiskNotice(null);

    try {
      let orderId: number;
      let orderCode: string | undefined;
      let amount: number;

      if (pendingOnlineOrderRef.current) {
        ({ orderId, orderCode, amount } = pendingOnlineOrderRef.current);
      } else {
        setPlacingOrder(true);
        setPaymentStage("creating_order");
        const result = await runCartCheckout("online");
        orderId = result.order_id;
        orderCode = result.order_code;
        amount = result.final_amount ?? cart?.billing?.total_amount ?? cart?.total_amount ?? 0;
        pendingOnlineOrderRef.current = { orderId, orderCode, amount };
      }

      setPaymentStage("creating_session");
      const session = await createPaymentSession({ order_id: orderId, amount });
      pendingSessionRef.current = session;

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
        handler: (response) => {
          void handleRazorpaySuccess(session, orderId, orderCode, response);
        },
        modal: {
          ondismiss: () => {
            // Not a failure - the order already exists, payment-pending.
            // Reset to "place order" so the customer can retry without a
            // scary error message.
            setPaymentStage("idle");
            setPlacingOrder(false);
            setNotice("Payment was not completed. You can try again or switch to Cash on Delivery.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
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

  /** Handler fired by Razorpay Checkout.js itself on a successful charge. */
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
      pendingSessionRef.current = null;
      setPlacingOrder(false);
      setOrderResult({
        order_id: orderId,
        order_code: verified.order_code ?? orderCode,
        status: verified.status,
        message: "Payment successful.",
      });
    } catch (err) {
      // Razorpay already reported success at this point - money may have
      // moved even though our own verify call failed or errored. Never
      // show a generic "nothing happened" message here.
      setPaymentStage("idle");
      setPlacingOrder(false);
      setVerifyRiskNotice({ orderId, orderCode });
      setError(
        err instanceof ClientApiError
          ? `Payment may have been received, but we could not confirm it (${err.message}). Please check your orders page or contact support before trying again.`
          : "Payment may have been received, but we could not confirm it due to a connection issue. Please check your orders page or contact support before trying again.",
      );
    }
  };

  if (!checked) {
    return (
      <main className="mx-auto flex max-w-6xl items-center justify-center px-5 py-24 lg:px-8">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </main>
    );
  }

  if (!user) {
    if (guestItems.length === 0) {
      return (
        <main className="mx-auto max-w-2xl px-5 py-24 text-center lg:px-8">
          <h1 className="text-3xl font-black">Your cart is empty</h1>
          <p className="mt-2 text-gray-500">Add a service to your cart before checking out.</p>
          <Link
            href="/services"
            className="mt-8 inline-block rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-black"
          >
            Browse services
          </Link>
        </main>
      );
    }

    const guestTotal = guestCartEstimatedTotal(guestItems);

    return (
      <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
        <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">Checkout</p>
          <h1 className="mt-2 text-4xl font-black">Complete your booking</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-black/5 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-black">Log in to complete your order</h2>
              <p className="mt-2 text-sm text-gray-500">
                Your cart is saved. Log in to choose a delivery address, pickup time and payment
                method, then place your order.
              </p>
              <Link
                href="/login?redirect=/checkout"
                className="mt-6 inline-block rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                Log in
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                New here?{" "}
                <Link href="/signup?redirect=/checkout" className="font-bold text-[#171717] underline underline-offset-2">
                  Create an account
                </Link>
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-3xl bg-[#171717] p-6 text-white">
            <h2 className="text-lg font-black">Order summary</h2>
            <div className="mt-6 space-y-4 text-sm text-white/65">
              {guestItems.map((item) => (
                <div key={item.service_id} className="flex justify-between">
                  <span>
                    {item.name} &times; {item.quantity}
                  </span>
                  <span>{`₹${(item.base_price * item.quantity).toLocaleString("en-IN")}`}</span>
                </div>
              ))}
            </div>
            <div className="my-5 border-t border-white/10" />
            <div className="flex justify-between text-xl font-black">
              <span>Total (estimated)</span>
              <span>{`₹${guestTotal.toLocaleString("en-IN")}`}</span>
            </div>
            <p className="mt-3 text-[11px] text-white/40">
              Final pricing, fees and any discounts are confirmed after you log in.
            </p>
            <Link
              href="/login?redirect=/checkout"
              className="mt-6 block w-full rounded-xl bg-white py-3.5 text-center text-sm font-black text-[#171717]"
            >
              Log in to place order <ChevronRight className="ml-1 inline" size={15} />
            </Link>
          </aside>
        </div>
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

  if (loading) {
    return (
      <main className="mx-auto flex max-w-6xl items-center justify-center px-5 py-24 lg:px-8">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </main>
    );
  }

  const entries = cart?.service_entries ?? [];
  const billing = cart?.billing;
  const total = billing?.total_amount ?? cart?.total_amount ?? 0;
  const totalDisplay = billing?.total_amount_display ?? cart?.total_amount_display ?? `₹${total}`;
  // Client-side estimate only, clearly labeled as such - the backend
  // recomputes and validates the real discount from offer_id server-side.
  const estimatedDiscount =
    billing?.discount && billing.discount > 0 ? 0 : estimateOfferDiscount(appliedOffer, total);
  const displayTotal = total - estimatedDiscount;
  const displayTotalLabel =
    estimatedDiscount > 0 ? `₹${displayTotal.toLocaleString("en-IN")}` : totalDisplay;

  if (entries.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-24 text-center lg:px-8">
        <h1 className="text-3xl font-black">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Add a service to your cart before checking out.</p>
        <Link
          href="/services"
          className="mt-8 inline-block rounded-xl bg-[#171717] px-6 py-3 text-sm font-bold text-white hover:-translate-y-0.5 hover:bg-black"
        >
          Browse services
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
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
      <div className="mb-10">
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#b4832e]">Checkout</p>
        <h1 className="mt-2 text-4xl font-black">Complete your booking</h1>
      </div>

      {razorpayLoadFailed && paymentMethod === "online" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <span>
            Couldn&apos;t load the payment gateway. Check your connection and retry, or choose Cash on Delivery instead.
          </span>
          <button
            type="button"
            onClick={retryRazorpayLoad}
            className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      )}

      {error && cart?.address && MISSING_LOCATION_ERROR_PATTERN.test(error) ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <span>This delivery address needs a precise location before we can use it.</span>
          <Link
            href={`/profile?tab=addresses&editAddress=${cart.address.id}`}
            className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100"
          >
            Update this address
          </Link>
        </div>
      ) : error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}
      {notice && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {notice}
        </div>
      )}
      {verifyRiskNotice && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Your payment for{" "}
          {verifyRiskNotice.orderCode ? `order #${verifyRiskNotice.orderCode}` : `order #${verifyRiskNotice.orderId}`}{" "}
          may have gone through even though we could not confirm it here. Please check{" "}
          <Link href="/orders" className="underline underline-offset-2">
            My Orders
          </Link>{" "}
          before placing this order again, or contact support if the payment status looks wrong.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#171717] text-white">
                  <MapPin size={17} />
                </span>
                <div>
                  <h2 className="font-black">Delivery address</h2>
                  <p className="text-xs text-gray-500">Where should we collect/deliver?</p>
                </div>
              </div>
              <Link
                href="/cart"
                className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-[#171717] underline underline-offset-2 hover:text-black"
              >
                Change
              </Link>
            </div>

            <div className="mt-5">
              {cart?.address ? (
                <div className="rounded-2xl border-2 border-black/5 bg-gray-50 p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-600">
                      {cart.address.address_type}
                    </span>
                    {cart.address.is_default && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-[#b4832e]">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-bold">{cart.address.full_name}</p>
                  <p className="mt-0.5 text-sm leading-6 text-gray-500">{cart.address.full_address}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{cart.address.mobile}</p>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#f8f6f1] p-5 text-center">
                  <p className="text-sm text-gray-500">
                    No delivery address selected yet.
                  </p>
                  <Link
                    href="/cart"
                    className="mt-3 inline-block rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
                  >
                    Choose an address
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#171717] text-white">
                <CreditCard size={17} />
              </span>
              <div>
                <h2 className="font-black">Payment method</h2>
                <p className="text-xs text-gray-500">Choose how you'd like to pay</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <button
                onClick={() => setPaymentMethod("cod")}
                className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left ${
                  paymentMethod === "cod" ? "border-[#171717]" : "border-black/5 hover:border-black/15"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet size={18} className="text-gray-500" />
                  <div>
                    <p className="font-bold">Cash on Delivery</p>
                    <p className="mt-1 text-xs text-gray-500">Pay when your order is delivered</p>
                  </div>
                </div>
                {paymentMethod === "cod" && <CheckCircle2 className="text-[#b4832e]" size={20} />}
              </button>
              <button
                onClick={() => setPaymentMethod("online")}
                className={`flex w-full items-center justify-between rounded-2xl border-2 p-4 text-left ${
                  paymentMethod === "online" ? "border-[#171717]" : "border-black/5 hover:border-black/15"
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={18} className="text-gray-500" />
                  <div>
                    <p className="font-bold">Online Payment</p>
                    <p className="mt-1 text-xs text-gray-500">UPI, cards & net banking via Razorpay</p>
                  </div>
                </div>
                {paymentMethod === "online" && <CheckCircle2 className="text-[#b4832e]" size={20} />}
              </button>
            </div>
          </section>
        </div>

        <aside className="h-fit rounded-3xl bg-[#171717] p-6 text-white">
          <h2 className="text-lg font-black">Order summary</h2>
          <div className="mt-6 space-y-4 text-sm text-white/65">
            {entries.map((entry) => (
              <div key={entry.entry_id ?? entry.id} className="flex justify-between">
                <span>
                  {entry.service_name} &times; {entry.quantity}
                </span>
                <span>{entry.line_total_display ?? `₹${entry.line_total ?? 0}`}</span>
              </div>
            ))}
            {billing?.platform_fee_display && (
              <div className="flex justify-between">
                <span>Platform fee</span>
                <span>{billing.platform_fee_display}</span>
              </div>
            )}
            {billing?.discount !== undefined && billing.discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Discount</span>
                <span>&minus;{`₹${billing.discount}`}</span>
              </div>
            )}
            {estimatedDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Offer discount (est.)</span>
                <span>&minus;{`₹${estimatedDiscount.toLocaleString("en-IN")}`}</span>
              </div>
            )}
            {billing?.cgst_amount !== undefined && billing.cgst_amount > 0 && (
              <div className="flex justify-between">
                <span>CGST</span>
                <span>{billing.cgst_display ?? `₹${billing.cgst_amount}`}</span>
              </div>
            )}
            {billing?.sgst_amount !== undefined && billing.sgst_amount > 0 && (
              <div className="flex justify-between">
                <span>SGST</span>
                <span>{billing.sgst_display ?? `₹${billing.sgst_amount}`}</span>
              </div>
            )}
            {billing?.cgst_amount === undefined &&
              billing?.gst_amount !== undefined &&
              billing.gst_amount > 0 && (
                <div className="flex justify-between">
                  <span>GST</span>
                  <span>{billing.gst_display ?? `₹${billing.gst_amount}`}</span>
                </div>
              )}
            {billing?.penalty_amount !== undefined && billing.penalty_amount > 0 && (
              <div className="flex justify-between font-semibold text-red-400">
                <span>Cancellation charge</span>
                <span>{`₹${billing.penalty_amount}`}</span>
              </div>
            )}
          </div>
          {billing?.penalty_amount !== undefined && billing.penalty_amount > 0 && (
            <p className="mt-2 text-[11px] text-red-300/80">
              Includes a ₹{billing.penalty_amount} charge carried over from a recent order cancellation.
            </p>
          )}
          {pickupSummary && (
            <div className="mt-5 rounded-xl bg-white/5 px-4 py-3 text-xs text-white/70">
              <p className="font-bold uppercase tracking-wide text-white/50">Pickup</p>
              <p className="mt-1">
                {pickupSummary.type === "instant"
                  ? "Instant pickup"
                  : `Scheduled - ${pickupSummary.dateLabel}${pickupSummary.slot ? `, ${pickupSummary.slot}` : ""}`}
              </p>
            </div>
          )}
          {appliedOffer && (
            <div className="mt-3 rounded-xl bg-white/5 px-4 py-3 text-xs text-white/70">
              <p className="font-bold uppercase tracking-wide text-white/50">Offer applied</p>
              <p className="mt-1">{appliedOffer.title}</p>
            </div>
          )}
          <div className="my-5 border-t border-white/10" />
          <div className="flex justify-between text-xl font-black">
            <span>Total</span>
            <span>{displayTotalLabel}</span>
          </div>
          <button
            onClick={placeOrder}
            disabled={placingOrder || !cart?.address || (paymentMethod === "online" && !razorpayReady)}
            className="mt-6 w-full rounded-xl bg-white py-3.5 text-sm font-black text-[#171717] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {placingOrder ? (
              <>
                {paymentStage === "creating_order" && "Placing order…"}
                {paymentStage === "creating_session" && "Starting payment…"}
                {paymentStage === "razorpay_pending" && "Waiting for payment…"}
                {paymentStage === "verifying" && "Confirming payment…"}
                {paymentStage === "idle" && "Placing order…"}
              </>
            ) : paymentMethod === "online" ? (
              <>
                Pay Online{" "}
                {razorpayLoadFailed ? "(unavailable - retry above)" : !razorpayReady && "(loading…)"}
              </>
            ) : (
              "Place Order"
            )}{" "}
            <ChevronRight className="ml-1 inline" size={15} />
          </button>
          <p className="mt-4 text-center text-[10px] text-white/35">By placing this order, you agree to our terms.</p>
        </aside>
      </div>
    </main>
  );
}
