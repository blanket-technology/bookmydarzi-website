import type { CatalogStitchingType } from "@/lib/types/catalog";

// Classifies a Custom Alterations line's tiers into Repair/Resize/Restyle.
// The catalog now has a real, admin-set field for this
// (CatalogStitchingType.alteration_group) - a tier's own explicit
// assignment always wins. Keyword classification on the tier name is only
// a fallback for a tier that hasn't been assigned one yet (e.g. one
// created before this field existed, or an admin who left it unset), so
// the grouping never silently loses items just because the backfill
// migration or an admin missed one.
//
// Used two ways on the website:
//  - A dedicated group page (/services/[categoryId]/[lineId]/[groupKey])
//    lists one group's tiers - the deliberate choice here is a real extra
//    click (line -> group -> tier) rather than an in-page section, since a
//    website tolerates that better than the mobile app and a dedicated URL
//    per group is better for SEO/scannability.
export type AlterationGroupKey = "repair" | "resize" | "restyle" | "other";

const GROUP_LABELS: Record<AlterationGroupKey, string> = {
  repair: "Repair",
  resize: "Resize",
  restyle: "Restyle",
  other: "Other",
};

// Kept in sync with react_app's lib/services/alterationGroups.ts exactly
// (see that file's comment) - shortened from the original ~90-char wording
// so the app's GroupCard (fixed 2-line height) doesn't clip mid-sentence;
// the shorter copy reads fine here too, so kept identical rather than
// diverging.
export const GROUP_DESCRIPTIONS: Record<AlterationGroupKey, string> = {
  repair: "Fix tears, broken zips, worn seams, or missing buttons.",
  resize: "Adjust length, waist, shoulder, or sleeve to fit you.",
  restyle: "Refresh the look with a design change or restyling.",
  other: "Additional alteration work for this garment.",
};

const GROUP_ORDER: AlterationGroupKey[] = ["repair", "resize", "restyle", "other"];

function classifyByKeyword(name: string): AlterationGroupKey {
  const n = name.toLowerCase();
  if (n.includes("repair") || n.includes("replacement")) return "repair";
  if (n.includes("length") || n.includes("waist") || n.includes("shoulder") || n.includes("adjustment")) {
    return "resize";
  }
  if (n.includes("restyle") || n.includes("redesign") || n.includes("style")) return "restyle";
  return "other";
}

function resolveGroup(tier: CatalogStitchingType): AlterationGroupKey {
  if (tier.alteration_group === "repair" || tier.alteration_group === "resize" || tier.alteration_group === "restyle") {
    return tier.alteration_group;
  }
  return classifyByKeyword(tier.name);
}

export interface AlterationGroup {
  key: AlterationGroupKey;
  label: string;
  tiers: CatalogStitchingType[];
}

/** Groups tiers by type, dropping any empty group - an "Other" bucket only
 * ever appears if a tier has neither an explicit alteration_group nor a
 * name matching a known keyword, so nothing is hidden, just organized. */
export function groupAlterationTiers(tiers: CatalogStitchingType[]): AlterationGroup[] {
  const byKey = new Map<AlterationGroupKey, CatalogStitchingType[]>();
  for (const tier of tiers) {
    const key = resolveGroup(tier);
    const list = byKey.get(key) ?? [];
    list.push(tier);
    byKey.set(key, list);
  }
  return GROUP_ORDER
    .filter((key) => byKey.has(key))
    .map((key) => ({ key, label: GROUP_LABELS[key], tiers: byKey.get(key)! }));
}
