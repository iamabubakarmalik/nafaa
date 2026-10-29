/**
 * Money on an order in one card: how the customer pays, the delivery charge
 * (charged to the customer, free, or kept by the rider), every advance
 * received (payment links and advances recorded by hand), and what the
 * courier or rider still has to collect. The shop records an advance taken
 * by JazzCash, Easypaisa, bank transfer or cash here; courier COD drops by
 * the same amount.
 */

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Bike, Building2, CircleDollarSign, Gift, Plus, Trash2, Truck, Wallet } from 'lucide-react';
import { Button, Input, Segmented, confirmDialog } from '@/design-system/components';
import { BrandLogo, brandForPayment, type BrandName } from '@/assets/brands/BrandLogo';
import { cn } from '@core/lib/cn';
import {
  apiErrorMessage, onlineOrdersApi, type AdvanceMethod, type OnlineOrder, type OnlineOrderDetail, type OrderMoney, type OrderPaymentLink,
} from '../../api/online-orders.api';
import { PAYMENT_LABEL, rs, whenText } from '../../lib/labels';

const METHODS: Array<{ value: AdvanceMethod; label: string; brand?: BrandName; icon?: typeof Wallet }> = [
  { value: 'JAZZCASH', label: 'JazzCash', brand: 'jazzcash' },
  { value: 'EASYPAISA', label: 'Easypaisa', brand: 'easypaisa' },
  { value: 'BANK', label: 'Bank', icon: Building2 },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'OTHER', label: 'Doosra', icon: CircleDollarSign },
];
const methodOf = (m?: string) => METHODS.find((x) => x.value === m) ?? METHODS[4];

const CLOSED = ['CANCELLED', 'REJECTED', 'RETURNED'];

/** Same numbers as the API (order-money.ts), for an API that does not send `money` yet. */
export function moneyOf(o: OnlineOrder): OrderMoney {
  if (o.money) return o.money;
  const links = ((o.metadata as any)?.payments ?? []) as OrderPaymentLink[];
  const advance = links.filter((l) => l.status === 'PAID').reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const rider = Number((o.metadata as any)?.riderDelivery ?? 0) > 0;
  return {
    advance,
    codDue: o.paymentStatus === 'PAID' ? 0 : Math.max(0, Math.round(o.total - advance)),
    deliveryMode: rider ? 'RIDER' : o.deliveryFee > 0 ? 'CUSTOMER' : 'FREE',
    deliveryFee: o.deliveryFee,
  };
}

function Line({ label, value, hint, strong, tone }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className={cn('text-[0.8125rem]', strong ? 'font-bold text-slate-900' : 'text-slate-600')}>{label}</div>
        {hint && <div className="text-[0.6875rem] text-slate-500">{hint}</div>}
      </div>
      <div className={cn('shrink-0 text-right tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'text-[0.8125rem] font-semibold text-slate-700', tone)}>{value}</div>
    </div>
  );
}

export function OrderMoneyCard({ order: o, onChanged, onPaid, paying }: {
  order: OnlineOrderDetail; onChanged: () => void; onPaid: () => void; paying: boolean;
}) {
  const m = moneyOf(o);
  const [open, setOpen] = useState(false);
  const pay = PAYMENT_LABEL[o.paymentStatus] ?? PAYMENT_LABEL.PENDING;
  const closed = CLOSED.includes(o.orderStatus);
  const links = (((o.metadata as any)?.payments ?? []) as OrderPaymentLink[]).filter((l) => l.status === 'PAID');
  const booked = (o.metadata as any)?.courierBooking as { cod?: number } | undefined;
  const collectLabel = !o.courierCode ? 'Customer se lena (COD)' : `${o.courierCode === 'RIDER' ? 'Rider' : (o.courierLabel ?? 'Courier')} customer se lega (COD)`;
  const canAdvance = !closed && o.paymentStatus !== 'PAID' && m.codDue > 0;

  const remove = useMutation({
    mutationFn: (ref: string) => onlineOrdersApi.removeAdvance(o.id, ref),
    onSuccess: () => { onChanged(); toast.success('Advance hata diya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  const delivery = m.deliveryMode === 'RIDER'
    ? { icon: Bike, label: 'Delivery — rider ki', value: rs(m.deliveryFee), hint: 'Rider khud leta hai — bill aur sale me shamil nahi' }
    : m.deliveryMode === 'FREE'
      ? { icon: Gift, label: 'Delivery — free', value: 'Rs 0', hint: 'Customer se nahi li — kharcha dukaan ka' }
      : { icon: Truck, label: 'Delivery — customer se', value: rs(m.deliveryFee), hint: o.metadata?.shippingMethod ?? 'Total me shamil' };

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-slate-200/80">
      <div className="flex flex-wrap items-center gap-3">
        <Wallet className="h-5 w-5 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-slate-900">{o.metadata?.paymentTitle ?? o.paymentMethod ?? 'Cash on Delivery'}</div>
          <div className="text-xs text-slate-500">
            {o.paymentStatus === 'PAID'
              ? `Paisa mil gaya${o.paymentReceivedAt ? ` · ${whenText(o.paymentReceivedAt)}` : ''}${o.codSettlementRef ? ` · ref ${o.codSettlementRef}` : ''}`
              : o.paymentStatus === 'COLLECTED' ? `${o.courierLabel ?? 'Courier'} ne customer se le liya — settlement par aap ko milega`
                : o.paymentStatus === 'NOT_COLLECTED' ? 'Parcel wapas aaya — paisa nahi aayega'
                  : o.isCod ? 'Delivery par cash (COD)' : 'Payment baqi'}
          </div>
        </div>
        <span className={cn('rounded-lg px-2 py-1 text-xs font-bold', pay.tone)}>{pay.label}</span>
        {o.paymentStatus !== 'PAID' && o.nafaaSaleId && !closed && (
          <Button size="xs" variant="outline" loading={paying} onClick={onPaid}>Paisa mil gaya</Button>
        )}
      </div>

      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
        <Line label="Order total" value={rs(o.total)} />
        <div className="flex items-start gap-2">
          <delivery.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <div className="min-w-0 flex-1"><Line label={delivery.label} value={delivery.value} hint={delivery.hint} /></div>
        </div>

        {links.map((l) => {
          const manual = l.provider === 'MANUAL';
          const meth = methodOf(l.method);
          return (
            <div key={l.ref} className="flex items-start gap-2">
              {manual
                ? meth.brand ? <BrandLogo name={meth.brand} size={16} className="mt-0.5" /> : (() => { const I = meth.icon ?? Wallet; return <I className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />; })()
                : <BrandLogo name={brandForPayment(l.provider)} size={16} className="mt-0.5" />}
              <div className="min-w-0 flex-1">
                <Line
                  label={`${l.kind === 'FULL' ? 'Poori payment' : 'Advance'} — ${manual ? meth.label : 'payment link'}`}
                  hint={[l.reference && `Ref ${l.reference}`, whenText(l.paidAt ?? l.createdAt)].filter(Boolean).join(' · ')}
                  value={`− ${rs(l.amount)}`} tone="text-success-700" />
              </div>
              {manual && o.paymentStatus !== 'PAID' && (
                <button type="button" aria-label="Advance hatayein" title="Ghalat likha? Hatayein" disabled={remove.isPending}
                  onClick={async () => { if (await confirmDialog({ title: `${rs(l.amount)} ka advance hatayein?`, text: 'COD phir utna barh jayega.', danger: true })) remove.mutate(l.ref); }}
                  className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          );
        })}

        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <Line strong
            label={o.paymentStatus === 'PAID' ? 'Lena baqi' : collectLabel}
            hint={m.advance > 0 ? `Total ${rs(o.total)} − advance ${rs(m.advance)}` : undefined}
            value={m.codDue > 0 ? rs(m.codDue) : 'Kuch nahi'} tone={m.codDue > 0 ? undefined : 'text-success-700'} />
        </div>
        {booked?.cod != null && o.courierBooked && Math.round(Number(booked.cod)) !== Math.round(m.codDue) && o.paymentStatus !== 'PAID' && (
          <p className="text-[0.6875rem] font-semibold text-amber-700">
            Courier booking par COD {rs(Number(booked.cod))} likha gaya tha — farq ho to courier portal par COD theek karwayein.
          </p>
        )}
      </div>

      {canAdvance && !open && (
        <Button className="mt-3" size="xs" variant="secondary" onClick={() => setOpen(true)} leftIcon={<Plus className="h-3.5 w-3.5" />}>Advance likhein</Button>
      )}
      {canAdvance && open && <AdvanceForm order={o} due={m.codDue} onDone={() => { setOpen(false); onChanged(); }} onCancel={() => setOpen(false)} />}
    </section>
  );
}

function AdvanceForm({ order: o, due, onDone, onCancel }: { order: OnlineOrderDetail; due: number; onDone: () => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(o.deliveryFee > 0 && o.deliveryFee < due ? String(Math.round(o.deliveryFee)) : '');
  const [method, setMethod] = useState<AdvanceMethod>('JAZZCASH');
  const [reference, setReference] = useState('');
  const n = Number(amount);
  const valid = n >= 1 && n <= due;
  const save = useMutation({
    mutationFn: () => onlineOrdersApi.addAdvance(o.id, { amount: n, method, reference: reference.trim() || undefined }),
    onSuccess: () => { toast.success(`${rs(n)} advance likh diya — COD ab ${rs(Math.max(0, due - n))}`); onDone(); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-slate-200 p-3">
      <p className="text-[0.75rem] text-slate-500">Customer ne pehle paisa bhej diya? Likhein — courier sirf baqi COD lega.</p>
      <Segmented label="Kaise aaya" value={method} onChange={setMethod} className="flex-wrap"
        items={METHODS.map((x) => ({ value: x.value, label: <>{x.brand ? <BrandLogo name={x.brand} size={16} /> : x.icon ? <x.icon className="h-3.5 w-3.5" /> : null}{x.label}</> }))} />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input size="sm" label="Amount (Rs)" type="number" min={1} max={due} value={amount} onChange={(e) => setAmount(e.target.value)}
          hint={`Baqi ${rs(due)}`} />
        <Input size="sm" label="Transaction / slip number (optional)" value={reference} maxLength={80} onChange={(e) => setReference(e.target.value)} placeholder="Jaise TID 1234567" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {o.deliveryFee > 0 && o.deliveryFee < due && <Button size="xs" variant="ghost" onClick={() => setAmount(String(Math.round(o.deliveryFee)))}>Sirf delivery {rs(o.deliveryFee)}</Button>}
        <Button size="xs" variant="ghost" onClick={() => setAmount(String(due))}>Poora {rs(due)}</Button>
        <span className="flex-1" />
        <Button size="xs" variant="ghost" onClick={onCancel}>Rehne dein</Button>
        <Button size="xs" variant="primary" loading={save.isPending} disabled={!valid} onClick={() => save.mutate()}>Advance save</Button>
      </div>
    </div>
  );
}
