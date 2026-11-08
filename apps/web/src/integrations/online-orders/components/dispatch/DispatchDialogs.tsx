/**
 * Small dispatch dialogs used by the board row menu and the bulk bar:
 * re-dispatch with a new CN, a courier claim, and cancel booking.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button, Input, Modal, Select, Switch } from '@/design-system/components';
import { apiErrorMessage, couriersApi, type OnlineOrder } from '../../api/online-orders.api';
import { dispatchApi } from '../../api/dispatch.api';
import { COURIER_OPTIONS } from '../../lib/labels';
import { orderNo } from '../../lib/orders';
import { COURIERS_KEY } from '../couriers/CourierForms';
import { t } from '@core/i18n';

/** Orders that can be sent again with a new CN: still out with the courier, or packed with an issue. */
export const canRedispatch = (o: OnlineOrder) => !o.deletedAt && (o.orderStatus === 'OUT_FOR_DELIVERY' || (o.orderStatus === 'READY' && o.stage === 'ISSUE'));

export function RedispatchDialog({ order, onClose, onDone }: { order: OnlineOrder; onClose: () => void; onDone: () => void }) {
  const { data: accounts } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  const api = (accounts ?? []).filter((a) => a.connected && a.active).map((a) => a.code);
  const [courier, setCourier] = useState(order.courierCode ?? '');
  const [cn, setCn] = useState('');
  const [note, setNote] = useState('');
  const canBook = api.includes(courier);
  const [book, setBook] = useState(true);
  const viaApi = canBook && book;
  const run = useMutation({
    mutationFn: () => dispatchApi.redispatch(order.id, { courier, trackingNumber: viaApi ? undefined : cn.trim(), book: viaApi, note: note.trim() || undefined }),
    onSuccess: (o) => { toast.success(t('#{{no}} dobara bhej diya · CN {{cn}}', { no: orderNo(order), cn: o.trackingNumber ?? '' })); onDone(); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Re-dispatch #{{no}}', { no: orderNo(order) })}
      description={t('Parcel naye CN ke saath dobara bhejein. Purana CN order ki history me rahega.')}
      footer={<div className="flex w-full justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button loading={run.isPending} disabled={!courier || (!viaApi && !cn.trim())} onClick={() => run.mutate()}>{t('Dobara bhejein')}</Button>
      </div>}>
      <div className="space-y-3">
        {order.trackingNumber && <p className="text-[0.8125rem] text-slate-600">{t('Purana CN: {{cn}}', { cn: order.trackingNumber })}</p>}
        <Select label={t('Courier')} value={courier} onChange={(e) => setCourier(e.target.value)} placeholder={t('Chunein')}
          options={COURIER_OPTIONS.filter((c) => c.code !== 'RIDER' && c.code !== 'OTHER').map((c) => ({ value: c.code, label: c.name }))} />
        {canBook && <Switch checked={book} onChange={(e) => setBook(e.target.checked)} label={t('Courier API se naya CN banayein')} />}
        {!viaApi && <Input label={t('Naya CN')} value={cn} onChange={(e) => setCn(e.target.value)} placeholder="e.g. 1234567890" />}
        <Input label={t('Note (zaroori nahi)')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Jaise: Customer ne naya address diya')} />
      </div>
    </Modal>
  );
}

export function ClaimDialog({ order, onClose, onDone }: { order: OnlineOrder; onClose: () => void; onDone: () => void }) {
  const current = (order.metadata as any)?.claim as { status: string; amount?: number | null; note?: string | null } | null | undefined;
  const [status, setStatus] = useState<'OPEN' | 'WON' | 'LOST' | 'NONE'>((current?.status as any) ?? 'OPEN');
  const [amount, setAmount] = useState(current?.amount ? String(current.amount) : String(Math.round(order.total)));
  const [note, setNote] = useState(current?.note ?? '');
  const run = useMutation({
    mutationFn: () => dispatchApi.claim(order.id, { status, amount: Number(amount) || undefined, note: note.trim() || undefined }),
    onSuccess: () => { toast.success(t('Claim save ho gaya')); onDone(); onClose(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('Courier claim · #{{no}}', { no: orderNo(order) })}
      description={t('Parcel gum ya kharab ho gaya? Courier se claim ka hisaab yahan rakhein. Khula claim board par CLAIM me dikhta hai.')}
      footer={<div className="flex w-full justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button loading={run.isPending} onClick={() => run.mutate()}>{t('Save')}</Button>
      </div>}>
      <div className="space-y-3">
        <Select label={t('Claim ki halat')} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
          options={[
            { value: 'OPEN', label: t('Khula (courier se baat jari)') }, { value: 'WON', label: t('Mil gaya') },
            { value: 'LOST', label: t('Nahi mila') }, { value: 'NONE', label: t('Claim hatayein') },
          ]} />
        {status !== 'NONE' && <Input label={t('Claim amount')} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />}
        {status !== 'NONE' && <Input label={t('Note')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Jaise: Ticket # 4521, parcel gum')} />}
      </div>
    </Modal>
  );
}

/** Cancel booking for one or many orders: through the courier's API where it can, else only the CN in Nafaa. */
export function CancelBookingDialog({ orders, onClose, onDone }: { orders: OnlineOrder[]; onClose: () => void; onDone: (failed: string[]) => void }) {
  const [local, setLocal] = useState(false);
  const [note, setNote] = useState('');
  const run = useMutation({
    mutationFn: () => dispatchApi.cancel(orders.map((o) => o.id), local, note.trim() || undefined),
    onSuccess: (r) => {
      if (r.done) toast.success(t('{{count}} orders ka CN hat gaya', { count: r.done }));
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length) {
        const byId = new Map(orders.map((o) => [o.id, o]));
        toast.error(t('{{count}} orders nahi hue', { count: failed.length }), {
          description: failed.slice(0, 3).map((f) => `#${byId.has(f.id) ? orderNo(byId.get(f.id)!) : ''}: ${f.error ?? ''}`).join('\n'), duration: 10_000,
        });
      }
      onDone(failed.map((f) => f.id)); onClose();
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={t('{{count}} orders ki booking cancel', { count: orders.length })}
      description={t('Jo courier API se cancel hota hai wahan cancel hoga. Baqi (haath se likha CN) sirf Nafaa se hatega.')}
      footer={<div className="flex w-full justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>{t('Rehne dein')}</Button>
        <Button variant="danger" loading={run.isPending} onClick={() => run.mutate()}>{t('Booking cancel')}</Button>
      </div>}>
      <div className="space-y-3">
        <Switch checked={local} onChange={(e) => setLocal(e.target.checked)} label={t('Sirf Nafaa me CN hatayein (courier ko kuch nahi bhejna)')} />
        <Input label={t('Note (zaroori nahi)')} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('Jaise: Customer ne order badla')} />
      </div>
    </Modal>
  );
}
