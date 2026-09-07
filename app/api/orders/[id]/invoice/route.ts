import { NextResponse } from "next/server";
import { BMD_API_V1 } from "@/lib/config";
import { getAccessToken } from "@/lib/session";

// Dedicated route for GET /orders/{id}/invoice (app/api/v1/endpoints/orders.py,
// download_invoice) - the generic /api/proxy/[...path] route always JSON-decodes
// the response body via bmdFetch, which can't carry a binary application/pdf
// payload (see app/api/proxy/[...path]/route.ts). This route streams the PDF
// bytes straight through instead, attaching the JWT from the httpOnly cookie
// exactly like bmdFetch does elsewhere - same pass-through precedent as
// app/api/chat/upload/route.ts.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const res = await fetch(`${BMD_API_V1}/orders/${id}/invoice`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/pdf" },
    cache: "no-store",
  });

  if (!res.ok) {
    // Backend errors come back as JSON ({"detail": "..."}); surface that message.
    const text = await res.text();
    let message = `Could not download invoice (${res.status}).`;
    try {
      const data = text ? JSON.parse(text) : null;
      if (data && typeof data === "object" && typeof data.detail === "string") {
        message = data.detail;
      }
    } catch {
      // body wasn't JSON - keep the generic message
    }
    return NextResponse.json({ message }, { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  const disposition = res.headers.get("Content-Disposition") ?? `attachment; filename="invoice-${id}.pdf"`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
