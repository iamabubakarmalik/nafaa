/**
 * Order desk dialogs shared by the orders list and the order page: send to
 * lab, take a payment, hand over (the bill is made here), cancel with or
 * without giving the advance back. `useOrderActions` holds the requests and
 * refreshes every screen the money touches.
 */

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, FlaskConical } from 'lucide-react';
import { Button, Input, Modal, Switch, Textarea } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { lensOrdersApi, type LensOrderStatus, type OpticalLensOrder } from '../api/lens-orders.api';
import { MONEY_KEYS, OPTICAL_KEYS, apiError, moneyInput, toDateInput, todayInput } from '../lib/meta';
import { Chips, PayModal, ReasonModal } from './ui';

export type OrderDialog = { kind: 'lab' | 'pay' | 'deliver' | 'cancel'; order: OpticalLensOrder } | null;

export function useOrderActions(onDone?: () => void) {
  const qc = useQueryClient();
  const refresh = (money: boolean) => {
    qc.invalidateQueries({ queryKey: [OPTICAL_KEYS.orders] });
    qc.invalidateQueries({ queryKey: ['optical-dashboard-overview'] });
    if (money) MONEY_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };
  const done = (msg: string, money = false) => { toast.success(msg); refresh(money); onDone?.(); };

  const step = useMutation({
    mutationFn: ({ o, status }: { o: OpticalLensOrder; status: LensOrderStatus }) => lensOrdersApi.updateStatus(o.id, { status }),
    onSuccess: (_r, v) => done(`${v.o.orderNumber} — halat badal gayi`),
    onError: (e) => toast.error(apiError(e, 'Halat nahi badli')),
  });
  const lab = useMutation({
    mutationFn: ({ o, body }: { o: OpticalLensOrder; body: { labName: string; labOrderRef?: string; expectedDate?: string } }) => lensOrdersApi.sendToLab(o.id, body),
    onSuccess: (_r, v) => done(`${v.o.orderNumber} lab ko bhej diya`),
    onError: (e) => toast.error(apiError(e, 'Lab ko nahi bheja')),
  });
  const pay = useMutation({
    mutationFn: ({ o, amount, paymentMethod }: { o: OpticalLensOrder; amount: number; paymentMethod: PaymentMethod }) => lensOrdersApi.recordPayment(o.id, { amount, paymentMethod }),
    onSuccess: (_r, v) => done(`${formatPKR(v.amount)} mil gaye — ${v.o.orderNumber}`, true),
    onError: (e) => toast.error(apiError(e, 'Payment save nahi hui')),
  });
  const deliver = useMutation({
    mutationFn: ({ o, body }: { o: OpticalLensOrder; body: { payment?: number; paymentMethod?: PaymentMethod; onKhata?: boolean; fittingNotes?: string } }) => lensOrdersApi.deliver(o.id, body),
    onSuccess: (_r, v) => done(`${v.o.orderNumber} de diya — bill ban gaya`, true),
    onError: (e) => toast.error(apiError(e, 'Deliver nahi hua')),
  });
  const cancel = useMutation({
    mutationFn: ({ o, body }: { o: OpticalLensOrder; body: { notes: string; refundAdvance?: boolean; refundMethod?: PaymentMethod; managerPin?: string } }) =>
      lensOrdersApi.updateStatus(o.id, { status: 'CANCELLED', ...body }),
    onSuccess: (_r, v) => done(`${v.o.orderNumber} cancel`, true),
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return { step, lab, pay, deliver, cancel };
}

const LABS_KEY = 'nafaa.optical.labs';
const savedLabs = (): string[] => { try { return JSON.parse(localStorage.getItem(LABS_KEY) ?? '[]') as string[]; } catch { return []; } };
const rememberLab = (name: string) => { try { localStorage.setItem(LABS_KEY, JSON.stringify([name, ...savedLabs().filter((l) => l !== name)].slice(0, 6))); } catch { /* storage off */ } };

export function SendToLabModal({ order, pending, onConfirm, onClose }: {
  order: OpticalLensOrder; pending: boolean; onConfirm: (b: { labName: string; labOrderRef?: string; expectedDate?: string }) => void; onClose: () => void;
}) {
  const [labName, setLabName] = useState(order.labName ?? savedLabs()[0] ?? '');
  const [ref, setRef] = useState(order.labOrderRef ?? '');
  const [date, setDate] = useState(toDateInput(order.expectedDate));
  const ok = labName.trim().length >= 2;
  const submit = () => {
    if (!ok || pending) return;
    rememberLab(labName.trim());
    onConfirm({ labName: labName.trim(), labOrderRef: ref.trim() || undefined, expectedDate: date ? new Date(`${date}T12:00:00`).toISOString() : undefined });
  };
  return (
    <Modal open onClose={onClose} size="sm" title={`Lab bhejein — ${order.orderNumber}`} description="Kis lab ko gaya aur kab tak wapas aayega"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={!ok} loading={pending} leftIcon={<FlaskConical className="h-4 w-4" />}>Lab bhej diya</Button></>}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <Input label="Lab ka naam" required autoFocus value={labName} onChange={(e) => setLabName(e.target.value)} placeholder="Jaise: Essilor, Hoya, local lab" error={labName && !ok ? 'Lab ka naam likhein' : undefined} maxLength={120} />
        {savedLabs().length > 0 && <Chips options={savedLabs()} value={labName} onChange={setLabName} />}
        <Input label="Lab ka order number" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Lab ki parchi ka number" hint="Marzi hai — lab se poochte waqt kaam aata hai" maxLength={60} />
        <Input label="Wapas kab aayega" type="date" min={todayInput()} value={date} onChange={(e) => setDate(e.target.value)} hint="Is date ke baad order 'Late' me dikhega" />
      </form>
    </Modal>
  );
}

export function DeliverModal({ order, pending, onConfirm, onClose }: {
  order: OpticalLensOrder; pending: boolean; onConfirm: (b: { payment?: number; paymentMethod?: PaymentMethod; onKhata?: boolean; fittingNotes?: string }) => void; onClose: () => void;
}) {
  const due = order.remainingAmount;
  const [amount, setAmount] = useState(due > 0 ? String(due) : '');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [khata, setKhata] = useState(false);
  const [notes, setNotes] = useState('');
  const n = Number(amount) || 0;
  const left = Math.max(Math.round((due - n) * 100) / 100, 0);
  const error = n > due + 0.01 ? `Sirf ${formatPKR(due)} baqi hai` : left > 0 && !khata ? `${formatPKR(left)} baqi reh jayega — poore lein ya khata chunein` : undefined;
  const submit = () => { if (!error && !pending) onConfirm({ payment: n > 0 ? n : undefined, paymentMethod: n > 0 ? method : undefined, onKhata: left > 0 ? true : undefined, fittingNotes: notes.trim() || undefined }); };
  return (
    <Modal open onClose={onClose} size="sm" title={`Customer ko dein — ${order.orderNumber}`} description="Yahin bill banta hai: frame stock se nikalta hai aur sale reports me aati hai"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button onClick={submit} disabled={!!error} loading={pending} leftIcon={<CheckCircle2 className="h-4 w-4" />}>De diya, bill banayein</Button></>}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-50 px-2 py-2"><dt className="text-[0.75rem] text-slate-500">Kul</dt><dd className="font-bold tabular-nums">{formatPKR(order.totalPrice)}</dd></div>
          <div className="rounded-xl bg-emerald-50 px-2 py-2"><dt className="text-[0.75rem] text-emerald-700">Mil chuka</dt><dd className="font-bold tabular-nums text-emerald-800">{formatPKR(order.paidAmount)}</dd></div>
          <div className="rounded-xl bg-amber-50 px-2 py-2"><dt className="text-[0.75rem] text-amber-700">Baqi</dt><dd className="font-bold tabular-nums text-amber-900">{formatPKR(due)}</dd></div>
        </dl>
        {due > 0 && (
          <>
            <Input label="Abhi kitna mila" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(moneyInput(e.target.value))} error={n > due + 0.01 ? `Sirf ${formatPKR(due)} baqi hai` : undefined} />
            {n > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
            {left > 0 && (
              <label className="flex items-start justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2.5 ring-1 ring-amber-200">
                <span className="text-[0.875rem] text-amber-900"><strong>{formatPKR(left)}</strong> customer ke khata me likhein (udhaar)</span>
                <Switch checked={khata} onChange={(e) => setKhata(e.target.checked)} aria-label="Baqi khata me" />
              </label>
            )}
          </>
        )}
        <Textarea label="Fitting note" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Jaise: nose pad badla, dandi seedhi ki" hint="Marzi hai" />
        {error && left > 0 && !khata && <p className="text-[0.8125rem] font-medium text-rose-600">{error}</p>}
      </form>
    </Modal>
  );
}

export function CancelOrderModal({ order, pending, onConfirm, onClose }: {
  order: OpticalLensOrder; pending: boolean; onConfirm: (b: { notes: string; refundAdvance?: boolean; refundMethod?: PaymentMethod; managerPin?: string }) => void; onClose: () => void;
}) {
  const paid = order.paidAmount > 0;
  const [refund, setRefund] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [pin, setPin] = useState('');
  return (
    <ReasonModal title={`Order cancel — ${order.orderNumber}`} confirm="Cancel karein" pending={pending}
      presets={['Customer ne mana kar diya', 'Number ghalat tha', 'Lab ne lens nahi banaya', 'Frame stock me nahi']}
      onClose={onClose} onConfirm={(notes) => onConfirm({ notes, ...(paid ? { refundAdvance: refund, refundMethod: refund ? method : undefined, managerPin: pin.trim() || undefined } : {}) })}>
      {paid && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <label className="flex items-start justify-between gap-3">
            <span className="text-[0.875rem] text-slate-800">Advance <strong>{formatPKR(order.paidAmount)}</strong> wapas dein?<span className="block text-[0.75rem] text-slate-500">Na dein to customer ke khata me jama rahega — agli khareed me kat jayega</span></span>
            <Switch checked={refund} onChange={(e) => setRefund(e.target.checked)} aria-label="Advance wapas" />
          </label>
          {refund && <PaymentMethodPicker label="Wapas kaise diye" value={method} onChange={setMethod} />}
          {refund && <Input label="Manager PIN" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 12))} hint="Agar dukaan ki settings me paisa wapas karne par PIN laga hai" />}
        </div>
      )}
    </ReasonModal>
  );
}

/** Renders whichever order dialog is open. */
export function OrderDialogs({ dialog, close, actions }: { dialog: OrderDialog; close: () => void; actions: ReturnType<typeof useOrderActions> }) {
  if (!dialog) return null;
  const o = dialog.order;
  if (dialog.kind === 'lab') return <SendToLabModal order={o} pending={actions.lab.isPending} onClose={close} onConfirm={(body) => actions.lab.mutate({ o, body })} />;
  if (dialog.kind === 'pay') {
    return <PayModal title={`Payment — ${o.orderNumber}`} description={o.customerName} due={o.remainingAmount} pending={actions.pay.isPending} onClose={close}
      onConfirm={({ amount, paymentMethod }) => actions.pay.mutate({ o, amount, paymentMethod })} />;
  }
  if (dialog.kind === 'deliver') return <DeliverModal order={o} pending={actions.deliver.isPending} onClose={close} onConfirm={(body) => actions.deliver.mutate({ o, body })} />;
  return <CancelOrderModal order={o} pending={actions.cancel.isPending} onClose={close} onConfirm={(body) => actions.cancel.mutate({ o, body })} />;
}
