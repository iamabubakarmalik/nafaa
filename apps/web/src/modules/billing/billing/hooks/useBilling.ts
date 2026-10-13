/**
 * Data for the billing centre: subscription, open upgrade, invoices,
 * payments, usage and plans, each loaded only when the viewer may see it,
 * plus the owner actions (start, cancel, resume, tidy up open invoices).
 */

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { billingApi } from '../api/billing.api';
import { plansApi } from '@modules/billing/plans/api/plans.api';
import { planUsageApi } from '@modules/billing/plan-usage/api/plan-usage.api';
import { subscriptionsApi, type BillingInterval } from '@modules/billing/subscriptions/api/subscriptions.api';
import { daysUntil } from '../components/helpers';

const KEYS = ['subscription-current', 'subscription-pending', 'billing-invoices', 'billing-payments', 'plan-usage', 'plans'];
const errorText = (e: unknown, fallback: string) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export function useBilling() {
  const qc = useQueryClient();
  const can = {
    billing: usePermission(PERMISSIONS.BILLING_VIEW),
    manage: usePermission(PERMISSIONS.BILLING_MANAGE),
    plans: usePermission(PERMISSIONS.PLANS_VIEW),
    usage: usePermission(PERMISSIONS.PLAN_USAGE_VIEW),
  };

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

  const refresh = () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const start = useMutation({
    mutationFn: ({ planId, interval }: { planId: string; interval: BillingInterval }) => subscriptionsApi.start(planId, interval),
    onSuccess: () => refresh(),
    onError: (e) => toast.error(errorText(e, 'Plan shuru nahi hua')),
  });
  const cancel = useMutation({
    mutationFn: subscriptionsApi.cancel,
    onSuccess: () => { toast.success('Plan period ke aakhir par band ho jayega', { description: 'Tab tak sab kuch chalta rahega. Kabhi bhi wapas chalu kar sakte hain.' }); refresh(); },
    onError: (e) => toast.error(errorText(e, 'Band nahi hua')),
  });
  const reactivate = useMutation({
    mutationFn: subscriptionsApi.reactivate,
    onSuccess: () => { toast.success('Plan wapas chalu — khud renew hota rahega'); refresh(); },
    onError: (e) => toast.error(errorText(e, 'Chalu nahi hua')),
  });
  const cleanup = useMutation({
    mutationFn: subscriptionsApi.cleanupPending,
    onSuccess: (d) => { toast.success(d?.message || 'Faltu bill band ho gaye'); refresh(); },
    onError: (e) => toast.error(errorText(e, 'Saaf nahi hua')),
  });

  return {
    can, sub, pending, endsAt, daysLeft, needsRenewal, totals,
    invoices: invoiceList, payments: paymentList, usage: usage.data ?? null, plans: plans.data ?? [],
    loading: { sub: current.isLoading, invoices: invoices.isLoading, payments: payments.isLoading, usage: usage.isLoading, plans: plans.isLoading },
    usageError: usage.isError,
    fetching: current.isFetching || invoices.isFetching || payments.isFetching,
    refresh, start, cancel, reactivate, cleanup,
  };
}

export type BillingData = ReturnType<typeof useBilling>;
