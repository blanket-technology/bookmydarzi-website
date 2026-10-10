import "server-only";
import { headers as requestHeaders } from "next/headers";
import { BMD_API_V1 } from "./config";
import { clearSessionCookies, getAccessToken, getRefreshToken, setSessionCookies } from "./session";
import { extractApiErrorMessage } from "./apiErrorMessage";

// Server-only API client for the BookMyDarzi backend. Every call site is a
// Next.js Server Component, Server Action, or Route Handler - never a
// browser fetch - so the JWT never reaches client JS (see lib/session.ts's
// httpOnly cookies). This mirrors react_app/services/api.ts's shape
// (baseURL + /api/v1, Bearer auth, 401 -> refresh-once-and-retry) so the
// two clients stay behaviorally consistent against the same backend.

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  skipAuth?: boolean;
  /** Extra headers to forward as-is, e.g. Idempotency-Key on order/cart
   * mutations - see lib/idempotency.ts. */
  extraHeaders?: Record<string, string>;
  /** Use this access token instead of the cookie. Set after a refresh: a
   * request that piggybacked on another request's in-flight refresh never
   * got the new cookie written to ITS cookie store, so re-reading the cookie
   * would resend the stale token. */
  accessToken?: string;
  /** Internal - marks a request as already retried after a 401 refresh. */
  _retried?: boolean;
}

// The backend rotates refresh tokens on every use (old one is revoked, reuse
// is treated as a stolen-token replay and revokes the whole session family -
// see app/services/auth/refresh_service.py). If two requests of the SAME
// session hit a 401 around the same moment and both call this independently,
// the second one's refresh token is already revoked by the first's rotation,
// which nukes the session instead of just refreshing it. Sharing one in-flight
// promise keeps concurrent 401s of one session from racing each other.
//
// The map is keyed by the caller's refresh token. A single module-level
// promise (the previous implementation) is shared by EVERY visitor hitting
// this server instance, so while user A's refresh was in flight, user B's
// concurrent refresh returned A's promise - and routes that hand the result to
// the browser (app/api/chat/ws-token, app/api/auth/session) gave B user A's
// freshly minted access token.
const refreshInFlight = new Map<string, Promise<string | null>>();

// Exported so callers outside the normal 401-triggered retry path (e.g. the
// WS auth-token route, which hands a token to the browser for a raw socket
// handshake rather than making an HTTP request itself) can proactively
// refresh a stale access token using this same rotation-safe machinery,
// instead of duplicating refresh logic or handing back a token guaranteed
// to be rejected by the backend.
export async function doRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const existing = refreshInFlight.get(refreshToken);
  if (existing) return existing;

  const attempt = (async () => {
    const res = await fetch(`${BMD_API_V1}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await visitorIpHeader("/auth/refresh")) },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    const accessToken = data?.access_token as string | undefined;
    const newRefreshToken = (data?.refresh_token as string | undefined) ?? refreshToken;
    if (!accessToken) return null;

    await setSessionCookies(accessToken, newRefreshToken);
    return accessToken;
  })();

  refreshInFlight.set(refreshToken, attempt);
  try {
    return await attempt;
  } finally {
    refreshInFlight.delete(refreshToken);
  }
}

// The backend rate-limits /auth/* (OTP request 5/min, login 5/min, ...) per
// source IP. Every website visitor reaches it through this server, so without
// forwarding the visitor's address they all share one bucket: a handful of
// logins per minute site-wide, then 429 for everybody. Only /auth/* calls
// read request headers - touching headers() opts a route into dynamic
// rendering, which public catalog fetches must not pay for.
async function visitorIpHeader(endpoint: string): Promise<Record<string, string>> {
  if (!endpoint.startsWith("/auth/")) return {};
  try {
    const h = await requestHeaders();
    const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "";
    if (!ip) return {};
    // The backend only trusts the right-most X-Forwarded-For entry (the one its
    // own proxy added - a client can forge everything to the left), which for
    // this server-side caller is the same address for every visitor. When the
    // shared secret is configured, assert the real visitor address explicitly;
    // the backend checks the secret in constant time (TRUSTED_CLIENT_IP_SECRET).
    const secret = process.env.BMD_CLIENT_IP_SECRET;
    return secret
      ? { "X-Forwarded-For": ip, "X-BMD-Client-IP": ip, "X-BMD-Client-IP-Secret": secret }
      : { "X-Forwarded-For": ip };
  } catch {
    return {}; // outside a request scope
  }
}

export async function bmdFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    skipAuth = false,
    extraHeaders,
    accessToken,
    _retried = false,
  } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(await visitorIpHeader(endpoint)),
    ...extraHeaders,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!skipAuth) {
    const token = accessToken ?? (await getAccessToken());
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${BMD_API_V1}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch (err) {
    console.error(`[bmdFetch] ${method} ${endpoint} network failure:`, err);
    throw new ApiError(503, "We couldn't reach our servers. Please try again in a moment.");
  }

  if (res.status === 401 && !skipAuth && !_retried) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return bmdFetch<T>(endpoint, { ...options, accessToken: refreshed, _retried: true });
    }
    await clearSessionCookies();
  }

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Proxy/gateway error pages (e.g. a Railway 502) are HTML, not JSON.
      console.error(`[bmdFetch] ${method} ${endpoint} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`);
      throw new ApiError(
        res.ok ? 502 : res.status,
        "Our servers are having trouble right now. Please try again in a moment.",
      );
    }
  }

  if (!res.ok) {
    if (res.status >= 500) {
      console.error(`[bmdFetch] ${method} ${endpoint} -> HTTP ${res.status}`, data);
    }
    throw new ApiError(res.status, extractApiErrorMessage(res.status, data), data);
  }

  return data as T;
}
