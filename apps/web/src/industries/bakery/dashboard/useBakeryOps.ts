/**
 * Bakery's own numbers for the dashboard: today's baking, orders due,
 * stock about to expire and raw materials running low. Every bakery widget
 * calls this; React Query shares the requests between them.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { cakeOrdersApi } from '../api/cake-orders.api';
import { bulkOrdersApi } from '../api/bulk-orders.api';
import { productionApi } from '../api/production.api';
import { ingredientsApi } from '../api/ingredients.api';
import { freshnessApi, type FreshnessLog } from '../api/freshness.api';
import { BULK_KEY, CAKE_KEY, FRESH_KEY, PRODUCTION_KEY, RAW_KEY } from '../components/meta';

const MINUTE = 60_000;

/** Hours from now until `iso`; negative when already past. */
const hoursTo = (iso?: string | null) => (iso ? (new Date(iso).getTime() - Date.now()) / 3_600_000 : null);

export interface DueOrder {
  kind: 'cake' | 'bulk';
  id: string;
  name: string;
  number: string;
  left: number | null;
  total: number;
  due: number;
}

export function useBakeryOps() {
  // Keys match the bakery pages, so a change there refreshes these numbers too.
  const cakes = useQuery({ queryKey: [CAKE_KEY, 'open'], queryFn: () => cakeOrdersApi.list({ open: 'true' }).catch(() => []), refetchInterval: MINUTE });
  const bulks = useQuery({ queryKey: [BULK_KEY, 'open'], queryFn: () => bulkOrdersApi.list({ open: 'true' }).catch(() => []), refetchInterval: MINUTE });
  const plans = useQuery({ queryKey: [PRODUCTION_KEY, 'today'], queryFn: () => productionApi.today().catch(() => []), refetchInterval: MINUTE });
  const ingredients = useQuery({ queryKey: [RAW_KEY, 'list', false], queryFn: () => ingredientsApi.list({}).catch(() => []), refetchInterval: 5 * MINUTE });
  const freshness = useQuery({ queryKey: [FRESH_KEY, 'live'], queryFn: () => freshnessApi.list({ active: 'true' }).catch(() => []), refetchInterval: MINUTE });

  // Freshness logs carry no price; join the product list so "3 batches"
  // becomes "Rs 4,500 of stock", which is what makes an owner act.
  const products = useQuery({
    queryKey: ['bakery-all-products'],
    queryFn: () => fetchAllProducts({ isActive: true }),
    staleTime: 5 * MINUTE,
  });

  const priceById = useMemo(() => {
    const m = new Map<string, number>();
    (products.data?.items ?? []).forEach((p: { id: string; price?: number | string }) => m.set(p.id, Number(p.price || 0)));
    return m;
  }, [products.data]);

  const fresh = useMemo(() => {
    const live = (freshness.data ?? [])
      .filter((f) => f.status !== 'DISCARDED' && Number(f.currentQty) > 0)
      .map((f) => ({ ...f, left: hoursTo(f.expiryDate || f.bestBefore) ?? 999, value: Number(f.currentQty || 0) * (priceById.get(f.productId) ?? 0) }));
    const within = (h: number) => live.filter((f) => f.left <= h);
    return {
      expired: live.filter((f) => f.left <= 0),
      urgent: live.filter((f) => f.left > 0 && f.left <= 12),
      qty: within(12).reduce((x, f) => x + Number(f.currentQty || 0), 0),
      // Whatever does not sell today is waste tomorrow.
      value: within(24).reduce((x, f) => x + f.value, 0),
      list: within(24).sort((a, b) => a.left - b.left).slice(0, 6) as Array<FreshnessLog & { left: number; value: number }>,
      /** Every live batch, soonest first, for widgets with their own window. */
      live: [...live].sort((a, b) => a.left - b.left) as Array<FreshnessLog & { left: number; value: number }>,
    };
  }, [freshness.data, priceById]);

  const production = useMemo(() => {
    const items = (plans.data ?? []).flatMap((p) => p.items ?? []);
    return {
      planCount: plans.data?.length ?? 0,
      pending: items.filter((i) => i.status === 'PLANNED').length,
      inOven: items.filter((i) => i.status === 'BAKING').length,
      done: items.filter((i) => i.status === 'COMPLETED').length,
      total: items.length,
    };
  }, [plans.data]);

  const orders = useMemo(() => {
    const closed = (s: string) => s === 'DELIVERED' || s === 'CANCELLED';
    const all: DueOrder[] = [
      ...(cakes.data ?? []).filter((c) => !closed(c.status)).map((c) => ({
        kind: 'cake' as const, id: c.id, name: c.customerName, number: c.orderNumber,
        left: hoursTo(c.neededBy),
        total: Number(c.total || 0), due: Math.max(Number(c.total || 0) - Number(c.paidAmount || 0), 0),
      })),
      ...(bulks.data ?? []).filter((b) => !closed(b.status)).map((b) => {
        const total = Number(b.finalPrice ?? b.quotedPrice ?? 0);
        return {
          kind: 'bulk' as const, id: b.id, name: b.organizationName, number: b.orderNumber,
          left: hoursTo(b.eventDate), total, due: Math.max(total - Number(b.paidAmount || 0), 0),
        };
      }),
    ];
    return {
      active: all,
      late: all.filter((x) => x.left !== null && x.left < 0),
      today: all.filter((x) => x.left !== null && x.left >= 0 && x.left <= 24),
      due: all.reduce((x, y) => x + y.due, 0),
      value: all.reduce((x, y) => x + y.total, 0),
      list: [...all].sort((a, b) => (a.left ?? 99_999) - (b.left ?? 99_999)).slice(0, 6),
      sorted: [...all].sort((a, b) => (a.left ?? 99_999) - (b.left ?? 99_999)),
    };
  }, [cakes.data, bulks.data]);

  const raw = useMemo(() => {
    const list = (ingredients.data ?? []).filter((i) => i.isActive !== false);
    const low = list.filter((i) => Number(i.currentStock || 0) <= Number(i.reorderLevel ?? i.minStock ?? 0));
    return {
      total: list.length,
      low: low.length,
      critical: low.filter((i) => i.isCritical || Number(i.currentStock || 0) <= 0).length,
      value: list.reduce((x, i) => x + Number(i.currentStock || 0) * Number(i.costPerUnit || 0), 0),
      list: low.slice(0, 6),
      lowAll: low,
      all: list,
    };
  }, [ingredients.data]);

  return { fresh, production, orders, raw, loading: plans.isLoading || cakes.isLoading };
}
