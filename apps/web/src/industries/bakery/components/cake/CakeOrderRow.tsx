/**
 * One cake order in the record: who, what, when it is due and the money,
 * with the next step one tap away and the rest under the arrow.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, Cake, ChefHat, ChevronDown, Clock, ExternalLink, MessageCircle, Phone, Printer, Receipt, Undo2, Wallet } from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { CakeOrder } from '../../api/cake-orders.api';
import { printCakeSlip, cakeMessage } from '../orderSlip';
import { CAKE_PREV, cakeLine, cakeNext, dateTime, deliveryOf, dueOf, hoursTo, isClosed, leftText, statusOf, waLink } from '../meta';

interface CakeRowActions {
  canManage: boolean;
  busyId?: string;
  shopName: string;
  next: (o: CakeOrder) => void;
  back: (o: CakeOrder) => void;
  pay: (o: CakeOrder) => void;
  cancel: (o: CakeOrder) => void;
}

export function CakeOrderRow({ o, a }: { o: CakeOrder; a: CakeRowActions }) {
  const [open, setOpen] = useState(false);
  const st = statusOf(o.status);
  const closed = isClosed(o.status);
  const left = hoursTo(o.neededBy);
  const late = !closed && left !== null && left < 0;
  const soon = !closed && left !== null && left >= 0 && left <= 24;
  const due = dueOf(o);
  const advanceShort = !closed && !['DRAFT', 'QUOTED'].includes(o.status) ? Math.max(Number(o.advanceRequired || 0) - Number(o.paidAmount || 0), 0) : 0;
  const next = cakeNext(o);
  const busy = a.busyId === o.id;
  const wa = waLink(o.customerPhone, cakeMessage(o, a.shopName));
  const Del = deliveryOf(o.deliveryType).icon;

  return (
    <li className={cn(closed && 'bg-slate-50/60')}>
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          late ? 'bg-rose-50 text-rose-600' : soon ? 'bg-amber-50 text-amber-600' : closed ? 'bg-slate-100 text-slate-400' : 'bg-pink-50 text-pink-600')}>
          <Cake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={`/bakery/cake-orders/${o.id}`} className="truncate font-semibold text-slate-900 hover:text-brand-700">{o.customerName}</Link>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
            <span className="font-mono text-[0.6875rem] text-slate-400">{o.orderNumber}</span>
          </div>
          <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{cakeLine(o)}</p>
          {o.messageOnCake && <p className="truncate text-[0.75rem] font-medium text-fuchsia-700">✍️ "{o.messageOnCake}"</p>}
          <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem]', late ? 'font-semibold text-rose-700' : soon ? 'font-semibold text-amber-700' : 'text-slate-500')}>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{closed ? dateTime(o.neededBy) : `${leftText(left)} · ${dateTime(o.neededBy)}`}</span>
            <span className="inline-flex items-center gap-1 font-normal text-slate-500"><Del className="h-3 w-3" />{deliveryOf(o.deliveryType).label}</span>
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-slate-900">{formatPKR(o.total)}</p>
          {o.status === 'DELIVERED'
            ? <p className="text-[0.6875rem] text-slate-500">{due > 0.5 ? `${formatPKR(due)} khate me` : 'Poora mila'}</p>
            : due > 0.5 ? <p className="text-[0.6875rem] font-semibold tabular-nums text-amber-700">{formatPKR(due)} baqi</p>
              : <p className="text-[0.6875rem] font-medium text-success-700">Poora mila</p>}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Aur kaam" aria-expanded={open} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>

      {advanceShort > 0.5 && (
        <p className="mx-3 mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[0.75rem] text-amber-900 ring-1 ring-amber-200 sm:mx-4 sm:ml-[4.25rem]">
          Advance me {formatPKR(advanceShort)} kam hai — bara cake bina advance ke na banayein.
        </p>
      )}

      {a.canManage && !closed && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 sm:px-4 sm:pl-[4.25rem]">
          {next && (
            <Button size="sm" variant={next.to === 'DELIVER' ? 'success' : 'primary'} loading={busy} onClick={() => a.next(o)}
              leftIcon={next.to === 'DELIVER' ? <Receipt className="h-4 w-4" /> : <ChefHat className="h-4 w-4" />}>{next.label}</Button>
          )}
          {due > 0.5 && <Button size="sm" variant="secondary" onClick={() => a.pay(o)} leftIcon={<Wallet className="h-4 w-4" />}>Paisa mila</Button>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-success-200 hover:bg-success-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        </div>
      )}

      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] sm:pl-[4.25rem]">
          {o.designInstructions && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 text-slate-700 ring-1 ring-slate-200">{o.designInstructions}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => printCakeSlip(o, a.shopName)} leftIcon={<Printer className="h-4 w-4" />}>Parchi</Button>
            <Button size="sm" variant="secondary" onClick={() => printCakeSlip(o, a.shopName, true)} leftIcon={<ChefHat className="h-4 w-4" />}>Kitchen parchi</Button>
            {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Phone className="h-4 w-4" />{o.customerPhone}</a>}
            {wa && (closed || !a.canManage) && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-slate-200"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
            {a.canManage && !closed && CAKE_PREV[o.status] && <Button size="sm" variant="ghost" onClick={() => a.back(o)} disabled={busy} leftIcon={<Undo2 className="h-4 w-4" />}>Ek qadam peeche</Button>}
            {a.canManage && !closed && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => a.cancel(o)} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>}
            <Link to={`/bakery/cake-orders/${o.id}`} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">Poori tafseel <ExternalLink className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      )}
    </li>
  );
}
