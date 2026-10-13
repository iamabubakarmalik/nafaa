/** One bill in the history list: a compact card on phones, aligned columns on desktop. */

import type { ReactNode } from 'react';
import { BookOpen, Clock, CloudOff, MessageCircle, Printer, RotateCcw, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/design-system/components';
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

/** Desktop column template, shared with the column header in the page. */
export const ROW_GRID = 'grid-cols-[minmax(10rem,1fr)_minmax(9rem,1fr)_minmax(12rem,2fr)_8.5rem_minmax(6rem,0.8fr)_8.5rem_6.5rem] items-center gap-4';

function Actions({ sale, waLink, onReturn, always }: { sale: HistorySale; waLink?: string | null; onReturn?: () => void; always?: boolean }) {
  if (sale.pending) return null;
  const voided = sale.status === 'VOIDED';
  return (
    <div className={cn('relative flex justify-end gap-1 transition', !always && 'sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100')}>
      {waLink && (
        <a href={waLink} target="_blank" rel="noreferrer" title="WhatsApp par bill"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-success-700 hover:bg-success-50"><MessageCircle className="h-4 w-4" /></a>
      )}
      <Link to={receiptLink(sale.id, true)} title="Print" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"><Printer className="h-4 w-4" /></Link>
      {onReturn && !voided && sale.status !== 'FULLY_RETURNED' && (
        <button type="button" onClick={onReturn} title="Maal wapas" className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-50"><RotateCcw className="h-4 w-4" /></button>
      )}
    </div>
  );
}

function Badges({ sale }: { sale: HistorySale }) {
  return (
    <>
      <SaleSourceBadge sale={sale as never} />
      <StatusBadge sale={sale} />
      {sale.creditAmount > 0 && sale.status !== 'VOIDED' && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-800"><BookOpen className="h-3 w-3" />Udhaar</span>}
    </>
  );
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
  const methodIcon = (size: string) => (
    <span className={cn('relative flex shrink-0 items-center justify-center rounded-xl', size)} style={{ backgroundColor: `${color}17`, color }}>
      {Icon ? <Icon className="h-[45%] w-[45%]" /> : null}
    </span>
  );
  const chips = (max: number) => (
    <div className="flex flex-wrap gap-1">
      {sale.items.slice(0, max).map((it) => (
        <span key={it.id} className="max-w-[12rem] truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-600">
          {qtyText(it.quantity)} × {it.name}{it.variant ? ` (${it.variant})` : ''}
        </span>
      ))}
      {sale.items.length > max && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[0.6875rem] text-slate-500">+{sale.items.length - max}</span>}
    </div>
  );
  const amount = (
    <>
      <span className={cn('text-[1.0625rem] font-bold tabular-nums', voided ? 'text-slate-400 line-through' : 'text-slate-900')}>{money(sale.total)}</span>
      {sale.creditAmount > 0 && !voided && <span className="text-[0.75rem] font-medium tabular-nums text-amber-700">udhaar {money(sale.creditAmount)}</span>}
      {sale.changeAmount > 0 && !voided && <span className="text-[0.75rem] tabular-nums text-success-700">return {money(sale.changeAmount)}</span>}
    </>
  );

  return (
    <li className={cn('group relative px-4 py-3 transition hover:bg-slate-50/80 sm:px-5', voided && 'opacity-60')}>
      <button type="button" onClick={onOpen} className="absolute inset-0" aria-label={`Bill ${sale.saleNumber} kholein`} />

      {/* Phones and tablets: one compact card. */}
      <div className="flex gap-3 lg:hidden">
        {methodIcon('h-11 w-11')}
        <div className="relative min-w-0 flex-1 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[0.875rem] font-semibold text-slate-900">{sale.saleNumber}</span>
            <Badges sale={sale} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] text-slate-500">
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{time(sale.soldAt)}</span>
            <span className="inline-flex min-w-0 items-center gap-1"><User className="h-3 w-3" /><span className="max-w-[10rem] truncate">{sale.customer?.name ?? 'Walk-in'}</span></span>
            <span>{sale.items.length} cheezein · {qtyText(qty)} qty</span>
            {sale.staff && <span className="hidden sm:inline">· {sale.staff}</span>}
          </div>
          <div className="mt-1.5">{chips(4)}</div>
          {extra}
        </div>
        <div className="relative flex shrink-0 flex-col items-end gap-1">
          {amount}
          <Actions sale={sale} waLink={waLink} onReturn={onReturn} />
        </div>
      </div>

      {/* Desktop: aligned columns, no empty middle. */}
      <div className={cn('hidden lg:grid', ROW_GRID)}>
        <div className="relative flex min-w-0 items-center gap-3 pointer-events-none">
          {methodIcon('h-10 w-10')}
          <div className="min-w-0">
            <div className="font-mono text-[0.875rem] font-semibold text-slate-900">{sale.saleNumber}</div>
            <div className="inline-flex items-center gap-1 text-[0.75rem] text-slate-500"><Clock className="h-3 w-3" />{time(sale.soldAt)}</div>
          </div>
        </div>
        <div className="relative flex min-w-0 items-center gap-2 pointer-events-none">
          {sale.customer ? (
            <>
              <Avatar name={sale.customer.name} size={28} />
              <div className="min-w-0">
                <div className="truncate text-[0.8125rem] font-medium text-slate-900">{sale.customer.name}</div>
                {sale.customer.phone && <div className="truncate text-[0.6875rem] text-slate-500">{sale.customer.phone}</div>}
              </div>
            </>
          ) : <span className="text-[0.8125rem] text-slate-400">Walk-in</span>}
        </div>
        <div className="relative min-w-0 pointer-events-none">
          {chips(3)}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-slate-500">
            <span>{sale.items.length} cheezein · {qtyText(qty)} qty</span>
            <Badges sale={sale} />
          </div>
          {extra}
        </div>
        <div className="relative pointer-events-none">
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-semibold" style={{ backgroundColor: `${color}14`, color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
          </span>
        </div>
        <div className="relative truncate text-[0.8125rem] text-slate-600 pointer-events-none">{sale.staff ?? '—'}</div>
        <div className="relative flex flex-col items-end pointer-events-none">{amount}</div>
        <Actions sale={sale} waLink={waLink} onReturn={onReturn} />
      </div>
    </li>
  );
}
