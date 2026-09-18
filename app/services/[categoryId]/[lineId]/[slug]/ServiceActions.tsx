"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Clock3, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AddonPicker from "./AddonPicker";
import AddToCartButton from "./AddToCartButton";
import type { CatalogStitchingType, ServiceAddon } from "@/lib/types/catalog";
import type { SelectedAddon } from "@/lib/selectedAddons";
import { selectedAddonsTotal } from "@/lib/selectedAddons";
import { useAddToCart } from "@/lib/useAddToCart";

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
  otherTiers,
}: {
  serviceId: number;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  categoryName: string;
  serviceLineName: string;
  estimatedDeliveryDays: number;
  addons: ServiceAddon[];
  /** Other tiers on the same line (any group) - offered as "Add more work
   * to this garment" checkboxes so several alteration tiers can be added
   * to one order in a single Add to Cart tap. Undefined/empty outside
   * Custom Alterations. */
  otherTiers?: CatalogStitchingType[];
}) {
  const router = useRouter();
  const { addMultipleToCart, addingId } = useAddToCart();
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [checkedTierIds, setCheckedTierIds] = useState<Set<number>>(new Set());
  const addonsTotal = selectedAddonsTotal(selectedAddons);
  const liveTotal = basePrice + addonsTotal;
  const bookingWithExtras = addingId === serviceId && checkedTierIds.size > 0;

  const toggleTier = (id: number) => {
    setCheckedTierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const extraTiers = useMemo(
    () => (otherTiers ?? []).filter((t) => checkedTierIds.has(t.service_id)),
    [otherTiers, checkedTierIds],
  );

  const bookNowHref = useMemo(() => {
    const params = new URLSearchParams({ service_id: String(serviceId), name });
    if (imageUrl) params.set("image", imageUrl);
    if (selectedAddons.length > 0) {
      params.set("addons", JSON.stringify(selectedAddons));
    }
    return `/book-now?${params.toString()}`;
  }, [serviceId, name, imageUrl, selectedAddons]);

  return (
    <div className="mt-7 rounded-3xl border border-black/5 bg-cream p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Price</p>
          <p className="mt-1 text-4xl font-black tracking-tight text-ink transition-all duration-200">
            ₹{liveTotal.toLocaleString("en-IN")}
          </p>
          {addonsTotal > 0 && (
            <p className="mt-1 text-xs font-semibold text-gray-400">
              ₹{basePrice.toLocaleString("en-IN")} + ₹{addonsTotal.toLocaleString("en-IN")} extras
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5 pb-1">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-gold-deep">
            <Clock3 size={16} />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">
              {estimatedDeliveryDays} day{estimatedDeliveryDays === 1 ? "" : "s"}
            </p>
            <p className="text-xs font-semibold text-gray-500">Delivery time</p>
          </div>
        </div>
      </div>

      <AddonPicker addons={addons} onChange={setSelectedAddons} />

      {otherTiers && otherTiers.length > 0 && (
        <div className="mt-6 border-t border-black/5 pt-5">
          <p className="text-sm font-black text-ink">Add more work to this garment</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Fixing more than one thing? Add it now in the same order.
          </p>
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {otherTiers.map((t) => {
              const checked = checkedTierIds.has(t.service_id);
              return (
                <button
                  key={t.service_id}
                  type="button"
                  onClick={() => toggleTier(t.service_id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    checked ? "border-gold-deep bg-white" : "border-black/5 bg-white/60 hover:bg-white"
                  }`}
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-stone-200 to-stone-300">
                    {t.image_url && (
                      <Image src={t.image_url} alt={t.name} fill sizes="44px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{t.name}</p>
                    <p className="mt-0.5 text-xs font-semibold text-gray-500">
                      ₹{t.base_price.toLocaleString("en-IN")} · {t.estimated_delivery_days}d
                    </p>
                  </div>
                  {checked ? (
                    <CheckCircle2 size={20} className="shrink-0 text-gold-deep" />
                  ) : (
                    <Circle size={20} className="shrink-0 text-gray-300" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <AddToCartButton
          serviceId={serviceId}
          name={name}
          imageUrl={imageUrl}
          basePrice={basePrice}
          categoryName={categoryName}
          serviceLineName={serviceLineName}
          estimatedDeliveryDays={estimatedDeliveryDays}
          selectedAddons={selectedAddons}
          extraTiers={extraTiers}
        />
        {extraTiers.length > 0 ? (
          // The direct-order ("Book Now") backend endpoint only ever takes
          // one service_id - rather than build a second multi-item order
          // path, this reuses the cart (already correct for multi-item
          // billing) as the mechanism: add the primary tier + every
          // checked extra, then land on /cart to finish checkout, instead
          // of the single-item /book-now flow.
          <button
            type="button"
            disabled={bookingWithExtras}
            onClick={async () => {
              await addMultipleToCart([
                {
                  serviceId,
                  displayInfo: {
                    name,
                    image_url: imageUrl,
                    base_price: basePrice,
                    category_name: categoryName,
                    service_line_name: serviceLineName,
                    estimated_delivery_days: estimatedDeliveryDays,
                  },
                },
                ...extraTiers.map((t) => ({
                  serviceId: t.service_id,
                  displayInfo: {
                    name: t.name,
                    image_url: t.image_url ?? null,
                    base_price: t.base_price,
                    category_name: categoryName,
                    service_line_name: serviceLineName,
                    estimated_delivery_days: estimatedDeliveryDays,
                  },
                })),
              ]);
              router.push("/cart");
            }}
            className="inline-flex items-center rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {bookingWithExtras ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : null}
            Book Now ({extraTiers.length + 1}) <ArrowRight className="ml-2" size={16} />
          </button>
        ) : (
          <Link
            href={bookNowHref}
            className="inline-flex items-center rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
          >
            Book Now <ArrowRight className="ml-2" size={16} />
          </Link>
        )}
      </div>
      {extraTiers.length > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          Booking {extraTiers.length + 1} items together will take you to your cart to finish checkout.
        </p>
      )}
    </div>
  );
}
