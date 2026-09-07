// Mirrors react_app/src/types/catalogApi.ts exactly - this is the real
// response shape returned by the BMD backend's GET /catalog/categories/tree
// (public, no auth). Keep in sync with that file; do not invent fields.

export interface CatalogStitchingType {
  service_id: number;
  name: string;
  description?: string | null;
  base_price: number;
  estimated_delivery_days: number;
  display_order: number;
  is_premium: boolean;
  is_active: boolean;
  image_url?: string | null;
  highlights: string[];
  service_line_id: number;
  service_line_name: string;
  category_id: number;
  category_name: string;
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
