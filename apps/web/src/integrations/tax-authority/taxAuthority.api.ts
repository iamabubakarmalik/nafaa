import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@core/api/client';
import { useActiveShopId } from '@core/stores/auth.store';

const unwrap = <T,>(r: any): T => (r?.data?.data !== undefined ? r.data.data : r?.data !== undefined ? r.data : r) as T;

export type Authority = 'PRA' | 'SRB' | 'KPRA' | 'FBR';
export interface Fiscal { authority: Authority; status: string; fiscalNumber: string | null; qrText: string | null; error: string | null; usin: string; taxAmount: number; taxRate: number; label: string }

export const taxAuthorityApi = {
  pos: () => apiClient.get('/tax-authority/pos').then((r) => unwrap<{ enabled: boolean; authority: Authority | null; env: string | null }>(r)),
  submit: (saleId: string) => apiClient.post(`/tax-authority/sales/${saleId}/submit`, undefined, { timeout: 15_000 }).then((r) => unwrap<Fiscal & { skipped?: boolean }>(r)),
};

/* Bill chhapte waqt (sync) — sale number → fiscal number */
let enabled = false;
const fiscalBySale = new Map<string, Fiscal | 'pending'>();

/** Tax sending is set per branch, so the answer is kept per active branch. */
export function useTaxAuthorityBoot() {
  const shopId = useActiveShopId();
  useQuery({
    queryKey: ['tax-authority-pos', shopId],
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
