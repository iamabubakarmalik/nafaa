/**
 * One online order in the list: number, status, channel, customer, items
 * and money, with the next step as a button and the rest in a small menu
 * (confirm call, book courier, label, invoice, cancel).
 */

import { useRef, useState } from 'react';
import {
  ArrowRight, Ban, CheckCircle2, Clock, FileText, Loader2, MapPin, MoreHorizontal, Package, PhoneCall, Tag, Timer, Truck, User,
} from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useDismissible } from '@core/print/useDismissible';
import type { CourierAccount, OnlineOrder } from '../../api/online-orders.api';
import { STATUS_LABEL, sourceOf, timeAgo } from '../../lib/labels';
import { isClosed, itemQty, openInvoices, orderNo, waitMinutes } from '../../lib/orders';
import { RiskBadge } from '../RiskBadge';
import { orderOptions, type QuickAction } from './useOrderActions';

const time = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const qtyText = (n: number) => String(Number(n.toFixed(2)));

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold';

export function OrderRow({ order: o, now, money, staleMinutes, branchName, selecting, checked, active, busy, couriers, onOpen, onToggle, onAction, onCancel }: {
  order: OnlineOrder;
  now: number;
  money: (n: number) => string;
  staleMinutes: number;
  branchName?: string;
  selecting: boolean;
  checked: boolean;
  active: boolean;
  busy: boolean;
  couriers: CourierAccount[];
  onOpen: () => void;
  onToggle: () => void;
  onAction: (a: QuickAction) => void;
  onCancel: () => void;
}) {
  const st = STATUS_LABEL[o.orderStatus] ?? STATUS_LABEL.PENDING;
  const src = sourceOf(o);
  const closed = isClosed(o);
  const isNew = o.orderStatus === 'PENDING';
  const wait = waitMinutes(o.receivedAt, now);
  const late = isNew && !o.isTest && wait >= staleMinutes;
  const opt = orderOptions(o);
  const phone = o.customerPhone ?? '';

  return (
    <li className={cn('group relative px-4 py-3 transition sm:px-5', active ? 'bg-brand-50/70' : 'hover:bg-slate-50/80', closed && 'opacity-70')}>
      <button type="button" onClick={selecting ? onToggle : onOpen} className="absolute inset-0" aria-label={`Order #${orderNo(o)} kholein`} />
      {(isNew || active) && <span className={cn('absolute inset-y-0 left-0 w-1', active ? 'bg-brand-500' : late ? 'bg-rose-500' : 'bg-amber-400')} aria-hidden />}

      <div className="flex gap-3">
        <span className="pointer-events-none relative">
          {selecting ? (
            <span className={cn('flex h-11 w-11 items-center justify-center rounded-xl border-2 text-base font-bold',
              checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-transparent')}>✓</span>
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-xl" title={src.label}>{src.emoji}</span>
          )}
        </span>

        <div className="pointer-events-none relative min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[0.875rem] font-semibold text-slate-900">#{orderNo(o)}</span>
            <span className={cn(pill, st.tone)}><span className={cn('h-1.5 w-1.5 rounded-full', st.dot, isNew && 'animate-pulse')} />{st.short}</span>
            <span className={cn(pill, 'bg-slate-100 text-slate-600')}>{o.integration?.displayName ?? src.label}</span>
            {branchName && <span className={cn(pill, 'bg-violet-50 text-violet-700')}>{branchName}</span>}
            {o.paymentStatus === 'PAID'
              ? <span className={cn(pill, 'bg-emerald-50 text-emerald-700')}>Paid</span>
              : o.isCod && !closed && <span className={cn(pill, 'bg-orange-50 text-orange-700')}>COD</span>}
            {o.isTest && <span className={cn(pill, 'bg-amber-100 text-amber-800')}>TEST</span>}
            {!closed && <RiskBadge risk={o.risk} />}
            {opt.confirm && (
              o.confirmation?.result === 'REFUSED'
                ? <span className={cn(pill, 'bg-rose-50 text-rose-700')}>Mana kiya</span>
                : <span className={cn(pill, 'bg-amber-50 text-amber-800')}>{o.confirmation?.result === 'NO_ANSWER' ? `Jawab nahi (${o.confirmation.attempts})` : 'Confirm baqi'}</span>
            )}
            {o.isCod && o.confirmation?.result === 'CONFIRMED' && !o.dispatchedAt && !closed && <span className={cn(pill, 'bg-emerald-50 text-emerald-700')}>Confirm</span>}
            {o.metadata?.cancelRequested && o.orderStatus !== 'CANCELLED' && <span className={cn(pill, 'bg-rose-600 text-white')}>Customer ne cancel maanga</span>}
            {late && <span className={cn(pill, 'bg-rose-50 text-rose-700')}><Timer className="h-3 w-3" />{wait} min se ruka</span>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[0.75rem] text-slate-500">
            <span className="inline-flex min-w-0 items-center gap-1"><User className="h-3 w-3" /><span className="max-w-[11rem] truncate font-medium text-slate-800">{o.customerName}</span></span>
            {phone && <span className="tabular-nums">{phone}</span>}
            {o.customerCity && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{o.customerCity}</span>}
            <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" />{o.items.length} cheezein · {qtyText(itemQty(o))} qty</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{time(o.receivedAt)} · {timeAgo(o.receivedAt)}</span>
          </div>
          <div className="mt-1.5 hidden flex-wrap gap-1 sm:flex">
            {o.items.slice(0, 3).map((it, i) => (
              <span key={i} className="max-w-[13rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">
                {qtyText(Number(it.quantity))} × {it.name}{it.variant ? ` (${it.variant})` : ''}
              </span>
            ))}
            {o.items.length > 3 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-500">+{o.items.length - 3}</span>}
          </div>
        </div>

        <div className="relative flex shrink-0 flex-col items-end gap-1.5">
          <span className="pointer-events-none flex flex-col items-end">
            <span className={cn('text-[1.0625rem] font-bold tabular-nums', closed ? 'text-slate-400 line-through' : 'text-slate-900')}>{money(o.total)}</span>
            {o.trackingNumber && <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-slate-500"><Truck className="h-3 w-3" />{o.trackingNumber}</span>}
          </span>
          {!selecting && (
            <div className="flex items-center gap-1">
              {busy ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : (
                <>
                  {opt.accept && <Button size="xs" variant="success" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onAction({ kind: 'accept' })}>Accept</Button>}
                  {!opt.accept && opt.next && <Button size="xs" variant="secondary" rightIcon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onAction({ kind: 'next' })} className="hidden sm:inline-flex">{opt.nextLabel}</Button>}
                  <RowMenu o={o} couriers={couriers} onAction={onAction} onCancel={onCancel} onOpen={onOpen} />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function RowMenu({ o, couriers, onAction, onCancel, onOpen }: {
  o: OnlineOrder; couriers: CourierAccount[]; onAction: (a: QuickAction) => void; onCancel: () => void; onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismissible(ref, open, () => setOpen(false));
  const opt = orderOptions(o);
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-50';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label="Aur kaam"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {opt.accept && <button type="button" role="menuitem" className={item} onClick={pick(() => onAction({ kind: 'accept' }))}><CheckCircle2 className="h-4 w-4 text-emerald-600" />Accept + bill</button>}
          {opt.next && <button type="button" role="menuitem" className={item} onClick={pick(() => onAction({ kind: 'next' }))}><ArrowRight className="h-4 w-4 text-brand-600" />{opt.nextLabel}</button>}
          {opt.confirm && <button type="button" role="menuitem" className={item} onClick={pick(() => onAction({ kind: 'confirm' }))}><PhoneCall className="h-4 w-4 text-emerald-600" />Customer ne confirm kiya</button>}
          {opt.book && couriers.map((c) => (
            <button key={c.code} type="button" role="menuitem" className={item} onClick={pick(() => onAction({ kind: 'book', courier: c.code }))}>
              <Truck className="h-4 w-4 text-sky-600" />{c.name} par book
            </button>
          ))}
          {opt.book && !couriers.length && <button type="button" role="menuitem" className={item} onClick={pick(onOpen)}><Truck className="h-4 w-4 text-sky-600" />Courier ko dein</button>}
          {opt.label && <button type="button" role="menuitem" className={item} onClick={pick(() => onAction({ kind: 'label' }))}><Tag className="h-4 w-4 text-slate-500" />Courier label print</button>}
          {opt.invoice && <button type="button" role="menuitem" className={item} onClick={pick(() => openInvoices([o.id]))}><FileText className="h-4 w-4 text-slate-500" />Invoice / packing slip</button>}
          <button type="button" role="menuitem" className={item} onClick={pick(onOpen)}><Package className="h-4 w-4 text-slate-500" />Poori details</button>
          {opt.cancel && (
            <button type="button" role="menuitem" className={cn(item, 'text-rose-700 hover:bg-rose-50')} onClick={pick(onCancel)}>
              <Ban className="h-4 w-4" />{o.orderStatus === 'PENDING' ? 'Reject' : 'Cancel'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
