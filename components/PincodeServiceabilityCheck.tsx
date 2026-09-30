"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MapPin } from "lucide-react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { usePincodeLookup } from "@/lib/usePincodeLookup";
import { registerServiceAreaInterest } from "@/lib/serviceAreaInterest";

interface ServiceabilityResult {
  serviceable: boolean;
  city?: string;
  message?: string;
}

/**
 * Homepage-only "do you serve my area?" check - deliberately upfront,
 * before a visitor invests any time picking services. Previously the
 * unserviceable-area warning only ever fired deep in checkout/address-add
 * (see UNSERVICEABLE_ERROR_PATTERN's other call sites), meaning acquisition
 * spend/organic traffic could land, browse, and only discover they can't
 * actually book at the very last step - wasted effort on both sides.
 *
 * Chains two existing public endpoints, no new backend surface:
 * GET /location/pincode-lookup (pincode -> city/state) then
 * GET /location/check-serviceability-by-address (city/state/pincode ->
 * serviceable true/false), exactly the same pair the address form's own
 * pincode lookup + assert_serviceable_for_address flow already use.
 */
export default function PincodeServiceabilityCheck() {
  const [pincode, setPincode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ServiceabilityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [interestState, setInterestState] = useState<"idle" | "submitting" | "done">("idle");
  const pincodeLookup = usePincodeLookup();

  const handleCheck = () => {
    const digits = pincode.trim();
    if (!/^\d{6}$/.test(digits)) {
      setError("Enter a valid 6-digit pincode.");
      return;
    }
    setError(null);
    setResult(null);
    setInterestState("idle");
    setChecking(true);

    // usePincodeLookup takes a found-callback, not a promise - a lookup
    // failure (not-found/error) resolves via its own `status` instead of
    // ever calling this callback, so failure is handled in the effect
    // below rather than a try/catch here.
    void pincodeLookup.lookup(digits, async ({ city, state }) => {
      try {
        const serviceability = await apiClient<ServiceabilityResult>(
          `/location/check-serviceability-by-address?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}&pincode=${digits}`,
        );
        setResult(serviceability);
      } catch (err) {
        setError(err instanceof ClientApiError ? err.message : "Couldn't check this pincode right now.");
      } finally {
        setChecking(false);
      }
    });
  };

  // Surfaces a pincode-lookup failure (the city/state resolution step,
  // before serviceability is even checked) - the success path clears
  // `checking` itself once the serviceability call resolves, in
  // handleCheck's callback above.
  useEffect(() => {
    if (!checking) return;
    if (pincodeLookup.status === "not-found") {
      setError("Pincode not found.");
      setChecking(false);
    } else if (pincodeLookup.status === "error") {
      setError("Couldn't check this pincode right now.");
      setChecking(false);
    }
  }, [checking, pincodeLookup.status]);

  const handleRegisterInterest = async () => {
    setInterestState("submitting");
    try {
      await registerServiceAreaInterest({ pincode: pincode.trim() });
      setInterestState("done");
    } catch {
      setInterestState("idle");
    }
  };

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-black/10 bg-white/70 p-4 backdrop-blur">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500">
        <MapPin size={13} className="text-[#b4832e]" />
        Check if we deliver to you
      </p>
      <div className="mt-2 flex gap-2">
        <input
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => {
            setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
            setResult(null);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleCheck()}
          placeholder="Enter your pincode"
          className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
        />
        <button
          type="button"
          onClick={handleCheck}
          disabled={checking}
          className="shrink-0 rounded-xl bg-[#171717] px-4 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking ? <Loader2 size={15} className="animate-spin" /> : "Check"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

      {result?.serviceable && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-green-700">
          <CheckCircle2 size={14} />
          Yes! We deliver to {result.city ?? "your area"}.
        </p>
      )}

      {result && !result.serviceable && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800">
          <p>{result.message ?? "We don't currently serve this area yet."}</p>
          <button
            type="button"
            onClick={handleRegisterInterest}
            disabled={interestState === "submitting" || interestState === "done"}
            className="mt-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {interestState === "done"
              ? "Thanks! We'll notify you 🎉"
              : interestState === "submitting"
                ? "Submitting..."
                : "Notify me when you launch here"}
          </button>
        </div>
      )}
    </div>
  );
}
