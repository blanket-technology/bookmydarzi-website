// Same backend every other BookMyDarzi client (react_app, bmdadmin) talks to.
// Server-only env var (no NEXT_PUBLIC_ prefix) - the browser never calls the
// BookMyDarzi API directly, only this website's own /api/* routes, which
// proxy through using this URL server-side. Keeps the JWT off the client
// entirely (see lib/session.ts).
export const BMD_API_BASE_URL =
  process.env.BMD_API_BASE_URL ?? "https://web-production-efff7.up.railway.app";

export const BMD_API_V1 = `${BMD_API_BASE_URL}/api/v1`;
