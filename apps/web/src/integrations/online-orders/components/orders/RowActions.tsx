/**
 * The row "⋯" menu on the orders board: edit, assign, follow-up, tag, note,
 * replacement, split, courier booking and label, airway bill, cancel
 * booking, re-dispatch, courier claim, print slip, open on the channel, and
 * delete / restore.
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarClock, ExternalLink, FileText, MoreHorizontal, Package, Pencil, Repeat, RotateCcw, Scissors, ShieldAlert, StickyNote, Tag, Trash2, Truck, UserPlus,
  Printer, Send, ShieldEllipsis, XCircle,
} from 'lucide-react';
import { cn } from '@core/lib/cn';
import { useDismissible } from '@core/print/useDismissible';
import type { CourierAccount, OnlineOrder } from '../../api/online-orders.api';
import { openInvoices } from '../../lib/orders';
import { orderOptions, type QuickAction } from './useOrderActions';
import type { ToolKind } from './OrderTools';
import { useBoardRefresh } from './useMoveOrder';
import { CancelBookingDialog, ClaimDialog, RedispatchDialog, canRedispatch } from '../dispatch/DispatchDialogs';
import { t } from '@core/i18n';

/** Admin link for a Shopify order, from the store's address. */
export function shopifyAdminUrl(o: OnlineOrder, siteUrl?: string | null) {
  if (o.integration?.type !== 'SHOPIFY' || !siteUrl) return null;
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  return `${base.replace(/\/+$/, '')}/admin/orders/${o.externalOrderId}`;
}

/** Orders whose items and amounts can still be edited. */
export const canEdit = (o: OnlineOrder) => !o.deletedAt && !['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus)
  && !(o.orderStatus === 'DELIVERED' && o.codSettledAt);

export function RowActions({ order: o, siteUrl, couriers, onTool, onQuick, onOpen, onDelete, onRestore, onPermanent }: {
  order: OnlineOrder;
  siteUrl?: string | null;
  couriers: CourierAccount[];
  onTool: (kind: ToolKind) => void;
  onQuick: (a: QuickAction) => void;
  onOpen: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanent: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dlg, setDlg] = useState<'redispatch' | 'claim' | 'cancel' | null>(null);
  const refresh = useBoardRefresh();
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  useDismissible(ref, open, () => setOpen(false));
  const opt = orderOptions(o);
  const shopUrl = shopifyAdminUrl(o, siteUrl);
  const deleted = !!o.deletedAt;
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-start text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-50';
  const icon = 'h-4 w-4 text-slate-500';

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t('Aur kaam')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div role="menu" className="absolute end-0 top-full z-40 mt-1 max-h-[24rem] w-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {deleted ? (
            <>
              <button type="button" role="menuitem" className={item} onClick={pick(onRestore)}><RotateCcw className={icon} />{t('Wapas layein')}</button>
              <button type="button" role="menuitem" className={cn(item, 'text-rose-700 hover:bg-rose-50')} onClick={pick(onPermanent)}><Trash2 className="h-4 w-4" />{t('Hamesha ke liye mitayein')}</button>
            </>
          ) : (
            <>
              {canEdit(o) && <button type="button" role="menuitem" className={item} onClick={pick(() => navigate(`/online-orders/${o.id}/edit`))}><Pencil className={icon} />{t('Order edit karein')}</button>}
              <button type="button" role="menuitem" className={item} onClick={pick(() => onTool('assign'))}><UserPlus className={icon} />{t('Assign')}</button>
              <button type="button" role="menuitem" className={item} onClick={pick(() => onTool('follow-up'))}><CalendarClock className={icon} />{t('Follow-up')}</button>
              <button type="button" role="menuitem" className={item} onClick={pick(() => onTool('tag'))}><Tag className={icon} />{t('Tag')}</button>
              <button type="button" role="menuitem" className={item} onClick={pick(() => onTool('note'))}><StickyNote className={icon} />{t('Note')}</button>
              <button type="button" role="menuitem" className={item} onClick={pick(() => navigate(`/online-orders/new?replacementOf=${o.id}`))}><Repeat className={icon} />{t('Replacement order')}</button>
              {o.orderStatus === 'PENDING' && o.items.length > 1 && <button type="button" role="menuitem" className={item} onClick={pick(() => onTool('split'))}><Scissors className={icon} />{t('Order alag karein (split)')}</button>}
              <div className="my-1 h-px bg-slate-100" />
              {opt.book && couriers.map((c) => (
                <button key={c.code} type="button" role="menuitem" className={item} onClick={pick(() => onQuick({ kind: 'book', courier: c.code }))}>
                  <Truck className="h-4 w-4 text-sky-600" />{t('{{name}} par book', { name: c.name })}
                </button>
              ))}
              {opt.label && <button type="button" role="menuitem" className={item} onClick={pick(() => onQuick({ kind: 'label' }))}><Tag className={icon} />{t('Courier label print')}</button>}
              {o.trackingNumber && <button type="button" role="menuitem" className={item} onClick={pick(() => window.open(`/online-orders/labels?ids=${o.id}`, '_blank'))}><Printer className={icon} />{t('Airway bill (Nafaa label)')}</button>}
              {o.trackingNumber && !['DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus) && <button type="button" role="menuitem" className={item} onClick={pick(() => setDlg('cancel'))}><XCircle className={icon} />{t('Booking cancel / CN hatayein')}</button>}
              {canRedispatch(o) && <button type="button" role="menuitem" className={item} onClick={pick(() => setDlg('redispatch'))}><Send className={icon} />{t('Re-dispatch (naya CN)')}</button>}
              {!!o.dispatchedAt && <button type="button" role="menuitem" className={item} onClick={pick(() => setDlg('claim'))}><ShieldEllipsis className={icon} />{t('Courier claim')}</button>}
              <button type="button" role="menuitem" className={item} onClick={pick(() => openInvoices([o.id]))}><FileText className={icon} />{t('Slip print')}</button>
              {shopUrl && <a role="menuitem" className={item} href={shopUrl} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}><ExternalLink className={icon} />{t('Shopify me kholein')}</a>}
              <button type="button" role="menuitem" className={item} onClick={pick(onOpen)}><Package className={icon} />{t('Poori details')}</button>
              <div className="my-1 h-px bg-slate-100" />
              {o.customerPhone && <button type="button" role="menuitem" className={cn(item, 'text-rose-700 hover:bg-rose-50')} onClick={pick(() => onTool('report-scam'))}><ShieldAlert className="h-4 w-4" />{t('Scammer report karein')}</button>}
              <button type="button" role="menuitem" className={cn(item, 'text-rose-700 hover:bg-rose-50')} onClick={pick(onDelete)}><Trash2 className="h-4 w-4" />{t('Delete')}</button>
            </>
          )}
        </div>
      )}
      {dlg === 'redispatch' && <RedispatchDialog order={o} onClose={() => setDlg(null)} onDone={() => refresh(o.id)} />}
      {dlg === 'claim' && <ClaimDialog order={o} onClose={() => setDlg(null)} onDone={() => refresh(o.id)} />}
      {dlg === 'cancel' && <CancelBookingDialog orders={[o]} onClose={() => setDlg(null)} onDone={() => refresh(o.id)} />}
    </div>
  );
}
