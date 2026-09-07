"use client";

// Distinguishes "the browser never even requested the Razorpay script"
// (the signature of an ad-blocker, tracking-protection list, or a
// proxy/firewall blocking the domain outright) from "a request went out but
// failed" (a real network/server issue) - used when next/script's onLoad
// hasn't fired within a timeout, since a silently-dropped request triggers
// neither onLoad nor onError.
export function diagnoseRazorpayLoadFailure(): {
  requestWasMade: boolean;
  message: string;
} {
  const entry = performance
    .getEntriesByType("resource")
    .find((r) => r.name.includes("checkout.razorpay.com/v1/checkout.js"));

  if (!entry) {
    return {
      requestWasMade: false,
      message:
        "Your browser never requested the payment script — an ad-blocker, tracking-protection " +
        "setting, or network filter is likely blocking checkout.razorpay.com.",
    };
  }
  return {
    requestWasMade: true,
    message:
      "The payment script request was sent but didn't complete in time — likely a slow or " +
      "unstable connection.",
  };
}
