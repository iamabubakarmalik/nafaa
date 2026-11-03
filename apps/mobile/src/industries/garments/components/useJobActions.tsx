/**
 * Work steps of stitching and alteration jobs shared by the lists and the
 * detail screen: next and previous step, money received, the hand-over bill
 * and cancel, with their sheets. All need the server.
 */

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { alterationNext, ALTERATION_PREV, TAILORING_PREV, tailoringNext, type AlterationStatus, type TailoringStatus } from '@nafaa/core/industries/garments';
import { haptic } from '@/core/device/haptics';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { toast } from '@/design';
import { errorText, PaySheet, useDeskOnline } from '../../_shared/deskKit';
import { alterationsApi, tailoringApi, type AlterationTicket, type TailoringOrder } from '../api';
import { ALTERATION_KEY, TAILORING_KEY, alterationStatus, dueOf, refreshGarments, tailoringStatus } from '../meta';
import { CancelSheet, TakeMoneySheet } from './kit';

type Pending<T> = { kind: 'pay' | 'deliver' | 'cancel'; o: T } | null;

export function useTailoringActions() {
  const { guard } = useDeskOnline('garmentsDesk');
  const [sheet, setSheet] = useState<Pending<TailoringOrder>>(null);
  const refresh = () => refreshGarments([TAILORING_KEY], true);
  const status = useMutation({
    mutationFn: ({ o, to }: { o: TailoringOrder; to: TailoringStatus }) => tailoringApi.updateStatus(o.id, to),
    onSuccess: (o) => { haptic('success'); toast.success(`${o.orderNumber}: ${t(tailoringStatus(o.orderStatus).label)}`); refresh(); },
    onError: (e) => toast.error(errorText(e, t('Halat nahi badli'))),
  });
  const next = (o: TailoringOrder) => guard(() => {
    const n = tailoringNext(o.orderStatus);
    if (!n) return;
    if (n.to === 'DELIVER') setSheet({ kind: 'deliver', o }); else status.mutate({ o, to: n.to });
  });
  const back = (o: TailoringOrder) => guard(() => { const prev = TAILORING_PREV[o.orderStatus]; if (prev) status.mutate({ o, to: prev }); });
  const open = (kind: 'pay' | 'deliver' | 'cancel') => (o: TailoringOrder) => guard(() => setSheet({ kind, o }));
  const close = () => setSheet(null);
  const o = sheet?.o;

  const modals = (
    <>
      <TakeMoneySheet open={sheet?.kind === 'pay'} title={t('Advance / payment')} name={`${o?.customerName ?? ''} · ${o?.orderNumber ?? ''}`} amount={o ? dueOf(o) : 0} max={o ? dueOf(o) : 0}
        cta={t('Payment darj karein')} onClose={close}
        onConfirm={async (p) => { if (!o) return; const r = await tailoringApi.addPayment(o.id, { amount: p.paidAmount, paymentMethod: p.paymentMethod }); toast.success(t('{{orderNumber}}: payment darj — baqi {{formatPKR}}', { orderNumber: r.orderNumber, formatPKR: formatMoney(dueOf(r)) })); refresh(); }} />
      <PaySheet open={sheet?.kind === 'deliver'} title={t('Suit de diya — bill')} name={`${o?.customerName ?? ''} · ${o?.orderNumber ?? ''}`} due={o ? dueOf(o) : 0}
        cta={t('Bill banayein')} onClose={close}
        onConfirm={async (p) => {
          if (!o) return;
          const r = await tailoringApi.updateStatus(o.id, 'DELIVERED', { paidNow: p.paidAmount, paymentMethod: p.paymentMethod });
          toast.success(t('{{orderNumber}} de diya — bill {{value}}', { orderNumber: r.orderNumber, value: r.bill?.saleNumber ?? '' })); refresh();
        }} />
      <CancelSheet open={sheet?.kind === 'cancel'} title={`${o?.customerName ?? ''} · ${o?.orderNumber ?? ''}`} paid={Number(o?.paidAmount || 0)} onClose={close}
        onConfirm={async (reason) => { if (o) { await tailoringApi.updateStatus(o.id, 'CANCELLED', { cancellationReason: reason || undefined }); refresh(); } }} />
    </>
  );
  return { next, back, pay: open('pay'), cancel: open('cancel'), busyId: status.isPending ? status.variables?.o.id : undefined, modals };
}

export function useAlterationActions() {
  const { guard } = useDeskOnline('garmentsDesk');
  const [sheet, setSheet] = useState<Pending<AlterationTicket>>(null);
  const refresh = () => refreshGarments([ALTERATION_KEY], true);
  const status = useMutation({
    mutationFn: ({ o, to }: { o: AlterationTicket; to: AlterationStatus }) => alterationsApi.updateStatus(o.id, to),
    onSuccess: (o) => { haptic('success'); toast.success(`${o.ticketNumber}: ${t(alterationStatus(o.status).label)}`); refresh(); },
    onError: (e) => toast.error(errorText(e, t('Halat nahi badli'))),
  });
  const next = (o: AlterationTicket) => guard(() => {
    const n = alterationNext(o.status);
    if (!n) return;
    if (n.to === 'DELIVER') setSheet({ kind: 'deliver', o }); else status.mutate({ o, to: n.to });
  });
  const back = (o: AlterationTicket) => guard(() => { const prev = ALTERATION_PREV[o.status]; if (prev) status.mutate({ o, to: prev }); });
  const open = (kind: 'pay' | 'deliver' | 'cancel') => (o: AlterationTicket) => guard(() => setSheet({ kind, o }));
  const close = () => setSheet(null);
  const o = sheet?.o;
  const due = o ? dueOf({ total: o.charges, paidAmount: o.paidAmount }) : 0;
  const name = `${o?.customerName ?? ''} · ${o?.ticketNumber ?? ''}`;

  const modals = (
    <>
      <TakeMoneySheet open={sheet?.kind === 'pay'} title={t('Payment')} name={name} amount={due} max={due} cta={t('Payment darj karein')} onClose={close}
        onConfirm={async (p) => { if (!o) return; await alterationsApi.payment(o.id, p.paidAmount, p.paymentMethod); refresh(); }} />
      <PaySheet open={sheet?.kind === 'deliver'} title={t('De diya')} name={name} due={due} cta={t('Bill banayein')} onClose={close}
        onConfirm={async (p) => { if (!o) return; await alterationsApi.updateStatus(o.id, 'DELIVERED', { paidNow: p.paidAmount, paymentMethod: p.paymentMethod }); refresh(); }} />
      <CancelSheet open={sheet?.kind === 'cancel'} title={name} paid={Number(o?.paidAmount || 0)} onClose={close}
        onConfirm={async (reason) => { if (o) { await alterationsApi.updateStatus(o.id, 'CANCELLED', { reason: reason || undefined }); refresh(); } }} />
    </>
  );
  return { next, back, pay: open('pay'), cancel: open('cancel'), busyId: status.isPending ? status.variables?.o.id : undefined, modals };
}
