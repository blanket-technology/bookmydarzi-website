"use client";

// Inline live-tracking map for the order detail page - the website's
// equivalent of react_app's LiveTrackingMap.tsx (same WS event, same REST
// fallback, same partner-pin/destination-pin/line/ETA shape), built on
// react-leaflet + OpenStreetMap tiles instead of react-native-maps, since
// this is a browser page with no Google Maps dependency anywhere else on
// the site - free at any scale, no API key to manage here.
//
// Dynamically imported with { ssr: false } by the caller - Leaflet
// touches `window`/`document` at module load and breaks server rendering.

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import { Clock } from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { useLiveTrackingWS, type PartnerLocationFrame } from "@/lib/useLiveTrackingWS";

interface Props {
  orderId: number;
  /** Only render/connect while the order is actually on a trackable leg -
   * caller already knows the order status. */
  enabled: boolean;
}

// Leaflet's default marker icon references image files by a relative URL
// that doesn't resolve once bundled - the standard fix is building the
// icon from the package's own asset imports instead of its CSS defaults.
const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#171717;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const partnerIcon = L.divIcon({
  className: "",
  html: `<div style="width:26px;height:26px;border-radius:50%;background:#B8860B;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:13px">🚲</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

export default function LiveTrackingMap({ orderId, enabled }: Props) {
  const [snapshot, setSnapshot] = useState<PartnerLocationFrame | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    apiClient<Partial<PartnerLocationFrame> & { order_id: number; trackable?: boolean }>(
      `/customer/orders/${orderId}/live-location`,
    )
      .then((res) => {
        if (!cancelled && res.partner_latitude != null && res.destination_latitude != null) {
          setSnapshot(res as PartnerLocationFrame);
        }
      })
      .catch(() => {
        // Non-critical - the WS subscription below fills this in on the
        // partner's next GPS ping, same as any other live feed.
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, enabled]);

  useLiveTrackingWS(enabled, (frame) => {
    if (Number(frame.order_id) !== orderId) return;
    setSnapshot(frame);
  });

  const bounds = useMemo(() => {
    if (!snapshot) return null;
    return [
      [snapshot.partner_latitude, snapshot.partner_longitude],
      [snapshot.destination_latitude, snapshot.destination_longitude],
    ] as [[number, number], [number, number]];
  }, [snapshot]);

  if (!enabled || !loaded || !snapshot || !bounds) return null;

  return (
    <div className="relative mb-3 overflow-hidden rounded-2xl border border-black/5 shadow-sm">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [50, 50] }}
        style={{ height: 260, width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        doubleClickZoom={false}
        touchZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[snapshot.partner_latitude, snapshot.partner_longitude]} icon={partnerIcon} />
        <Marker position={[snapshot.destination_latitude, snapshot.destination_longitude]} icon={destinationIcon} />
        <Polyline
          positions={[
            [snapshot.partner_latitude, snapshot.partner_longitude],
            [snapshot.destination_latitude, snapshot.destination_longitude],
          ]}
          pathOptions={{ color: "#B8860B", weight: 3, dashArray: "1 8", lineCap: "round" }}
        />
      </MapContainer>

      {/* Floating status pill overlapping the map's bottom edge - the
          Zomato/Blinkit "arriving in X min" treatment, not a separate
          strip stacked below the map. */}
      <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-2.5 rounded-xl bg-white px-3 py-2.5 shadow-lg">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#B8860B] text-white">
          <Clock size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-[#171717]">{snapshot.eta_label}</p>
          <p className="truncate text-xs text-gray-400">
            {snapshot.partner_name ? `${snapshot.partner_name} · ` : ""}
            {snapshot.distance_km.toFixed(1)} km away
          </p>
        </div>
      </div>
    </div>
  );
}
