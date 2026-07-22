import { create } from 'zustand';

export interface CartLine {
  productId: string;
  shopId: string;
  shopName: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

interface CartState {
  lines: CartLine[];
  addItem: (line: CartLine) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQty: (productId: string, quantity: number, variantId?: string) => void;
  clear: () => void;
  totalItems: () => number;
  totalAmount: () => number;
  byShop: () => Record<string, { shopName: string; lines: CartLine[]; subtotal: number }>;
}

export const useMarketplaceCartStore = create<CartState>((set, get) => ({
  lines: [],
  addItem: (line) =>
    set((s) => {
      const existing = s.lines.find((l) => l.productId === line.productId && l.variantId === line.variantId);
      if (existing) {
        return {
          lines: s.lines.map((l) =>
            l.productId === line.productId && l.variantId === line.variantId
              ? { ...l, quantity: l.quantity + line.quantity }
              : l,
          ),
        };
      }
      return { lines: [...s.lines, line] };
    }),
  removeItem: (productId, variantId) =>
    set((s) => ({
      lines: s.lines.filter((l) => !(l.productId === productId && l.variantId === variantId)),
    })),
  updateQty: (productId, quantity, variantId) =>
    set((s) => ({
      lines: s.lines.map((l) =>
        l.productId === productId && l.variantId === variantId ? { ...l, quantity } : l,
      ),
    })),
  clear: () => set({ lines: [] }),
  totalItems: () => get().lines.reduce((sum, l) => sum + l.quantity, 0),
  totalAmount: () => get().lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
  byShop: () => {
    const map: Record<string, { shopName: string; lines: CartLine[]; subtotal: number }> = {};
    for (const line of get().lines) {
      if (!map[line.shopId]) map[line.shopId] = { shopName: line.shopName, lines: [], subtotal: 0 };
      map[line.shopId].lines.push(line);
      map[line.shopId].subtotal += line.price * line.quantity;
    }
    return map;
  },
}));
