/** Side panel with one return: items and stock result, money, people, and its actions. */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { PackageCheck, PackageX, Printer, Receipt, RotateCcw, ShieldCheck, Store, User, UserCheck, X } from 'lucide-react';
import { Button, IconButton } from '@/design-system/components';
import { receiptLink } from '@modules/sales/history/receiptPrefs';
import type { ReturnRow } from '../api/returns.api';
import { methodLabel, qtyText } from './meta';

const full = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(v));
const short = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium' }).format(new Date(v));

function Row({ label, value, strong, tone }: { label: string; value: ReactNode; strong?: boolean; tone?: string }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1 text-[0.875rem] ${strong ? 'border-t border-slate-200 pt-2' : ''}`}>
      <dt className={strong ? 'font-semibold text-slate-900' : 'text-slate-500'}>{label}</dt>
      <dd className={`tabular-nums ${strong ? 'text-xl font-bold text-slate-900' : `font-medium ${tone ?? 'text-slate-900'}`}`}>{value}</dd>
    </div>
  );
}

export function ReturnDrawer({ r, money, onPrint, onMore, moreLoading, onClose }: {
  r: ReturnRow;
  money: (n: number) => string;
  onPrint: () => void;
  /** Return more from the same bill. */
  onMore: () => void;
  moreLoading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])')) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const billOpen = r.sale.status !== 'FULLY_RETURNED' && r.sale.status !== 'VOIDED';

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label={`Wapsi ${r.returnNumber}`}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="font-mono text-lg font-semibold text-slate-900">{r.returnNumber}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[0.6875rem] font-medium text-orange-700 ring-1 ring-orange-200"><RotateCcw className="h-3 w-3" />Wapsi</span>
            </div>
            <p className="mt-0.5 text-[0.8125rem] text-slate-500">{full(r.returnedAt)}</p>
          </div>
          <IconButton label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <Link to={receiptLink(r.sale.id)} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-[0.8125rem] ring-1 ring-slate-100 transition hover:bg-brand-50 hover:ring-brand-100">
            <Receipt className="h-5 w-5 shrink-0 text-slate-400" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500">Asal bill</span>
              <span className="block font-mono font-semibold text-slate-900">{r.sale.saleNumber}</span>
              <span className="block text-slate-500">{short(r.sale.soldAt)} · {money(r.sale.total)} · {methodLabel(r.sale.paymentMethod)}</span>
            </span>
            <span className="text-[0.75rem] font-semibold text-brand-700">Kholein →</span>
          </Link>

          <div className="grid grid-cols-2 gap-2 text-[0.8125rem]">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500"><User className="h-3.5 w-3.5" />Customer</div>
              {r.sale.customer ? (
                <Link to={`/customers/${r.sale.customer.id}`} className="mt-1 block font-semibold text-slate-900 hover:text-brand-700">{r.sale.customer.name}</Link>
              ) : <div className="mt-1 font-semibold text-slate-900">Walk-in</div>}
              {r.sale.customer?.phone && <div className="text-slate-500">{r.sale.customer.phone}</div>}
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-1.5 text-[0.6875rem] font-medium uppercase tracking-wide text-slate-500"><UserCheck className="h-3.5 w-3.5" />Kis ne ki</div>
              <div className="mt-1 font-semibold text-slate-900">{r.createdBy?.fullName ?? '—'}</div>
              {r.approvedBy && <div className="flex items-center gap-1 text-emerald-700"><ShieldCheck className="h-3 w-3" />{r.approvedBy} se manzoor</div>}
              {r.shop && <div className="flex items-center gap-1 text-slate-500"><Store className="h-3 w-3" />{r.shop.name}</div>}
            </div>
          </div>

          <section>
            <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">Kya wapas aaya · {r.items.length}</h3>
            <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
              {r.items.map((i) => (
                <li key={i.id} className="flex items-start gap-3 px-3 py-2.5 text-[0.8125rem]">
                  <span className="w-10 shrink-0 text-right font-bold tabular-nums text-slate-900">{qtyText(i.quantity)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-slate-900">{i.name}{i.variant && <span className="text-slate-500"> · {i.variant}</span>}</span>
                    <span className="block text-[0.75rem] text-slate-500">{money(i.refundPrice)} / {i.unit}{i.soldQty != null && ` · ${qtyText(i.soldQty)} bika tha`}</span>
                    {i.units.length > 0 && <span className="block font-mono text-[0.6875rem] text-slate-500">{i.units.join(', ')}</span>}
                    <span className="mt-1 flex flex-wrap gap-1">
                      {i.restockedQty > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.6875rem] font-medium text-emerald-700 ring-1 ring-emerald-200"><PackageCheck className="h-3 w-3" />{qtyText(i.restockedQty)} stock me wapas</span>}
                      {i.writtenOffQty > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[0.6875rem] font-medium text-rose-700 ring-1 ring-rose-200"><PackageX className="h-3 w-3" />{qtyText(i.writtenOffQty)} kharab</span>}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{money(i.total)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl bg-slate-50 px-4 py-3">
            <dl>
              <Row label="Kaise wapas" value={methodLabel(r.refundMethod)} />
              {r.khataAmount > 0 && <Row label="Khate se kam" value={money(r.khataAmount)} tone="text-blue-700" />}
              {r.khataAmount > 0 && <Row label="Haath me diye" value={money(r.payout)} />}
              <Row label="Kul wapas" value={money(r.refundAmount)} strong />
            </dl>
          </section>

          {(r.reason || r.notes) && (
            <section className="space-y-1.5 text-[0.8125rem]">
              {r.reason && <p><span className="text-slate-500">Wajah: </span><span className="font-medium text-slate-900">{r.reason}</span></p>}
              {r.notes && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 text-slate-700 ring-1 ring-slate-200">{r.notes}</p>}
            </section>
          )}
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-slate-200 p-4">
          <Button leftIcon={<Printer className="h-4 w-4" />} onClick={onPrint}>Parchi print</Button>
          {billOpen
            ? <Button variant="secondary" leftIcon={<RotateCcw className="h-4 w-4" />} onClick={onMore} loading={moreLoading}>Isi bill se aur</Button>
            : <Link to={receiptLink(r.sale.id)} className="contents"><Button variant="secondary" leftIcon={<Receipt className="h-4 w-4" />}>Bill dekhein</Button></Link>}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
