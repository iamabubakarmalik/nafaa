/**
 * Batches behind the bill lines. Only products that have batches in the
 * branch are looked up; the rest of the bill costs no request. Offline the
 * lookups fail quietly and the sale falls back to the server's default
 * (earliest expiry first).
 */

import { useCallback, useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { posBatchesApi, type PosBatch } from '../api/batches.api';
import type { PosCartLine } from '../lib/posCart';

/** Query key prefix; invalidate it after a sale. */
export const POS_BATCHES_KEY = 'pos-batches';

const DAY = 86_400_000;

export const isBatchExpired = (b: Pick<PosBatch, 'expiryDate'>) =>
  !!b.expiryDate && new Date(b.expiryDate).getTime() < Date.now();

/** Days until expiry (negative once expired); null without an expiry date. */
export const batchDaysLeft = (b: Pick<PosBatch, 'expiryDate'>) =>
  b.expiryDate ? Math.floor((new Date(b.expiryDate).getTime() - Date.now()) / DAY) : null;

/** The batch a sale takes first when none is named: earliest valid expiry, expired ones last. */
export function defaultBatch(list: PosBatch[]): PosBatch | undefined {
  return list.find((b) => !isBatchExpired(b)) ?? list[0];
}

export interface PosLineBatch {
  /** Batches of this line's product (and variant) in stock, in selling order. */
  list: PosBatch[];
  /** The batch the line sells from: the one picked, else the default. */
  current?: PosBatch;
  /** True when the cashier picked the batch. */
  picked: boolean;
}

export function usePosBatches(shopId: string | null | undefined, cart: PosCartLine[]) {
  const online = typeof navigator === 'undefined' || navigator.onLine;
  const { data: batched } = useQuery({
    queryKey: [POS_BATCHES_KEY, 'products', shopId],
    queryFn: () => posBatchesApi.products(shopId!),
    enabled: !!shopId && online,
    staleTime: 2 * 60_000,
    retry: false,
  });
  const batchedSet = useMemo(() => new Set(batched ?? []), [batched]);

  const ids = useMemo(() => {
    const s = new Set<string>();
    for (const l of cart) if (l.type === 'product' && l.productId && !l.serialId && batchedSet.has(l.productId)) s.add(l.productId);
    return [...s].sort();
  }, [cart, batchedSet]);

  const { data: rows } = useQuery({
    queryKey: [POS_BATCHES_KEY, 'list', shopId, ids.join(',')],
    queryFn: () => posBatchesApi.list(shopId!, ids),
    enabled: !!shopId && online && ids.length > 0,
    staleTime: 60_000,
    retry: false,
    placeholderData: keepPreviousData,
  });

  const byProduct = useMemo(() => {
    const m = new Map<string, PosBatch[]>();
    for (const b of rows ?? []) {
      const key = `${b.productId}:${b.variantId ?? ''}`;
      m.set(key, [...(m.get(key) ?? []), b]);
    }
    return m;
  }, [rows]);

  return useCallback((line: PosCartLine): PosLineBatch | null => {
    if (line.type !== 'product' || !line.productId || line.serialId) return null;
    const list = byProduct.get(`${line.productId}:${line.variantId ?? ''}`) ?? [];
    if (!list.length) return null;
    const pickedBatch = line.batchId ? list.find((b) => b.id === line.batchId) : undefined;
    return { list, current: pickedBatch ?? defaultBatch(list), picked: !!pickedBatch };
  }, [byProduct]);
}
