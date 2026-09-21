// Mirrors react_app/src/types/catalogApi.ts exactly - this is the real
// response shape returned by the BMD backend's GET /catalog/categories/tree
// (public, no auth). Keep in sync with that file; do not invent fields.

export interface CatalogStitchingType {
  service_id: number;
  name: string;
  description?: string | null;
  base_price: number;
  estimated_delivery_days: number;
  /** Sub-day turnaround override (e.g. a 6hr/12hr rush alteration). When
   * set, this takes precedence over estimated_delivery_days for display.
   * Null for every service still quoted in days. */
  estimated_delivery_hours?: number | null;
  display_order: number;
  is_premium: boolean;
  is_active: boolean;
  image_url?: string | null;
  highlights: string[];
  service_line_id: number;
  service_line_name: string;
  category_id: number;
  category_name: string;
  /** Admin-set Repair/Resize/Restyle grouping, only meaningful for a
   * Custom Alterations tier. Null if not yet explicitly assigned - callers
   * fall back to keyword classification on the tier name in that case
   * (see alterationGroups.ts's classify()). */
  alteration_group?: "repair" | "resize" | "restyle" | null;
}

export interface CatalogServiceLine {
  id: number;
  name: string;
  description?: string | null;
  display_order: number;
  image_url: string | null;
  starting_price: number | null;
  stitching_types: CatalogStitchingType[];
}

export interface CatalogDirectService {
  service_id: number;
  name: string;
  description?: string | null;
  base_price: number;
  estimated_delivery_days: number;
  estimated_delivery_hours?: number | null;
  display_order: number;
  is_premium: boolean;
  is_active: boolean;
  image_url: string | null;
  highlights: string[];
  service_line_id: number | null;
  service_line_name: string | null;
  category_id: number;
  category_name: string;
}

export interface CatalogCategory {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  service_lines: CatalogServiceLine[];
  direct_services: CatalogDirectService[];
}

export interface CatalogCategoriesTreeResponse {
  categories: CatalogCategory[];
}

// GET /services/{id}/addons - app/api/v1/endpoints/catalog.py's
// get_service_addons. Optional, separately-priced extras scoped to one
// specific service (e.g. Shirt Repair's own Button Replacement/Shoulder
// Adjustment/Length Shortening), not part of the catalog tree response.
export interface ServiceAddon {
  id: number;
  service_id: number;
  name: string;
  description?: string | null;
  price: number;
  display_order: number;
  is_active: boolean;
}
