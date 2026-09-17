import { NextResponse } from "next/server";
import { getCatalogTree } from "@/lib/services/catalog";
import { buildSearchIndex } from "@/lib/services/searchIndex";

// The catalog tree itself is fetched server-side only (lib/services/catalog.ts
// is "server-only"), so the client-side Header's live-search dropdown can't
// call it directly. This route re-exposes just the flattened, already-public
// search index over the site's own API surface (same pattern as every other
// browser -> BMD call in this app: never direct, always through /api/*) -
// small payload (name/price/href per product, not the full nested tree),
// cached the same 60s window as the tree itself via getCatalogTree's own
// revalidate setting.
export async function GET() {
  const { categories } = await getCatalogTree();
  const index = buildSearchIndex(categories);
  return NextResponse.json({ index });
}
