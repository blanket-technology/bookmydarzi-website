"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import AddonPicker from "./AddonPicker";
import AddToCartButton from "./AddToCartButton";
import type { ServiceAddon } from "@/lib/types/catalog";
import type { SelectedAddon } from "@/lib/selectedAddons";
import { selectedAddonsTotal } from "@/lib/selectedAddons";

// Client-side coordinator between the addon picker and the two purchase
// actions (Add to Cart / Book Now) - the page itself is a Server Component
// so selection state has to live in a client wrapper like this one, not on
// the page, for both buttons to read the same selection.
export default function ServiceActions({
  serviceId,
  name,
  imageUrl,
  basePrice,
  categoryName,
  serviceLineName,
  estimatedDeliveryDays,
  addons,
}: {
  serviceId: number;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  categoryName: string;
  serviceLineName: string;
  estimatedDeliveryDays: number;
  addons: ServiceAddon[];
}) {
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const addonsTotal = selectedAddonsTotal(selectedAddons);
  const liveTotal = basePrice + addonsTotal;

  const bookNowHref = useMemo(() => {
    const params = new URLSearchParams({ service_id: String(serviceId), name });
    if (imageUrl) params.set("image", imageUrl);
    if (selectedAddons.length > 0) {
      params.set("addons", JSON.stringify(selectedAddons));
    }
    return `/book-now?${params.toString()}`;
  }, [serviceId, name, imageUrl, selectedAddons]);

  return (
    <>
      <div className="mt-7 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Price</p>
          <p className="text-3xl font-black text-ink transition-all duration-200">
            ₹{liveTotal.toLocaleString("en-IN")}
          </p>
          {addonsTotal > 0 && (
            <p className="mt-0.5 text-xs font-semibold text-gray-400">
              ₹{basePrice.toLocaleString("en-IN")} + ₹{addonsTotal.toLocaleString("en-IN")} extras
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 pb-1.5 text-sm font-semibold text-gray-600">
          <Clock3 size={16} className="text-gold-deep" />
          Delivered in {estimatedDeliveryDays} day
          {estimatedDeliveryDays === 1 ? "" : "s"}
        </div>
      </div>

      <AddonPicker addons={addons} onChange={setSelectedAddons} />

      <div className="mt-7 flex flex-wrap gap-3">
        <AddToCartButton
          serviceId={serviceId}
          name={name}
          imageUrl={imageUrl}
          basePrice={basePrice}
          categoryName={categoryName}
          serviceLineName={serviceLineName}
          estimatedDeliveryDays={estimatedDeliveryDays}
          selectedAddons={selectedAddons}
        />
        <Link
          href={bookNowHref}
          className="inline-flex items-center rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
        >
          Book Now <ArrowRight className="ml-2" size={16} />
        </Link>
      </div>
    </>
  );
}
