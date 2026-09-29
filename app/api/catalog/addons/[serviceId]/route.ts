import { NextResponse } from "next/server";
import { getServiceAddons } from "@/lib/services/catalog";

// getServiceAddons (lib/services/catalog.ts) is "server-only", so the
// client-side tier expansion on the line page (AlterationGroupPicker)
// can't call it directly - same reason /api/catalog/search exists: never
// call the BMD API from the browser, always through this site's own
// /api/* proxy. Small, public, unauthenticated payload (a service's own
// add-on list) - safe to expose with no session/auth check, same as the
// underlying endpoint (skipAuth: true).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const id = Number(serviceId);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ addons: [] }, { status: 400 });
  }
  const addons = await getServiceAddons(id);
  return NextResponse.json({ addons });
}
