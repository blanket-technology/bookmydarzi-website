// Minimal ambient typing for the Razorpay Checkout.js web SDK
// (https://checkout.razorpay.com/v1/checkout.js), loaded via next/script in
// app/checkout/page.tsx. Only the fields actually used there are typed -
// intentionally not a full SDK surface.

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailureError {
  code: string;
  description: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: {
    order_id?: string;
    payment_id?: string;
  };
}

interface RazorpayFailureResponse {
  error: RazorpayFailureError;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

export {};
