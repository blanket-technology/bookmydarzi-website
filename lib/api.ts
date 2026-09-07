import "server-only";
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
  /** Internal - marks a request as already retried after a 401 refresh. */
  _retried?: boolean;
}

// The backend rotates refresh tokens on every use (old one is revoked, reuse
// is treated as a stolen-token replay and revokes the whole session family -
// see app/services/auth/refresh_service.py). If two requests hit a 401
// around the same moment and both call this independently, the second one's
// refresh token is already revoked by the first's rotation, which nukes the
// session instead of just refreshing it. Sharing one in-flight promise per
// server instance keeps concurrent 401s on the same request-response cycle
// from racing each other.
let refreshInFlight: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;

    const res = await fetch(`${BMD_API_V1}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function bmdFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, skipAuth = false, extraHeaders, _retried = false } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BMD_API_V1}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 401 && !skipAuth && !_retried) {
    const refreshed = await doRefresh();
    if (refreshed) {
      return bmdFetch<T>(endpoint, { ...options, _retried: true });
    }
    await clearSessionCookies();
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractApiErrorMessage(res.status, data), data);
  }

  return data as T;
}
