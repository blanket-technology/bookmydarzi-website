// Format-only GSTIN check - mirrors app/core/gstin.py's regex exactly.
// Does not verify the number is actually registered/active (that needs a
// paid GST-portal API, out of scope).
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[Z][A-Z0-9]$/;

export function normalizeGstin(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidGstin(value: string): boolean {
  return GSTIN_RE.test(normalizeGstin(value));
}
