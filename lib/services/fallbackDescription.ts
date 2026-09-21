// Fallback body copy for a tier that has no real description set in the
// catalog yet - most tiers today fall into this bucket (verified: 22 of 23
// live tiers have no description as of this writing). Previously every one
// of those pages showed the exact same sentence with only the service name
// substituted in ("Professional X, finished by a verified tailor and
// quality-checked before dispatch.") - functionally correct, but reads as
// near-duplicate content across ~20+ pages to a search crawler, which can
// suppress how well any of them get indexed/ranked. This varies the
// sentence structure using data that's already unique per tier (price,
// delivery time, category) so the fallback itself isn't identical
// page-to-page - a stopgap until real descriptions are added in the admin
// panel, not a replacement for them.
// Shared turnaround-time phrase - "6 hours" for a rush alteration
// (estimatedDeliveryHours set by the admin), otherwise the usual "3 days"
// wording. Used everywhere a tier's delivery estimate is shown to the
// customer, so a rush service actually reads as fast instead of silently
// falling back to a days-based sentence.
export function formatDeliveryEta(estimatedDeliveryDays: number, estimatedDeliveryHours?: number | null): string {
  if (estimatedDeliveryHours && estimatedDeliveryHours > 0) {
    return `${estimatedDeliveryHours} hour${estimatedDeliveryHours === 1 ? "" : "s"}`;
  }
  return `${estimatedDeliveryDays} day${estimatedDeliveryDays === 1 ? "" : "s"}`;
}

export function fallbackTierDescription(params: {
  name: string;
  basePrice: number;
  estimatedDeliveryDays: number;
  estimatedDeliveryHours?: number | null;
  categoryName: string;
}): string {
  const { name, basePrice, estimatedDeliveryDays, estimatedDeliveryHours } = params;
  const lower = name.toLowerCase();
  const days = formatDeliveryEta(estimatedDeliveryDays, estimatedDeliveryHours);
  const price = `₹${basePrice.toLocaleString("en-IN")}`;

  // Rotates between a few real, distinct phrasings keyed off the tier's own
  // price band - cheap/quick fixes read differently from a fuller
  // alteration, and this keeps that distinction rather than forcing every
  // tier through one sentence shape.
  if (basePrice <= 49) {
    return `A quick, precise fix - ${lower} starts at ${price} and is typically ready in ${days}.`;
  }
  if (basePrice <= 99) {
    return `${name} done right: picked up from your door, handled by a verified tailor, and delivered back in ${days} for ${price}.`;
  }
  return `A more involved job - ${lower} is priced at ${price} and takes about ${days}, with the fabric collected and returned to your door.`;
}
