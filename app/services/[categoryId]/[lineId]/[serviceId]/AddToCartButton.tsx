"use client";

import { Loader2, ShoppingBag } from "lucide-react";
import { useAddToCart } from "@/lib/useAddToCart";
import type { SelectedAddon } from "@/lib/selectedAddons";

// Client component so "Add to Cart" can add the item and stay on this page
// (toast confirmation) instead of navigating to /cart, matching the mobile
// app's behavior - see lib/useAddToCart.ts. "Book Now" (the other button,
// rendered by the parent page) stays a plain <Link> to /cart?add=...  -
// unlike this button it deliberately DOES navigate, landing on the cart
// page with the item already added, so the customer still sees the full
// cart, address, and offers before checkout (it used to skip straight to
// /checkout, which meant those never got a chance to render).
export default function AddToCartButton({
  serviceId,
  name,
  imageUrl,
  basePrice,
  categoryName,
  serviceLineName,
  estimatedDeliveryDays,
  selectedAddons,
}: {
  serviceId: number;
  name: string;
  imageUrl: string | null;
  basePrice: number;
  categoryName: string;
  serviceLineName: string;
  estimatedDeliveryDays: number;
  selectedAddons?: SelectedAddon[];
}) {
  const { addToCart, addingId } = useAddToCart();
  const adding = addingId === serviceId;

  return (
    <button
      type="button"
      disabled={adding}
      onClick={() =>
        addToCart(
          serviceId,
          {
            name,
            image_url: imageUrl,
            base_price: basePrice,
            category_name: categoryName,
            service_line_name: serviceLineName,
            estimated_delivery_days: estimatedDeliveryDays,
          },
          1,
          selectedAddons,
        )
      }
      className="inline-flex items-center rounded-xl border-2 border-ink px-6 py-3.5 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60"
    >
      {adding ? (
        <Loader2 className="mr-2 animate-spin" size={16} />
      ) : (
        <ShoppingBag className="mr-2" size={16} />
      )}
      Add to Cart
    </button>
  );
}
