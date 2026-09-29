"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  ChevronDown,
  Clock3,
  Hammer,
  Info,
  Loader2,
  PlusCircle,
  RefreshCcw,
  Ruler,
  ShoppingBag,
  Sparkles,
  SquareCheck,
  Square,
  Wand2,
} from "lucide-react";
import { fallbackTierDescription, formatDeliveryEta } from "@/lib/services/fallbackDescription";
import { GROUP_DESCRIPTIONS, type AlterationGroup } from "@/lib/services/alterationGroups";
import type { CatalogStitchingType, ServiceAddon } from "@/lib/types/catalog";
import type { SelectedAddon } from "@/lib/selectedAddons";
import { selectedAddonsTotal } from "@/lib/selectedAddons";
import { useAddToCart } from "@/lib/useAddToCart";
import { useBillingEstimate } from "@/lib/useBillingEstimate";

const GROUP_ICONS = {
  repair: Hammer,
  resize: Ruler,
  restyle: Wand2,
  other: Sparkles,
} as const;

/**
 * Bug fix: this used to link each group card to its own page, a hop whose
 * only new content was the tier list already summarized on the card one
 * screen earlier - collapsed into an inline expansion (see the group-card
 * commit). Same reasoning applied one level deeper here: each tier card
 * used to link to ITS OWN detail page just to show add-ons + Add to Cart /
 * Book Now - genuinely real booking actions, not a redundant re-display,
 * but per explicit follow-up direction they're now inline too, so the
 * whole line -> group -> tier -> book flow collapses to a single page with
 * two levels of in-place expansion instead of three separate navigations.
 */
export default function AlterationGroupPicker({
  groups,
  categoryId,
  lineId,
}: {
  groups: AlterationGroup[];
  categoryId: number;
  lineId: number;
}) {
  const [expandedKey, setExpandedKey] = useState<string | null>(groups[0]?.key ?? null);

  return (
    <div className="mt-6 grid gap-5 sm:grid-cols-3">
      {groups.map((group) => {
        const Icon = GROUP_ICONS[group.key];
        const cheapest = group.tiers.reduce(
          (min, t) => (min === null || t.base_price < min ? t.base_price : min),
          null as number | null,
        );
        const expanded = expandedKey === group.key;

        return (
          <div
            key={group.key}
            className={`sm:col-span-3 overflow-hidden rounded-3xl border shadow-sm transition ${
              expanded ? "border-ink/15 bg-white" : "border-black/5 bg-white hover:-translate-y-1 hover:shadow-xl"
            }`}
          >
            <button
              type="button"
              onClick={() => setExpandedKey(expanded ? null : group.key)}
              aria-expanded={expanded}
              className="group flex w-full items-center gap-4 p-6 text-left"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cream text-gold-deep">
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black">{group.label}</h3>
                <p className="mt-1 line-clamp-1 text-sm leading-6 text-gray-500">
                  {GROUP_DESCRIPTIONS[group.key]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div className="text-right">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    {group.tiers.length} option{group.tiers.length === 1 ? "" : "s"}
                  </p>
                  {cheapest != null && (
                    <p className="text-sm font-black">from ₹{cheapest.toLocaleString("en-IN")}</p>
                  )}
                </div>
                <ChevronDown
                  size={18}
                  className={`shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {expanded && (
              <div className="grid items-start gap-5 border-t border-black/5 bg-cream/40 p-6 md:grid-cols-2 lg:grid-cols-3">
                {group.tiers.map((tier) => (
                  <TierCard key={tier.service_id} tier={tier} categoryId={categoryId} lineId={lineId} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Exported so the flat (non-grouped) tier list on the line page
// (page.tsx) can reuse the exact same inline add-ons/Add to
// Cart/Book Now card instead of maintaining a second, divergent
// tier-card implementation that still links out to a detail page.
export function TierCard({
  tier,
  categoryId,
  lineId,
}: {
  tier: CatalogStitchingType;
  categoryId: number;
  lineId: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:shadow-lg md:col-span-1 lg:col-span-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex flex-1 flex-col text-left"
      >
        {tier.image_url && (
          <div className="relative h-44 w-full overflow-hidden">
            <Image
              src={tier.image_url}
              alt={tier.name}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-1 flex-col p-6">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-black">{tier.name}</h3>
            {tier.is_premium && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-gold">
                <Sparkles size={11} /> Premium
              </span>
            )}
          </div>

          <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
            {tier.description && tier.description.trim().length >= 20
              ? tier.description
              : fallbackTierDescription({
                  name: tier.name,
                  basePrice: tier.base_price,
                  estimatedDeliveryDays: tier.estimated_delivery_days,
                  estimatedDeliveryHours: tier.estimated_delivery_hours,
                  categoryName: tier.category_name,
                })}
          </p>

          <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Clock3 size={13} />
            Delivered in {formatDeliveryEta(tier.estimated_delivery_days, tier.estimated_delivery_hours)}
          </p>

          <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
            {open ? (
              <span className="text-sm font-bold text-gray-400">Options below</span>
            ) : (
              <span className="text-xl font-black">₹{tier.base_price.toLocaleString("en-IN")}</span>
            )}
            <span
              className={`inline-flex items-center rounded-xl px-4 py-2.5 text-xs font-bold transition ${
                open ? "bg-cream text-ink" : "bg-ink text-white"
              }`}
            >
              {open ? "Hide options" : "Book this"}
              <ChevronDown
                size={14}
                className={`ml-1.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </span>
          </div>
        </div>
      </button>

      {open && <TierBookingPanel tier={tier} categoryId={categoryId} lineId={lineId} />}
    </div>
  );
}

/**
 * The actual booking step - add-ons, live price, Add to Cart / Book Now -
 * inlined instead of living on its own page. Fetches this tier's add-ons
 * client-side (via /api/catalog/addons/[serviceId], since the direct
 * server-only helper can't be called from the browser) the first time it's
 * opened, same lazy-load feel as the old page navigation had, minus the
 * navigation.
 */
function TierBookingPanel({
  tier,
  categoryId,
  lineId,
}: {
  tier: CatalogStitchingType;
  categoryId: number;
  lineId: number;
}) {
  const [addons, setAddons] = useState<ServiceAddon[] | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [justAdded, setJustAdded] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { addToCart, addingId } = useAddToCart();
  const adding = addingId === tier.service_id;
  const billing = useBillingEstimate();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/catalog/addons/${tier.service_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setAddons(Array.isArray(data?.addons) ? data.addons : []);
      })
      .catch(() => {
        if (!cancelled) setAddons([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tier.service_id]);

  const addonsTotal = selectedAddonsTotal(selectedAddons);
  const subtotal = tier.base_price + addonsTotal;
  // Mirrors backend's compute_billing (app/services/orders/billing_breakdown.py):
  // GST applies to subtotal, platform fee is a flat add-on - matches what
  // checkout's real GET /cart billing block will charge, so this "Total"
  // doesn't visibly jump once the customer reaches checkout.
  const gstAmount = billing ? subtotal * billing.gst_rate : 0;
  const platformFee = billing?.platform_fee ?? 0;
  const liveTotal = subtotal + gstAmount + platformFee;

  const bookNowHref = useMemo(() => {
    const params = new URLSearchParams({ service_id: String(tier.service_id), name: tier.name });
    if (tier.image_url) params.set("image", tier.image_url);
    if (selectedAddons.length > 0) params.set("addons", JSON.stringify(selectedAddons));
    return `/book-now?${params.toString()}`;
  }, [tier.service_id, tier.name, tier.image_url, selectedAddons]);

  const handleAddToCart = async () => {
    await addToCart(
      tier.service_id,
      {
        name: tier.name,
        image_url: tier.image_url ?? null,
        base_price: tier.base_price,
        category_name: tier.category_name,
        service_line_name: tier.name,
        estimated_delivery_days: tier.estimated_delivery_days,
      },
      1,
      selectedAddons,
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1600);
  };

  return (
    <div className="border-t border-black/5 bg-cream/60 p-6">
      {addons === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 size={15} className="animate-spin" /> Loading options…
        </div>
      ) : addons.length > 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-white">
              <PlusCircle size={15} />
            </span>
            <div>
              <p className="text-sm font-black">Add extras</p>
              <p className="text-[11px] text-gray-400">Extend this order with optional work</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {addons.map((addon) => {
              const checked = selectedAddons.some((a) => a.addon_id === addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() =>
                    setSelectedAddons((prev) =>
                      checked
                        ? prev.filter((a) => a.addon_id !== addon.id)
                        : [...prev, { addon_id: addon.id, name: addon.name, price: addon.price }],
                    )
                  }
                  aria-pressed={checked}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left text-sm transition ${
                    checked ? "border-ink bg-cream" : "border-black/5 bg-white hover:border-black/15"
                  }`}
                >
                  {checked ? (
                    <SquareCheck size={18} className="shrink-0 text-ink" />
                  ) : (
                    <Square size={18} className="shrink-0 text-gray-300" />
                  )}
                  <span className="flex-1 font-bold">{addon.name}</span>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-black ${
                      checked ? "bg-ink text-white" : "bg-cream text-gold-deep"
                    }`}
                  >
                    +₹{addon.price.toLocaleString("en-IN")}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-400"
          >
            Total (incl. GST & fees)
            <Info size={12} />
          </button>
          <p className="text-2xl font-black tracking-tight text-ink">
            ₹{liveTotal.toLocaleString("en-IN")}
          </p>

          {showBreakdown && (
            <div className="absolute bottom-full left-0 z-10 mb-2 w-56 rounded-2xl border border-black/5 bg-white p-4 text-xs shadow-xl">
              <div className="flex items-center justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-bold text-ink">₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-gray-500">
                <span>GST{billing ? ` (${billing.gst_percent}%)` : ""}</span>
                <span className="font-bold text-ink">₹{gstAmount.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-gray-500">
                <span>Platform fee</span>
                <span className="font-bold text-ink">₹{platformFee.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2">
                <span className="font-bold text-ink">Total</span>
                <span className="font-black text-ink">₹{liveTotal.toLocaleString("en-IN")}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={adding}
            onClick={handleAddToCart}
            className={`inline-flex items-center rounded-xl border-2 px-5 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              justAdded
                ? "border-green-600 bg-green-600 text-white"
                : "border-ink text-ink hover:bg-white"
            }`}
          >
            {adding ? (
              <Loader2 className="mr-2 animate-spin" size={16} />
            ) : justAdded ? (
              <Check className="mr-2" size={16} />
            ) : (
              <ShoppingBag className="mr-2" size={16} />
            )}
            {justAdded ? "Added" : "Add to Cart"}
          </button>
          <Link
            href={bookNowHref}
            className="inline-flex items-center rounded-xl bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-black"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
