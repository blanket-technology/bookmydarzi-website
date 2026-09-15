// Order status metadata, ported from react_app/src/constants/orderStatus.ts
// (the mobile app's single source of truth for status labels/colors/progress).
// Keep this file's status set and customer-facing copy in lockstep with that
// file - the backend's state machine (app/constants/order_status.py) is the
// authority both clients describe.

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "order_placed"
  | "order_accepted"
  | "order_rejected"
  | "searching_tailor"
  | "broadcasted"
  | "tailor_assigned"
  | "pickup_scheduled"
  | "pickup_pending"
  | "picked_up"
  | "cloth_received_by_tailor"
  | "stitching_started"
  | "in_progress"
  | "final_check"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "return_pending"
  | "return_scheduled"
  | "return_in_transit"
  | "returned";

export type StatusVisualTone = "success" | "warning" | "neutral" | "error" | "info";

export interface OrderStatusMeta {
  status: OrderStatus;
  title: string;
  description: string;
  nextStep: string | null;
  tone: StatusVisualTone;
  progress: number;
  customerFacing: boolean;
  customerLabel: string;
  terminal: boolean;
}

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  "pending_payment",
  "order_placed",
  "order_accepted",
  "searching_tailor",
  "broadcasted",
  "tailor_assigned",
  "pickup_scheduled",
  "pickup_pending",
  "picked_up",
  "cloth_received_by_tailor",
  "stitching_started",
  "in_progress",
  "final_check",
  "ready_for_dispatch",
  "out_for_delivery",
  "delivered",
  "completed",
];

export const ORDER_STATUS_META: Record<OrderStatus, OrderStatusMeta> = {
  pending_payment: {
    status: "pending_payment",
    title: "Awaiting payment",
    description: "Complete the payment to confirm your booking.",
    nextStep: "Once payment is received, we'll confirm your order immediately.",
    tone: "warning",
    progress: 0,
    customerFacing: true,
    customerLabel: "Pending Payment",
    terminal: false,
  },
  payment_failed: {
    status: "payment_failed",
    title: "Payment didn't go through",
    description: "Your payment could not be processed. No amount has been charged.",
    nextStep: "Retry payment with the same or a different method.",
    tone: "error",
    progress: 0,
    customerFacing: true,
    customerLabel: "Payment Failed",
    terminal: false,
  },
  order_placed: {
    status: "order_placed",
    title: "Order received",
    description: "We've got your booking and our team is reviewing it now.",
    nextStep: "You'll hear from us shortly to confirm your order.",
    tone: "info",
    progress: 1,
    customerFacing: true,
    customerLabel: "Order Placed",
    terminal: false,
  },
  order_accepted: {
    status: "order_accepted",
    title: "Order confirmed",
    description: "Your booking is confirmed. We're finding the right tailor and arranging pickup.",
    nextStep: "Pickup and tailor assignment happen next - both may proceed in parallel.",
    tone: "info",
    progress: 2,
    customerFacing: true,
    customerLabel: "Order Confirmed",
    terminal: false,
  },
  order_rejected: {
    status: "order_rejected",
    title: "Unable to process this order",
    description: "We couldn't accept your order at this time. You won't be charged.",
    nextStep: "Please contact support if you'd like more information.",
    tone: "error",
    progress: 0,
    customerFacing: true,
    customerLabel: "Order Rejected",
    terminal: true,
  },
  searching_tailor: {
    status: "searching_tailor",
    title: "Finding your tailor",
    description: "We're matching your order with a nearby, available tailor.",
    nextStep: "We'll notify you the moment a tailor accepts.",
    tone: "info",
    progress: 3,
    customerFacing: false,
    customerLabel: "Assigning Tailor",
    terminal: false,
  },
  broadcasted: {
    status: "broadcasted",
    title: "Reaching out to tailors",
    description: "Nearby tailors have been notified about your order.",
    nextStep: "We'll notify you the moment a tailor accepts.",
    tone: "info",
    progress: 3,
    customerFacing: false,
    customerLabel: "Assigning Tailor",
    terminal: false,
  },
  tailor_assigned: {
    status: "tailor_assigned",
    title: "Tailor assigned",
    description: "A skilled tailor has been assigned to your order.",
    nextStep: "Stitching begins once your fabric reaches the tailor.",
    tone: "success",
    progress: 4,
    customerFacing: true,
    customerLabel: "Tailor Assigned",
    terminal: false,
  },
  pickup_scheduled: {
    status: "pickup_scheduled",
    title: "Pickup scheduled",
    description: "Your fabric pickup has been scheduled for your chosen time.",
    nextStep: "Our team will arrive at the scheduled pickup window.",
    tone: "warning",
    progress: 5,
    customerFacing: true,
    customerLabel: "Pickup Scheduled",
    terminal: false,
  },
  pickup_pending: {
    status: "pickup_pending",
    title: "Pickup on the way",
    description: "A BookMyDarzi team member is on their way to collect your fabric.",
    nextStep: "Keep your fabric ready - they'll collect it shortly.",
    tone: "warning",
    progress: 6,
    customerFacing: true,
    customerLabel: "Pickup Pending",
    terminal: false,
  },
  picked_up: {
    status: "picked_up",
    title: "Fabric collected",
    description: "We've picked up your fabric. It's on its way to your tailor.",
    nextStep: "Your tailor will begin work once the fabric arrives.",
    tone: "success",
    progress: 7,
    customerFacing: true,
    customerLabel: "Pickup Completed",
    terminal: false,
  },
  cloth_received_by_tailor: {
    status: "cloth_received_by_tailor",
    title: "Fabric with your tailor",
    description: "Your tailor has received the fabric and is preparing to start.",
    nextStep: "Stitching will begin shortly.",
    tone: "success",
    progress: 8,
    customerFacing: false,
    customerLabel: "Pickup Completed",
    terminal: false,
  },
  stitching_started: {
    status: "stitching_started",
    title: "Stitching started",
    description: "Your tailor has started working on your garment.",
    nextStep: "We'll share progress as work continues.",
    tone: "info",
    progress: 9,
    customerFacing: true,
    customerLabel: "Stitching Started",
    terminal: false,
  },
  in_progress: {
    status: "in_progress",
    title: "Being stitched right now",
    description: "Your garment is on the worktable, being stitched to your exact measurements.",
    nextStep: "We'll notify you the moment stitching is complete.",
    tone: "info",
    progress: 10,
    customerFacing: true,
    customerLabel: "Stitching In Progress",
    terminal: false,
  },
  final_check: {
    status: "final_check",
    title: "Final quality check",
    description: "Your garment is undergoing a final quality check.",
    nextStep: "It'll be marked ready for dispatch shortly.",
    tone: "info",
    progress: 11,
    customerFacing: true,
    customerLabel: "Final Check",
    terminal: false,
  },
  ready_for_dispatch: {
    status: "ready_for_dispatch",
    title: "Ready for dispatch",
    description: "Your garment is ready and passed quality check. It's being prepared for delivery.",
    nextStep: "Delivery is being arranged. Expect it at your door soon.",
    tone: "success",
    progress: 12,
    customerFacing: true,
    customerLabel: "Ready For Dispatch",
    terminal: false,
  },
  out_for_delivery: {
    status: "out_for_delivery",
    title: "On its way to you",
    description: "Your garment has left for delivery and is heading to your address.",
    nextStep: "Keep your phone handy - the delivery agent may call before arriving.",
    tone: "warning",
    progress: 13,
    customerFacing: true,
    customerLabel: "Out For Delivery",
    terminal: false,
  },
  delivered: {
    status: "delivered",
    title: "Delivered",
    description: "Your order has been delivered. We hope it fits perfectly.",
    nextStep: "Your order will be marked complete shortly.",
    tone: "success",
    progress: 14,
    customerFacing: true,
    customerLabel: "Delivered",
    terminal: false,
  },
  completed: {
    status: "completed",
    title: "Order completed",
    description: "This order is complete. Thank you for choosing BookMyDarzi!",
    nextStep: "Love the fit? Leave a review. Need changes? Contact support within 7 days.",
    tone: "success",
    progress: 15,
    customerFacing: true,
    customerLabel: "Completed",
    terminal: true,
  },
  cancelled: {
    status: "cancelled",
    title: "Order cancelled",
    description: "This order has been cancelled.",
    nextStep: "If a payment was made, it will be refunded per our cancellation policy.",
    tone: "error",
    progress: 0,
    customerFacing: true,
    customerLabel: "Cancelled",
    // Not terminal in the type sense that matters for the timeline: an
    // order cancelled after the tailor already had the fabric/garment in
    // hand continues into the return_pending/... sequence below rather than
    // stopping here. Still flagged terminal=true because "cancelled and
    // nothing more happens" is genuinely the end state for most cancelled
    // orders (cancelled before the tailor had custody) - callers that need
    // to know whether a SPECIFIC order continues into a return should check
    // for a later return_* status on that order instead of this flag.
    terminal: true,
  },
  return_pending: {
    status: "return_pending",
    title: "Return pending",
    description: "This order was cancelled after your fabric/garment reached the tailor, so it needs to be returned to you.",
    nextStep: "We're arranging pickup from the tailor to bring it back to you.",
    tone: "warning",
    progress: 0,
    customerFacing: true,
    customerLabel: "Return Pending",
    terminal: false,
  },
  return_scheduled: {
    status: "return_scheduled",
    title: "Return pickup scheduled",
    description: "A pickup has been scheduled to collect your item from the tailor for return.",
    nextStep: "It'll be on its way to you once collected.",
    tone: "warning",
    progress: 0,
    customerFacing: true,
    customerLabel: "Return Scheduled",
    terminal: false,
  },
  return_in_transit: {
    status: "return_in_transit",
    title: "Return in transit",
    description: "Your item has been collected from the tailor and is on its way back to you.",
    nextStep: "Keep your phone handy - our team may call before arriving.",
    tone: "info",
    progress: 0,
    customerFacing: true,
    customerLabel: "Return In Transit",
    terminal: false,
  },
  returned: {
    status: "returned",
    title: "Item returned",
    description: "Your item has been returned to you.",
    nextStep: "If a payment was made, any refund follows our cancellation policy.",
    tone: "success",
    progress: 0,
    customerFacing: true,
    customerLabel: "Returned",
    terminal: true,
  },
};

const ALL_STATUSES = new Set<string>(Object.keys(ORDER_STATUS_META));

// Shown only if the backend ever returns a status string this file's
// OrderStatus union doesn't know about yet (e.g. a new state added to
// app/constants/order_status.py before this file is updated to match).
// Previously an unrecognized status silently normalized to "order_placed",
// which would show a customer's order as freshly placed (step 1 of the
// timeline) even if it were actually much further along, or even
// cancelled - a misleading, wrong-looking state rather than an honest
// "we can't show you the details right now" one.
const UNKNOWN_STATUS_META: OrderStatusMeta = {
  status: "order_placed",
  title: "Status update",
  description: "We're syncing this order's latest status. Please check back shortly.",
  nextStep: null,
  tone: "neutral",
  progress: 0,
  customerFacing: true,
  customerLabel: "Updating",
  terminal: false,
};

export function normalizeOrderStatus(raw: string | null | undefined): OrderStatus | null {
  const s = (raw ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (ALL_STATUSES.has(s)) return s as OrderStatus;
  return null;
}

export function getOrderStatusMeta(raw: string | null | undefined): OrderStatusMeta {
  const normalized = normalizeOrderStatus(raw);
  return normalized ? ORDER_STATUS_META[normalized] : UNKNOWN_STATUS_META;
}

/** 0-100 progress percentage for progress bars, based on ORDER_STATUS_SEQUENCE position. */
export function getOrderStatusProgressPercent(raw: string | null | undefined): number {
  const meta = getOrderStatusMeta(raw);
  if (meta.status === "cancelled" || meta.status === "order_rejected") return 0;
  const maxProgress = ORDER_STATUS_META.completed.progress;
  return Math.round((meta.progress / maxProgress) * 100);
}

export const STATUS_TONE_CLASSES: Record<StatusVisualTone, string> = {
  success: "bg-green-50 text-green-700",
  warning: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
  neutral: "bg-gray-100 text-gray-600",
};
