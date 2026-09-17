import type { CatalogStitchingType } from "@/lib/types/catalog";

// Purely presentational grouping for a Custom Alterations line's tiers -
// no backend/catalog change, no new URL level. The catalog has no explicit
// "type" field for a tier, so this classifies by keywords already present
// in every real tier name today (see the live catalog: "Sleeve Repair",
// "Button Replacement", "Waist Adjustment", "Length Shortening", ...).
// Keeps the buying path at one click (line -> tier), just groups the same
// cards under headers instead of one flat, unsorted list - see the
// "box-in-a-box" navigation-depth discussion this was built for.
export type AlterationGroupKey = "repair" | "resize" | "restyle" | "other";

const GROUP_LABELS: Record<AlterationGroupKey, string> = {
  repair: "Repair",
  resize: "Resize",
  restyle: "Restyle",
  other: "Other",
};

const GROUP_ORDER: AlterationGroupKey[] = ["repair", "resize", "restyle", "other"];

function classify(name: string): AlterationGroupKey {
  const n = name.toLowerCase();
  if (n.includes("repair") || n.includes("replacement")) return "repair";
  if (n.includes("length") || n.includes("waist") || n.includes("shoulder") || n.includes("adjustment")) {
    return "resize";
  }
  if (n.includes("restyle") || n.includes("redesign") || n.includes("style")) return "restyle";
  return "other";
}

export interface AlterationGroup {
  key: AlterationGroupKey;
  label: string;
  tiers: CatalogStitchingType[];
}

/** Groups tiers by type, dropping any empty group - an "Other" bucket only
 * ever appears if a tier's name genuinely doesn't match a known keyword, so
 * nothing is hidden, just organized. */
export function groupAlterationTiers(tiers: CatalogStitchingType[]): AlterationGroup[] {
  const byKey = new Map<AlterationGroupKey, CatalogStitchingType[]>();
  for (const tier of tiers) {
    const key = classify(tier.name);
    const list = byKey.get(key) ?? [];
    list.push(tier);
    byKey.set(key, list);
  }
  return GROUP_ORDER
    .filter((key) => byKey.has(key))
    .map((key) => ({ key, label: GROUP_LABELS[key], tiers: byKey.get(key)! }));
}
