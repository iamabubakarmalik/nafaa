/**
 * Medicine facts per product (schedule, formula, form, fridge) for the counter
 * and the products list. The last answer is kept on the phone, so the counter
 * knows which medicines need a prescription register even without internet.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { saltKey } from '@nafaa/core/industries/pharmacy';
import { isOnline } from '@/core/net';
import { kv } from '@/core/storage/kv';
import { medicinesApi, type MedicineFacts } from './api';

export const MEDICINE_FACTS_KEY = 'pharmacy-medicine-facts';
const STORE_KEY = 'nafaa.pharmacy.facts';
const STALE = 5 * 60_000;

let list: MedicineFacts[] = kv.get<MedicineFacts[]>(STORE_KEY, []);
let byProduct = new Map(list.map((m) => [m.productId, m]));
let loadedAt = 0;

function remember(next: MedicineFacts[]) {
  list = next;
  byProduct = new Map(next.map((m) => [m.productId, m]));
  loadedAt = Date.now();
  kv.set(STORE_KEY, next);
}

/** Facts of one product as last known (synchronous; the counter uses this). */
export const factsOf = (productId: string): MedicineFacts | undefined => byProduct.get(productId);
export const allFacts = (): MedicineFacts[] => list;
export const saltsOf = (productId: string): string => saltKey(factsOf(productId)?.saltIds ?? []);

export async function loadFacts(): Promise<MedicineFacts[]> {
  const rows = await medicinesApi.lookup();
  remember(Array.isArray(rows) ? rows : []);
  return list;
}

/** Warms the cache at the counter without waiting. */
export function refreshFacts() {
  if (!isOnline() || Date.now() - loadedAt < STALE) return;
  loadedAt = Date.now();
  loadFacts().catch(() => { loadedAt = 0; });
}

/** Facts map by product id for screens; shows the saved copy first, then refreshes. */
export function useMedicineFacts() {
  const q = useQuery({ queryKey: [MEDICINE_FACTS_KEY], queryFn: loadFacts, staleTime: STALE, initialData: list.length ? list : undefined, initialDataUpdatedAt: 0 });
  return useMemo(() => new Map((q.data ?? []).map((m) => [m.productId, m])), [q.data]);
}
