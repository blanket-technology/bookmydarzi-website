// Shared shape for "which add-ons did the customer pick, with what note"
// across the guest cart, useAddToCart, and the add-on picker UI - one type
// instead of drifting copies in each file that touches this.

export interface SelectedAddon {
  addon_id: number;
  name: string;
  price: number;
  note?: string | null;
}

export function selectedAddonsTotal(addons: SelectedAddon[] | undefined): number {
  if (!addons || addons.length === 0) return 0;
  return addons.reduce((sum, a) => sum + a.price, 0);
}
