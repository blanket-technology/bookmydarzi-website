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

export interface BillingEstimate {
  platform_fee: number;
  gst_rate: number;
  gst_percent: number;
}

/**
 * GST rate + platform fee, public and admin-configurable (same values
 * checkout's real GET /cart billing block uses) - lets a pre-cart price
 * (e.g. a tier card's "Total") show an accurate "incl. GST & fees"
 * estimate instead of a bare base price that visibly changes once the
 * customer reaches checkout. Falls back to nulls-as-zero (caller treats
 * a failure the same as "estimate unavailable, show base price only")
 * rather than hardcoding a rate here that could drift from whatever an
 * admin has actually configured.
 */
export async function getBillingEstimate(): Promise<BillingEstimate | null> {
  try {
    return await bmdFetch<BillingEstimate>(`/catalog/billing-estimate`, { skipAuth: true });
  } catch {
    return null;
  }
}

export interface ServiceReview {
  rating: number;
  comment: string | null;
  created_at: string | null;
}

export interface ServiceRatings {
  service_id: number;
  avg_rating: number;
  total_reviews: number;
  star_counts: Record<string, number>;
  recent_reviews: ServiceReview[];
}

/**
 * Aggregate star rating + recent reviews for one service - public, no
 * auth (GET /catalog/services/{id}/ratings, computed from ORDER_RATINGS).
 * Mirrors react_app/src/services/catalogService.ts's fetchServiceRatings
 * exactly (same endpoint, same shape) - the app already surfaces this on
 * its service detail screen; the website never did until now. Returns
 * null on failure so a tier detail page still renders without a reviews
 * section rather than erroring, same non-fatal-degrade convention as
 * getServiceAddons/getBillingEstimate above.
 */
export async function getServiceRatings(serviceId: number): Promise<ServiceRatings | null> {
  try {
    return await bmdFetch<ServiceRatings>(`/catalog/services/${serviceId}/ratings`, {
      skipAuth: true,
    });
  } catch {
    return null;
  }
}
