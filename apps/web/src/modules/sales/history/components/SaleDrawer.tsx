/** Side panel with the full bill: items, money, people, and every action on it. */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Eye, MessageCircle, Printer, RotateCcw, Store, Undo2, User, UserCheck, X } from 'lucide-react';
import { Button, IconButton } from '@/design-system/components';
import { PAYMENT_LABELS } from '@modules/dashboard/engine/useChartTheme';
import { SaleSourceBadge } from '@modules/sales/sales/components/SaleSourceBadge';
import type { HistoryItem, HistorySale } from '../api';
import { receiptLink } from '../receiptPrefs';
import { qtyText, StatusBadge } from './SaleRow';
import { BillTierBadge, LineTierBadge } from './PriceTierBadge';

const full = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(v));

function Row({ label, value, strong, tone }: { label: string; value: ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 text-[0.875rem] ${strong ? 'border-t border-slate-200 pt-2' : ''}`}>
      <dt className={strong ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-xl font-bold text-slate-900' : `font-medium ${tone ?? 'text-slate-900'}`}`}>{value}</dd>
    </div>
  );
}

/** For a wholesale/credit line: the retail price it would have sold at, and the gap per unit. */
function RetailCompare({ item, money }: { item: HistoryItem; money: (n: number) => string }) {
  if (!item.priceTier || item.priceTier === 'RETAIL' || item.retailPrice == null) return null;
  const gap = item.retailPrice - item.price;
  const diff = Math.abs(gap) < 0.005 ? 'barabar' : `${money(Math.abs(gap))} ${gap > 0 ? 'kam' : 'zyada'}`;
  return (
    <span className="block text-[0.75rem] text-slate-500">
      Retail {money(item.retailPrice)}{item.retailPriceIsToday && <span className="text-slate-400"> (aaj ka retail)</span>}
      {' · '}<span className={gap > 0.005 ? 'font-medium text-blue-700' : 'font-medium text-slate-700'}>{diff}</span>
    </span>
  );
}

export function SaleDrawer({ sale, money, cost, costHidden, waLink, extra, onReturn, onVoid, onClose }: {
  sale: HistorySale;
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  waLink?: string | null;
  extra?: ReactNode;
  onReturn: () => void;
  onVoid: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const voided = sale.status === 'VOIDED';
  const profit = sale.total - sale.costOfGoods;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={`Bill ${sale.saleNumber}`}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="font-mono text-lg font-semibold text-slate-900">{sale.saleNumber}</h2>
              <SaleSourceBadge sale={sale as never} />
              <BillTierBadge tier={sale.priceTier} size="sm" />
              <StatusBadge sale={sale} />
            </div>
            <p className="mt-0.5 text-[0.8125rem] text-slate-500">{full(sale.soldAt)}</p>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500"><User className="h-3.5 w-3.5" />Customer</div>
              {sale.customer ? (
                <Link to={`/customers/${sale.customer.id}`} className="mt-1 block font-semibold text-slate-900 hover:text-brand-700">{sale.customer.name}</Link>
              ) : <div className="mt-1 font-semibold text-slate-900">Walk-in</div>}
              {sale.customer?.phone && <div className="text-slate-500">{sale.customer.phone}</div>}
              {sale.receivedByName && <div className="mt-1 text-[0.75rem] text-slate-500">Maal liya: {sale.receivedByName}</div>}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500"><UserCheck className="h-3.5 w-3.5" />Staff</div>
              <div className="mt-1 font-semibold text-slate-900">{sale.staff ?? '—'}</div>
              {sale.shop && <div className="flex items-center gap-1 text-slate-500"><Store className="h-3 w-3" />{sale.shop.name}</div>}
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Cheezein · {sale.items.length}</h3>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {sale.items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 px-3 py-2.5 text-[0.8125rem]">
                  <span className="w-10 shrink-0 text-right font-bold tabular-nums text-slate-900">{qtyText(it.quantity)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5 font-medium text-slate-900">
                      <span>{it.name}{it.variant && <span className="text-slate-500"> · {it.variant}</span>}</span>
                      <LineTierBadge tier={it.priceTier} />
                    </span>
                    <span className="block text-[0.75rem] text-slate-500">{money(it.price)} / {it.unit}{it.returnedQty > 0 && <span className="text-rose-600"> · {qtyText(it.returnedQty)} wapas</span>}</span>
                    <RetailCompare item={it} money={money} />
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{money(it.total)}</span>
                </li>
              ))}
            </ul>
            {extra}
          </section>

          <section className="rounded-xl bg-slate-50 px-4 py-3">
            <dl>
              {sale.discount > 0 && <Row label="Subtotal" value={money(sale.subtotal)} />}
              {sale.discount > 0 && <Row label="Discount" value={`−${money(sale.discount)}`} tone="text-amber-700" />}
              <Row label="Kul" value={money(sale.total)} strong />
              {(sale.payments?.length ?? 0) > 1 || sale.payments?.some((p) => p.method === 'TRADE_IN')
                ? sale.payments!.map((p, i) => (
                  <Row key={i} label={`Mila · ${PAYMENT_LABELS[p.method] ?? p.method}${p.note ? ` (${p.note})` : ''}`} value={money(p.amount)} />
                ))
                : <Row label={`Mila · ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}`} value={money(sale.paidAmount)} />}
              {sale.changeAmount > 0 && <Row label="Return di" value={money(sale.changeAmount)} tone="text-success-700" />}
              {sale.creditAmount > 0 && <Row label="Udhaar" value={money(sale.creditAmount)} tone="text-amber-700" />}
              {sale.refundedAmount > 0 && <Row label="Wapas kiya" value={money(sale.refundedAmount)} tone="text-rose-700" />}
              {!costHidden && !sale.pending && <Row label="Profit" value={`${cost(profit)} (${sale.total > 0 ? ((profit / sale.total) * 100).toFixed(1) : 0}%)`} tone={profit >= 0 ? 'text-success-700' : 'text-rose-700'} />}
            </dl>
          </section>
        </div>

        {!sale.pending && (
          <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 p-4">
            <Link to={receiptLink(sale.id)} className="contents"><Button variant="secondary" leftIcon={<Eye className="h-4 w-4" />}>Receipt</Button></Link>
            <Link to={receiptLink(sale.id, true)} className="contents"><Button leftIcon={<Printer className="h-4 w-4" />}>Print</Button></Link>
            {waLink && <a href={waLink} target="_blank" rel="noreferrer" className="contents"><Button variant="secondary" leftIcon={<MessageCircle className="h-4 w-4" />}>WhatsApp</Button></a>}
            {!voided && sale.status !== 'FULLY_RETURNED' && <Button variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onReturn}>Maal wapas</Button>}
            {!voided && <Button variant="ghost" className="col-span-2 text-rose-700 hover:bg-rose-50" leftIcon={<Undo2 className="h-4 w-4" />} onClick={onVoid}>Poora bill wapas lein (void)</Button>}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
