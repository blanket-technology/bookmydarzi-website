// Turns a real BMD backend error response into a clean, customer-facing
// message - never the raw internal shape.
//
// The backend's 422 validation errors (app/core/request_validation.py) come
// back as {error, message, path, details: [{type, loc, msg, input, ctx}],
// request_id}. `message` is a machine-oriented summary (field-path prefixed,
// e.g. "body.mobile: Value error, Mobile number must be exactly 10 digits")
// meant for logs/debugging, not display - showing it directly put internal
// request-shape details ("body", Pydantic's "Value error," prefix) in front
// of customers. `details[0].msg` is the same underlying text without the
// field-path noise; this strips the redundant "Value error, " prefix Pydantic
// custom validators add on top of that.
//
// Non-validation errors (most endpoints) just have a real, already
// customer-appropriate `message` string (e.g. "Order not found") - those
// pass through unchanged.
export function extractApiErrorMessage(
  status: number,
  data: unknown,
): string {
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const details = obj.details;
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0];
      if (first && typeof first === "object" && "msg" in first) {
        const msg = String((first as Record<string, unknown>).msg ?? "").trim();
        if (msg) return msg.replace(/^Value error,\s*/i, "");
      }
    }

    if (typeof obj.message === "string" && obj.message.trim()) {
      return obj.message;
    }
    if (typeof obj.detail === "string" && obj.detail.trim()) {
      return obj.detail;
    }
  }
  return `Something went wrong. Please try again. (${status})`;
}
