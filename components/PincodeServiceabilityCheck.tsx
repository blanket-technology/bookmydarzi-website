"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";
import { useAddressLocation } from "@/lib/useAddressLocation";
import { registerServiceAreaInterest } from "@/lib/serviceAreaInterest";

/**
 * Homepage-only "do you serve my area?" check - silent by default, only
 * interrupts with a popup when the area is genuinely unserviceable.
 * Previously this was a pincode-entry box a visitor had to notice and use
 * (real friction for something meant to remove friction); auto-detecting
 * GPS location on page load and staying invisible unless there's actually
 * bad news to deliver is far less intrusive, matching the ask directly.
 *
 * Browser's own geolocation permission prompt is the only UI shown for a
 * serviceable area or a denied/unavailable location - no fallback pincode
 * box, no nagging banner either way (per explicit product decision - see
 * useAddressLocation's identical "leave serviceability null, badge simply
 * won't render" non-fatal-degrade convention).
 */
export default function PincodeServiceabilityCheck() {
  const location = useAddressLocation();
  const [dismissed, setDismissed] = useState(false);
  const [interestState, setInterestState] = useState<"idle" | "submitting" | "done">("idle");

  useEffect(() => {
    // Fire once on mount - triggers the browser's native permission
    // prompt if location access hasn't been granted/denied yet; if it's
    // already been decided (previously granted or denied), this resolves
    // silently with no visible prompt at all.
    void location.detectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRegisterInterest = async () => {
    setInterestState("submitting");
    try {
      await registerServiceAreaInterest({
        latitude: location.coords?.latitude ?? null,
        longitude: location.coords?.longitude ?? null,
      });
      setInterestState("done");
    } catch {
      setInterestState("idle");
    }
  };

  const showPopup =
    !dismissed && location.serviceability != null && location.serviceability.serviceable === false;

  if (!showPopup) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => setDismissed(true)}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
            <MapPin size={20} />
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>
        <h2 className="mt-4 text-lg font-black">
          {interestState === "done" ? "Thanks - you're on the list!" : "We're not in your area yet"}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-gray-500">
          {interestState === "done" ? (
            "We'll notify you the moment BookMyDarzi launches near you."
          ) : location.serviceability?.nearest_city && location.serviceability?.distance_km != null ? (
            <>
              We&apos;re not quite there yet, but we&apos;re close! The nearest area we currently
              serve is{" "}
              <span className="font-bold text-ink">{location.serviceability.nearest_city}</span>,
              about {Math.round(location.serviceability.distance_km)} km away. We&apos;re
              expanding fast - leave your details and we&apos;ll let you know the moment we reach
              you.
            </>
          ) : (
            "We're still growing our doorstep tailoring network and haven't reached your area just yet. Leave your details and we'll let you know the moment we do."
          )}
        </p>
        {interestState !== "done" && (
          <button
            type="button"
            onClick={handleRegisterInterest}
            disabled={interestState === "submitting"}
            className="mt-5 w-full rounded-xl bg-[#171717] px-4 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {interestState === "submitting" ? "Submitting..." : "Notify me when you launch here"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 w-full rounded-xl border border-black/10 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
        >
          {interestState === "done" ? "Close" : "Maybe later"}
        </button>
      </div>
    </div>
  );
}
