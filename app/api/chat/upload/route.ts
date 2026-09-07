import { NextResponse } from "next/server";
import { BMD_API_V1 } from "@/lib/config";
import { getAccessToken } from "@/lib/session";

// Dedicated route for chat_v2's multipart image upload - the generic
// /api/proxy/[...path] route (see app/api/proxy/[...path]/route.ts) always
// JSON-encodes the request body via bmdFetch, which can't carry a
// multipart/form-data file upload. This route streams the incoming
// FormData straight through to the backend instead, attaching the JWT from
// the httpOnly cookie exactly like bmdFetch does elsewhere. Kept as thin
// pass-through, no retry-on-401 (a logged-in user mid-chat-upload with an
// expired access token is rare enough that surfacing the failure and
// letting the user retry the send is simpler and safer than the refresh
// dance for a mutating multipart request).
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

  const res = await fetch(`${BMD_API_V1}/chat/v2/upload`, {
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
