"use client";

import { apiClient } from "@/lib/apiClient";

// The stable substring the backend always includes in its unserviceable-area
// rejection message (see app/services/location/serviceability_service.py's
// _build_unserviceable_message) - used to special-case a friendlier banner +
// "I'm interested" button instead of the plain red error text, mirroring the
// existing MISSING_LOCATION_ERROR_PATTERN convention in app/checkout/page.tsx.
export const UNSERVICEABLE_ERROR_PATTERN = /outside our current service area/i;

export interface ServiceAreaInterestPayload {
  // Optional - the backend best-effort forward-geocodes city/pincode when
  // omitted (some callers, e.g. checkout's cart-linked address, never
  // surface coordinates client-side at all).
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  pincode?: string | null;
  address_text?: string | null;
}

export async function registerServiceAreaInterest(
  payload: ServiceAreaInterestPayload,
): Promise<{ message: string }> {
  return apiClient("/location/service-area-interest", {
    method: "POST",
    body: payload,
  });
}
