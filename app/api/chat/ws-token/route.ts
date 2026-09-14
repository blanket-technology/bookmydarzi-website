import { NextResponse } from "next/server";
import { BMD_API_BASE_URL } from "@/lib/config";
import { getAccessToken } from "@/lib/session";
import { doRefresh } from "@/lib/api";

// Access tokens expire in 15 minutes (ACCESS_EXPIRE_MINUTES, app/core/config.py)
// and this route previously handed back whatever was in the `bmd_at` cookie
// with no validity check. A WS connection only re-fetches this route on
// (re)connect, so once the cookie went stale, every reconnect kept fetching
// the same expired token, the backend rejected it (code 4001), and the
// client retried forever with no live notifications until some unrelated
// REST call happened to 401-and-refresh the cookie first. Decode the token's
// own `exp` and refresh proactively here instead, reusing the same rotation
// -safe doRefresh() bmdFetch already uses for its 401 retry path.
const EXPIRY_SAFETY_MARGIN_SECONDS = 30;

function isExpiredOrExpiringSoon(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return true;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const exp = payload?.exp;
    if (typeof exp !== "number") return true;
    return exp * 1000 <= Date.now() + EXPIRY_SAFETY_MARGIN_SECONDS * 1000;
  } catch {
    return true;
  }
}

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
  let token = await getAccessToken();
  if (!token) {
    return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
  }

  if (isExpiredOrExpiringSoon(token)) {
    token = await doRefresh();
    if (!token) {
      return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }
  }
  // Derived server-side from the same BMD_API_BASE_URL every other client
  // call uses (see lib/config.ts) - never hardcode a different host here.
  // BMD_API_BASE_URL has no NEXT_PUBLIC_ prefix (browser can't read it
  // directly), so it's handed back alongside the token instead.
  const wsBase = BMD_API_BASE_URL.replace(/^http/, "ws");
  return NextResponse.json({ token, wsBase });
}
