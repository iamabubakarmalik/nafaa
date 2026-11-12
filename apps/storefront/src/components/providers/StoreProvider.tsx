'use client';

/**
 * Client-side shop state: language and words, the shop facts client
 * components need, the server cart (token in the nafaa_cart cookie, handled
 * by /api/sf), and the open/closed state of the cart drawer and search.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Bootstrap, Cart, Lang } from '@/lib/api';
import { t as translate, type MessageKey } from '@/lib/i18n';
import { href as hrefFor, money as fmt } from '@/lib/format';
import type { ThemeLayout } from '@/lib/theme/presets';
import { readCookie, sf, SfError } from '@/lib/client/sf';
import { track } from '@/lib/client/track';

export interface ShopInfo {
  storeId: string;
  name: string;
  lang: Lang;
  langs: Lang[];
  symbol: string;
  whatsapp: string | null;
  payments: Bootstrap['payments'];
  checkout: Bootstrap['checkout'];
  shipping: Bootstrap['shipping'];
  layout: ThemeLayout;
  newsletter: Bootstrap['settings']['newsletter'];
  preview: boolean;
}

interface AddInput {
  productId: string;
  variantId: string | null;
  quantity: number;
  title?: string;
  price?: number;
}

interface Ctx {
  shop: ShopInfo;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  money: (n: number | null | undefined) => string;
  href: (path: string) => string;
  cart: Cart | null;
  cartReady: boolean;
  busy: boolean;
  error: string | null;
  add: (input: AddInput, opts?: { open?: boolean }) => Promise<Cart | null>;
  addMany: (inputs: AddInput[]) => Promise<void>;
  setQty: (lineId: string, quantity: number) => Promise<void>;
  setCart: (c: Cart | null) => void;
  refresh: () => Promise<void>;
  drawer: boolean;
  setDrawer: (open: boolean) => void;
  search: boolean;
  setSearch: (open: boolean) => void;
}

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ shop, children }: { shop: ShopInfo; children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartReady, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const loaded = useRef(false);

  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(shop.lang, key, vars), [shop.lang]);
  const money = useCallback((n: number | null | undefined) => fmt(n, shop.symbol), [shop.symbol]);
  const href = useCallback((p: string) => hrefFor(shop.lang, p), [shop.lang]);

  const refresh = useCallback(async () => {
    if (!readCookie('nafaa_cart')) {
      setCart(null);
      setReady(true);
      return;
    }
    try {
      const r = await sf<{ cart: Cart | null }>('cart.get');
      setCart(r.cart);
    } catch {
      setCart(null);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void refresh();
  }, [refresh]);

  const add = useCallback(
    async (input: AddInput, opts?: { open?: boolean }) => {
      setBusy(true);
      setError(null);
      try {
        const r = await sf<{ cart: Cart }>('cart.add', { productId: input.productId, variantId: input.variantId, quantity: input.quantity });
        setCart(r.cart);
        if (opts?.open !== false) setDrawer(true);
        track('add_to_cart', { productId: input.productId, value: (input.price ?? 0) * input.quantity, name: input.title, quantity: input.quantity });
        return r.cart;
      } catch (e) {
        setError(e instanceof SfError ? e.message : translate(shop.lang, 'common.error'));
        return null;
      } finally {
        setBusy(false);
      }
    },
    [shop.lang],
  );

  const addMany = useCallback(
    async (inputs: AddInput[]) => {
      for (const i of inputs) await add(i, { open: false });
      setDrawer(true);
    },
    [add],
  );

  const setQty = useCallback(async (lineId: string, quantity: number) => {
    setBusy(true);
    setCart((c) =>
      c ? { ...c, lines: quantity <= 0 ? c.lines.filter((l) => l.lineId !== lineId) : c.lines.map((l) => (l.lineId === lineId ? { ...l, quantity, lineTotal: l.price * quantity } : l)) } : c,
    );
    try {
      const r = await sf<{ cart: Cart }>('cart.line', { lineId, quantity });
      setCart(r.cart);
    } catch {
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  useEffect(() => {
    document.documentElement.style.overflow = drawer || search ? 'hidden' : '';
  }, [drawer, search]);

  const value = useMemo<Ctx>(
    () => ({ shop, t, money, href, cart, cartReady, busy, error, add, addMany, setQty, setCart, refresh, drawer, setDrawer, search, setSearch }),
    [shop, t, money, href, cart, cartReady, busy, error, add, addMany, setQty, refresh, drawer, search],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(StoreCtx);
  if (!c) throw new Error('useStore outside StoreProvider');
  return c;
}
