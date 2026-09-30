import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type Authority = 'PRA' | 'SRB' | 'KPRA' | 'FBR';
export interface Fiscal { authority: Authority; status: string; fiscalNumber: string | null; qrText: string | null; error: string | null; usin: string; taxAmount: number; taxRate: number; label: string }
export interface TerminalView { shopId: string | null; posId: string; ntn: string; user: string; hasSecret: boolean }
export interface TaxOverview {
  config: null | { authority: Authority; enabled: boolean; env: 'sandbox' | 'live'; businessName: string; pctCode: string; cashRate: number; cardRate: number; onlyPos: boolean; terminals: TerminalView[]; startAt: string | null };
  authorities: Record<Authority, { name: string; province: string; portal: string; docs: string; fields: { key: string; label: string; secret?: boolean }[] }>;
  defaults: Record<Authority, { cash: number; card: number }>;
  shops: { id: string; name: string }[];
  stats: Record<string, number>;
  recent: Array<{ id: string; authority: string; kind: string; usin: string; status: string; fiscalNumber: string | null; totalAmount: number; taxAmount: number; error: string | null; attempts: number; createdAt: string }>;
}

export const taxAuthorityApi = {
  overview: () => apiClient.get('/tax-authority').then((r) => unwrap<TaxOverview>(r)),
  pos: () => apiClient.get('/tax-authority/pos').then((r) => unwrap<{ enabled: boolean; authority: Authority | null; env: string | null }>(r)),
  save: (b: unknown) => apiClient.put('/tax-authority', b).then((r) => unwrap<TaxOverview>(r)),
  test: () => apiClient.post('/tax-authority/test').then((r) => unwrap<{ ok: boolean; fiscalNumber: string | null; error: string | null; response: unknown }>(r)),
  submit: (saleId: string) => apiClient.post(`/tax-authority/sales/${saleId}/submit`, undefined, { timeout: 15_000 }).then((r) => unwrap<Fiscal & { skipped?: boolean }>(r)),
};

/* Bill chhapte waqt (sync) — sale number → fiscal number */
let enabled = false;
const fiscalBySale = new Map<string, Fiscal | 'pending'>();

export function useTaxAuthorityBoot() {
  useQuery({
    queryKey: ['tax-authority-pos'],
    queryFn: async () => { const r = await taxAuthorityApi.pos(); enabled = r.enabled; return r; },
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/**
 * Sale ban gayi → authority se number (zyada se zyada ~6 second). Na mile to
 * bill "baad me" likh kar chhapta hai; server ka cron khud bhej dega.
 * Kabhi throw nahi karta — sale kabhi na ruke.
 */
export async function fiscalizeSale(sale: { id: string; saleNumber: string }) {
  if (!enabled) return;
  fiscalBySale.set(sale.saleNumber, 'pending');
  try {
    const r = await Promise.race([
      taxAuthorityApi.submit(sale.id),
      new Promise<null>((res) => setTimeout(() => res(null), 6_000)),
    ]);
    if (r && !r.skipped && r.status === 'SUCCESS') fiscalBySale.set(sale.saleNumber, r);
    else if (r?.skipped) fiscalBySale.delete(sale.saleNumber);
  } catch { /* cron bhej dega */ }
  if (fiscalBySale.size > 200) fiscalBySale.delete(fiscalBySale.keys().next().value!);
}

/** Receipt ke liye: number mila / abhi baqi / tax band */
export function fiscalFor(saleNumber: string): Fiscal | 'pending' | null {
  return fiscalBySale.get(saleNumber) ?? null;
}
