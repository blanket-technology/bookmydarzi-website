"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  Camera,
  ChevronRight,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Ruler,
  ShieldAlert,
  ShoppingBag,
  Star,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth, type WebUser } from "@/lib/useAuth";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { useAddressLocation } from "@/lib/useAddressLocation";
import { AddressLocationField } from "@/components/AddressLocationField";
import OrdersPanel from "@/components/OrdersPanel";
import type {
  Address,
  AddressListResponse,
  AddressPayload,
  AddressType,
  Measurement,
  MeasurementListResponse,
  MeasurementUpdatePayload,
  UpdateProfileRequest,
  UserProfile,
} from "@/lib/types/account";

type Tab = "orders" | "overview" | "addresses" | "measurements";

const TABS: { key: Tab; label: string; description: string; icon: typeof UserIcon }[] = [
  { key: "orders", label: "My orders", description: "Track & view order history", icon: ShoppingBag },
  { key: "overview", label: "Account details", description: "Name, email & mobile", icon: UserIcon },
  { key: "addresses", label: "Saved addresses", description: "Pickup & delivery locations", icon: MapPin },
  { key: "measurements", label: "My measurements", description: "Review & update your fit", icon: Ruler },
];

const EMPTY_ADDRESS_FORM: AddressPayload = {
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

// ────────────────────────────────────────────────────────────────────────────

function Avatar({ profile }: { profile: UserProfile | null }) {
  const initials =
    `${profile?.FirstName?.charAt(0) ?? ""}${profile?.LastName?.charAt(0) ?? ""}`.toUpperCase() ||
    "U";
  if (profile?.ProfileImageUrl) {
    return (
      <div className="relative h-16 w-16 overflow-hidden rounded-full">
        <Image src={profile.ProfileImageUrl} alt="" fill sizes="64px" className="object-cover" />
      </div>
    );
  }
  return (
    <div className="grid h-16 w-16 place-items-center rounded-full bg-[#171717] text-xl font-black text-white">
      {initials}
    </div>
  );
}

// Wraps Avatar with a photo-upload affordance - previously the circle was
// purely decorative (rendered ProfileImageUrl when present, but nothing on
// the website ever let a customer set one; the backend's
// POST /users/profile/photo has always existed with no client anywhere).
// Uses a dedicated route (app/api/users/profile-photo/route.ts), not the
// generic JSON proxy, which can't carry a multipart file - same reasoning
// as the chat widget's own image-upload route.
function EditableAvatar({
  profile,
  onUploaded,
}: {
  profile: UserProfile | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/users/profile-photo", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data && typeof data === "object" && data.message) || "Upload failed.");
      }
      onUploaded(data.profile_image_url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Couldn't upload photo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative shrink-0">
      <Avatar profile={profile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        title="Change photo"
        className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-[#171717] text-white shadow-sm transition hover:bg-black disabled:opacity-60"
      >
        {uploading ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {uploadError && (
        <p className="absolute left-1/2 top-full mt-1.5 w-40 -translate-x-1/2 text-center text-[11px] font-semibold text-red-600">
          {uploadError}
        </p>
      )}
    </div>
  );
}

// IsEmailVerified/IsMobileVerified have always been part of GET /users/profile
// (see lib/types/account.ts's UserProfile) but were fetched and never shown -
// a customer had no way to tell whether BookMyDarzi actually trusts their
// contact details, unlike Amazon/Swiggy's green-checkmark-or-verify-prompt
// pattern on this exact screen.
function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
        <BadgeCheck size={11} /> Verified
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
      <ShieldAlert size={11} /> Unverified
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function OverviewTab({ onNavigate }: { onNavigate: (tab: Tab) => void }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    apiClient<UserProfile>("/users/profile")
      .then((res) => {
        setProfile(res);
        setForm({
          first_name: res.FirstName ?? "",
          last_name: res.LastName ?? "",
          email: res.Email ?? "",
        });
      })
      .catch(() => setError("Couldn't load your profile."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const body: UpdateProfileRequest = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim() || undefined,
    };
    try {
      const updated = await apiClient<UserProfile>("/users/profile", { method: "PATCH", body });
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ClientApiError ? err.message : "Couldn't save changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />;
  if (error || !profile)
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl bg-red-50 p-6 text-sm font-semibold text-red-700">
        <span>{error ?? "Couldn't load your profile."}</span>
        <button
          onClick={load}
          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-6">
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-4 bg-[#f8f6f1] p-6">
        <EditableAvatar profile={profile} onUploaded={(url) => setProfile((p) => (p ? { ...p, ProfileImageUrl: url } : p))} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">
            {profile.FullName || `${profile.FirstName} ${profile.LastName}`.trim() || "Your account"}
          </h2>
          {profile.CreatedAt && (
            <p className="mt-1 text-xs text-gray-400">
              Member since{" "}
              {new Date(profile.CreatedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold shadow-sm hover:-translate-y-0.5"
          >
            <Pencil size={13} className="mr-1.5 inline" /> Edit
          </button>
        )}
      </div>

      <div className="p-6">
        {!editing ? (
          <dl className="grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">Name</dt>
              <dd className="mt-1 text-sm font-semibold">
                {`${profile.FirstName} ${profile.LastName}`.trim() || "-"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">Email</dt>
              <dd className="mt-1 truncate text-sm font-semibold">{profile.Email || "-"}</dd>
              {profile.Email && (
                <div className="mt-1">
                  <VerificationBadge verified={profile.IsEmailVerified} />
                </div>
              )}
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-gray-400">Mobile</dt>
              <dd className="mt-1 text-sm font-semibold">{profile.Mobile || "-"}</dd>
              {profile.Mobile && (
                <div className="mt-1">
                  <VerificationBadge verified={profile.IsMobileVerified} />
                </div>
              )}
            </div>
          </dl>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-400">First name</label>
                <input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Last name</label>
                <input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Mobile</label>
              <input
                disabled
                value={profile.Mobile ?? ""}
                className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-black/10 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-400">Mobile number can&apos;t be changed here.</p>
            </div>
            {saveError && <p className="text-sm font-semibold text-red-600">{saveError}</p>}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving && <Loader2 size={14} className="animate-spin" />} Save changes
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setSaveError(null);
                  setForm({
                    first_name: profile.FirstName ?? "",
                    last_name: profile.LastName ?? "",
                    email: profile.Email ?? "",
                  });
                }}
                className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>

      {/* Quick-access tiles into the other real sections of this account -
          mirrors how big platforms (Myntra, Amazon) treat "Overview" as a
          hub with navigation tiles rather than just a data card. Only links
          to tabs that actually exist here (no fabricated "Wallet"/"Saved
          Cards" tiles for features this product doesn't have). */}
      <div className="grid gap-4 sm:grid-cols-3">
        <OverviewTile
          icon={ShoppingBag}
          label="My orders"
          desc="Track & view order history"
          onClick={() => onNavigate("orders")}
        />
        <OverviewTile
          icon={MapPin}
          label="Saved addresses"
          desc="Pickup & delivery locations"
          onClick={() => onNavigate("addresses")}
        />
        <OverviewTile
          icon={Ruler}
          label="My measurements"
          desc="Review & update your fit"
          onClick={() => onNavigate("measurements")}
        />
      </div>
    </div>
  );
}

function OverviewTile({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: typeof UserIcon;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-3 rounded-3xl border border-black/5 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f8f6f1] text-[#171717]">
        <Icon size={18} />
      </span>
      <div>
        <p className="text-sm font-black">{label}</p>
        <p className="mt-0.5 text-xs text-gray-500">{desc}</p>
      </div>
    </button>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function AddressForm({
  initial,
  onCancel,
  onSaved,
}: {
  initial: AddressPayload;
  onCancel: () => void;
  onSaved: (payload: AddressPayload) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useAddressLocation();
  // Pre-populate coords when editing an address that already has them, so
  // re-saving without re-detecting doesn't lose the existing location
  // (mirrors address.tsx's loadAddressIntoForm).
  const seededRef = useRef(false);
  if (!seededRef.current && initial.latitude != null && initial.longitude != null) {
    seededRef.current = true;
    location.setCoords({ latitude: initial.latitude, longitude: initial.longitude });
  }

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
    // The backend now requires latitude/longitude (assert_serviceable in
    // app/services/location/serviceability_service.py) - block here with a
    // specific message instead of letting the generic 422 surface after a
    // failed save attempt, mirroring react_app/app/address.tsx's
    // handleSaveAddress gating.
    if (location.coords == null) {
      setError('Please use "Use my current location" so we can confirm we deliver there.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSaved({ ...form, latitude: location.coords.latitude, longitude: location.coords.longitude });
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't save this address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <AddressLocationField
          status={location.status}
          statusMessage={location.statusMessage}
          serviceability={location.serviceability}
          onDetect={handleDetectLocation}
        />
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Full name</label>
          <input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Mobile</label>
          <input
            value={form.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Address line 1</label>
          <input
            value={form.address_line_1}
            onChange={(e) => set("address_line_1", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Address line 2 (optional)
          </label>
          <input
            value={form.address_line_2 ?? ""}
            onChange={(e) => set("address_line_2", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">City</label>
          <input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">State</label>
          <input
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Pincode</label>
          <input
            value={form.pincode}
            onChange={(e) => set("pincode", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Landmark (optional)
          </label>
          <input
            value={form.landmark ?? ""}
            onChange={(e) => set("landmark", e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Type</label>
          <select
            value={form.address_type}
            onChange={(e) => set("address_type", e.target.value as AddressType)}
            className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
          >
            <option value="home">Home</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          checked={!!form.is_default}
          onChange={(e) => set("is_default", e.target.checked)}
        />
        Set as default address
      </label>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-5 flex gap-3">
        <button
          onClick={submit}
          disabled={saving}
          className="flex items-center gap-1.5 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {saving && <Loader2 size={14} className="animate-spin" />} Save address
        </button>
        <button onClick={onCancel} className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

function AddressesTab({ initialEditId }: { initialEditId?: number | null }) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const appliedInitialEditRef = useRef(false);

  const load = () => {
    setError(null);
    apiClient<AddressListResponse>("/users/addresses")
      .then((res) => setAddresses(res.addresses))
      .catch(() => setError("Couldn't load your addresses."));
  };

  useEffect(load, []);

  // Deep-linked from checkout's "needs a precise location" error (?tab=
  // addresses&editAddress=<id>) - open that address's edit form directly and
  // scroll it into view, instead of leaving the customer to hunt for which
  // of their saved addresses is the broken one.
  useEffect(() => {
    if (!initialEditId || !addresses || appliedInitialEditRef.current) return;
    if (!addresses.some((a) => a.id === initialEditId)) return;
    appliedInitialEditRef.current = true;
    setEditingId(initialEditId);
    requestAnimationFrame(() => {
      document
        .getElementById(`address-${initialEditId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [initialEditId, addresses]);

  const handleCreate = async (payload: AddressPayload) => {
    await apiClient<Address>("/users/addresses", { method: "POST", body: payload });
    setAdding(false);
    load();
  };

  const handleUpdate = async (id: number, payload: AddressPayload) => {
    await apiClient<Address>(`/users/addresses/${id}`, { method: "PATCH", body: payload });
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await apiClient(`/users/addresses/${id}`, { method: "DELETE" });
      load();
    } catch {
      setError("Couldn't delete this address.");
    } finally {
      setDeletingId(null);
    }
  };

  if (error && !addresses)
    return <div className="rounded-3xl bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>;
  if (!addresses) return <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />;

  return (
    <div className="space-y-4">
      {addresses.map((addr) =>
        editingId === addr.id ? (
          <div key={addr.id} id={`address-${addr.id}`}>
            <AddressForm
              initial={{
                full_name: addr.full_name,
                mobile: addr.mobile,
                address_line_1: addr.address_line_1,
                address_line_2: addr.address_line_2 ?? "",
                city: addr.city,
                state: addr.state,
                pincode: addr.pincode,
                landmark: addr.landmark ?? "",
                address_type: addr.address_type,
                is_default: addr.is_default,
                latitude: addr.latitude,
                longitude: addr.longitude,
              }}
              onCancel={() => setEditingId(null)}
              onSaved={(payload) => handleUpdate(addr.id, payload)}
            />
          </div>
        ) : (
          <div key={addr.id} id={`address-${addr.id}`} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-gray-600">
                    {addr.address_type}
                  </span>
                  {addr.is_default && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#b4832e]">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm font-bold">{addr.full_name}</p>
                <p className="text-sm text-gray-500">{addr.mobile}</p>
                <p className="mt-1 max-w-md text-sm leading-6 text-gray-600">
                  {[addr.address_line_1, addr.address_line_2, addr.landmark, addr.city, addr.state, addr.pincode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => setEditingId(addr.id)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 hover:bg-gray-50"
                  aria-label="Edit address"
                >
                  <Pencil size={14} />
                </button>
                {addr.can_delete && (
                  <button
                    onClick={() => handleDelete(addr.id)}
                    disabled={deletingId === addr.id}
                    className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Delete address"
                  >
                    {deletingId === addr.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <AddressForm initial={EMPTY_ADDRESS_FORM} onCancel={() => setAdding(false)} onSaved={handleCreate} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-black/10 py-6 text-sm font-bold text-gray-500 hover:border-black/20 hover:text-[#171717]"
        >
          <Plus size={16} /> Add new address
        </button>
      )}

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

const MEASUREMENT_FIELDS: { key: keyof Measurement; label: string; unit: string }[] = [
  { key: "chest", label: "Chest", unit: "in" },
  { key: "waist", label: "Waist", unit: "in" },
  { key: "hips", label: "Hips", unit: "in" },
  { key: "shoulder", label: "Shoulder", unit: "in" },
  { key: "neck", label: "Neck", unit: "in" },
  { key: "sleeve_length", label: "Sleeve length", unit: "in" },
  { key: "inseam", label: "Inseam", unit: "in" },
  { key: "height", label: "Height", unit: "in" },
];

function MeasurementCard({ measurement, onSaved }: { measurement: Measurement; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [fitPreference, setFitPreference] = useState(measurement.fit_preference ?? "");
  const [notes, setNotes] = useState(measurement.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    const initial: Record<string, string> = {};
    for (const f of MEASUREMENT_FIELDS) {
      const v = measurement[f.key];
      initial[f.key as string] = v == null ? "" : String(v);
    }
    setForm(initial);
    setFitPreference(measurement.fit_preference ?? "");
    setNotes(measurement.notes ?? "");
    setEditing(true);
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    const payload: MeasurementUpdatePayload = {
      fit_preference: (fitPreference || null) as MeasurementUpdatePayload["fit_preference"],
      notes: notes.trim() || null,
    };
    for (const f of MEASUREMENT_FIELDS) {
      const raw = form[f.key as string];
      const num = raw === "" ? null : Number(raw);
      (payload as Record<string, unknown>)[f.key as string] =
        num == null || Number.isNaN(num) ? null : num;
    }
    try {
      await apiClient<Measurement>(`/users/measurements/${measurement.id}`, {
        method: "PATCH",
        body: payload,
      });
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ClientApiError ? err.message : "Couldn't save this profile.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black">{measurement.profile_name}</h3>
          <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {MEASUREMENT_FIELDS.map((f) => (
            <div key={f.key as string}>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {f.label} ({f.unit})
              </label>
              <input
                type="number"
                step="0.1"
                value={form[f.key as string] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key as string]: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
              />
            </div>
          ))}
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Fit preference</label>
            <select
              value={fitPreference}
              onChange={(e) => setFitPreference(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
            >
              <option value="">Not set</option>
              <option value="slim">Slim</option>
              <option value="regular">Regular</option>
              <option value="loose">Loose</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1.5 w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm focus:border-[#171717] focus:outline-none"
            />
          </div>
        </div>

        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-[#171717] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Save
          </button>
          <button onClick={() => setEditing(false)} className="rounded-xl border border-black/10 px-5 py-2.5 text-sm font-bold hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-black">{measurement.profile_name}</h3>
            {measurement.is_default && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-[#b4832e]">
                <Star size={10} fill="currentColor" /> Default
              </span>
            )}
          </div>
          {measurement.gender && (
            <p className="mt-1 text-xs capitalize text-gray-400">
              {measurement.gender}
              {measurement.fit_preference ? ` · ${measurement.fit_preference} fit` : ""}
            </p>
          )}
        </div>
        <button
          onClick={startEdit}
          className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 hover:bg-gray-50"
          aria-label="Edit measurements"
        >
          <Pencil size={14} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {MEASUREMENT_FIELDS.map((f) => {
          const v = measurement[f.key];
          return (
            <div key={f.key as string}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{f.label}</p>
              <p className="mt-0.5 text-sm font-semibold">{v != null ? `${v} ${f.unit}` : "-"}</p>
            </div>
          );
        })}
      </div>

      {measurement.notes && (
        <p className="mt-4 border-t border-black/5 pt-4 text-sm text-gray-500">{measurement.notes}</p>
      )}
    </div>
  );
}

function MeasurementsTab() {
  const [data, setData] = useState<MeasurementListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    apiClient<MeasurementListResponse>("/users/measurements")
      .then(setData)
      .catch(() => setError("Couldn't load your measurement profiles."));
  };

  useEffect(load, []);

  if (error && !data)
    return <div className="rounded-3xl bg-red-50 p-6 text-sm font-semibold text-red-700">{error}</div>;
  if (!data) return <div className="h-48 animate-pulse rounded-3xl bg-gray-100" />;

  if (data.measurements.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-black/5 bg-white px-6 py-16 text-center">
        <Ruler size={32} className="text-gray-300" />
        <p className="mt-4 text-base font-bold">No measurement profiles yet</p>
        <p className="mt-1 max-w-sm text-sm text-gray-500">
          Our team takes your measurements at your first pickup and saves them here for future
          orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Measurement profiles are created by our team at pickup. You can review and update the values
        here at any time.
      </p>
      {data.measurements.map((m) => (
        <MeasurementCard key={m.id} measurement={m} onSaved={load} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

function ProfileSidebar({
  user,
  tab,
  setTab,
  onLogout,
  loggingOut,
}: {
  user: WebUser | null;
  tab: Tab;
  setTab: (t: Tab) => void;
  onLogout: () => void;
  loggingOut: boolean;
}) {
  const displayName = user?.first_name || user?.full_name || "Your account";
  const initials = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <aside className="lg:w-72 lg:shrink-0">
      <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3 border-b border-black/5 pb-5">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-base font-black text-white">
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{displayName}</p>
            <p className="truncate text-xs text-muted">{user?.email ?? user?.mobile ?? ""}</p>
          </div>
        </div>

        <nav className="mt-4 space-y-1">
          {TABS.map(({ key, label, description, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold transition ${
                tab === key ? "bg-ink text-white" : "text-ink hover:bg-cream-deep"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  tab === key ? "bg-white/10" : "bg-cream-deep"
                }`}
              >
                <Icon size={16} className={tab === key ? "text-gold" : "text-gold-deep"} />
              </span>
              <span className="flex-1">
                {label}
                <span className={`block text-xs font-medium ${tab === key ? "text-white/60" : "text-muted"}`}>
                  {description}
                </span>
              </span>
              <ChevronRight size={15} className={tab === key ? "text-white/40" : "text-gray-300"} />
            </button>
          ))}
        </nav>

        <button
          onClick={onLogout}
          disabled={loggingOut}
          className="mt-4 flex w-full items-center gap-3 rounded-xl border-t border-black/5 px-3 pt-4 text-sm font-bold text-red-600 transition hover:text-red-700 disabled:opacity-50"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-50">
            {loggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
          </span>
          Log out
        </button>
      </div>
    </aside>
  );
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checked, fetchSession, logout } = useAuth();
  const [tab, setTab] = useState<Tab>("orders");
  const [loggingOut, setLoggingOut] = useState(false);

  // Deep link from checkout's "needs a precise location" error:
  // /profile?tab=addresses&editAddress=<id> opens straight to that
  // address's edit form instead of dropping the customer on the generic
  // Orders tab with no idea which saved address needs fixing.
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "addresses") setTab("addresses");
  }, [searchParams]);

  const editAddressParam = searchParams.get("editAddress");
  const initialEditAddressId = editAddressParam ? Number(editAddressParam) : null;

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.push("/");
  };

  if (!checked) {
    return (
      <main className="mx-auto flex max-w-6xl items-center justify-center px-5 py-24 lg:px-8">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
        <h1 className="text-3xl font-black">Sign in to view your profile</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
          Manage your details, addresses and measurements once you&apos;re signed in.
        </p>
        <Link
          href="/login?redirect=/profile"
          className="mt-8 inline-flex rounded-xl bg-ink px-6 py-3.5 text-sm font-bold text-white shadow-lg hover:-translate-y-0.5"
        >
          Log in
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[.2em] text-gold-deep">Account</p>
      <h1 className="mt-2 text-4xl font-black tracking-[-.03em]">
        {user.first_name ? `Hi, ${user.first_name}` : "My account"}
      </h1>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-start">
        <ProfileSidebar user={user} tab={tab} setTab={setTab} onLogout={handleLogout} loggingOut={loggingOut} />

        <div className="min-w-0 flex-1">
          {tab === "orders" && <OrdersPanel />}
          {tab === "overview" && <OverviewTab onNavigate={setTab} />}
          {tab === "addresses" && <AddressesTab initialEditId={initialEditAddressId} />}
          {tab === "measurements" && <MeasurementsTab />}
        </div>
      </div>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}
