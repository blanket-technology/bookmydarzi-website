import { NextResponse } from "next/server";
import { ApiError, bmdFetch } from "@/lib/api";

// Generic authenticated pass-through to the BMD API for client components
// (cart mutations, order actions, address/measurement CRUD, etc.) - avoids
// hand-writing a dedicated Route Handler for every single backend endpoint
// while still keeping the JWT server-side only (bmdFetch attaches it from
// the httpOnly cookie, see lib/session.ts). The browser calls
// /api/proxy/<same path the backend expects>, e.g.
// /api/proxy/cart -> BMD_API_V1/cart.
//
// Deliberately NOT used for /auth/* (those have their own routes that set
// cookies) or for anything that shouldn't be callable with an arbitrary
// path/method from the client - this is a pass-through, not a bypass: the
// real backend still enforces every permission/ownership check exactly as
// it does for the mobile app.

async function handle(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const endpoint = `/${path.join("/")}`;
  const url = new URL(request.url);
  const query = url.search;

  const method = request.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  let body: unknown;
  if (method !== "GET" && method !== "DELETE") {
    body = await request.json().catch(() => undefined);
  }

  // Forward the client's Idempotency-Key as-is if present, so a duplicate
  // add-to-cart/checkout retry (network blip, double-tap) is recognized as
  // the same attempt server-side instead of creating a duplicate row - same
  // protection the mobile app already relies on for these mutations.
  const idempotencyKey = request.headers.get("Idempotency-Key");
  const extraHeaders = idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined;

  try {
    const data = await bmdFetch(`${endpoint}${query}`, { method, body, extraHeaders });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { message: err.message, detail: err.detail },
        { status: err.status },
      );
    }
    return NextResponse.json({ message: "Request failed." }, { status: 500 });
  }
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
