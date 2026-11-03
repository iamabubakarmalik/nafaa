/**
 * One-tap order actions for list rows and bulk picks: accept, confirm the
 * call, next step, book a courier, label and cancel. The same endpoints as
 * the order screen, so stock, bill and courier rules stay in one place.
 */

import { useState } from 'react';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { orderNo, type OnlineOrder } from '@nafaa/core/online-store';
import { haptic } from '@/core/device/haptics';
import { t } from '@/core/i18n';
import { toast } from '@/design';
import { apiErrorMessage, couriersApi, ordersApi, statusOf, unmatchedFromError } from '../api/online';
import { KEYS, refreshOrders } from '../lib/online';
import { STATUS_LABEL } from '../lib/labels';
import { openCourierLabel } from '../lib/docs';

export type QuickAction =
  | { kind: 'accept' }
  | { kind: 'confirm' }
  | { kind: 'next' }
  | { kind: 'book'; courier: string }
  | { kind: 'label' }
  | { kind: 'cancel'; reason: string };

/** Connected couriers that can book right now. */
export function useConnectedCouriers() {
  const q = useQuery({ queryKey: KEYS.couriers, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  return { ...q, connected: (q.data ?? []).filter((a) => a.connected && a.active) };
}

export const orderHref = (id: string) => `/online/orders/${id}` as const;

export function useOrderActions() {
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const { connected } = useConnectedCouriers();

  const m = useMutation({
    mutationFn: async ({ o, a }: { o: OnlineOrder; a: QuickAction }): Promise<string> => {
      switch (a.kind) {
        case 'accept': {
          const r = await ordersApi.accept(o.id);
          return t('Bill ban gaya — {{saleNumber}}', { saleNumber: r.sale.saleNumber });
        }
        case 'confirm':
          await ordersApi.setConfirmation(o.id, 'CONFIRMED');
          return t('Customer ne order confirm kiya');
        case 'next': {
          const r = await ordersApi.bulk('next', [o.id]);
          if (!r.done) throw new Error(r.results[0]?.error ?? t('Agla qadam nahi hua'));
          return o.nextStatus ? t(STATUS_LABEL[o.nextStatus].label) : t('Ho gaya');
        }
        case 'book': {
          const r = await couriersApi.book(o.id, { courier: a.courier });
          return t('Book ho gaya · CN {{trackingNumber}}', { trackingNumber: r.trackingNumber });
        }
        case 'label':
          await openCourierLabel(o.id, orderNo(o));
          return '';
        case 'cancel':
          await ordersApi.cancel(o.id, a.reason);
          return o.nafaaSaleId ? t('Order cancel — bill void, stock wapas') : t('Order cancel ho gaya');
      }
    },
    onMutate: ({ o }) => setBusyId(o.id),
    onSettled: () => setBusyId(null),
    onSuccess: (msg, { o }) => {
      if (msg) { haptic('success'); toast.success(`#${orderNo(o)} · ${msg}`); }
      refreshOrders(qc, o.id);
    },
    onError: (err, { o, a }) => {
      // Items not linked to products: the order screen opens the linking step.
      if (a.kind === 'accept' && (unmatchedFromError(err) !== null || statusOf(err) === 409)) {
        toast.info(t('#{{orderNo}} · kuch items Nafaa product se jodne hain', { orderNo: orderNo(o) }));
        router.push(`/online/orders/${o.id}?match=1` as never);
        return;
      }
      haptic('error');
      toast.error(apiErrorMessage(err, t('Nahi hua')));
      refreshOrders(qc, o.id);
    },
  });

  return {
    couriers: connected,
    busyId,
    run: (o: OnlineOrder, a: QuickAction) => m.mutate({ o, a }),
    pending: m.isPending,
  };
}
