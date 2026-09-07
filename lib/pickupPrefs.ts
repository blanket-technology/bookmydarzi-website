// Shared pickup time-slot generator - 9:00 AM to 9:00 PM in 30-minute steps,
// matching react_app/src/utils/pickupTimeSlots.ts exactly (same free-text
// labels are sent to the backend's PickupTimeSlot column). Kept in sync
// deliberately - do not invent new slot times here.
export interface PickupTimeSlot {
  /** Sent as-is to the backend's free-text pickup_time_slot field, e.g. "9:30 AM". */
  label: string;
  hour: number;
  minute: number;
}

const START_HOUR = 9;
const END_HOUR = 21; // 9 PM, inclusive as the last selectable start time

export function buildPickupTimeSlots(): PickupTimeSlot[] {
  const slots: PickupTimeSlot[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    for (const minute of [0, 30]) {
      if (hour === END_HOUR && minute > 0) break; // stop exactly at 9:00 PM
      const period = hour < 12 ? "AM" : "PM";
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const label = `${displayHour}:${minute === 0 ? "00" : "30"} ${period}`;
      slots.push({ label, hour, minute });
    }
  }
  return slots;
}

// Pickup selections made on the cart page, handed to the checkout page via
// sessionStorage (both pages read/write the same key) so the two pages never
// disagree about pickup_type / scheduled_pickup_at / pickup_time_slot - the
// cart page is the single place these are chosen; checkout only reads them.
export const PICKUP_PREFS_STORAGE_KEY = "bmd:pickup-prefs";

export interface PickupPrefs {
  pickup_type: "instant" | "scheduled";
  /** yyyy-mm-dd, local <input type="date"> value - stored for re-rendering the picker. */
  scheduled_date?: string;
  pickup_time_slot?: string;
  /** ISO-ish local datetime "YYYY-MM-DDTHH:mm:00", ready for POST /cart/checkout. */
  scheduled_pickup_at?: string;
}

export function readPickupPrefs(): PickupPrefs | null {
  try {
    const raw = sessionStorage.getItem(PICKUP_PREFS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PickupPrefs;
  } catch {
    return null;
  }
}
