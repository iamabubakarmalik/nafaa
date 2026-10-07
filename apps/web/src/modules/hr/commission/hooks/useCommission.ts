import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { commissionApi } from '../api/commission.api';

/** "2026-10" — aaj ka mahina */
export const thisPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** "2026-10" → "October 2026" */
export const periodLabel = (p: string) => {
  const [y, m] = (p ?? '').split('-').map(Number);
  if (!y || !m) return p;
  return new Date(y, m - 1, 1).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' });
};

/** Pichhle 12 mahine — chunne ke liye */
export const recentPeriods = (n = 12) => {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < n; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
};

/**
 * Commission ka saara kaam ek hook me — har industry ke safhe se
 * pukara ja sakta hai.
 *
 * Hisab server par banta hai, yahan sirf dikhaya jata hai. Koi
 * cheez badalne par sab queries dobara chal jati hain, taake
 * number kabhi purana na rahe.
 */
export function useCommission(period: string = thisPeriod()) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const summaryQ = useQuery({
    queryKey: ['commission-summary', period],
    queryFn: () => commissionApi.summary(period),
  });
  const rulesQ = useQuery({
    queryKey: ['commission-rules'],
    queryFn: () => commissionApi.listRules(),
  });
  const peopleQ = useQuery({
    queryKey: ['commission-people'],
    queryFn: () => commissionApi.people(),
  });

  const refreshAll = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['commission-summary'] });
    qc.invalidateQueries({ queryKey: ['commission-rules'] });
    qc.invalidateQueries({ queryKey: ['commission-people'] });
  }, [qc]);

  /** Har call ek jaise chalti hai: busy lagao, karo, refresh karo, ghalti par batao */
  const run = useCallback(async <T,>(fn: () => Promise<T>, okMsg?: string) => {
    setBusy(true);
    try {
      const out = await fn();
      refreshAll();
      if (okMsg) toast.success(okMsg);
      return out;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Kaam nahi hua');
      return null;
    } finally {
      setBusy(false);
    }
  }, [refreshAll]);

  const s = summaryQ.data;

  return {
    period,
    rows: s?.rows ?? [],
    total: s?.total ?? 0,
    paidTotal: s?.paidTotal ?? 0,
    pendingTotal: s?.pendingTotal ?? 0,
    enabledCount: s?.enabledCount ?? 0,
    notEnrolled: s?.notEnrolled ?? [],
    partialReturnCount: s?.partialReturnCount ?? 0,
    orphanBills: s?.orphanBills ?? 0,
    orphanSale: s?.orphanSale ?? 0,
    reassignedBills: s?.reassignedBills ?? 0,
    baseTotal: s?.baseTotal ?? 0,
    payTotal: s?.payTotal ?? 0,
    timezone: s?.timezone,
    dayStartHour: s?.dayStartHour ?? 0,
    scope: s?.scope ?? 'all',
    onlyMine: s?.scope === 'own',

    rules: rulesQ.data ?? [],
    people: peopleQ.data?.people ?? [],
    withoutLogin: peopleQ.data?.withoutLogin ?? [],

    isLoading: summaryQ.isLoading || rulesQ.isLoading,
    isError: summaryQ.isError,
    busy,
    refetch: refreshAll,

    addRule: (data: any) => run(() => commissionApi.createRule(data), 'Rule ban gaya'),
    updateRule: (id: string, data: any) => run(() => commissionApi.updateRule(id, data), 'Rule badal gaya'),
    removeRule: (id: string) => run(() => commissionApi.removeRule(id), 'Rule hata diya'),
    setEnabled: (userId: string, on: boolean, staffId?: string | null) =>
      run(() => commissionApi.enroll({ userId, isActive: on, staffId: staffId ?? undefined }),
        on ? 'Commission chaalu ho gayi' : 'Commission band kar di'),
    markPaid: (userId: string, amount: number, note?: string) =>
      run(() => commissionApi.pay({ userId, period, amount, note }), 'Adaigi likh di'),
    undoPaid: (userId: string) =>
      run(() => commissionApi.undoPay(userId, period), 'Adaigi wapas le li'),
  };
}

/** Ek bande ka poora khata — detail safhe ke liye */
export function useCommissionDetail(userId: string | null, period: string) {
  return useQuery({
    queryKey: ['commission-detail', userId, period],
    queryFn: () => commissionApi.detail(userId!, period),
    enabled: !!userId,
  });
}
