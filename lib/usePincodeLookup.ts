"use client";

import { useCallback, useRef, useState } from "react";
import { apiClient, ClientApiError } from "@/lib/apiClient";

// Auto-fills City/State from a typed 6-digit pincode (GET
// /location/pincode-lookup - app/api/v1/endpoints/location.py, backed by
// India Post's free public pincode API). Matches the Amazon/Flipkart/Myntra
// convention: type the pincode, city/state fill in and lock, with an
// explicit "Edit manually" escape hatch in case the lookup is ever wrong or
// the API is briefly down - this is a UX convenience, not a validation
// gate, so it must never be able to block someone from finishing the form.

interface PincodeLookupResult {
  city: string;
  state: string;
}

export type PincodeLookupStatus = "idle" | "looking-up" | "found" | "not-found" | "error";

export function usePincodeLookup() {
  const [status, setStatus] = useState<PincodeLookupStatus>("idle");
  const requestIdRef = useRef(0);

  const lookup = useCallback(
    async (pincode: string, onFound: (result: PincodeLookupResult) => void) => {
      const requestId = ++requestIdRef.current;

      if (!/^\d{6}$/.test(pincode)) {
        setStatus("idle");
        return;
      }

      setStatus("looking-up");
      try {
        const result = await apiClient<PincodeLookupResult>(
          `/location/pincode-lookup?pincode=${pincode}`,
        );
        if (requestId !== requestIdRef.current) return;
        setStatus("found");
        onFound(result);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof ClientApiError && err.status === 404) {
          setStatus("not-found");
        } else {
          setStatus("error");
        }
      }
    },
    [],
  );

  const reset = useCallback(() => setStatus("idle"), []);

  return { status, lookup, reset };
}
