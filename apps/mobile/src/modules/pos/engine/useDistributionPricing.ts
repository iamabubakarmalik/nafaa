/**
 * Wholesale prices on the counter, the same rules as the web
 * useDistributionPricing. When distribution is on and the picked customer
 * has a price list, every product line is re-priced from that list (GET
 * /distribution/price-lists/resolve) and running trade schemes are applied
 * (POST /distribution/schemes/preview):
 *
 * - the line's rate becomes the list rate of the pack sold; rupees a scheme
 *   takes off go inside that rate (not a line discount, which would count
 *   against the counter's discount limit);
 * - free goods are their own line at price 0, noted "Scheme: …";
 * - lines carry `dist`, so the sale sends unitName / unitQty /
 *   conversionRate / schemeId and the tier switch leaves them alone.
 *
 * Price lists live on the server, so this needs internet; offline (or
 * without a list) no line is touched and the counter sells as usual.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posLineId, tierPrice, type PosCartLine } from '@nafaa/core/pos';
import { apiClient } from '@/core/api/client';
import { useBusinessModels } from '@/core/business-models';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { toast } from '@/design';
import { useBill } from './bill';

interface ResolvedPrice { productId: string; variantId: string | null; unitId: string | null; unitName: string; conversionRate: number; price: number; perBase: number }
interface Resolve { priceListId: string | null; priceListName: string | null; items: ResolvedPrice[]; schemes: unknown[] }
interface SchemeResult { schemeId: string | null; schemeName: string | null; note: string | null; discount: number; freeBaseQty: number; freeProductId: string | null }

const r4 = (n: number) => Math.round(n * 10_000) / 10_000;
const isPaid = (l: PosCartLine) => l.type === 'product' && !!l.productId && !l.dist?.free && !l.usedPhoneId;

function listRateFor(l: PosCartLine, items: ResolvedPrice[]): number | null {
  const rows = items.filter((i) => i.productId === l.productId && (i.variantId ?? null) === (l.variantId ?? null));
  if (!rows.length) return null;
  const pack = rows.find((i) => i.unitName.toLowerCase() === l.unitName.toLowerCase() && Math.abs(i.conversionRate - l.conversionRate) < 1e-6)
    ?? rows.find((i) => Math.abs(i.conversionRate - l.conversionRate) < 1e-6 && (l.conversionRate !== 1 || !i.unitId));
  if (pack) return pack.price;
  const base = rows.find((i) => !i.unitId) ?? rows.find((i) => i.conversionRate === 1);
  return base ? r4(base.perBase * l.conversionRate) : null;
}

function undo(l: PosCartLine, price: number): PosCartLine {
  const { dist, ...rest } = l;
  return { ...rest, note: dist?.baseNote ?? l.note, unitPrice: price, basePrice: price, lineTotal: l.quantity * price };
}

function useSettled(key: string, ms = 350) {
  const [v, setV] = useState(key);
  useEffect(() => {
    if (!key) { setV(''); return; }
    const h = setTimeout(() => setV(key), ms);
    return () => clearTimeout(h);
  }, [key, ms]);
  return v;
}

/** Runs once on the POS screen. `productInfo` names free goods of another item. */
export function useDistributionPricing(productInfo: (id: string) => { name: string; unit: string; image?: string } | undefined) {
  const { distribution } = useBusinessModels();
  const online = useOnlineStatus();
  const customer = useBill((s) => s.customer);
  const lines = useBill((s) => s.lines);
  const tier = useBill((s) => s.tier);
  const setLines = useBill((s) => s.setLines);
  const customerId = customer?.id ?? '';
  const on = distribution && online && !!customerId && !customerId.startsWith('tmp_');

  const productIds = useMemo(() => (on ? [...new Set(lines.filter(isPaid).map((l) => l.productId!))].sort().slice(0, 200).join(',') : ''), [on, lines]);
  const resolveQ = useQuery({
    queryKey: ['distribution', 'pos-resolve', customerId, productIds],
    queryFn: async () => (await apiClient.get<Resolve>('/distribution/price-lists/resolve', { params: { customerId, productIds } })).data,
    enabled: on && !!productIds,
    staleTime: 60_000,
    retry: false,
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[2] === customerId ? prev : undefined),
  });
  const resolved = resolveQ.data;
  const active = on && !resolveQ.isError && !!resolved?.priceListId;

  // Leaving the list: every list line goes back to the counter rate.
  useEffect(() => {
    if (active) return;
    setLines((prev) => (prev.some((l) => l.dist)
      ? prev.filter((l) => !l.dist?.free).map((l) => (l.dist ? undo(l, l.priceEdited ? l.unitPrice : l.tierSrc ? tierPrice(l.tierSrc, tier) : l.unitPrice) : l))
      : prev));
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const told = useRef('');
  useEffect(() => {
    if (active && resolved?.priceListName && told.current !== customerId) {
      told.current = customerId;
      toast.info(t('{{name}}: {{list}} list rates', { name: customer?.name ?? '', list: resolved.priceListName }));
    }
    if (!customerId) told.current = '';
  }, [active, resolved?.priceListName, customerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = resolved?.items;
  useEffect(() => {
    if (!active || !items) return;
    setLines((prev) => {
      let changed = false;
      const next = prev.map((l) => {
        if (!isPaid(l) || l.priceEdited || l.fixedPrice || l.serialId || l.imeiId) return l;
        const rate = listRateFor(l, items);
        if (rate == null || !(rate > 0)) return l;
        if (l.dist && Math.abs(l.dist.listPrice - rate) < 1e-6) return l;
        changed = true;
        const net = l.dist?.schemeOff ? Math.max(0, rate - l.dist.schemeOff / l.quantity) : rate;
        return { ...l, unitPrice: net, basePrice: net, lineTotal: l.quantity * net, dist: { ...(l.dist ?? { baseNote: l.note }), listPrice: rate } };
      });
      return changed ? next : prev;
    });
  }, [active, items, lines]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasSchemes = !!resolved?.schemes?.length;
  const paidKey = useMemo(() => (active && hasSchemes
    ? lines.filter((l) => isPaid(l) && l.dist && !l.priceEdited).map((l) => `${l.id}:${l.productId}:${l.variantId ?? ''}:${r4(l.baseQuantity)}:${r4(l.dist!.listPrice / l.conversionRate)}`).join('|')
    : ''), [active, hasSchemes, lines]);
  const settledKey = useSettled(paidKey);

  const previewQ = useQuery({
    queryKey: ['distribution', 'pos-schemes', customerId, settledKey],
    queryFn: async () => {
      const parsed = settledKey.split('|').map((s) => {
        const [id, productId, variantId, baseQty, perBase] = s.split(':');
        return { id, productId, variantId: variantId || null, baseQty: Number(baseQty), unitPrice: Number(perBase) };
      });
      const r = (await apiClient.post<{ lines: SchemeResult[] }>('/distribution/schemes/preview', { customerId, lines: parsed.map(({ id: _id, ...x }) => x) })).data;
      return parsed.map((x, i) => ({ lineId: x.id, res: r.lines[i] as SchemeResult | undefined }));
    },
    enabled: !!settledKey,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (!active) return;
    const results = settledKey && settledKey === paidKey ? previewQ.data : hasSchemes ? undefined : [];
    if (!results) return;
    const byLine = new Map(results.map((x) => [x.lineId, x]));
    setLines((prev) => {
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
          // Saved with the sale as written.
          lineTotal: 0, note: `Scheme: ${res.note ?? res.schemeName ?? 'free'}`,
          variantId: res.freeProductId ? undefined : l.variantId,
          lockQty: true, fixedPrice: true,
          dist: { listPrice: 0, free: true, forLineId: l.id, schemeId: res.schemeId, schemeNote: res.note ?? res.schemeName },
        });
      }
      const oldFree = prev.filter((x) => x.dist?.free);
      const sameFree = oldFree.length === free.length && free.every((f, i) => oldFree[i]?.id === f.id && oldFree[i].quantity === f.quantity && oldFree[i].productId === f.productId);
      if (!changed && sameFree) return prev;
      return [...paid, ...free];
    });
  }, [active, previewQ.data, settledKey, paidKey, hasSchemes]); // eslint-disable-line react-hooks/exhaustive-deps

  return { active, listName: active ? resolved?.priceListName ?? null : null, busy: resolveQ.isFetching || previewQ.isFetching };
}
