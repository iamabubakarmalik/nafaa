/**
 * Bills and payments for "Mera plan": the subscription row, Nafaa invoices
 * and the payments sent, each loaded only when the viewer may see billing.
 * Plan state, usage and add-ons come from modules/billing/pricing.
 */

import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { billingApi } from '../api/billing.api';
import { subscriptionsApi } from '@modules/billing/subscriptions/api/subscriptions.api';

const KEYS = ['subscription-current', 'billing-invoices', 'billing-payments'];

export function useBilling() {
  const qc = useQueryClient();
  const can = {
    billing: usePermission(PERMISSIONS.BILLING_VIEW),
    manage: usePermission(PERMISSIONS.BILLING_MANAGE),
    plans: usePermission(PERMISSIONS.PLANS_VIEW),
  };

  const current = useQuery({ queryKey: ['subscription-current'], queryFn: subscriptionsApi.current, enabled: can.billing });
  const invoices = useQuery({ queryKey: ['billing-invoices'], queryFn: billingApi.invoices, enabled: can.billing });
  const payments = useQuery({ queryKey: ['billing-payments'], queryFn: billingApi.payments, enabled: can.billing });

  const invoiceList = useMemo(() => invoices.data ?? [], [invoices.data]);
  const paymentList = useMemo(() => payments.data ?? [], [payments.data]);

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

  return {
    can, sub: current.data ?? null, totals,
    invoices: invoiceList, payments: paymentList,
    loading: { sub: current.isLoading, invoices: invoices.isLoading, payments: payments.isLoading },
    fetching: current.isFetching || invoices.isFetching || payments.isFetching,
    refresh,
  };
}

export type BillingData = ReturnType<typeof useBilling>;
