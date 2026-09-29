"use client";

import { useEffect, useState } from "react";
import type { BillingEstimate } from "@/lib/services/catalog";

// Module-level cache + in-flight promise, shared across every component
// instance for the lifetime of the page - the GST rate/platform fee don't
// vary per-tier or per-render, so with several tier cards mounted (or
// re-mounted via expand/collapse) at once, each independently calling
// this hook should still result in exactly one network request, not one
// per card.
let cached: BillingEstimate | null | undefined;
let inFlight: Promise<BillingEstimate | null> | null = null;

function fetchBillingEstimate(): Promise<BillingEstimate | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = fetch("/api/catalog/billing-estimate")
      .then((res) => res.json())
      .then((data): BillingEstimate | null => {
        const result: BillingEstimate | null = data?.estimate ?? null;
        cached = result;
        return result;
      })
      .catch((): BillingEstimate | null => {
        cached = null;
        return null;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** GST rate + platform fee for showing "Total incl. GST & fees" ahead of
 * the cart, matching checkout's real billing breakdown instead of a bare
 * base price that visibly jumps later. Returns null while loading or if
 * unavailable - callers should fall back to showing the base price alone
 * rather than blocking on this. */
export function useBillingEstimate(): BillingEstimate | null {
  const [estimate, setEstimate] = useState<BillingEstimate | null>(cached ?? null);

  useEffect(() => {
    let cancelled = false;
    fetchBillingEstimate().then((result) => {
      if (!cancelled) setEstimate(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return estimate;
}
