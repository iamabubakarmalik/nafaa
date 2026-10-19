/**
 * One stitching order in the list: who, what garments, when it is due, the
 * karigar and the money, with the next step one tap away and the rest
 * under the arrow.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CalendarClock, ChevronDown, ExternalLink, MessageCircle, Pencil, Phone, Printer, Receipt, Scissors, Undo2, UserRound, Wallet } from 'lucide-react';
import { Button } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { waLink } from '@core/lib/whatsapp/templates';
import type { TailoringOrder } from '../../api/tailoring.api';
import { Pill } from '../fields';
import { TAILORING_PREV, daysFrom, dayOnly, dueOf, isClosed, priorityOf, tailoringNext, tailoringStatus, whenText } from '../meta';
import { printTailoringSlip, tailoringMessage } from '../slips';
import type { TailoringActions } from './useTailoringActions';

export function TailoringRow({ o, a, canManage, shopName }: { o: TailoringOrder; a: TailoringActions; canManage: boolean; shopName: string }) {
  const [open, setOpen] = useState(false);
  const st = tailoringStatus(o.orderStatus);
  const closed = isClosed(o.orderStatus);
  const d = daysFrom(o.promisedDate);
  const late = !closed && d !== null && d < 0 && o.orderStatus !== 'READY';
  const soon = !closed && d !== null && d >= 0 && d <= 1;
  const due = dueOf(o);
  const next = tailoringNext(o.orderStatus);
  const busy = a.busyId === o.id;
  const wa = waLink(o.customerPhone, tailoringMessage(o, shopName));
  const pr = priorityOf(o.priority);
  const pieces = o.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <li className={cn(closed && 'bg-slate-50/60')}>
      <div className="flex items-start gap-3 px-3 py-3 sm:px-4">
        <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          late ? 'bg-rose-50 text-rose-600' : o.orderStatus === 'READY' ? 'bg-success-50 text-success-600' : soon ? 'bg-amber-50 text-amber-600' : closed ? 'bg-slate-100 text-slate-400' : 'bg-pink-50 text-pink-600')}>
          <Scissors className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link to={`/garments/tailoring/${o.id}`} className="truncate font-semibold text-slate-900 hover:text-brand-700">{o.customerName || 'Customer'}</Link>
            <Pill tone={st.tone}>{st.label}</Pill>
            {(o.priority === 'HIGH' || o.priority === 'URGENT') && !closed && <Pill tone={pr.tone}>{pr.label}</Pill>}
            <span className="font-mono text-[0.6875rem] text-slate-400">{o.orderNumber}</span>
          </div>
          <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">
            {o.items.map((i) => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.garmentName}`).join(', ')}{pieces > 1 ? ` · ${pieces} pc` : ''}
          </p>
          <p className={cn('mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.75rem]', late ? 'font-semibold text-rose-700' : soon ? 'font-semibold text-amber-700' : 'text-slate-500')}>
            <span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />
              {closed ? (o.orderStatus === 'DELIVERED' ? `Diya ${dayOnly(o.deliveredAt)}` : 'Cancel') : o.promisedDate ? `${whenText(o.promisedDate)} · ${dayOnly(o.promisedDate)}` : 'Date nahi di'}
            </span>
            {o.tailorName && <span className="inline-flex items-center gap-1 font-normal text-slate-500"><UserRound className="h-3 w-3" />{o.tailorName}</span>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold tabular-nums text-slate-900">{formatPKR(o.total)}</p>
          {o.orderStatus === 'DELIVERED'
            ? <p className="text-[0.6875rem] text-slate-500">{due > 0.5 ? `${formatPKR(due)} khate me` : 'Poora mila'}</p>
            : o.orderStatus === 'CANCELLED' ? <p className="text-[0.6875rem] text-slate-500">{o.paidAmount > 0 ? `${formatPKR(o.paidAmount)} khate me jama` : '—'}</p>
              : due > 0.5 ? <p className="text-[0.6875rem] font-semibold tabular-nums text-amber-700">{formatPKR(due)} baqi</p>
                : <p className="text-[0.6875rem] font-medium text-success-700">Poora mila</p>}
        </div>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Aur kaam" aria-expanded={open} className="mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>

      {canManage && !closed && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3 sm:px-4 sm:pl-[4.25rem]">
          {next && (
            <Button size="sm" variant={next.to === 'DELIVER' ? 'success' : 'primary'} loading={busy} onClick={() => a.next(o)}
              leftIcon={next.to === 'DELIVER' ? <Receipt className="h-4 w-4" /> : <Scissors className="h-4 w-4" />}>{next.label}</Button>
          )}
          {due > 0.5 && <Button size="sm" variant="secondary" onClick={() => a.pay(o)} leftIcon={<Wallet className="h-4 w-4" />}>Paisa mila</Button>}
          {wa && <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-success-700 ring-1 ring-success-200 hover:bg-success-50"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        </div>
      )}

      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] sm:pl-[4.25rem]">
          {o.designInstructions && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 text-slate-700 ring-1 ring-slate-200">{o.designInstructions}</p>}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => printTailoringSlip(o, shopName)} leftIcon={<Printer className="h-4 w-4" />}>Parchi</Button>
            <Button size="sm" variant="secondary" onClick={() => printTailoringSlip(o, shopName, true)} leftIcon={<Scissors className="h-4 w-4" />}>Karigar parchi</Button>
            {o.customerPhone && <a href={`tel:${o.customerPhone}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Phone className="h-4 w-4" />{o.customerPhone}</a>}
            {o.bill && <Link to={`/sales/${o.bill.id}/receipt`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Receipt className="h-4 w-4" />Bill {o.bill.saleNumber}</Link>}
            {canManage && !closed && <Link to={`/garments/tailoring/new?edit=${o.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.8125rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" />Badlein</Link>}
            {canManage && !closed && TAILORING_PREV[o.orderStatus] && <Button size="sm" variant="ghost" onClick={() => a.back(o)} disabled={busy} leftIcon={<Undo2 className="h-4 w-4" />}>Ek qadam peeche</Button>}
            {canManage && !closed && <Button size="sm" variant="ghost" className="text-rose-700" onClick={() => a.cancel(o)} leftIcon={<Ban className="h-4 w-4" />}>Cancel</Button>}
            <Link to={`/garments/tailoring/${o.id}`} className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">Poori details <ExternalLink className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      )}
    </li>
  );
}
