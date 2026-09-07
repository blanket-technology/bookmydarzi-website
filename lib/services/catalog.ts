import "server-only";
import { bmdFetch } from "@/lib/api";
import type { CatalogCategoriesTreeResponse } from "@/lib/types/catalog";

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
