/**
 * Wholesale prices on the counter. When the picked customer has a price
 * list and distribution is on, every product line is re-priced from that
 * list (GET /distribution/price-lists/resolve) and the running trade schemes
 * are applied (POST /distribution/schemes/preview):
 *
 * - the line's rate becomes the list rate of the pack sold; rupees taken off
 *   by a scheme go inside that rate (not as a line discount, which would count
 *   against the counter's discount limit), so `priceOverride` per base unit
 *   is the net list rate;
 * - free goods are their own line at price 0, noted "Scheme: …";
 * - lines carry `dist` so checkout can send unitName / unitQty /
 *   conversionRate / schemeId and the tier switch leaves them alone.
 *
 * Without a customer price list nothing here runs: no request is made and no
 * line is touched, so ordinary counter sales behave exactly as before. A
 * rate typed by the cashier is kept (and counted as a discount, as usual).
 */

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@core/stores/auth.store';
import { hasAnyPermission, PERMISSIONS } from '@core/lib/permissions';
import { DIST_KEY, distSetupApi, distributionApi, type ResolvedPrice, type SchemeResult } from '@modules/distribution/api/distribution.api';
import { posLineId, type PosCartLine } from '../lib/posCart';

interface Options {
  customer: { id: string; name?: string; priceListId?: string | null } | undefined;
  cart: PosCartLine[];
  setCart: Dispatch<SetStateAction<PosCartLine[]>>;
  /** The line's normal counter rate (its tier price), used when a line leaves the list. */
  counterPrice: (l: PosCartLine) => number;
  /** Catalog name and base unit of a product, for free goods of another item. */
  productInfo: (productId: string) => { name: string; unit: string; image?: string } | undefined;
}

const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
const isPaid = (l: PosCartLine) => l.type === 'product' && !!l.productId && !l.dist?.free && !l.usedPhoneId;

/** The list rate of the pack this line is sold in, or null when the list has none. */
function listRateFor(l: PosCartLine, items: ResolvedPrice[]): number | null {
  const rows = items.filter((i) => i.productId === l.productId && (i.variantId ?? null) === (l.variantId ?? null));
  if (!rows.length) return null;
  const pack = rows.find((i) => i.unitName.toLowerCase() === l.unitName.toLowerCase() && Math.abs(i.conversionRate - l.conversionRate) < 1e-6)
    ?? rows.find((i) => Math.abs(i.conversionRate - l.conversionRate) < 1e-6 && (l.conversionRate !== 1 || !i.unitId));
  if (pack) return pack.price;
  const base = rows.find((i) => !i.unitId) ?? rows.find((i) => i.conversionRate === 1);
  return base ? r4(base.perBase * l.conversionRate) : null;
}

/** A line taken back to the normal counter rate. */
function undo(l: PosCartLine, price: number): PosCartLine {
  const { dist, ...rest } = l;
  return { ...rest, note: dist?.baseNote ?? l.note, unitPrice: price, basePrice: price, lineTotal: l.quantity * price };
}

export function useDistributionPricing({ customer, cart, setCart, counterPrice, productInfo }: Options) {
  const hasList = !!customer?.priceListId;
  const customerId = customer?.id ?? '';

  // Distribution switch: read only when the customer has a list. People who
  // cannot read settings rely on the resolve call (refused when it is off).
  const canRead = useAuthStore((s) => !!s.user && hasAnyPermission(s.user.role as never, s.user.permissions,
    [PERMISSIONS.SETTINGS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_VIEW, PERMISSIONS.DISTRIBUTION_ORDERS_BOOK]));
  const settingsQ = useQuery({ queryKey: [DIST_KEY, 'settings'], queryFn: distributionApi.settings, enabled: hasList && canRead, staleTime: 5 * 60_000, retry: false });
  const access = settingsQ.data?.access;
  const switchOn = canRead ? !!access?.enabled && !!access.planAllows : true;

  const productIds = useMemo(() => {
    if (!hasList) return '';
    return [...new Set(cart.filter(isPaid).map((l) => l.productId!))].sort().slice(0, 200).join(',');
  }, [hasList, cart]);

  const resolveQ = useQuery({
    queryKey: [DIST_KEY, 'pos-resolve', customerId, productIds],
    queryFn: () => distSetupApi.resolve({ customerId, productIds: productIds.split(',') }),
    enabled: hasList && switchOn && !!productIds && (!canRead || settingsQ.isSuccess),
    staleTime: 60_000,
    retry: false,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === customerId ? prev : undefined),
  });
  const resolved = resolveQ.data;
  const active = hasList && switchOn && !resolveQ.isError && !!resolved?.priceListId;

  // Leaving the list (customer changed, distribution off): every list line goes back to the counter rate.
  useEffect(() => {
    if (active) return;
    setCart((prev) => (prev.some((l) => l.dist)
      ? prev.filter((l) => !l.dist?.free).map((l) => (l.dist ? undo(l, l.priceEdited ? l.unitPrice : counterPrice(l)) : l))
      : prev));
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tell the cashier once per customer.
  const told = useRef('');
  useEffect(() => {
    if (active && resolved?.priceListName && told.current !== customerId) {
      told.current = customerId;
      toast.info(`${customer?.name ?? 'Customer'}: ${resolved.priceListName} list ke rate`, { duration: 2500 });
    }
    if (!hasList) told.current = '';
  }, [active, resolved?.priceListName, customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 1) List rates on the paid lines.
  const items = resolved?.items;
  useEffect(() => {
    if (!active || !items) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        if (!isPaid(l) || l.priceEdited || l.fixedPrice || l.serialId || l.imeiId) return l;
        const rate = listRateFor(l, items);
        if (rate == null || !(rate > 0)) return l;
        if (l.dist && Math.abs(l.dist.listPrice - rate) < 1e-6) return l;
        changed = true;
        const net = l.dist?.schemeOff ? Math.max(0, rate - l.dist.schemeOff / l.quantity) : rate;
        return {
          ...l, unitPrice: net, basePrice: net, lineTotal: l.quantity * net,
          dist: { ...(l.dist ?? { baseNote: l.note }), listPrice: rate },
        };
      });
      return changed ? next : prev;
    });
  }, [active, items, cart]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) Schemes, only when the list has schemes for these items.
  const hasSchemes = !!resolved?.schemes?.length;
  const paidKey = useMemo(() => (active && hasSchemes
    ? cart.filter((l) => isPaid(l) && l.dist && !l.priceEdited).map((l) => `${l.id}:${l.productId}:${l.variantId ?? ''}:${r4(l.baseQuantity)}:${r4(l.dist!.listPrice / l.conversionRate)}`).join('|')
    : ''), [active, hasSchemes, cart]);
  const debouncedKey = useSettled(paidKey);

  const previewQ = useQuery({
    queryKey: [DIST_KEY, 'pos-schemes', customerId, debouncedKey],
    queryFn: async () => {
      const lines = debouncedKey.split('|').map((s) => {
        const [id, productId, variantId, baseQty, perBase] = s.split(':');
        return { id, productId, variantId: variantId || null, baseQty: Number(baseQty), unitPrice: Number(perBase) };
      });
      const r = await distSetupApi.schemePreview({ customerId, lines: lines.map(({ id: _id, ...x }) => x) });
      return lines.map((x, i) => ({ lineId: x.id, productId: x.productId, res: r.lines[i] as SchemeResult | undefined }));
    },
    enabled: !!debouncedKey,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!active) return;
    const results = debouncedKey && debouncedKey === paidKey ? previewQ.data : hasSchemes ? undefined : [];
    if (!results) return;
    const byLine = new Map(results.map((x) => [x.lineId, x]));
    setCart((prev) => {
      let changed = false;
      const paid = prev.filter((l) => !l.dist?.free).map((l) => {
        if (!l.dist || l.dist.free || l.priceEdited) return l;
        const res = byLine.get(l.id)?.res;
        const off = res?.schemeId && res.discount > 0 ? Math.min(res.discount, l.dist.listPrice * l.quantity) : 0;
        const note = res?.schemeId ? res.note ?? res.schemeName ?? 'Scheme' : null;
        const net = off ? Math.max(0, l.dist.listPrice - off / l.quantity) : l.dist.listPrice;
        if (Math.abs(net - l.unitPrice) < 1e-6 && (l.dist.schemeId ?? null) === (res?.schemeId ?? null) && (l.dist.schemeOff ?? 0) === off) return l;
        changed = true;
        return {
          ...l, unitPrice: net, basePrice: net, lineTotal: l.quantity * net,
          note: [l.dist.baseNote, note && off ? `Scheme: ${note}` : ''].filter(Boolean).join(' • ') || undefined,
          dist: { ...l.dist, schemeId: res?.schemeId ?? null, schemeNote: note, schemeOff: off },
        };
      });
      // Free goods: one price-0 line per paid line that earned them.
      const free: PosCartLine[] = [];
      for (const l of paid) {
        const res = l.dist && !l.priceEdited ? byLine.get(l.id)?.res : undefined;
        if (!res?.schemeId || !(res.freeBaseQty > 0)) continue;
        const pid = res.freeProductId ?? l.productId!;
        const info = res.freeProductId ? productInfo(pid) : undefined;
        const old = prev.find((x) => x.dist?.free && x.dist.forLineId === l.id);
        const qty = r4(res.freeBaseQty);
        free.push({
          id: old?.id ?? posLineId(), type: 'product', productId: pid,
          name: res.freeProductId ? info?.name ?? 'Free item' : l.name, image: res.freeProductId ? info?.image : l.image,
          unitName: res.freeProductId ? info?.unit ?? 'pcs' : l.baseUnit, unitLabel: 'FREE', emoji: '🎁',
          unitPrice: 0, basePrice: 0, quantity: qty, baseQuantity: qty, conversionRate: 1,
          baseUnit: res.freeProductId ? info?.unit ?? 'pcs' : l.baseUnit, baseStock: Number.MAX_SAFE_INTEGER,
          lineTotal: 0, note: `Scheme: ${res.note ?? res.schemeName ?? 'free'}`, variantId: res.freeProductId ? undefined : l.variantId,
          lockQty: true, fixedPrice: true,
          dist: { listPrice: 0, free: true, forLineId: l.id, schemeId: res.schemeId, schemeNote: res.note ?? res.schemeName },
        });
      }
      const oldFree = prev.filter((x) => x.dist?.free);
      const sameFree = oldFree.length === free.length && free.every((f, i) => oldFree[i]?.id === f.id && oldFree[i].quantity === f.quantity && oldFree[i].productId === f.productId);
      if (!changed && sameFree) return prev;
      return [...paid, ...free];
    });
  }, [active, previewQ.data, debouncedKey, paidKey, hasSchemes]); // eslint-disable-line react-hooks/exhaustive-deps

  return { active, listName: active ? resolved?.priceListName ?? null : null, busy: resolveQ.isFetching || previewQ.isFetching };
}

/** The key once it has stayed the same for 350 ms (typing a quantity sends one preview). */
function useSettled(key: string, ms = 350) {
  const [v, setV] = useState(key);
  useEffect(() => {
    if (!key) { setV(''); return; }
    const t = setTimeout(() => setV(key), ms);
    return () => clearTimeout(t);
  }, [key, ms]);
  return v;
}
