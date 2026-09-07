"use client";

import { Loader2, LocateFixed, MapPinCheck, MapPinOff } from "lucide-react";
import type { LocationStatus, ServiceabilityResult } from "@/lib/useAddressLocation";

// "Use my current location" control shared by both website AddressForm
// implementations (app/cart/page.tsx, app/profile/page.tsx). Styled to match
// the ink/gold/cream tokens in app/globals.css's @theme block, same family
// as the surrounding form fields in both pages.

export function AddressLocationField({
  status,
  statusMessage,
  serviceability,
  onDetect,
}: {
  status: LocationStatus;
  statusMessage: string | null;
  serviceability: ServiceabilityResult | null;
  onDetect: () => void;
}) {
  const detecting = status === "detecting";
  const captured = status === "captured";
  const isError = status === "denied" || status === "unavailable" || status === "timeout" || status === "unsupported";

  return (
    <div className="sm:col-span-2">
      <button
        type="button"
        onClick={onDetect}
        disabled={detecting}
        className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
          captured
            ? "border-gold-deep/40 bg-gold/10 text-gold-deep"
            : "border-black/10 bg-white text-ink hover:border-ink"
        }`}
      >
        {detecting ? (
          <Loader2 size={15} className="animate-spin" />
        ) : captured ? (
          <MapPinCheck size={15} />
        ) : (
          <LocateFixed size={15} />
        )}
        {detecting ? "Detecting location…" : captured ? "Location captured" : "Use my current location"}
      </button>

      {isError && statusMessage && (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-red-600">
          <MapPinOff size={13} className="mt-0.5 shrink-0" />
          {statusMessage}
        </p>
      )}

      {status === "idle" && (
        <p className="mt-2 text-xs font-medium text-muted">
          We need your location to confirm we deliver to this address.
        </p>
      )}

      {serviceability && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            serviceability.serviceable
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {serviceability.serviceable
            ? `We deliver here${serviceability.city ? ` · ${serviceability.city}` : ""}${
                serviceability.distance_km != null ? ` · ${serviceability.distance_km} km away` : ""
              }`
            : serviceability.message || "We don't deliver to this area yet"}
        </p>
      )}
    </div>
  );
}
