'use client';
/**
 * Cart actions for any page: add, change quantity, remove. Answers from the
 * bridge replace the cart in AppProvider, so every badge and stepper updates.
 * OUT_OF_STOCK (409) shows the shop's stock message; signed-out visitors are
 * sent to the login page first.
 */
import { useCallback, useState } from 'react';
import { useApp } from '@/components/providers/AppProvider';
import { ClientError, m } from '@/lib/client';
import type { Cart, CartLine } from '@/lib/types';

/** A line the list steppers may change: no notes, no add-ons and no options except the substitute switch. */
const isPlain = (l: CartLine) => !l.notes && !l.modifiers?.picks?.length && (!l.options || Object.keys(l.options).every((k) => k === 'substitute'));

export interface AddInput {
  productId: string;
  variantId?: string | null;
  quantity?: number;
  notes?: string;
  options?: Record<string, unknown>;
  modifiers?: Array<{ groupId: string; optionIds: string[] }>;
}

export function useCart() {
  const app = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  const run = useCallback(
    async (key: string, fn: () => Promise<Cart>) => {
      setBusy(key);
      try {
        app.setCart(await fn());
        return true;
      } catch (e) {
        if (e instanceof ClientError && e.status === 401) {
          app.setSignedIn(false);
          app.requireSignIn();
          return false;
        }
        if (e instanceof ClientError && e.code === 'OUT_OF_STOCK') app.toast(e.userMessage ?? app.t('product.maxReached'), 'error');
        else app.toast(app.errorText(e), 'error');
        return false;
      } finally {
        setBusy(null);
      }
    },
    [app],
  );

  const add = useCallback(
    async (input: AddInput, opts: { silent?: boolean } = {}) => {
      if (!app.requireSignIn()) return false;
      const ok = await run(input.productId, () =>
        m<Cart>('cart/add', { body: { ...input, variantId: input.variantId ?? undefined, quantity: input.quantity ?? 1 } }),
      );
      if (ok && !opts.silent) app.toast(app.t('common.added'), 'ok', { label: app.t('common.viewCart'), href: app.href('/cart') });
      return ok;
    },
    [app, run],
  );

  const setQty = useCallback(
    (line: CartLine, qty: number) =>
      qty <= 0
        ? run(line.productId, () => m<Cart>(`cart/lines/${line.id}`, { method: 'DELETE' }))
        : run(line.productId, () => m<Cart>(`cart/lines/${line.id}`, { method: 'PATCH', body: { quantity: qty } })),
    [run],
  );

  const remove = useCallback((line: CartLine) => run(line.productId, () => m<Cart>(`cart/lines/${line.id}`, { method: 'DELETE' })), [run]);

  /** The plain (no options) cart line for a product, used by +/− steppers on lists. */
  const lineFor = useCallback(
    (productId: string, variantId: string | null = null): CartLine | undefined => {
      for (const g of app.cart?.shopGroups ?? []) {
        const l = g.lines.find((x) => x.productId === productId && x.variantId === variantId && isPlain(x));
        if (l) return l;
      }
      return undefined;
    },
    [app.cart],
  );

  return { add, setQty, remove, lineFor, busy };
}
