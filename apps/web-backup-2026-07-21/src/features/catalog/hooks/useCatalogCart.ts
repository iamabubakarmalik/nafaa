import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nafaa.catalog-cart';

export interface CatalogCartItem {
  cartId: string;
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  image?: string;
  price: number;
  unit: string;
  quantity: number;
  notes?: string;
  modifiers?: Array<{
    name: string;
    priceAdjustment: number;
  }>;
  meta?: Record<string, any>;
}

interface CartState {
  items: CatalogCartItem[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes: string;
}

const empty: CartState = {
  items: [],
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  notes: '',
};

const genId = () => `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function loadCart(): CartState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...empty, ...parsed };
    }
  } catch {}
  return empty;
}

/**
 * Marketplace-ready cart hook. Persists to localStorage so customers
 * can browse over multiple sessions. Used by all industry catalogs.
 *
 * Future: hook this to a real "PlaceOrder" API endpoint. For now,
 * checkout goes via WhatsApp with formatted message.
 */
export function useCatalogCart() {
  const [state, setState] = useState<CartState>(loadCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  const addItem = useCallback((item: Omit<CatalogCartItem, 'cartId'>) => {
    setState((prev) => {
      // Merge if same product + variant + no unique modifiers
      const existing = prev.items.find(
        (i) =>
          i.productId === item.productId &&
          i.variantId === item.variantId &&
          !i.modifiers?.length &&
          !item.modifiers?.length,
      );
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.cartId === existing.cartId ? { ...i, quantity: i.quantity + item.quantity } : i,
          ),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { ...item, cartId: genId() }],
      };
    });
  }, []);

  const updateItem = useCallback((cartId: string, patch: Partial<CatalogCartItem>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.cartId === cartId ? { ...i, ...patch } : i)),
    }));
  }, []);

  const removeItem = useCallback((cartId: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.cartId !== cartId),
    }));
  }, []);

  const setQuantity = useCallback((cartId: string, qty: number) => {
    if (qty < 0.01) return removeItem(cartId);
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.cartId === cartId ? { ...i, quantity: qty } : i)),
    }));
  }, [removeItem]);

  const clear = useCallback(() => {
    setState(empty);
  }, []);

  const setCustomer = useCallback((patch: Partial<Pick<CartState, 'customerName' | 'customerPhone' | 'customerAddress' | 'notes'>>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const subtotal = state.items.reduce((sum, item) => {
    const modTotal = (item.modifiers ?? []).reduce((s, m) => s + (m.priceAdjustment || 0), 0);
    return sum + (item.price + modTotal) * item.quantity;
  }, 0);

  const totalItems = state.items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    ...state,
    subtotal,
    totalItems,
    addItem,
    updateItem,
    removeItem,
    setQuantity,
    clear,
    setCustomer,
  };
}
