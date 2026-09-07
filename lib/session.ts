import { cookies } from "next/headers";

// httpOnly session cookies - the browser JS never touches the raw JWTs.
// Access token is short-lived (matches backend's own expiry); refresh token
// is long-lived and only ever read server-side by app/api/proxy's refresh
// logic. Both `secure` in production (Next.js sets this off automatically
// under `next dev` over http, but we pin it to NODE_ENV to be explicit).
const ACCESS_COOKIE = "bmd_at";
const REFRESH_COOKIE = "bmd_rt";
const isProd = process.env.NODE_ENV === "production";

const baseCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax" as const,
  path: "/",
};

// Cookie lifetimes must not outlive the JWTs they hold - a cookie that
// outlives its token just means bmdFetch's refresh-on-401 path fires (or
// worse, fails) on every request in the gap. Mirror the backend's real
// settings.ACCESS_EXPIRE_MINUTES (15) and settings.REFRESH_EXPIRE_DAYS (90)
// exactly (see app/core/config.py) - do not invent a different value here.
const ACCESS_TOKEN_MAX_AGE = 60 * 15;
const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 90;

export async function setSessionCookies(accessToken: string, refreshToken?: string | null) {
  const store = await cookies();
  store.set(ACCESS_COOKIE, accessToken, { ...baseCookieOpts, maxAge: ACCESS_TOKEN_MAX_AGE });
  if (refreshToken) {
    store.set(REFRESH_COOKIE, refreshToken, { ...baseCookieOpts, maxAge: REFRESH_TOKEN_MAX_AGE });
  }
}

export async function clearSessionCookies() {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}
