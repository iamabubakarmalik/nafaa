/**
 * Delivery and installation jobs of a bill, for the receipt. The receipt
 * extenders are sync and read the server bill, so a pack registers a loader
 * here: when a bill (GET /sales/:id) reaches the query cache, the loader runs
 * once for it and the result is stored on the bill as `tradeJobs`, which
 * re-renders whatever shows the bill. Offline or on a failure the bill stays
 * as it is and prints without the rows.
 */

import { useAuthStore } from '@/core/auth/store';
import { queryClient } from '@/core/query/client';
import { industryIdForBusinessType } from '@/design/industries/businessTypes';

export interface TradeJob {
  kind: 'delivery' | 'installation';
  number: string;
  status: string;
  /** ISO date the job is planned for or was done on. */
  date?: string | null;
  who?: string | null;
  charge?: number;
  /** Delivery with assembly (furniture) or fitting included. */
  fitting?: boolean;
}

type Loader = (saleId: string) => Promise<TradeJob[]>;
const LOADERS = new Map<string, Loader>();
const tried = new Set<string>();
const results = new Map<string, TradeJob[]>();
let listening = false;

const isBill = (d: unknown): d is { id: string; saleNumber: string; tradeJobs?: TradeJob[] } =>
  !!d && typeof d === 'object' && typeof (d as { id?: unknown }).id === 'string' && typeof (d as { saleNumber?: unknown }).saleNumber === 'string' && Array.isArray((d as { items?: unknown }).items);

const keyIsBill = (key: readonly unknown[]) =>
  (key[0] === 'api' && typeof key[1] === 'string' && /^\/sales\/[^/]+$/.test(key[1])) || (key[0] === 'sales' && key[1] === 'one');

function listen() {
  if (listening) return;
  listening = true;
  queryClient.getQueryCache().subscribe((e) => {
    if (e.type !== 'updated' || e.action.type !== 'success') return;
    const data = e.query.state.data;
    if (!keyIsBill(e.query.queryKey) || !isBill(data) || data.tradeJobs) return;
    const load = LOADERS.get(industryIdForBusinessType(useAuthStore.getState().tenant?.businessType) ?? '');
    const mark = `${data.id}:${data.saleNumber}`;
    if (!load) return;
    // A refetch drops the extra field: put the loaded jobs back.
    const known = results.get(mark);
    if (known) { queryClient.setQueryData(e.query.queryKey, { ...data, tradeJobs: known }); return; }
    if (tried.has(mark)) return;
    tried.add(mark);
    load(data.id).then((jobs) => {
      results.set(mark, jobs);
      queryClient.setQueryData(e.query.queryKey, { ...data, tradeJobs: jobs });
    }).catch(() => tried.delete(mark));
  });
}

/** Loads the jobs of every bill of these industries (once per bill). */
export function registerSaleJobs(industry: string | string[], load: Loader) {
  for (const id of Array.isArray(industry) ? industry : [industry]) LOADERS.set(id, load);
  listen();
}

export const jobsOf = (sale: Record<string, any> | null | undefined): TradeJob[] => (Array.isArray(sale?.tradeJobs) ? sale!.tradeJobs : []);
