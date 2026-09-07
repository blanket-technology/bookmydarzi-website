"use client";

// Thin client-side wrapper around the two BMD payment endpoints used by the
// web checkout's online-payment flow, plus a helper for opening the loaded
// Razorpay Checkout.js widget. Mirrors the field names confirmed against
// the backend source (app/schemas/payment.py) and the mobile reference
// (react_app/src/services/paymentService.ts, react_app/src/utils/razorpayCheckout.ts) -
// adapted to Razorpay's web Checkout.js rather than react-native-razorpay.

import { apiClient } from "@/lib/apiClient";

// POST /payments/create request body - app/schemas/payment.py PaymentCreate.
export interface CreatePaymentPayload {
  order_id: number;
  amount: number;
  method?: "upi" | "card" | "netbanking" | "cash";
}

// POST /payments/create response - app/schemas/payment.py PaymentSessionResponse.
// Every alias field the schema can emit is kept optional here; callers should
// prefer razorpay_key_id per the confirmed contract.
export interface PaymentSessionResponse {
  payment_id: number;
  id: number;
  payment_code: string;
  order_code: string;
  order_id: number;
  amount: number;
  amount_paise: number;
  amountPaise: number;
  currency: string;
  method?: string | null;
  status: string;
  provider?: string | null;
  razorpay_key_id?: string | null;
  razorpay_key?: string | null;
  key?: string | null;
  key_id?: string | null;
  razorpay_order_id?: string | null;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  } | null;
  session_data?: Record<string, unknown> | null;
  resumed: boolean;
}

// POST /payments/verify response - app/schemas/payment.py PaymentVerifyResponse.
export interface PaymentVerifyResponse {
  message: string;
  status: string;
  payment_code: string;
  order_code?: string | null;
  transaction_id?: string | null;
}

/** POST /api/v1/payments/create - creates (or idempotently resumes) a Razorpay session for an order. */
export async function createPaymentSession(
  payload: CreatePaymentPayload,
): Promise<PaymentSessionResponse> {
  // No Idempotency-Key here: unlike /cart/checkout, /payments/create has no
  // header-based idempotency support server-side (confirmed by reading
  // app/api/v1/endpoints/payments.py's create_payment handler - it takes no
  // such dependency). The endpoint is itself idempotent per order via
  // `resumed`, which is the mechanism to rely on instead.
  return apiClient<PaymentSessionResponse>("/payments/create", {
    method: "POST",
    body: payload,
  });
}

/** POST /api/v1/payments/balance - creates (or resumes) a Razorpay session for
 * an order's remaining balance. Same response shape as /payments/create.
 * The backend also allows this for a COD order paying its full amount early
 * (detected server-side via the order's COD Payment row - see
 * create_balance_payment's is_cod_order check in payment_service.py), not
 * just the advance/balance split case the name suggests - mirrors
 * react_app/src/services/paymentService.ts's createBalancePaymentSession. */
export async function createBalancePaymentSession(
  orderId: number,
): Promise<PaymentSessionResponse> {
  return apiClient<PaymentSessionResponse>("/payments/balance", {
    method: "POST",
    body: { order_id: orderId },
  });
}

/** POST /api/v1/payments/verify - verifies the Razorpay Checkout result against the order. */
export async function verifyPayment(payload: {
  payment_code: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}): Promise<PaymentVerifyResponse> {
  return apiClient<PaymentVerifyResponse>("/payments/verify", {
    method: "POST",
    body: payload,
  });
}

/** Resolves the best available Razorpay publishable key from a session's aliases. */
export function resolveRazorpayKey(session: PaymentSessionResponse): string | null {
  return session.razorpay_key_id || session.razorpay_key || session.key || session.key_id || null;
}

/** True once the Razorpay Checkout.js script has attached window.Razorpay. */
export function isRazorpayScriptReady(): boolean {
  return typeof window !== "undefined" && typeof window.Razorpay === "function";
}
