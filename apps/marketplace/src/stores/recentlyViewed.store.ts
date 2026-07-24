import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ViewedProduct {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  viewedAt: number;
}

interface RecentlyViewedState {
  items: ViewedProduct[];
  add: (p: Omit<ViewedProduct, 'viewedAt'>) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      add: (p) => set((s) => {
        const filtered = s.items.filter((i) => i.productId !== p.productId);
        return {
          items: [{ ...p, viewedAt: Date.now() }, ...filtered].slice(0, 20),
        };
      }),
      clear: () => set({ items: [] }),
    }),
    { name: 'marketplace-recently-viewed' },
  ),
);
