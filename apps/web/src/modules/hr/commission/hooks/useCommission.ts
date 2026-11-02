/**
 * Commission data and actions for one month: the summary, rules and people
 * (managers only), and the writes. Every write refreshes all commission
 * queries so no figure is left stale.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { businessDayKey, useBusinessDayStart } from '@core/lib/business-day';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { commissionApi, type RulePayload } from '../api/commission.api';
import { COMMISSION_KEY, apiError } from '../components/meta';
import { t } from '@core/i18n';

/** The current business month, "2026-10". */
export function useThisPeriod() {
  const startHour = useBusinessDayStart();
  return businessDayKey(new Date(), startHour).slice(0, 7);
}

export function useCommission(period: string) {
  const qc = useQueryClient();
  const canManage = usePermission(PERMISSIONS.COMMISSION_MANAGE);

  const summaryQ = useQuery({
    queryKey: [COMMISSION_KEY, 'summary', period],
    queryFn: () => commissionApi.summary(period),
    placeholderData: (p) => p,
  });
  const rulesQ = useQuery({ queryKey: [COMMISSION_KEY, 'rules'], queryFn: commissionApi.listRules, enabled: canManage, staleTime: 60_000 });
  const peopleQ = useQuery({ queryKey: [COMMISSION_KEY, 'people'], queryFn: commissionApi.people, enabled: canManage, staleTime: 60_000 });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: [COMMISSION_KEY] });
    qc.invalidateQueries({ queryKey: ['commission-sellers'] });
  }, [qc]);

  const done = (msg: string) => { toast.success(msg); refresh(); };
  const failed = (fallback: string) => (e: unknown) => toast.error(apiError(e, fallback));

  const saveRule = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: RulePayload }) => (id ? commissionApi.updateRule(id, data) : commissionApi.createRule(data)),
    onSuccess: (_d, { id }) => done(id ? t('Rule badal gaya') : t('Rule ban gaya')),
    onError: failed(t('Rule save nahi hua')),
  });
  const removeRule = useMutation({
    mutationFn: (id: string) => commissionApi.removeRule(id),
    onSuccess: () => done(t('Rule hata diya')),
    onError: failed(t('Rule nahi hata')),
  });
  const enroll = useMutation({
    mutationFn: (a: { userId: string; on: boolean; staffId?: string | null }) =>
      commissionApi.enroll({ userId: a.userId, isActive: a.on, staffId: a.staffId ?? undefined }),
    onSuccess: (_d, a) => done(a.on ? t('Commission chaalu ho gayi') : t('Commission band kar di')),
    onError: failed(t('Nahi hua')),
  });
  const pay = useMutation({
    mutationFn: (a: { userId: string; amount: number; expectedPaid: number; note?: string }) => commissionApi.pay({ ...a, period }),
    onSuccess: () => done(t('Payment likh di')),
    onError: failed(t('Payment nahi likhi gayi')),
  });
  const undoPay = useMutation({
    mutationFn: (userId: string) => commissionApi.undoPay(userId, period),
    onSuccess: () => done(t('Payment wapas le li')),
    onError: failed(t('Nahi hua')),
  });

  return {
    summaryQ,
    summary: summaryQ.data,
    rules: rulesQ.data ?? [],
    people: peopleQ.data?.people ?? [],
    withoutLogin: peopleQ.data?.withoutLogin ?? [],
    peopleLoading: peopleQ.isLoading,
    rulesLoading: rulesQ.isLoading,
    canManage,
    refresh,
    saveRule, removeRule, enroll, pay, undoPay,
    busy: saveRule.isPending || removeRule.isPending || enroll.isPending || pay.isPending || undoPay.isPending,
  };
}

export function useCommissionDetail(userId: string | null, period: string) {
  return useQuery({
    queryKey: [COMMISSION_KEY, 'detail', userId, period],
    queryFn: () => commissionApi.detail(userId!, period),
    enabled: !!userId,
  });
}
