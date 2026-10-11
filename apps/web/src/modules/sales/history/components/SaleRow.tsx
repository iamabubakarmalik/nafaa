/** One bill in the history list: payment, number, badges, customer, items, amounts, quick actions. */

import type { ReactNode } from 'react';
import { BookOpen, Clock, CloudOff, MessageCircle, Printer, RotateCcw, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@core/lib/cn';
import { PAYMENT_COLORS, PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import { POS_PAYMENT_METHODS } from '@modules/pos/lib/posCart';
import { SaleSourceBadge } from '@modules/sales/sales/components/SaleSourceBadge';
import type { HistorySale } from '../api';
import { receiptLink } from '../receiptPrefs';

const time = (v: string) => new Intl.DateTimeFormat('en-PK', { hour: 'numeric', minute: '2-digit' }).format(new Date(v));
export const qtyText = (n: number) => String(Number(Number(n).toFixed(2)));

export function StatusBadge({ sale }: { sale: HistorySale }) {
  if (sale.pending) return <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-sky-700"><CloudOff className="h-3 w-3" />Offline</span>;
  if (sale.status === 'VOIDED') return <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-rose-700">Wapas li gayi</span>;
  if (sale.status === 'FULLY_RETURNED') return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800">Poora wapas</span>;
  if (sale.status === 'PARTIALLY_RETURNED') return <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-orange-700">Kuch wapas</span>;
  return null;
}

export function SaleRow({ sale, money, onOpen, onReturn, waLink, extra }: {
  sale: HistorySale;
  money: (n: number) => string;
  onOpen: () => void;
  onReturn?: () => void;
  waLink?: string | null;
  extra?: ReactNode;
}) {
  const color = PAYMENT_COLORS[sale.paymentMethod] ?? '#64748b';
  const Icon = POS_PAYMENT_METHODS.find((m) => m.id === sale.paymentMethod)?.icon;
  const voided = sale.status === 'VOIDED';
  const qty = sale.items.reduce((s, i) => s + Number(i.quantity), 0);

  return (
    <li className={cn('group relative flex gap-3 px-4 py-3 transition hover:bg-slate-50/80 sm:px-5', voided && 'opacity-60')}>
      <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={`Bill ${sale.saleNumber} kholein`} />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}17`, color }}>
        {Icon ? <Icon className="h-5 w-5" /> : null}
      </span>
      <div className="relative min-w-0 flex-1 pointer-events-none">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[0.875rem] font-semibold text-slate-900">{sale.saleNumber}</span>
          <SaleSourceBadge sale={sale as never} />
          <StatusBadge sale={sale} />
          {sale.creditAmount > 0 && !voided && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800"><BookOpen className="h-3 w-3" />Udhaar</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] text-slate-500">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{time(sale.soldAt)}</span>
          <span className="inline-flex min-w-0 items-center gap-1"><User className="h-3 w-3" /><span className="max-w-[10rem] truncate">{sale.customer?.name ?? 'Walk-in'}</span></span>
          <span>{sale.items.length} cheezein · {qtyText(qty)} qty</span>
          {sale.staff && <span className="hidden sm:inline">· {sale.staff}</span>}
          <span className="hidden md:inline">· {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {sale.items.slice(0, 4).map((it) => (
            <span key={it.id} className="max-w-[12rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">
              {qtyText(it.quantity)} × {it.name}{it.variant ? ` (${it.variant})` : ''}
            </span>
          ))}
          {sale.items.length > 4 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-500">+{sale.items.length - 4}</span>}
        </div>
        {extra}
      </div>
      <div className="relative flex shrink-0 flex-col items-end gap-1">
        <span className={cn('text-[1.0625rem] font-bold tabular-nums', voided ? 'text-slate-400 line-through' : 'text-slate-900')}>{money(sale.total)}</span>
        {sale.creditAmount > 0 && !voided && <span className="text-[0.75rem] font-medium tabular-nums text-amber-700">udhaar {money(sale.creditAmount)}</span>}
        {sale.changeAmount > 0 && !voided && <span className="text-[0.75rem] tabular-nums text-success-700">wapsi {money(sale.changeAmount)}</span>}
        {!sale.pending && (
          <div className="mt-0.5 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" title="WhatsApp par bill"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-success-700 hover:bg-success-50"><MessageCircle className="h-4 w-4" /></a>
            )}
            <Link to={receiptLink(sale.id, true)} title="Print" className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Printer className="h-4 w-4" /></Link>
            {onReturn && !voided && sale.status !== 'FULLY_RETURNED' && (
              <button type="button" onClick={onReturn} title="Maal wapas" className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-50"><RotateCcw className="h-4 w-4" /></button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
