"use client";

import { useCallback, useRef, useState } from "react";
import { apiClient, ClientApiError } from "@/lib/apiClient";

// Browser counterpart of react_app/app/address.tsx's GPS-tagging flow
// (handleUseMyLocation / gpsCoords / serviceability state). The backend now
// rejects saving an address with no latitude/longitude (see
// app/services/location/serviceability_service.py's assert_serviceable),
// so this hook is the single place both website AddressForm implementations
// (app/cart/page.tsx, app/profile/page.tsx) get real coordinates from,
// via the browser's own navigator.geolocation - there's no native module
// here like the mobile app, so no API key is needed client-side; the two
// backend calls below are plain unauthenticated GETs proxied through
// /api/proxy the same way every other client request is.

export interface GpsCoords {
  latitude: number;
  longitude: number;
}

interface ReverseGeocodeResult {
  line1: string;
  line2: string;
  city: string;
  state: string;
  pincode: string;
  cached: boolean;
}

export interface ServiceabilityResult {
  serviceable: boolean;
  city?: string;
  distance_km?: number;
  estimated_pickup_hours?: number;
  message: string;
}

export type LocationStatus =
  | "idle"
  | "detecting"
  | "captured"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported";

interface UseAddressLocationResult {
  coords: GpsCoords | null;
  status: LocationStatus;
  serviceability: ServiceabilityResult | null;
  statusMessage: string | null;
  /** Detect GPS, then reverse-geocode + check serviceability. Reverse-geocode
   * fields are handed back via onResolved so the caller can fill blank
   * fields only (never overwrite text the customer already typed) - same
   * rule as the mobile app's handleUseMyLocation. */
  detectLocation: (onResolved?: (fields: Partial<ReverseGeocodeResult>) => void) => Promise<void>;
  /** Seed coords when editing an address that already has lat/lng, so
   * re-saving without re-detecting doesn't lose them (mirrors
   * loadAddressIntoForm in address.tsx). */
  setCoords: (coords: GpsCoords | null) => void;
  reset: () => void;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0,
};

function messageForGeolocationError(err: GeolocationPositionError): {
  status: LocationStatus;
  message: string;
} {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return {
        status: "denied",
        message:
          "Location access was denied. Please allow location access in your browser settings, or enter your address manually.",
      };
    case err.POSITION_UNAVAILABLE:
      return {
        status: "unavailable",
        message: "We couldn't determine your location. Please try again or enter your address manually.",
      };
    case err.TIMEOUT:
      return {
        status: "timeout",
        message: "Location detection timed out. Please try again or enter your address manually.",
      };
    default:
      return {
        status: "unavailable",
        message: "Location unavailable. Please enter your address manually.",
      };
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, GEOLOCATION_OPTIONS);
  });
}

export function useAddressLocation(): UseAddressLocationResult {
  const [coords, setCoordsState] = useState<GpsCoords | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [serviceability, setServiceability] = useState<ServiceabilityResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  // Guards against a stale detectLocation() call's result landing after a
  // newer one started (rapid double-click on "Use my location").
  const requestIdRef = useRef(0);

  const setCoords = useCallback((next: GpsCoords | null) => {
    setCoordsState(next);
    setServiceability(null);
    setStatus(next ? "captured" : "idle");
    setStatusMessage(null);
  }, []);

  const reset = useCallback(() => {
    setCoordsState(null);
    setServiceability(null);
    setStatus("idle");
    setStatusMessage(null);
  }, []);

  const detectLocation = useCallback(
    async (onResolved?: (fields: Partial<ReverseGeocodeResult>) => void) => {
      const requestId = ++requestIdRef.current;

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setStatus("unsupported");
        setStatusMessage("Your browser doesn't support location detection. Please enter your address manually.");
        return;
      }

      setStatus("detecting");
      setStatusMessage(null);
      setServiceability(null);

      let position: GeolocationPosition;
      try {
        position = await getCurrentPosition();
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        const { status: errStatus, message } = messageForGeolocationError(err as GeolocationPositionError);
        setStatus(errStatus);
        setStatusMessage(message);
        return;
      }
      if (requestId !== requestIdRef.current) return;

      const next: GpsCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCoordsState(next);
      setStatus("captured");
      setStatusMessage("Location captured");

      // Reverse geocode - best-effort, non-fatal. GPS coords are already
      // captured so saving works even if this fails (backend returns 503
      // when it can't resolve address text; the customer just types it in).
      try {
        const geo = await apiClient<ReverseGeocodeResult>(
          `/location/reverse-geocode?latitude=${next.latitude}&longitude=${next.longitude}`,
        );
        if (requestId === requestIdRef.current) onResolved?.(geo);
      } catch {
        // Non-fatal - see comment above.
      }

      // Serviceability check - shown as an early, friendly heads-up only.
      // The backend (assert_serviceable) is the real authority and will
      // 422 on save with a proper message if this location is genuinely
      // out of area, so a failure here just means the badge doesn't show.
      try {
        const svc = await apiClient<ServiceabilityResult>(
          `/location/check-serviceability?latitude=${next.latitude}&longitude=${next.longitude}`,
        );
        if (requestId === requestIdRef.current) setServiceability(svc);
      } catch (err) {
        if (err instanceof ClientApiError) {
          // Leave serviceability null - badge simply won't render.
        }
      }
    },
    [],
  );

  return { coords, status, serviceability, statusMessage, detectLocation, setCoords, reset };
}
