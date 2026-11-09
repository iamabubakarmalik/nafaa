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
import { Menu, MenuItem, MenuSeparator } from '@/design-system/components';
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
  const ref = useRef<HTMLButtonElement>(null);
  const navigate = useNavigate();
  const opt = orderOptions(o);
  const shopUrl = shopifyAdminUrl(o, siteUrl);
  const deleted = !!o.deletedAt;
  const pick = (fn: () => void) => () => { setOpen(false); fn(); };

  return (
    <div>
      <button ref={ref} type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} aria-label={t('Aur kaam')}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <Menu open={open} onClose={() => setOpen(false)} anchorRef={ref} width="w-64" label={t('Aur kaam')}>
        {deleted ? (
          <>
            <MenuItem icon={<RotateCcw />} onClick={pick(onRestore)}>{t('Wapas layein')}</MenuItem>
            <MenuItem icon={<Trash2 />} tone="danger" onClick={pick(onPermanent)}>{t('Hamesha ke liye mitayein')}</MenuItem>
          </>
        ) : (
          <>
            {canEdit(o) && <MenuItem icon={<Pencil />} onClick={pick(() => navigate(`/online-orders/${o.id}/edit`))}>{t('Order edit karein')}</MenuItem>}
            <MenuItem icon={<UserPlus />} onClick={pick(() => onTool('assign'))}>{t('Assign')}</MenuItem>
            <MenuItem icon={<CalendarClock />} onClick={pick(() => onTool('follow-up'))}>{t('Follow-up')}</MenuItem>
            <MenuItem icon={<Tag />} onClick={pick(() => onTool('tag'))}>{t('Tag')}</MenuItem>
            <MenuItem icon={<StickyNote />} onClick={pick(() => onTool('note'))}>{t('Note')}</MenuItem>
            <MenuItem icon={<Repeat />} onClick={pick(() => navigate(`/online-orders/new?replacementOf=${o.id}`))}>{t('Replacement order')}</MenuItem>
            {o.orderStatus === 'PENDING' && o.items.length > 1 && <MenuItem icon={<Scissors />} onClick={pick(() => onTool('split'))}>{t('Order alag karein (split)')}</MenuItem>}
            <MenuSeparator />
            {opt.book && couriers.map((c) => (
              <MenuItem key={c.code} icon={<Truck className="!text-sky-600" />} onClick={pick(() => onQuick({ kind: 'book', courier: c.code }))}>{t('{{name}} par book', { name: c.name })}</MenuItem>
            ))}
            {opt.label && <MenuItem icon={<Tag />} onClick={pick(() => onQuick({ kind: 'label' }))}>{t('Courier label print')}</MenuItem>}
            {o.trackingNumber && <MenuItem icon={<Printer />} onClick={pick(() => window.open(`/online-orders/labels?ids=${o.id}`, '_blank'))}>{t('Airway bill (Nafaa label)')}</MenuItem>}
            {o.trackingNumber && !['DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus) && <MenuItem icon={<XCircle />} onClick={pick(() => setDlg('cancel'))}>{t('Booking cancel / CN hatayein')}</MenuItem>}
            {canRedispatch(o) && <MenuItem icon={<Send />} onClick={pick(() => setDlg('redispatch'))}>{t('Re-dispatch (naya CN)')}</MenuItem>}
            {!!o.dispatchedAt && <MenuItem icon={<ShieldEllipsis />} onClick={pick(() => setDlg('claim'))}>{t('Courier claim')}</MenuItem>}
            <MenuItem icon={<FileText />} onClick={pick(() => openInvoices([o.id]))}>{t('Slip print')}</MenuItem>
            {shopUrl && <MenuItem icon={<ExternalLink />} onClick={pick(() => window.open(shopUrl, '_blank', 'noopener'))}>{t('Shopify me kholein')}</MenuItem>}
            <MenuItem icon={<Package />} onClick={pick(onOpen)}>{t('Poori details')}</MenuItem>
            <MenuSeparator />
            {o.customerPhone && <MenuItem icon={<ShieldAlert />} tone="danger" onClick={pick(() => onTool('report-scam'))}>{t('Scammer report karein')}</MenuItem>}
            <MenuItem icon={<Trash2 />} tone="danger" onClick={pick(onDelete)}>{t('Delete')}</MenuItem>
          </>
        )}
      </Menu>
      {dlg === 'redispatch' && <RedispatchDialog order={o} onClose={() => setDlg(null)} onDone={() => refresh(o.id)} />}
      {dlg === 'claim' && <ClaimDialog order={o} onClose={() => setDlg(null)} onDone={() => refresh(o.id)} />}
      {dlg === 'cancel' && <CancelBookingDialog orders={[o]} onClose={() => setDlg(null)} onDone={() => refresh(o.id)} />}
    </div>
  );
}
