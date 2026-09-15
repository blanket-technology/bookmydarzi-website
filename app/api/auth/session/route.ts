import { NextResponse } from "next/server";
import { bmdFetch, doRefresh } from "@/lib/api";
import { getAccessToken, getRefreshToken } from "@/lib/session";

// Lets client components ask "am I logged in, and as whom" without ever
// handling the JWT themselves - reads the httpOnly cookie server-side and
// fetches the real profile.
//
// The access-token cookie is intentionally short-lived (15min, mirroring
// the backend's ACCESS_EXPIRE_MINUTES - see lib/session.ts) and the browser
// deletes it itself once its maxAge elapses. Previously, once that
// happened, this route saw no access-token cookie at all and immediately
// reported {user: null} - even though the 90-day refresh-token cookie was
// still sitting right next to it, completely valid. bmdFetch's own 401
// retry-with-refresh only helps once a request is actually sent with a
// (rejected) access token; it never runs here because there was no token
// to even attempt the request with. Users saw this as being logged out
// within 15 minutes of the access cookie's own lifetime, regardless of
// their refresh token's real 90-day validity - exactly the "logs out too
// fast" and "navbar shows logged out inconsistently" reports, since
// whether this flipped to logged-out depended only on cookie-expiry timing
// relative to the last page load, not on whether the session was actually
// still valid.
export async function GET() {
  let token = await getAccessToken();
  if (!token) {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      return NextResponse.json({ user: null });
    }
    token = await doRefresh();
    if (!token) {
      return NextResponse.json({ user: null });
    }
  }

  try {
    // bmdFetch reads the (possibly just-refreshed) access-token cookie
    // itself and still retries once through its own 401->refresh path if
    // the token we just obtained is somehow rejected (e.g. revoked
    // concurrently) - this call doesn't need the token passed explicitly.
    const user = await bmdFetch("/users/profile");
    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ user: null });
  }
}
