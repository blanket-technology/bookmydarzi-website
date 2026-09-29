import { NextResponse } from "next/server";
import { getBillingEstimate } from "@/lib/services/catalog";

// getBillingEstimate (lib/services/catalog.ts) is "server-only", so a
// client component (e.g. the tier booking card showing "Total incl. GST
// & fees") can't call it directly - same reason /api/catalog/addons/
// [serviceId] exists: never call the BMD API from the browser, always
// through this site's own /api/* proxy. Public, unauthenticated, and
// non-sensitive (the same GST rate/platform fee every customer sees at
// checkout) - safe to expose with no session/auth check.
export async function GET() {
  const estimate = await getBillingEstimate();
  return NextResponse.json({ estimate });
}
