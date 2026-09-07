import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Banknote,
  Bike,
  Box,
  Calendar,
  CalendarClock,
  Clock,
  CreditCard,
  HelpCircle,
  ImageIcon,
  MapPin,
  Ruler,
  Scissors,
  Shirt,
  XCircle,
} from "lucide-react";

// Ported from react_app/src/constants/supportIssues.ts (the mobile app's
// proven Zomato/Swiggy-style "select order -> select issue -> chat" flow) -
// same keys, same status-bucket logic, so a session opened from the website
// carries the exact same IssueCategory the backend/admin side already knows
// how to label and triage (see app/services/chat_v2/ai_dispatcher.py's
// _ISSUE_CATEGORY_LABELS). Free-text keys, not a backend enum - keep this in
// sync with both mirrors if a category is added or renamed.
export type SupportIssueKey =
  | "pickup_not_scheduled"
  | "pickup_delayed"
  | "reschedule_pickup"
  | "cancel_order"
  | "stitching_update"
  | "upload_reference"
  | "measurement_concern"
  | "tailoring_concern"
  | "delivery_delayed"
  | "delivery_address_issue"
  | "alteration_required"
  | "wrong_stitching"
  | "wrong_garment"
  | "missing_item"
  | "refund_issue"
  | "payment_issue"
  | "other";

export interface SupportIssueOption {
  key: SupportIssueKey;
  label: string;
  icon: LucideIcon;
}

const ALL_ISSUES: Record<SupportIssueKey, SupportIssueOption> = {
  pickup_not_scheduled: { key: "pickup_not_scheduled", label: "Pickup not scheduled", icon: Calendar },
  pickup_delayed: { key: "pickup_delayed", label: "Pickup delayed", icon: Clock },
  reschedule_pickup: { key: "reschedule_pickup", label: "Need to reschedule", icon: CalendarClock },
  cancel_order: { key: "cancel_order", label: "Cancel order", icon: XCircle },
  stitching_update: { key: "stitching_update", label: "Need stitching update", icon: Scissors },
  upload_reference: { key: "upload_reference", label: "Upload additional reference", icon: ImageIcon },
  measurement_concern: { key: "measurement_concern", label: "Measurement concern", icon: Ruler },
  tailoring_concern: { key: "tailoring_concern", label: "Tailoring concern", icon: Shirt },
  delivery_delayed: { key: "delivery_delayed", label: "Delivery delayed", icon: Bike },
  delivery_address_issue: { key: "delivery_address_issue", label: "Delivery address issue", icon: MapPin },
  alteration_required: { key: "alteration_required", label: "Alteration required", icon: Scissors },
  wrong_stitching: { key: "wrong_stitching", label: "Wrong stitching", icon: AlertCircle },
  wrong_garment: { key: "wrong_garment", label: "Wrong garment", icon: Shirt },
  missing_item: { key: "missing_item", label: "Missing item", icon: Box },
  refund_issue: { key: "refund_issue", label: "Refund issue", icon: Banknote },
  payment_issue: { key: "payment_issue", label: "Payment issue", icon: CreditCard },
  other: { key: "other", label: "Something else", icon: HelpCircle },
};

type OrderStageBucket = "before_pickup" | "after_pickup" | "ready_or_out" | "delivered" | "closed";

// Falls through to "before_pickup" as the bucketForStatus default below, so
// no explicit pre-pickup status set is needed (mirrors the mobile original,
// which declares but never references one).
const AFTER_PICKUP_STATUSES = new Set([
  "picked_up", "cloth_received_by_tailor", "stitching_started", "in_progress", "final_check",
]);
const READY_OR_OUT_STATUSES = new Set(["ready_for_dispatch", "out_for_delivery"]);
const DELIVERED_STATUSES = new Set(["delivered", "completed"]);
const CLOSED_STATUSES = new Set(["cancelled", "order_rejected"]);

function bucketForStatus(status: string): OrderStageBucket {
  const s = status.toLowerCase();
  if (CLOSED_STATUSES.has(s)) return "closed";
  if (DELIVERED_STATUSES.has(s)) return "delivered";
  if (READY_OR_OUT_STATUSES.has(s)) return "ready_or_out";
  if (AFTER_PICKUP_STATUSES.has(s)) return "after_pickup";
  return "before_pickup";
}

const BUCKET_ISSUES: Record<OrderStageBucket, SupportIssueKey[]> = {
  before_pickup: ["pickup_not_scheduled", "pickup_delayed", "reschedule_pickup", "cancel_order", "payment_issue", "other"],
  after_pickup: ["stitching_update", "upload_reference", "measurement_concern", "tailoring_concern", "other"],
  ready_or_out: ["delivery_delayed", "delivery_address_issue", "payment_issue", "other"],
  delivered: ["alteration_required", "wrong_stitching", "wrong_garment", "missing_item", "refund_issue", "payment_issue", "other"],
  closed: ["refund_issue", "payment_issue", "other"],
};

/** Issue options relevant to an order's current status - only choices that
 * make sense for that stage (e.g. "Wrong garment" only once delivered). */
export function getIssueOptionsForStatus(status: string): SupportIssueOption[] {
  const bucket = bucketForStatus(status);
  return BUCKET_ISSUES[bucket].map((k) => ALL_ISSUES[k]);
}
