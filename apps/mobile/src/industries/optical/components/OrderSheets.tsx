/**
 * Order desk actions shared by the orders list and the order page: send to
 * lab, take a payment, hand over (the bill is made on the server), cancel
 * with or without giving the advance back. `useOrderActions` holds the
 * requests and refreshes every screen the money touches. All need the server.
 */

import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, FlaskConical, Wallet, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { deliveryLeft } from '@nafaa/core/industries/optical';
import { formatMoney } from '@/core/format';
import { t } from '@/core/i18n';
import { useOnlineStatus } from '@/core/net';
import { onlineNeededText } from '@/core/offline';
import { PinCancelled, withManagerPin } from '@/core/security/ManagerPin';
import { kv } from '@/core/storage/kv';
import { Button, Card, ChipGroup, DatePicker, Input, MoneyInput, Row, Sheet, Switch, Text, TextArea, toast, useTheme } from '@/design';
import { lensOrdersApi, type LensOrderStatus, type OpticalLensOrder, type PayMethod } from '../api';
import { CANCEL_ORDER_REASONS, OPTICAL_KEYS, PAY_METHODS, isoAt, dayKey, refreshOptical } from '../meta';
import { Choices } from './parts';

export type OrderDialog = { kind: 'lab' | 'pay' | 'deliver' | 'cancel'; order: OpticalLensOrder } | null;

export function useOrderActions(onDone?: () => void) {
  const online = useOnlineStatus();
  const done = (msgText: string, money = false) => { toast.success(msgText); refreshOptical([OPTICAL_KEYS.orders], money); onDone?.(); };
  const guard = () => { if (!online) { toast.warning(onlineNeededText('opticalDesk')); throw new Error('offline'); } };
  const step = useMutation({
    mutationFn: ({ o, status }: { o: OpticalLensOrder; status: LensOrderStatus }) => { guard(); return lensOrdersApi.updateStatus(o.id, { status }); },
    onSuccess: (_r, v) => done(t('{{orderNumber}} — halat badal gayi', { orderNumber: v.o.orderNumber })),
  });
  const lab = useMutation({
    mutationFn: ({ o, body }: { o: OpticalLensOrder; body: { labName: string; labOrderRef?: string; expectedDate?: string } }) => { guard(); return lensOrdersApi.sendToLab(o.id, body); },
    onSuccess: (_r, v) => done(t('{{orderNumber}} lab ko bhej diya', { orderNumber: v.o.orderNumber })),
  });
  const pay = useMutation({
    mutationFn: ({ o, amount, paymentMethod }: { o: OpticalLensOrder; amount: number; paymentMethod: PayMethod }) => { guard(); return lensOrdersApi.recordPayment(o.id, { amount, paymentMethod }); },
    onSuccess: (_r, v) => done(t('{{amount}} mil gaye — {{orderNumber}}', { amount: formatMoney(v.amount), orderNumber: v.o.orderNumber }), true),
  });
  const deliver = useMutation({
    mutationFn: ({ o, body }: { o: OpticalLensOrder; body: { payment?: number; paymentMethod?: PayMethod; onKhata?: boolean; fittingNotes?: string } }) => { guard(); return lensOrdersApi.deliver(o.id, body); },
    onSuccess: (_r, v) => done(t('{{orderNumber}} de diya — bill ban gaya', { orderNumber: v.o.orderNumber }), true),
  });
  const cancel = useMutation({
    meta: { silentError: true },
    mutationFn: async ({ o, body }: { o: OpticalLensOrder; body: { notes: string; refundAdvance?: boolean; refundMethod?: PayMethod } }) => {
      guard();
      try { return await withManagerPin(t('Advance wapsi'), (pin) => lensOrdersApi.updateStatus(o.id, { status: 'CANCELLED', ...body, managerPin: pin }), 'refund'); }
      catch (e) { if (e instanceof PinCancelled) return null; throw e; }
    },
    onSuccess: (r, v) => { if (r) done(t('{{orderNumber}} cancel', { orderNumber: v.o.orderNumber }), true); },
    onError: (e) => toast.error(e instanceof Error && e.message === 'offline' ? onlineNeededText('opticalDesk') : t('Cancel nahi hua')),
  });
  return { step, lab, pay, deliver, cancel };
}

const MethodChips = ({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) => (
  <ChipGroup wrap value={value} onChange={onChange} options={PAY_METHODS.map((m) => ({ value: m.id, label: t(m.label) }))} />
);

const LABS_KEY = 'nafaa.optical.labs';

export function PaySheet({ open, title, name, due, pending, onConfirm, onClose }: {
  open: boolean; title: string; name?: string; due: number; pending: boolean; onConfirm: (v: { amount: number; paymentMethod: PayMethod }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const [amount, setAmount] = useState<number | null>(due);
  const [method, setMethod] = useState<PayMethod>('CASH');
  useEffect(() => { if (open) { setAmount(due > 0 ? due : null); setMethod('CASH'); } }, [open, due]);
  const n = amount ?? 0;
  const bad = n <= 0 || n > due + 0.01;
  return (
    <Sheet open={open} onClose={onClose} title={title} description={name ? `${name} · ${t('Baqi:')} ${formatMoney(due)}` : undefined}
      footer={<Button fullWidth size="lg" icon={Wallet} loading={pending} disabled={bad} onPress={() => onConfirm({ amount: n, paymentMethod: method })}>{n > 0 ? t('{{formatPKR}} lein', { formatPKR: formatMoney(n) }) : t('Paisa lein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <MoneyInput label={t('Kitna mila')} value={amount} onChangeValue={setAmount} size="xl" error={n > due + 0.01 ? t('Sirf {{due}} baqi hai', { due: formatMoney(due) }) : undefined} />
        <Text size="sm" weight="semibold" tone="secondary">{t('Payment kaise mili')}</Text>
        <MethodChips value={method} onChange={setMethod} />
      </View>
    </Sheet>
  );
}

export function LabSheet({ open, order, pending, onConfirm, onClose }: {
  open: boolean; order: OpticalLensOrder; pending: boolean; onConfirm: (b: { labName: string; labOrderRef?: string; expectedDate?: string }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const saved = kv.get<string[]>(LABS_KEY, []);
  const [labName, setLabName] = useState('');
  const [ref, setRef] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  useEffect(() => {
    if (!open) return;
    setLabName(order.labName ?? saved[0] ?? ''); setRef(order.labOrderRef ?? '');
    setDate(order.expectedDate ? new Date(order.expectedDate) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order.id]);
  const ok = labName.trim().length >= 2;
  const submit = () => {
    kv.set(LABS_KEY, [labName.trim(), ...saved.filter((l) => l !== labName.trim())].slice(0, 6));
    onConfirm({ labName: labName.trim(), labOrderRef: ref.trim() || undefined, expectedDate: date ? isoAt(dayKey(date.toISOString())) : undefined });
  };
  return (
    <Sheet open={open} onClose={onClose} title={t('Lab bhejein — {{orderNumber}}', { orderNumber: order.orderNumber })} description={t('Kis lab ko gaya aur kab tak wapas aayega')}
      footer={<Button fullWidth size="lg" icon={FlaskConical} loading={pending} disabled={!ok} onPress={submit}>{t('Lab bhej diya')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Input label={t('Lab ka naam')} value={labName} onChangeText={setLabName} placeholder={t('Jaise: Essilor, Hoya, local lab')} error={labName && !ok ? t('Lab ka naam likhein') : undefined} maxLength={120} />
        {saved.length > 0 && <Choices options={saved} value={labName} onChange={setLabName} />}
        <Input label={t('Lab ka order number')} value={ref} onChangeText={setRef} placeholder={t('Lab ki parchi ka number')} hint={t('Marzi hai — lab se poochte waqt kaam aata hai')} maxLength={60} />
        <DatePicker label={t('Wapas kab aayega')} value={date} onChange={setDate} minimumDate={new Date()} hint={t("Is date ke baad order 'Late' me dikhega")} />
      </View>
    </Sheet>
  );
}

export function DeliverSheet({ open, order, pending, onConfirm, onClose }: {
  open: boolean; order: OpticalLensOrder; pending: boolean; onConfirm: (b: { payment?: number; paymentMethod?: PayMethod; onKhata?: boolean; fittingNotes?: string }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const due = order.remainingAmount;
  const [amount, setAmount] = useState<number | null>(due > 0 ? due : null);
  const [method, setMethod] = useState<PayMethod>('CASH');
  const [khata, setKhata] = useState(false);
  const [notes, setNotes] = useState('');
  useEffect(() => { if (open) { setAmount(due > 0 ? due : null); setMethod('CASH'); setKhata(false); setNotes(''); } }, [open, due]);
  const n = amount ?? 0;
  const left = deliveryLeft(due, n);
  const error = n > due + 0.01 ? t('Sirf {{due}} baqi hai', { due: formatMoney(due) }) : left > 0 && !khata ? t('{{left}} baqi reh jayega — poore lein ya khata chunein', { left: formatMoney(left) }) : undefined;
  const Box = ({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' }) => (
    <Card style={{ flex: 1, padding: th.space(2.5) }}><Text size="xs" tone={tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'muted'}>{label}</Text><Text size="md" weight="bold" ltr>{formatMoney(value)}</Text></Card>
  );
  return (
    <Sheet open={open} onClose={onClose} title={t('Customer ko dein — {{orderNumber}}', { orderNumber: order.orderNumber })} description={t('Yahin bill banta hai: frame stock se nikalta hai aur sale reports me aati hai')}
      footer={<Button fullWidth size="lg" icon={CheckCircle2} loading={pending} disabled={!!error}
        onPress={() => onConfirm({ payment: n > 0 ? n : undefined, paymentMethod: n > 0 ? method : undefined, onKhata: left > 0 ? true : undefined, fittingNotes: notes.trim() || undefined })}>{t('De diya, bill banayein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Row gap={2}><Box label={t('Kul')} value={order.totalPrice} /><Box label={t('Mil chuka')} value={order.paidAmount} tone="success" /><Box label={t('Baqi')} value={due} tone="warning" /></Row>
        {due > 0 && (
          <>
            <MoneyInput label={t('Abhi kitna mila')} value={amount} onChangeValue={setAmount} size="xl" error={n > due + 0.01 ? t('Sirf {{due}} baqi hai', { due: formatMoney(due) }) : undefined} />
            {n > 0 && <MethodChips value={method} onChange={setMethod} />}
            {left > 0 && <Switch value={khata} onChange={setKhata} label={t('{{left}} customer ke khata me likhein (udhaar)', { left: formatMoney(left) })} />}
            {error && left > 0 && !khata && <Text size="xs" weight="medium" tone="danger">{error}</Text>}
          </>
        )}
        <TextArea label={t('Fitting note')} value={notes} onChangeText={setNotes} placeholder={t('Jaise: nose pad badla, dandi seedhi ki')} hint={t('Marzi hai')} />
      </View>
    </Sheet>
  );
}

export function CancelOrderSheet({ open, order, pending, onConfirm, onClose }: {
  open: boolean; order: OpticalLensOrder; pending: boolean; onConfirm: (b: { notes: string; refundAdvance?: boolean; refundMethod?: PayMethod }) => void; onClose: () => void;
}) {
  const th = useTheme();
  const paid = order.paidAmount > 0;
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(true);
  const [method, setMethod] = useState<PayMethod>('CASH');
  useEffect(() => { if (open) { setReason(''); setRefund(true); setMethod('CASH'); } }, [open]);
  const ok = reason.trim().length >= 3;
  return (
    <Sheet open={open} onClose={onClose} title={t('Order cancel — {{orderNumber}}', { orderNumber: order.orderNumber })}
      footer={<Button fullWidth size="lg" variant="danger" icon={XCircle} loading={pending} disabled={!ok}
        onPress={() => onConfirm({ notes: reason.trim(), ...(paid ? { refundAdvance: refund, refundMethod: refund ? method : undefined } : {}) })}>{t('Cancel karein')}</Button>}>
      <View style={{ gap: th.space(3) }}>
        <Choices options={CANCEL_ORDER_REASONS} value={reason} onChange={setReason} />
        <TextArea label={t('Wajah')} value={reason} onChangeText={setReason} error={reason && !ok ? t('Thori si wajah likhein') : undefined} />
        {paid && (
          <Card tone="warning" style={{ gap: th.space(2) }}>
            <Switch value={refund} onChange={setRefund} label={t('Advance {{amount}} wapas dein?', { amount: formatMoney(order.paidAmount) })}
              description={t('Na dein to customer ke khata me jama rahega — agli khareed me kat jayega')} />
            {refund && <MethodChips value={method} onChange={setMethod} />}
          </Card>
        )}
      </View>
    </Sheet>
  );
}

/** Renders whichever order sheet is open. */
export function OrderDialogs({ dialog, close, actions }: { dialog: OrderDialog; close: () => void; actions: ReturnType<typeof useOrderActions> }) {
  const [last, setLast] = useState<NonNullable<OrderDialog> | null>(null);
  useEffect(() => { if (dialog) setLast(dialog); }, [dialog]);
  if (!last) return null;
  const o = last.order;
  const open = !!dialog;
  return (
    <>
      <LabSheet open={open && last.kind === 'lab'} order={o} pending={actions.lab.isPending} onClose={close} onConfirm={(body) => actions.lab.mutate({ o, body })} />
      <PaySheet open={open && last.kind === 'pay'} title={t('Payment — {{orderNumber}}', { orderNumber: o.orderNumber })} name={o.customerName} due={o.remainingAmount} pending={actions.pay.isPending} onClose={close}
        onConfirm={({ amount, paymentMethod }) => actions.pay.mutate({ o, amount, paymentMethod })} />
      <DeliverSheet open={open && last.kind === 'deliver'} order={o} pending={actions.deliver.isPending} onClose={close} onConfirm={(body) => actions.deliver.mutate({ o, body })} />
      <CancelOrderSheet open={open && last.kind === 'cancel'} order={o} pending={actions.cancel.isPending} onClose={close} onConfirm={(body) => actions.cancel.mutate({ o, body })} />
    </>
  );
}

