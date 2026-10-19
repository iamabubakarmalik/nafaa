/**
 * Takes payment for a restaurant order with the shared checkout dialog:
 * cash, card, wallet, split, part payment or full udhaar. The server turns
 * the order into a bill (Sale), so the money reaches the day book, cash
 * drawer, khata and reports once. Shop rules (discount limit, credit limit)
 * ask for the owner's PIN through the shared PIN dialog.
 */

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PosCheckoutModal, type PosCheckoutResult } from '@modules/pos/components';
import { keepAdvance } from '@modules/pos/lib/posCheckout';
import { settingsApi } from '@modules/organization/settings/api/settings.api';
import { withManagerPin } from '@core/security/ManagerPin';
import { ordersApi, type CheckoutPart, type RestaurantOrder } from '../api/orders.api';
import { ORDER_KEYS, apiError } from '../lib/orderMeta';

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface PayCustomer { id: string; name: string; balance?: number }

/** Payment parts for the server: change stays out (the server takes it off cash). */
function partsOf(d: PosCheckoutResult, due: number): CheckoutPart[] {
  if (d.payments?.length) {
    return d.payments.filter((p) => p.method !== 'TRADE_IN' && p.amount > 0)
      .map((p) => ({ method: p.method, amount: r2(p.amount), reference: p.reference ?? undefined }));
  }
  const amount = d.isCredit || d.depositExtra ? Math.min(d.paidAmount, due) : d.paidAmount;
  return amount > 0 ? [{ method: d.paymentMethod, amount: r2(amount) }] : [];
}

export function useOrderPayment(onPaid?: (order: RestaurantOrder) => void, cancelNote?: string) {
  const qc = useQueryClient();
  const [target, setTarget] = useState<{ order: RestaurantOrder; customer?: PayCustomer | null; print: boolean } | null>(null);
  const { data: rules } = useQuery({ queryKey: ['settings', 'counter'], queryFn: () => settingsApi.counter(), staleTime: 5 * 60_000 });

  const pay = useMutation({
    mutationFn: async (d: PosCheckoutResult) => {
      const { order, customer } = target!;
      const due = r2(order.total - order.paidAmount);
      const customerId = order.customerId || customer?.id || undefined;
      const payments = partsOf(d, due);
      const res = await withManagerPin('Bill ke liye malik ka PIN', (managerPin) => ordersApi.checkout(order.id, {
        payments,
        ...(d.isCredit && { closeOnCredit: true }),
        ...(customerId && { customerId }),
        ...(managerPin && { managerPin }),
      }), d.isCredit ? 'credit' : 'discount');
      await keepAdvance(d, due, customerId, res.sale?.saleNumber ?? order.orderNumber);
      return res;
    },
    onSuccess: (order) => {
      ORDER_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      ['sales-history', 'sales-list', 'customers', 'customers-for-pos', 'dashboard-overview', 'cash-register'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`Bill ban gaya${order.sale?.saleNumber ? ` — ${order.sale.saleNumber}` : ''}`);
      if (target?.print && order.saleId) window.open(`/sales/${order.saleId}/receipt?auto=1`, '_blank');
      setTarget(null);
      onPaid?.(order);
    },
    onError: (e) => toast.error(apiError(e, 'Payment nahi hui')),
  });

  const open = (order: RestaurantOrder, customer?: PayCustomer | null, print = true) => {
    if (!order.items.some((it) => !it.isReturned)) { toast.error('Order me koi item nahi'); return; }
    setTarget({ order, customer, print });
  };

  const due = target ? r2(target.order.total - target.order.paidAmount) : 0;
  const hasCustomer = !!(target?.order.customerId || target?.customer?.id);
  const modal: ReactNode = target ? (
    <PosCheckoutModal
      total={due}
      itemCount={target.order.items.filter((it) => !it.isReturned).length}
      loading={pay.isPending}
      customerName={target.customer?.name ?? target.order.customerName ?? undefined}
      customerBalance={Number(target.customer?.balance ?? 0)}
      hasCustomer={hasCustomer}
      initMode="full"
      initMethod={(rules?.defaultPaymentMethod as PosCheckoutResult['paymentMethod'] | undefined) || 'CASH'}
      allowCredit={rules?.allowCredit ?? true}
      onConfirm={(d) => pay.mutate(d)}
      onClose={() => { if (pay.isPending) return; setTarget(null); if (cancelNote) toast.info(cancelNote); }}
    />
  ) : null;

  return { open, modal, paying: pay.isPending };
}
