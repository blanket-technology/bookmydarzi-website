"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Minus,
  MapPin,
  Plus,
  ShoppingBag,
  Trash2,
  Zap,
} from "lucide-react";
import { useAuth } from "@/lib/useAuth";
import { apiClient, ClientApiError } from "@/lib/apiClient";
import { InlineAddressForm, formatAddressLine } from "@/components/InlineAddressForm";
import { OfferPicker, useValidOffers } from "@/components/OfferPicker";
import { generateIdempotencyKey } from "@/lib/idempotency";
import type { Address, AddressListResponse } from "@/lib/types/account";
import {
  PICKUP_PREFS_STORAGE_KEY,
  buildPickupTimeSlots,
  type PickupPrefs,
} from "@/lib/pickupPrefs";
import {
  readAppliedOffer,
  writeAppliedOffer,
  estimateOfferDiscount,
  type AppliedOffer,
  type ApiOffer,
} from "@/lib/appliedOffer";
import { useGuestCart, guestCartEstimatedTotal, type GuestCartItem } from "@/lib/guestCart";
import type { CatalogCategoriesTreeResponse } from "@/lib/types/catalog";

// ApiOffer moved to lib/appliedOffer.ts, OfferPicker/CouponCodeInput/
// formatOfferDiscount/useValidOffers moved to components/OfferPicker.tsx -
// both shared with app/book-now/page.tsx, which also calls GET /offers
// and GET /offers/validate.

// Mirrors react_app/src/types/cart.ts's ApiCart shape (raw backend field
// names, not the mobile app's camelCase mapping - this page reads the API
// response directly). Backend: GET/POST /cart, POST/PUT/DELETE
// /cart/service-entry(/{id}) - see react_app/src/services/cartService.ts.
interface CartServiceEntry {
  entry_id?: number;
  id?: number;
  service_id: number;
  service_name: string;
  category_name?: string | null;
  image_url?: string | null;
  quantity: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
  unit_price_display?: string;
  line_total_display?: string;
}

interface CartBilling {
  item_total?: number;
  platform_fee?: number;
  discount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  gst_amount?: number;
  // A pending cancellation charge from an earlier COD order, already folded
  // into total_amount server-side (see _cart_billing in cart_service.py) -
  // shown as its own line so the customer understands why the total is
  // higher, mirroring react_app's cart.tsx "Cancellation Charges" row.
  penalty_amount?: number;
  total_amount?: number;
  item_total_display?: string;
  platform_fee_display?: string;
  cgst_display?: string;
  sgst_display?: string;
  gst_display?: string;
  total_amount_display?: string;
}

interface ApiCart {
  id: number;
  total_amount?: number;
  total_amount_display?: string;
  billing?: CartBilling;
  service_entries?: CartServiceEntry[];
}

function entryId(e: CartServiceEntry): number {
  return e.entry_id ?? e.id ?? 0;
}

function formatInr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

const PICKUP_TIME_SLOTS = buildPickupTimeSlots();


// Guest ("browse before login") cart view - visually mirrors the
// authenticated cart layout (line items / delivery address / pickup type /
// order summary) but is backed entirely by the local guestCart store: no
// server calls, no persisted address or pickup selection. Address/pickup
// sections are shown but locked behind a login prompt, matching
// Amazon/Flipkart/Myntra's guest-cart pattern - login is only required at
// "Place Order" (on /checkout), not to browse or edit the cart itself.
function GuestCartView({
  items,
  error,
  updateQuantity,
  removeItem,
  offers,
  appliedOffer,
  onApplyOffer,
  onRemoveOffer,
}: {
  items: GuestCartItem[];
  error: string | null;
  updateQuantity: (service_id: number, quantity: number) => void;
  removeItem: (service_id: number) => void;
  offers: ApiOffer[];
  appliedOffer: AppliedOffer | null;
  onApplyOffer: (offer: ApiOffer) => void;
  onRemoveOffer: () => void;
}) {
  const total = guestCartEstimatedTotal(items);
  const validOffers = useValidOffers(offers);
  const estimatedDiscount = estimateOfferDiscount(appliedOffer, total);
  const displayTotal = total - estimatedDiscount;

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <h1 className="text-4xl font-black tracking-tight">Your cart</h1>
      <p className="mt-2 text-gray-500">Review your services, address and pickup before checkout.</p>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-black/5 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream">
            <ShoppingBag className="text-gray-400" size={24} />
          </span>
          <h2 className="mt-5 text-xl font-black">Your cart is empty</h2>
          <p className="mt-2 text-sm text-gray-500">Browse our services and find the perfect fit.</p>
          <Link
            href="/services"
            className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
          >
            Browse services
          </Link>
        </div>
      ) : (
        <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* ── Line items ─────────────────────────────────────────── */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.service_id}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-stone-200 to-stone-300">
                      {item.image_url && (
                        <Image src={item.image_url} alt={item.name} fill sizes="80px" className="object-cover" />
                      )}
                    </div>
                    <div>
                      <h2 className="font-bold">{item.name}</h2>
                      <p className="text-xs text-gray-400">{item.category_name}</p>
                      <p className="mt-1 text-sm text-gray-500">{formatInr(item.base_price)} each</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        item.quantity <= 1
                          ? removeItem(item.service_id)
                          : updateQuantity(item.service_id, item.quantity - 1)
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg border"
                      aria-label={item.quantity <= 1 ? "Remove item" : "Decrease quantity"}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-5 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.service_id, item.quantity + 1)}
                      className="grid h-9 w-9 place-items-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.service_id)}
                      className="ml-2 p-2 text-gray-400 hover:text-red-500"
                      aria-label="Remove item"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Delivery address (locked for guests) ──────────────────── */}
            <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                  <MapPin size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-black">Delivery address</h2>
                  <p className="text-xs text-muted">Where should we pick up & deliver?</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-cream p-5 text-center">
                <p className="text-sm text-muted">Log in to add or select a delivery address.</p>
                <Link
                  href="/login?redirect=/cart"
                  className="mt-3 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
                >
                  Log in
                </Link>
              </div>
            </section>

            {/* ── Pickup type (locked for guests) ───────────────────────── */}
            <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                  <Calendar size={17} />
                </span>
                <div>
                  <h2 className="font-black">Pickup type</h2>
                  <p className="text-xs text-muted">When should we collect your garments?</p>
                </div>
              </div>
              <div className="mt-5 rounded-2xl bg-cream p-5 text-center">
                <p className="text-sm text-muted">Log in to choose instant or scheduled pickup.</p>
              </div>
            </section>

            {/* ── Available offers (browsable/selectable for guests; carries
                through to checkout after login via sessionStorage) ────────── */}
            <OfferPicker
              offers={validOffers}
              appliedOfferId={appliedOffer?.offer_id ?? null}
              onApply={onApplyOffer}
              onRemove={onRemoveOffer}
            />
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <div className="rounded-3xl bg-cream p-6">
              <h2 className="text-lg font-black">Order summary</h2>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (estimated)</span>
                  <span>{formatInr(total)}</span>
                </div>
                {estimatedDiscount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Offer discount (est.)</span>
                    <span>&minus;{formatInr(estimatedDiscount)}</span>
                  </div>
                )}
              </div>
              <div className="my-5 border-t border-black/10" />
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span>{formatInr(displayTotal)}</span>
              </div>
              <p className="mt-4 text-xs text-gray-400">
                Final pricing, fees and any discounts are confirmed after you log in.
              </p>

              <Link
                href="/checkout"
                className="mt-5 block rounded-xl bg-ink py-3.5 text-center text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
              >
                Continue to checkout <ChevronRight className="ml-1 inline" size={15} />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function CartContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, checked, fetchSession } = useAuth();
  const guestItems = useGuestCart((s) => s.items);
  const guestAddItem = useGuestCart((s) => s.addItem);
  const guestUpdateQuantity = useGuestCart((s) => s.updateQuantity);
  const guestRemoveItem = useGuestCart((s) => s.removeItem);

  const [cart, setCart] = useState<ApiCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutatingId, setMutatingId] = useState<number | null>(null);
  const addHandledRef = useRef(false);
  const guestAddHandledRef = useRef(false);
  const [guestAddError, setGuestAddError] = useState<string | null>(null);

  // ─── Delivery address state ─────────────────────────────────────────────
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressesError, setAddressesError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddressLink, setSavingAddressLink] = useState(false);
  const addressAutoSelected = useRef(false);

  // ─── Pickup type state ──────────────────────────────────────────────────
  const [pickupType, setPickupType] = useState<"instant" | "scheduled">("instant");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledSlot, setScheduledSlot] = useState<string | null>(null);

  // ─── Offers state ────────────────────────────────────────────────────────
  const [offers, setOffers] = useState<ApiOffer[]>([]);
  const [appliedOffer, setAppliedOfferState] = useState<AppliedOffer | null>(null);

  useEffect(() => {
    if (!checked) fetchSession();
  }, [checked, fetchSession]);

  // Offers are public catalog data (GET /offers has no auth requirement per
  // the route decorator) - fetch for guests and logged-in customers alike,
  // same as react_app's useHomeStore.loadHomeData.
  useEffect(() => {
    if (!checked) return;
    apiClient<{ offers: ApiOffer[]; total: number }>("/offers")
      .then((res) => setOffers(res.offers))
      .catch(() => {
        // Non-fatal - the offers section simply stays empty.
      });
  }, [checked]);

  // Restore any offer selected earlier this session (mirrors the pickup
  // prefs restore effect below) so returning to /cart from /checkout never
  // silently drops the applied offer.
  useEffect(() => {
    setAppliedOfferState(readAppliedOffer());
  }, []);

  const applyOffer = useCallback((offer: ApiOffer) => {
    const next: AppliedOffer = {
      offer_id: offer.offer_id,
      title: offer.title,
      discount_type: offer.discount_type === "flat" ? "flat" : "percentage",
      discount_value: offer.discount_type === "flat" ? (offer.discount_amount ?? 0) : offer.discount_percent,
    };
    setAppliedOfferState(next);
    writeAppliedOffer(next);
  }, []);

  const removeOffer = useCallback(() => {
    setAppliedOfferState(null);
    writeAppliedOffer(null);
  }, []);

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient<ApiCart>("/cart");
      setCart(data);
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 404) {
        setCart(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load your cart.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAddresses = useCallback(async () => {
    setAddressesError(null);
    try {
      const res = await apiClient<AddressListResponse>("/users/addresses");
      setAddresses(res.addresses);
      if (!addressAutoSelected.current) {
        addressAutoSelected.current = true;
        const preferred =
          res.addresses.find((a) => a.id === res.default_address_id) ??
          res.addresses.find((a) => a.is_default) ??
          res.addresses[0];
        if (preferred) {
          // Must actually PUT /cart/address here, not just set local state -
          // ApiCart on this page carries no address field, so the cart page
          // has no way to tell whether the server-side cart already has an
          // address attached. Previously this only set selectedAddressId,
          // which pre-checked the UI but left the real cart address null
          // until the customer happened to click the (already-highlighted)
          // address themselves - checkout then found no address on the cart
          // and bounced them back here to "select" it again.
          void selectAddress(preferred.id);
        } else {
          setShowAddressForm(true);
        }
      }
    } catch (err) {
      setAddressesError(err instanceof Error ? err.message : "Couldn't load your addresses.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!checked || !user) return;
    loadCart();
    loadAddresses();
  }, [checked, user, loadCart, loadAddresses]);

  // Restore any pickup preference the user picked earlier this session (e.g.
  // returning from checkout) so the two pages never show contradictory state.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(PICKUP_PREFS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<PickupPrefs>;
      if (saved.pickup_type === "scheduled" || saved.pickup_type === "instant") {
        setPickupType(saved.pickup_type);
      }
      if (typeof saved.scheduled_date === "string") setScheduledDate(saved.scheduled_date);
      if (typeof saved.pickup_time_slot === "string") setScheduledSlot(saved.pickup_time_slot);
    } catch {
      // sessionStorage unavailable (private mode etc.) - fall back to defaults.
    }
  }, []);

  // Persist pickup selections so checkout/page.tsx can read them and place
  // the order with the same pickup_type/scheduled_pickup_at/pickup_time_slot
  // the customer chose here, instead of re-deciding independently.
  useEffect(() => {
    try {
      const slot = PICKUP_TIME_SLOTS.find((s) => s.label === scheduledSlot);
      let scheduledPickupAt: string | undefined;
      if (pickupType === "scheduled" && scheduledDate && slot) {
        const dt = new Date(`${scheduledDate}T00:00:00`);
        dt.setHours(slot.hour, slot.minute, 0, 0);
        scheduledPickupAt = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
          dt.getDate(),
        ).padStart(2, "0")}T${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}:00`;
      }
      const prefs: PickupPrefs = {
        pickup_type: pickupType,
        scheduled_date: scheduledDate || undefined,
        pickup_time_slot: scheduledSlot ?? undefined,
        scheduled_pickup_at: scheduledPickupAt,
      };
      sessionStorage.setItem(PICKUP_PREFS_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Non-fatal - checkout falls back to "instant" if nothing was saved.
    }
  }, [pickupType, scheduledDate, scheduledSlot]);

  // Handle ?add=<bookable_service_id> from a service detail page's "Add to
  // cart" or "Book Now" button - both add the service and land on /cart, so
  // the customer always sees the full cart (all items, not just this one),
  // picks/confirms a delivery address, and sees applicable offers before
  // proceeding to checkout themselves. Book Now used to skip straight to
  // /checkout via ?next=checkout, but that meant the customer never saw the
  // cart page at all - no address step, no offers, and no way to review a
  // combined cart if they already had other items in it. ?next=checkout is
  // still accepted from any old links but no longer changes behavior.
  useEffect(() => {
    if (!checked || !user) return;
    const addParam = searchParams.get("add");
    if (!addParam || addHandledRef.current) return;
    const serviceId = Number(addParam);
    if (!Number.isFinite(serviceId) || serviceId <= 0) return;

    addHandledRef.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient<ApiCart>("/cart/service-entry", {
          method: "POST",
          body: { service_id: serviceId, quantity: 1 },
          idempotencyKey: generateIdempotencyKey(),
        });
        setCart(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not add the service to your cart.");
      } finally {
        setLoading(false);
        router.replace("/cart");
      }
    })();
  }, [checked, user, searchParams, router]);

  // Guest counterpart of the ?add= handler above: resolve the service_id via
  // the public catalog tree (same source server components use, just
  // through the client proxy - see lib/services/catalog.ts / lib/api.ts)
  // and add it straight into the local guest cart store. No server call.
  useEffect(() => {
    if (!checked || user) return;
    const addParam = searchParams.get("add");
    if (!addParam || guestAddHandledRef.current) return;
    const serviceId = Number(addParam);
    if (!Number.isFinite(serviceId) || serviceId <= 0) return;

    guestAddHandledRef.current = true;
    (async () => {
      setGuestAddError(null);
      try {
        const tree = await apiClient<CatalogCategoriesTreeResponse>("/catalog/categories/tree");
        let found: {
          name: string;
          image_url: string | null;
          base_price: number;
          category_name: string;
          service_line_name: string;
          estimated_delivery_days: number;
        } | null = null;
        for (const category of tree.categories) {
          for (const line of category.service_lines) {
            const tier = line.stitching_types.find((t) => t.service_id === serviceId);
            if (tier) {
              found = {
                name: tier.name,
                image_url: tier.image_url ?? null,
                base_price: tier.base_price,
                category_name: category.name,
                service_line_name: line.name,
                estimated_delivery_days: tier.estimated_delivery_days,
              };
              break;
            }
          }
          if (found) break;
          const direct = category.direct_services.find((s) => s.service_id === serviceId);
          if (direct) {
            found = {
              name: direct.name,
              image_url: direct.image_url,
              base_price: direct.base_price,
              category_name: category.name,
              service_line_name: direct.service_line_name ?? category.name,
              estimated_delivery_days: direct.estimated_delivery_days,
            };
            break;
          }
        }
        if (found) {
          guestAddItem(serviceId, 1, found);
          router.replace("/cart");
          return;
        }
        setGuestAddError("Could not find this service.");
        router.replace("/cart");
      } catch (err) {
        setGuestAddError(err instanceof Error ? err.message : "Could not add the service to your cart.");
        router.replace("/cart");
      }
    })();
  }, [checked, user, searchParams, router, guestAddItem]);

  const updateQuantity = async (entry: CartServiceEntry, nextQty: number) => {
    if (nextQty < 1) return;
    const id = entryId(entry);
    setMutatingId(id);
    try {
      const data = await apiClient<ApiCart>(`/cart/service-entry/${id}`, {
        method: "PUT",
        body: { quantity: nextQty },
      });
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update quantity.");
    } finally {
      setMutatingId(null);
    }
  };

  const removeEntry = async (entry: CartServiceEntry) => {
    const id = entryId(entry);
    setMutatingId(id);
    try {
      const data = await apiClient<ApiCart>(`/cart/service-entry/${id}`, { method: "DELETE" });
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this item.");
    } finally {
      setMutatingId(null);
    }
  };

  const selectAddress = async (id: number) => {
    // Guards the window between a click and the disabled attribute actually
    // rendering, and the auto-select-default-address effect racing a manual
    // click - two concurrent PUT /cart/address calls would leave whichever
    // response lands last silently "winning", desyncing the UI's
    // selectedAddressId from what's actually persisted on the server cart.
    if (savingAddressLink) return;
    setSelectedAddressId(id);
    setShowAddressForm(false);
    setSavingAddressLink(true);
    setAddressesError(null);
    try {
      await apiClient("/cart/address", { method: "PUT", body: { address_id: id } });
    } catch (err) {
      setAddressesError(
        err instanceof Error ? err.message : "Couldn't save this address to your cart.",
      );
    } finally {
      setSavingAddressLink(false);
    }
  };

  const handleAddressSaved = async (addr: Address) => {
    setAddresses((prev) => [...(prev ?? []), addr]);
    setShowAddressForm(false);
    await selectAddress(addr.id);
  };

  // Called unconditionally (before any early return) to satisfy React's
  // rules of hooks - useValidOffers wraps useMemo.
  const validOffers = useValidOffers(offers);

  if (!checked) {
    return (
      <main className="mx-auto flex max-w-6xl items-center justify-center px-5 py-24 lg:px-8">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </main>
    );
  }

  if (!user) {
    return (
      <GuestCartView
        items={guestItems}
        error={guestAddError}
        updateQuantity={guestUpdateQuantity}
        removeItem={guestRemoveItem}
        offers={offers}
        appliedOffer={appliedOffer}
        onApplyOffer={applyOffer}
        onRemoveOffer={removeOffer}
      />
    );
  }

  const entries = cart?.service_entries ?? [];
  const billing = cart?.billing;
  const total = billing?.total_amount ?? cart?.total_amount ?? 0;
  const totalDisplay = billing?.total_amount_display ?? cart?.total_amount_display ?? formatInr(total);
  const estimatedDiscount = estimateOfferDiscount(appliedOffer, total);
  const displayTotal = total - estimatedDiscount;

  const scheduledReady = pickupType !== "scheduled" || (scheduledDate !== "" && scheduledSlot !== null);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <h1 className="text-4xl font-black tracking-tight">Your cart</h1>
      <p className="mt-2 text-gray-500">Review your services, address and pickup before checkout.</p>

      {error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="animate-spin text-gray-400" size={28} />
        </div>
      ) : entries.length === 0 ? (
        <div className="mt-16 rounded-3xl border border-black/5 bg-white p-12 text-center shadow-sm">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cream">
            <ShoppingBag className="text-gray-400" size={24} />
          </span>
          <h2 className="mt-5 text-xl font-black">Your cart is empty</h2>
          <p className="mt-2 text-sm text-gray-500">Browse our services and find the perfect fit.</p>
          <Link
            href="/services"
            className="mt-6 inline-block rounded-xl bg-ink px-6 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-black"
          >
            Browse services
          </Link>
        </div>
      ) : (
        <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* ── Line items ─────────────────────────────────────────── */}
            <div className="space-y-3">
              {entries.map((entry) => {
                const id = entryId(entry);
                const busy = mutatingId === id;
                const unitPrice = entry.unit_price ?? entry.price ?? 0;
                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between rounded-2xl border border-black/5 bg-white p-4 shadow-sm ${busy ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-stone-200 to-stone-300">
                        {entry.image_url && (
                          <Image src={entry.image_url} alt={entry.service_name} fill sizes="80px" className="object-cover" />
                        )}
                      </div>
                      <div>
                        <h2 className="font-bold">{entry.service_name}</h2>
                        {entry.category_name && <p className="text-xs text-gray-400">{entry.category_name}</p>}
                        <p className="mt-1 text-sm text-gray-500">
                          {entry.unit_price_display ?? formatInr(unitPrice)} each
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          entry.quantity <= 1
                            ? removeEntry(entry)
                            : updateQuantity(entry, entry.quantity - 1)
                        }
                        disabled={busy}
                        className="grid h-9 w-9 place-items-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={entry.quantity <= 1 ? "Remove item" : "Decrease quantity"}
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{entry.quantity}</span>
                      <button
                        onClick={() => updateQuantity(entry, entry.quantity + 1)}
                        disabled={busy}
                        className="grid h-9 w-9 place-items-center rounded-lg border disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeEntry(entry)}
                        disabled={busy}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Remove item"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Delivery address ──────────────────────────────────────── */}
            <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                  <MapPin size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-black">Delivery address</h2>
                  <p className="text-xs text-muted">Where should we pick up & deliver?</p>
                </div>
                {savingAddressLink && <Loader2 size={16} className="animate-spin text-muted" />}
              </div>

              {addressesError && (
                <p className="mt-4 text-sm font-semibold text-red-600">{addressesError}</p>
              )}

              {addresses === null ? (
                <div className="mt-5 h-24 animate-pulse rounded-2xl bg-cream" />
              ) : addresses.length === 0 ? (
                <div className="mt-5">
                  <p className="mb-3 text-sm text-muted">
                    You don&apos;t have a saved address yet - add one to continue.
                  </p>
                  <InlineAddressForm
                    onCancel={() => {}}
                    onSaved={handleAddressSaved}
                    showCancel={false}
                  />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {addresses.map((addr) => {
                    const selected = selectedAddressId === addr.id;
                    return (
                      <button
                        key={addr.id}
                        onClick={() => selectAddress(addr.id)}
                        disabled={savingAddressLink}
                        className={`flex w-full items-start gap-3 rounded-2xl border-2 p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          selected ? "border-ink bg-cream" : "border-black/5 hover:border-black/15"
                        }`}
                      >
                        <span
                          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${
                            selected ? "border-ink bg-ink" : "border-black/20"
                          }`}
                        >
                          {selected && <CheckCircle2 size={14} className="text-white" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-600">
                              {addr.address_type}
                            </span>
                            {addr.is_default && (
                              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-gold-deep">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-bold">{addr.full_name}</p>
                          <p className="mt-0.5 text-sm leading-6 text-gray-500">
                            {formatAddressLine(addr)} - {addr.pincode}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">{addr.mobile}</p>
                        </div>
                      </button>
                    );
                  })}

                  {showAddressForm ? (
                    <InlineAddressForm
                      onCancel={() => setShowAddressForm(false)}
                      onSaved={handleAddressSaved}
                      showCancel
                    />
                  ) : (
                    <button
                      onClick={() => setShowAddressForm(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/15 p-4 text-sm font-bold text-gray-500 transition hover:border-black/30 hover:text-ink"
                    >
                      <Plus size={16} /> Add a new address
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── Pickup type ────────────────────────────────────────────── */}
            <section className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-white">
                  <Calendar size={17} />
                </span>
                <div>
                  <h2 className="font-black">Pickup type</h2>
                  <p className="text-xs text-muted">When should we collect your garments?</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPickupType("instant")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition ${
                    pickupType === "instant"
                      ? "border-ink bg-cream text-ink"
                      : "border-black/5 text-muted hover:border-black/15"
                  }`}
                >
                  <Zap size={16} className={pickupType === "instant" ? "text-gold-deep" : ""} /> Instant
                </button>
                <button
                  onClick={() => setPickupType("scheduled")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-4 text-sm font-bold transition ${
                    pickupType === "scheduled"
                      ? "border-ink bg-cream text-ink"
                      : "border-black/5 text-muted hover:border-black/15"
                  }`}
                >
                  <Calendar size={16} className={pickupType === "scheduled" ? "text-gold-deep" : ""} /> Scheduled
                </button>
              </div>

              {pickupType === "scheduled" && (
                <div className="mt-5 space-y-4 rounded-2xl bg-cream p-5">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-muted">
                      Pickup date
                    </label>
                    <input
                      type="date"
                      min={today}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-ink sm:w-64"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wide text-muted">
                      Time slot (9 AM – 9 PM)
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PICKUP_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot.label}
                          onClick={() => setScheduledSlot(slot.label)}
                          className={`rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition ${
                            scheduledSlot === slot.label
                              ? "border-ink bg-ink text-white"
                              : "border-black/10 bg-white text-muted hover:border-black/25"
                          }`}
                        >
                          {slot.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* ── Available offers ─────────────────────────────────────────── */}
            <OfferPicker
              offers={validOffers}
              appliedOfferId={appliedOffer?.offer_id ?? null}
              onApply={applyOffer}
              onRemove={removeOffer}
            />
          </div>

          <aside className="h-fit space-y-4 lg:sticky lg:top-6">
            <div className="rounded-3xl bg-cream p-6">
              <h2 className="text-lg font-black">Order summary</h2>
              <div className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{billing?.item_total_display ?? formatInr(billing?.item_total ?? total)}</span>
                </div>
                {billing?.platform_fee !== undefined && billing.platform_fee > 0 && (
                  <div className="flex justify-between">
                    <span>Platform fee</span>
                    <span>{billing.platform_fee_display ?? formatInr(billing.platform_fee)}</span>
                  </div>
                )}
                {billing?.discount !== undefined && billing.discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount</span>
                    <span>&minus;{formatInr(billing.discount)}</span>
                  </div>
                )}
                {estimatedDiscount > 0 && (!billing?.discount || billing.discount === 0) && (
                  <div className="flex justify-between text-green-700">
                    <span>Offer discount (est.)</span>
                    <span>&minus;{formatInr(estimatedDiscount)}</span>
                  </div>
                )}
                {billing?.cgst_amount !== undefined && billing.cgst_amount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>CGST</span>
                    <span>{billing.cgst_display ?? formatInr(billing.cgst_amount)}</span>
                  </div>
                )}
                {billing?.sgst_amount !== undefined && billing.sgst_amount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>SGST</span>
                    <span>{billing.sgst_display ?? formatInr(billing.sgst_amount)}</span>
                  </div>
                )}
                {billing?.cgst_amount === undefined &&
                  billing?.gst_amount !== undefined &&
                  billing.gst_amount > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>GST</span>
                      <span>{billing.gst_display ?? formatInr(billing.gst_amount)}</span>
                    </div>
                  )}
                {billing?.penalty_amount !== undefined && billing.penalty_amount > 0 && (
                  <div className="flex justify-between font-semibold text-red-600">
                    <span>Cancellation charge</span>
                    <span>{formatInr(billing.penalty_amount)}</span>
                  </div>
                )}
              </div>
              {billing?.penalty_amount !== undefined && billing.penalty_amount > 0 && (
                <p className="mt-2 text-[11px] text-red-500">
                  This includes a {formatInr(billing.penalty_amount)} charge carried over from a recent order cancellation.
                </p>
              )}
              <div className="my-5 border-t border-black/10" />
              <div className="flex justify-between text-lg font-black">
                <span>Total</span>
                <span>
                  {estimatedDiscount > 0 && (!billing?.discount || billing.discount === 0)
                    ? formatInr(displayTotal)
                    : totalDisplay}
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400">Inclusive of all taxes</p>

              {!selectedAddressId && (
                <p className="mt-4 text-xs font-semibold text-red-600">
                  Select or add a delivery address to continue.
                </p>
              )}
              {selectedAddressId && !scheduledReady && (
                <p className="mt-4 text-xs font-semibold text-red-600">
                  Choose a pickup date and time slot to continue.
                </p>
              )}

              <Link
                href="/checkout"
                aria-disabled={!selectedAddressId || !scheduledReady}
                onClick={(e) => {
                  if (!selectedAddressId || !scheduledReady) e.preventDefault();
                }}
                className={`mt-5 block rounded-xl py-3.5 text-center text-sm font-bold text-white transition ${
                  !selectedAddressId || !scheduledReady
                    ? "cursor-not-allowed bg-black/30"
                    : "bg-ink hover:-translate-y-0.5 hover:bg-black"
                }`}
              >
                Continue to checkout <ChevronRight className="ml-1 inline" size={15} />
              </Link>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartContent />
    </Suspense>
  );
}
