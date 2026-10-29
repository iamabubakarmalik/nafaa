/**
 * Side drawer with one order: lines in packs and pieces, free goods and the
 * scheme behind them, the credit warning from booking, where and when it was
 * booked, and the linked bill and load sheet. Actions follow the status.
 * J / K move through the list, Esc closes.
 */

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, BadgeCheck, ChevronDown, ChevronUp, Clock, ExternalLink, FileText, Gift, MapPin, Pencil, Printer, Receipt, Truck, X, XCircle,
} from 'lucide-react';
import { Alert, Button, IconButton, Kbd, Skeleton } from '@/design-system/components';
import { isTyping } from '@core/lib/shortcuts';
import { DIST_KEY, distributionApi, type OrderDetail } from '../api/distribution.api';
import { dayTime, ORDER_STATUS, OUTCOME, packText, partyName, rs, trim } from '../lib/meta';
import { Pill } from './parts';

const innerModalOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])');

export interface DrawerActions {
  canManage: boolean;
  canBook: boolean;
  canLoad: boolean;
  busy?: boolean;
  onEdit: (o: OrderDetail) => void;
  onApprove: (o: OrderDetail) => void;
  onInvoice: (o: OrderDetail) => void;
  onLoad: (o: OrderDetail) => void;
  onCancel: (o: OrderDetail) => void;
  onPrint: (o: OrderDetail) => void;
}

export function OrderDrawer({ orderId, onClose, onStep, actions }: {
  orderId: string;
  onClose: () => void;
  onStep?: (dir: 1 | -1) => void;
  actions: DrawerActions;
}) {
  const q = useQuery({ queryKey: [DIST_KEY, 'order', orderId], queryFn: () => distributionApi.order(orderId) });
  const o = q.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (innerModalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') onClose();
      if (isTyping() || !onStep) return;
      if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') { e.preventDefault(); onStep(1); }
      if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') { e.preventDefault(); onStep(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end print:hidden">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label="Order ki details"
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-1.5 text-[0.75rem] text-slate-500">
          <span className="hidden items-center gap-1 sm:inline-flex">{onStep && <><Kbd>J</Kbd> agla · <Kbd>K</Kbd> pichla · </>}<Kbd>Esc</Kbd> band</span>
          <span className="ml-auto flex gap-1">
            {onStep && <>
              <IconButton size="sm" label="Pichla order (K)" onClick={() => onStep(-1)}><ChevronUp className="h-4 w-4" /></IconButton>
              <IconButton size="sm" label="Agla order (J)" onClick={() => onStep(1)}><ChevronDown className="h-4 w-4" /></IconButton>
            </>}
            <IconButton size="sm" label="Band karein" onClick={onClose}><X className="h-4 w-4" /></IconButton>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {!o ? <div className="space-y-3 p-5"><Skeleton className="h-16 rounded-2xl" /><Skeleton className="h-40 rounded-2xl" /><Skeleton className="h-24 rounded-2xl" /></div>
            : <Body o={o} />}
        </div>
        {o && <Footer o={o} a={actions} />}
      </aside>
    </div>,
    document.body,
  );
}

function Body({ o }: { o: OrderDetail }) {
  const st = ORDER_STATUS[o.status];
  const c = o.customer;
  const map = o.latitude != null && o.longitude != null ? `https://www.google.com/maps?q=${o.latitude},${o.longitude}` : null;
  const free = o.items.filter((i) => i.freeBaseQty > 0);
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[1.125rem] font-bold text-slate-900">{o.orderNumber}</h2>
          <Pill tone={st.tone}>{st.label}</Pill>
          {o.deliveryStatus && o.deliveryStatus !== o.status && <Pill tone={OUTCOME[o.deliveryStatus].tone}>{OUTCOME[o.deliveryStatus].label}</Pill>}
        </div>
        <p className="mt-1 text-[0.9375rem] font-semibold text-slate-800">{partyName(c)}</p>
        <p className="text-[0.8125rem] text-slate-500">{[c?.businessName ? c.name : null, c?.phone, c?.address].filter(Boolean).join(' · ')}</p>
      </header>

      {o.creditWarning && <Alert tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>{o.creditWarning}</Alert>}
      {o.invoiceError && <Alert tone="danger" icon={<XCircle className="h-4 w-4" />}>Invoice nahi bana: {o.invoiceError}</Alert>}
      {o.cancelReason && o.status === 'CANCELLED' && <Alert tone="info">Cancel ki wajah: {o.cancelReason}</Alert>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-slate-50 p-3 text-[0.8125rem]">
        <Item label="Booked" icon={<Clock className="h-3.5 w-3.5" />}>{dayTime(o.bookedAt)} · {o.bookedByName ?? '—'}</Item>
        <Item label="Jagah" icon={<MapPin className="h-3.5 w-3.5" />}>
          {map ? <a href={map} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline">Map par dekhein<ExternalLink className="h-3 w-3" /></a> : 'GPS nahi'}
          {o.gpsAccuracy != null && <span className="text-slate-500"> · ±{Math.round(o.gpsAccuracy)} m</span>}
        </Item>
        <Item label="Route">{o.routeName ?? '—'}</Item>
        <Item label="Godown">{o.shopName ?? '—'}</Item>
        {o.deliveryDate && <Item label="Delivery date">{dayTime(o.deliveryDate).split(',')[0]}</Item>}
        {o.approvedAt && <Item label="Approve">{dayTime(o.approvedAt)} · {o.approvedByName ?? ''}</Item>}
        <Item label="Invoice" icon={<Receipt className="h-3.5 w-3.5" />}>
          {o.saleId ? <Link to={`/sales/${o.saleId}`} className="font-semibold text-brand-700 hover:underline">{o.saleNumber}</Link> : 'Abhi nahi bana'}
        </Item>
        <Item label="Load sheet" icon={<Truck className="h-3.5 w-3.5" />}>
          {o.loadSheetId ? <Link to={`/distribution/load-sheets/${o.loadSheetId}`} className="font-semibold text-brand-700 hover:underline">{o.loadSheetNumber}</Link> : '—'}
        </Item>
        {c && <Item label="Khata">{rs(c.balance)}{c.creditLimit ? <span className="text-slate-500"> / had {rs(c.creditLimit)}</span> : null}{c.creditDays ? <span className="text-slate-500"> · {c.creditDays} din</span> : null}</Item>}
      </dl>

      <section className="overflow-hidden rounded-2xl ring-1 ring-slate-200/80">
        <table className="w-full text-[0.8125rem]">
          <thead className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
            <tr><th className="px-3 py-2">Product</th><th className="px-2 py-2 text-right">Quantity</th><th className="px-2 py-2 text-right">Rate</th><th className="px-3 py-2 text-right">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {o.items.map((i) => (
              <tr key={i.id} className="align-top">
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900">{i.productName}{i.variantName ? ` · ${i.variantName}` : ''}</div>
                  {i.conversionRate > 1 && <div className="text-[0.6875rem] text-slate-500">{trim(i.baseQty)} {i.baseUnit}</div>}
                  {i.schemeNote && <div className="mt-0.5 inline-flex items-center gap-1 text-[0.6875rem] font-medium text-violet-700"><Gift className="h-3 w-3" />{i.schemeNote}</div>}
                  {i.deliveredBaseQty != null && i.deliveredBaseQty < i.baseQty && <div className="text-[0.6875rem] text-rose-600">Wapas: {trim(i.baseQty - i.deliveredBaseQty)} {i.baseUnit}</div>}
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{trim(i.qty)} {i.unitName ?? i.baseUnit}</td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums text-slate-600">{rs(i.price)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                  <div className="font-semibold text-slate-900">{rs(i.total)}</div>
                  {i.schemeDiscount + i.discount > 0 && <div className="text-[0.6875rem] text-success-700">−{rs(i.schemeDiscount + i.discount)}</div>}
                </td>
              </tr>
            ))}
            {free.map((i) => (
              <tr key={`f-${i.id}`} className="bg-violet-50/40">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900"><Gift className="h-3.5 w-3.5 text-violet-600" />{i.freeProductName ?? i.productName}</div>
                  <div className="text-[0.6875rem] text-slate-500">Free · {i.schemeNote}</div>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums" colSpan={2}>{packText(i.freeBaseQty, i.freeProductId ? null : i.conversionRate, i.unitName, i.baseUnit)}</td>
                <td className="px-3 py-2 text-right font-semibold text-violet-700">Free</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="space-y-1 border-t border-slate-100 bg-slate-50/60 px-3 py-2.5 text-[0.8125rem]">
          <Row label="Gross" value={rs(o.subtotal)} />
          {o.schemeDiscount > 0 && <Row label="Scheme discount" value={`−${rs(o.schemeDiscount)}`} />}
          {o.discount > 0 && <Row label="Discount" value={`−${rs(o.discount)}`} />}
          <Row label="Total" value={rs(o.total)} strong />
          {o.returnsValue > 0 && <Row label="Wapas aaya" value={`−${rs(o.returnsValue)}`} />}
          {o.cashCollected > 0 && <Row label="Delivery par cash" value={rs(o.cashCollected)} />}
        </div>
      </section>
      {o.note && <p className="rounded-2xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600"><FileText className="mr-1 inline h-3.5 w-3.5" />{o.note}</p>}
    </div>
  );
}

function Footer({ o, a }: { o: OrderDetail; a: DrawerActions }) {
  const s = o.status;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3">
      {s === 'BOOKED' && (a.canManage || a.canBook) && <Button size="sm" variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => a.onEdit(o)}>Badlein</Button>}
      {(s === 'BOOKED' || s === 'APPROVED') && a.canManage && <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => a.onCancel(o)}>Cancel</Button>}
      {o.saleId && <Button size="sm" variant="secondary" leftIcon={<Printer className="h-4 w-4" />} onClick={() => a.onPrint(o)}>Invoice print</Button>}
      <span className="flex-1" />
      {s === 'BOOKED' && a.canManage && <Button size="sm" loading={a.busy} leftIcon={<BadgeCheck className="h-4 w-4" />} onClick={() => a.onApprove(o)}>Approve + Invoice</Button>}
      {s === 'APPROVED' && a.canManage && <Button size="sm" loading={a.busy} leftIcon={<Receipt className="h-4 w-4" />} onClick={() => a.onInvoice(o)}>Invoice banayein</Button>}
      {s === 'INVOICED' && !o.loadSheetId && a.canLoad && <Button size="sm" leftIcon={<Truck className="h-4 w-4" />} onClick={() => a.onLoad(o)}>Load sheet me</Button>}
    </div>
  );
}

function Item({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{icon}{label}</dt>
      <dd className="mt-0.5 text-slate-800">{children}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? 'flex justify-between border-t border-slate-200 pt-1.5 text-[0.9375rem] font-bold text-slate-900' : 'flex justify-between text-slate-600'}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}
