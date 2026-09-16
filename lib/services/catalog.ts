import "server-only";
import { bmdFetch } from "@/lib/api";
import { BMD_API_V1 } from "@/lib/config";
import type { CatalogCategoriesTreeResponse, ServiceAddon } from "@/lib/types/catalog";

/**
 * Fetches the full category -> service line -> stitching type tree.
 * Public endpoint (no auth) - safe to call from any Server Component,
 * including at build/request time for SEO-friendly rendering. Mirrors
 * react_app/src/services/catalogService.ts's use of the same endpoint.
 *
 * Deliberately does NOT go through bmdFetch, which always sets
 * cache: "no-store" - correct for authenticated/per-user data, but this
 * catalog tree is genuinely public and shared, and no-store was forcing
 * every page that calls this (/services and its category/service-line/
 * detail pages) to fully opt out of static generation and re-fetch on
 * every request. A 60s revalidation window is a standard, safe tradeoff
 * for a catalog that changes via occasional admin edits, not per-request -
 * a price/availability change being visible within a minute instead of
 * instantly is normal for a storefront.
 */
export async function getCatalogTree(): Promise<CatalogCategoriesTreeResponse> {
  const res = await fetch(`${BMD_API_V1}/catalog/categories/tree`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`catalog tree fetch failed: ${res.status}`);
  return res.json();
}

/**
 * Active add-ons available for one specific service (e.g. Shirt Repair's
 * own Button Replacement/Shoulder Adjustment/Length Shortening) - public,
 * no auth. Returns [] rather than throwing on failure so a service detail
 * page still renders (without the add-on picker) if this call has trouble,
 * same non-fatal-degrade convention as other optional catalog data on this
 * page (e.g. missing image_url).
 */
export async function getServiceAddons(serviceId: number): Promise<ServiceAddon[]> {
  try {
    return await bmdFetch<ServiceAddon[]>(`/catalog/services/${serviceId}/addons`, {
      skipAuth: true,
    });
  } catch {
    return [];
  }
}
