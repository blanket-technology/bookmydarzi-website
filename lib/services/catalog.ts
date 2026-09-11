import "server-only";
import { bmdFetch } from "@/lib/api";
import type { CatalogCategoriesTreeResponse, ServiceAddon } from "@/lib/types/catalog";

/**
 * Fetches the full category -> service line -> stitching type tree.
 * Public endpoint (no auth) - safe to call from any Server Component,
 * including at build/request time for SEO-friendly rendering. Mirrors
 * react_app/src/services/catalogService.ts's use of the same endpoint.
 */
export async function getCatalogTree(): Promise<CatalogCategoriesTreeResponse> {
  return bmdFetch<CatalogCategoriesTreeResponse>("/catalog/categories/tree", {
    skipAuth: true,
  });
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
