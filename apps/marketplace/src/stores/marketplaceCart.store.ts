import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Guest cart (before login) — stored locally, synced on login
interface GuestCartItem {
  productId: string;
  shopId: string;
  productName: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  variantId?: string;
}

interface MarketplaceCartState {
  guestItems: GuestCartItem[];
  serverCount: number;
  addGuestItem: (item: GuestCartItem) => void;
  removeGuestItem: (productId: string, variantId?: string) => void;
  updateGuestQty: (productId: string, qty: number, variantId?: string) => void;
  clearGuest: () => void;
  setServerCount: (n: number) => void;
  totalItems: () => number;
}

export const useMarketplaceCartStore = create<MarketplaceCartState>()(
  persist(
    (set, get) => ({
      guestItems: [],
      serverCount: 0,
      addGuestItem: (item) => set((s) => {
        const existing = s.guestItems.find(
          (i) => i.productId === item.productId && i.variantId === item.variantId,
        );
        if (existing) {
          return {
            guestItems: s.guestItems.map((i) =>
              i.productId === item.productId && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i,
            ),
          };
        }
        return { guestItems: [...s.guestItems, item] };
      }),
      removeGuestItem: (productId, variantId) => set((s) => ({
        guestItems: s.guestItems.filter((i) => !(i.productId === productId && i.variantId === variantId)),
      })),
      updateGuestQty: (productId, qty, variantId) => set((s) => ({
        guestItems: qty <= 0
          ? s.guestItems.filter((i) => !(i.productId === productId && i.variantId === variantId))
          : s.guestItems.map((i) =>
              i.productId === productId && i.variantId === variantId
                ? { ...i, quantity: qty }
                : i,
            ),
      })),
      clearGuest: () => set({ guestItems: [] }),
      setServerCount: (n) => set({ serverCount: n }),
      totalItems: () => {
        const s = get();
        return s.serverCount || s.guestItems.reduce((sum, i) => sum + i.quantity, 0);
      },
    }),
    { name: 'marketplace-cart' },
  ),
);
