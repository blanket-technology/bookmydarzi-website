"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, Clock3, Hammer, RefreshCcw, Ruler, Sparkles, Wand2 } from "lucide-react";
import { fallbackTierDescription, formatDeliveryEta } from "@/lib/services/fallbackDescription";
import { GROUP_DESCRIPTIONS, type AlterationGroup } from "@/lib/services/alterationGroups";
import type { CatalogStitchingType } from "@/lib/types/catalog";

const GROUP_ICONS = {
  repair: Hammer,
  resize: Ruler,
  restyle: Wand2,
  other: Sparkles,
} as const;

/**
 * Bug fix: this used to link each group card to its own page
 * (/services/[categoryId]/[lineId]/[groupKey]), a real navigation hop whose
 * only new content was the tier list - the group's own icon/label/
 * description was already shown one screen earlier, on this same card.
 * Per explicit product direction (customer app's dedicated group-page
 * screen was found to be the one genuinely redundant "box in a box" step
 * in the whole booking flow), the group card now expands its tier list
 * in place instead of navigating away. Ported to the website first so it
 * can be reviewed before the same change goes into the mobile app.
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
          <div key={group.key} className="sm:col-span-3">
            <button
              type="button"
              onClick={() => setExpandedKey(expanded ? null : group.key)}
              aria-expanded={expanded}
              className={`group flex w-full flex-col rounded-3xl border p-6 text-left shadow-sm transition ${
                expanded ? "border-ink/15 bg-white" : "border-black/5 bg-white hover:-translate-y-1 hover:shadow-xl"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cream text-gold-deep">
                  <Icon size={22} />
                </span>
                <ChevronDown
                  size={18}
                  className={`mt-1.5 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </div>
              <h3 className="mt-4 text-lg font-black">{group.label}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-gray-500">
                {GROUP_DESCRIPTIONS[group.key]}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  {group.tiers.length} option{group.tiers.length === 1 ? "" : "s"}
                </p>
                {cheapest != null && (
                  <p className="text-sm font-black">from ₹{cheapest.toLocaleString("en-IN")}</p>
                )}
              </div>
            </button>

            {expanded && (
              <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

function TierCard({
  tier,
  categoryId,
  lineId,
}: {
  tier: CatalogStitchingType;
  categoryId: number;
  lineId: number;
}) {
  return (
    <Link
      href={`/services/${categoryId}/${lineId}/${tier.service_id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      {tier.image_url && (
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src={tier.image_url}
            alt={tier.name}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
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
          <span className="text-xl font-black">₹{tier.base_price.toLocaleString("en-IN")}</span>
          <span className="inline-flex items-center rounded-xl bg-ink px-4 py-2.5 text-xs font-bold text-white transition group-hover:-translate-y-0.5 group-hover:bg-black">
            View details <ArrowRight className="ml-1.5" size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
