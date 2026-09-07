// One key per mutation *attempt* - generate once before the request and
// reuse it across any retry of that same attempt, so the backend recognizes
// a retry-after-lost-response as the same attempt instead of creating a
// duplicate (e.g. double add-to-cart, duplicate order). Same contract as
// react_app/src/utils/idempotencyKey.ts - kept identical since both clients
// hit the same backend idempotency-key store.
export function generateIdempotencyKey(): string {
  const rand = Math.random().toString(36).slice(2, 12);
  return `${Date.now().toString(36)}-${rand}`;
}
