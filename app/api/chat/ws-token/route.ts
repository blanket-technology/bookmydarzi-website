import { NextResponse } from "next/server";
import { BMD_API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/session";

// The chat WebSocket connects directly from the browser to the backend
// (a raw ws:// connection can't be proxied through a Next.js Route Handler
// like REST calls are), so the client needs the real access token in memory
// just long enough to send it as the first `{type:"auth",token}` frame.
// This route is the one narrow, deliberate exception to "the JWT never
// reaches browser JS" - it hands back the token ONLY to a caller that
// already holds a valid httpOnly session cookie, and only in this single
// JSON response (never logged, never persisted client-side beyond an
// in-memory variable for the socket's lifetime - see lib/chat/useChatWS.ts).
export async function GET() {
  const token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }
  // Derived server-side from the same BMD_API_BASE_URL every other client
  // call uses (see lib/config.ts) - never hardcode a different host here.
  // BMD_API_BASE_URL has no NEXT_PUBLIC_ prefix (browser can't read it
  // directly), so it's handed back alongside the token instead.
  const wsBase = BMD_API_BASE_URL.replace(/^http/, "ws");
  return NextResponse.json({ token, wsBase });
}
