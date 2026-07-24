import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toast } from 'sonner';

interface CompareProduct {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string;
  shopName?: string;
  rating?: number;
  ratingCount?: number;
  addedAt: number;
}

interface CompareState {
  items: CompareProduct[];
  add: (p: Omit<CompareProduct, 'addedAt'>) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isInCompare: (productId: string) => boolean;
}

const MAX_COMPARE = 4;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (p) => {
        const items = get().items;
        if (items.length >= MAX_COMPARE) {
          toast.error(`Max ${MAX_COMPARE} products can be compared`);
          return;
        }
        if (items.some((i) => i.productId === p.productId)) return;
        set({ items: [...items, { ...p, addedAt: Date.now() }] });
        toast.success('Added to compare');
      },
      remove: (productId) =>
        set((s) => ({ items: s.items.filter((i) => i.productId !== productId) })),
      clear: () => set({ items: [] }),
      isInCompare: (productId) => get().items.some((i) => i.productId === productId),
    }),
    { name: 'marketplace-compare' },
  ),
);
