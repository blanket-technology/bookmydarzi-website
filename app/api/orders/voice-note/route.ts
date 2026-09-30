import { NextResponse } from "next/server";
import { BMD_API_V1 } from "@/lib/config";
import { getAccessToken } from "@/lib/session";

// Dedicated route for the checkout voice-note recorder's multipart upload -
// mirrors app/api/chat/upload/route.ts exactly (same reasoning: the generic
// /api/proxy/[...path] route always JSON-encodes via bmdFetch, which can't
// carry multipart/form-data). Streams the recorded audio straight through
// to POST /orders/voice-note, attaching the JWT from the httpOnly cookie.
export async function POST(request: Request) {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  const incomingForm = await request.formData();
  const file = incomingForm.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "file is required." }, { status: 400 });
  }

  const outgoingForm = new FormData();
  outgoingForm.append("file", file, file.name);

  const res = await fetch(`${BMD_API_V1}/orders/voice-note`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: outgoingForm,
    cache: "no-store",
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && String(data.message)) ||
      (data && typeof data === "object" && "detail" in data && String(data.detail)) ||
      `Upload failed (${res.status})`;
    return NextResponse.json({ message }, { status: res.status });
  }

  return NextResponse.json(data);
}
