"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { AddressLocationField } from "@/components/AddressLocationField";
import { useAddressLocation } from "@/lib/useAddressLocation";
import type { Address, AddressPayload, AddressType } from "@/lib/types/account";

// Extracted from app/cart/page.tsx (the only place this form previously
// lived) so the /book-now flow can offer the exact same "add a new address"
// experience without a second, drifting copy of ~170 lines of markup.
export const EMPTY_ADDRESS_FORM: AddressPayload = {
  full_name: "",
  mobile: "",
  address_line_1: "",
  address_line_2: "",
  city: "",
  state: "",
  pincode: "",
  landmark: "",
  address_type: "home",
  is_default: false,
  latitude: null,
  longitude: null,
};

export function formatAddressLine(addr: Address): string {
  return [addr.address_line_1, addr.address_line_2, addr.city, addr.state]
    .filter(Boolean)
    .join(", ");
}

export function InlineAddressForm({
  onCancel,
  onSaved,
  showCancel,
}: {
  onCancel: () => void;
  onSaved: (addr: Address) => Promise<void>;
  showCancel: boolean;
}) {
  const [form, setForm] = useState<AddressPayload>(EMPTY_ADDRESS_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useAddressLocation();

  const set = <K extends keyof AddressPayload>(key: K, value: AddressPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleDetectLocation = () => {
    void location.detectLocation((geo) => {
      setForm((f) => ({
        ...f,
        address_line_1: f.address_line_1.trim() ? f.address_line_1 : geo.line1 ?? f.address_line_1,
        address_line_2: f.address_line_2?.trim() ? f.address_line_2 : geo.line2 ?? f.address_line_2,
        city: geo.city || f.city,
        state: geo.state || f.state,
        pincode: geo.pincode || f.pincode,
      }));
    });
  };

  const submit = async () => {
    // Geolocation is optional, not required, to save an address - the
    // backend (app/services/users/address_service.py's create_address) only
    // enforces serviceability when coordinates are actually provided, so a
    // manually-typed address saves fine with null lat/lng. The real
    // location-precision requirement is enforced later, at order-placement
    // time, where it actually matters operationally.
    setSaving(true);
    setError(null);
    try {
      const created = await apiClient<Address>("/users/addresses", {
        method: "POST",
        body: {
          ...form,
          latitude: location.coords?.latitude ?? null,
          longitude: location.coords?.longitude ?? null,
        },
      });
      await onSaved(created);
      setForm(EMPTY_ADDRESS_FORM);
      location.reset();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't save this address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-cream p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <AddressLocationField
          status={location.status}
          statusMessage={location.statusMessage}
          serviceability={location.serviceability}
          onDetect={handleDetectLocation}
        />
        <input
          placeholder="Full name"
          value={form.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="Mobile number"
          value={form.mobile}
          onChange={(e) => set("mobile", e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="Address line 1"
          value={form.address_line_1}
          onChange={(e) => set("address_line_1", e.target.value)}
          className="sm:col-span-2 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="Address line 2 (optional)"
          value={form.address_line_2 ?? ""}
          onChange={(e) => set("address_line_2", e.target.value)}
          className="sm:col-span-2 rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="State"
          value={form.state}
          onChange={(e) => set("state", e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="Pincode"
          value={form.pincode}
          onChange={(e) => set("pincode", e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
        <input
          placeholder="Landmark (optional)"
          value={form.landmark ?? ""}
          onChange={(e) => set("landmark", e.target.value)}
          className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink"
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        {(["home", "office", "other"] as const satisfies readonly AddressType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => set("address_type", type)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-bold capitalize transition ${
              form.address_type === type
                ? "border-ink bg-ink text-white"
                : "border-black/10 bg-white text-muted"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={!!form.is_default}
          onChange={(e) => set("is_default", e.target.checked)}
        />
        Set as default address
      </label>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Save address
        </button>
        {showCancel && (
          <button
            onClick={onCancel}
            className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold hover:bg-white"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
