"use client";

// Browser-side helper for calling this website's own /api/proxy/* routes
// (which forward to the real BMD API with the JWT attached server-side -
// see app/api/proxy/[...path]/route.ts). Client components should always
// go through this, never call BMD_API_V1 directly - the browser has no way
// to attach the httpOnly-cookie JWT to a cross-origin request anyway.

export class ClientApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    /** Pass a value from lib/idempotency.ts's generateIdempotencyKey() for
     * mutations where a duplicate retry would be a real problem (add to
     * cart, checkout) - forwarded through /api/proxy to the real backend. */
    idempotencyKey?: string;
  } = {},
): Promise<T> {
  const { method = "GET", body, idempotencyKey } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

  const res = await fetch(`/api/proxy${endpoint}`, {
    method,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && String(data.message)) ||
      `Request failed (${res.status})`;
    throw new ClientApiError(res.status, message, data);
  }
  return data as T;
}
