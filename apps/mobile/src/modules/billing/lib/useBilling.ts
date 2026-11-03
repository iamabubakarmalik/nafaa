/**
 * Data for the billing screens: subscription, open upgrade, invoices,
 * payments, usage and plans, each loaded only when the viewer may see it,
 * plus the owner actions (start, stop, resume, tidy up open invoices).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { apiErrorMessage } from '@/core/api/errors';
import { t } from '@/core/i18n';
import { PERMISSIONS as P, usePermission } from '@/core/permissions';
import { toast } from '@/design';
import { billingApi, planUsageApi, plansApi, subscriptionsApi, type BillingInterval } from '../api/billing';
import { daysUntil } from './meta';

export const BILLING_KEYS = ['subscription-current', 'subscription-pending', 'billing-invoices', 'billing-payments', 'plan-usage', 'plans'] as const;

export function useBilling() {
  const qc = useQueryClient();
  const has = usePermission();
  const can = { billing: has(P.BILLING_VIEW), manage: has(P.BILLING_MANAGE), plans: has(P.PLANS_VIEW), usage: has(P.PLAN_USAGE_VIEW) };

  const current = useQuery({ queryKey: ['subscription-current'], queryFn: subscriptionsApi.current, enabled: can.billing });
  const pendingRaw = useQuery({ queryKey: ['subscription-pending'], queryFn: subscriptionsApi.pendingUpgrade, enabled: can.billing });
  const invoices = useQuery({ queryKey: ['billing-invoices'], queryFn: billingApi.invoices, enabled: can.billing });
  const payments = useQuery({ queryKey: ['billing-payments'], queryFn: billingApi.payments, enabled: can.billing });
  const usage = useQuery({ queryKey: ['plan-usage'], queryFn: planUsageApi.me, enabled: can.usage, retry: false });
  const plans = useQuery({ queryKey: ['plans'], queryFn: plansApi.list, enabled: can.plans, staleTime: 10 * 60_000 });

  const sub = current.data ?? null;
  const p = pendingRaw.data;
  const pending = p?.subscription?.plan && p?.invoice ? p : null;
  const invoiceList = useMemo(() => invoices.data ?? [], [invoices.data]);
  const paymentList = useMemo(() => payments.data ?? [], [payments.data]);

  const endsAt = sub ? (sub.status === 'TRIAL' && sub.trialEndsAt ? sub.trialEndsAt : sub.currentPeriodEnd) : null;
  const daysLeft = endsAt ? daysUntil(endsAt) : null;
  const needsRenewal = !!sub && (sub.status === 'PAST_DUE' || sub.status === 'EXPIRED' || (sub.status === 'ACTIVE' && (daysLeft ?? 99) <= 15));

  const totals = useMemo(() => {
    const open = invoiceList.filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE');
    const paid = invoiceList.filter((i) => i.status === 'PAID');
    return {
      open,
      due: open.reduce((s, i) => s + (i.amountDue || 0), 0),
      overdue: invoiceList.filter((i) => i.status === 'OVERDUE').length,
      paidTotal: paid.reduce((s, i) => s + (i.total || 0), 0),
      paidCount: paid.length,
      reviewing: paymentList.filter((x) => x.status === 'PENDING').length,
    };
  }, [invoiceList, paymentList]);

  const refresh = () => Promise.all(BILLING_KEYS.map((k) => qc.invalidateQueries({ queryKey: [k] })));

  const start = useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: BillingInterval }) => subscriptionsApi.start(planId, interval),
    onSuccess: () => { void refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Plan shuru nahi hua'))),
  });
  const cancel = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => { toast.success(t('Plan period ke aakhir par band ho jayega'), { message: t('Tab tak sab kuch chalta rahega. Kabhi bhi wapas chalu kar sakte hain.') }); void refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Band nahi hua'))),
  });
  const reactivate = useMutation({
    mutationFn: subscriptionsApi.reactivate,
    onSuccess: () => { toast.success(t('Plan wapas chalu — khud renew hota rahega')); void refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Chalu nahi hua'))),
  });
  const cleanup = useMutation({
    mutationFn: subscriptionsApi.cleanupPending,
    onSuccess: (d) => { toast.success(d?.message || t('Faltu bill band ho gaye')); void refresh(); },
    onError: (e) => toast.error(apiErrorMessage(e, t('Saaf nahi hua'))),
  });

  return {
    can, sub, pending, endsAt, daysLeft, needsRenewal, totals,
    invoices: invoiceList, payments: paymentList, usage: usage.data ?? null, plans: plans.data ?? [],
    loading: { sub: current.isLoading, invoices: invoices.isLoading, payments: payments.isLoading, usage: usage.isLoading, plans: plans.isLoading },
    usageError: usage.isError,
    error: current.error ?? invoices.error,
    fetching: current.isFetching || invoices.isFetching || payments.isFetching,
    queries: { current, invoices, payments },
    refresh, start, cancel, reactivate, cleanup,
  };
}

export type BillingData = ReturnType<typeof useBilling>;
