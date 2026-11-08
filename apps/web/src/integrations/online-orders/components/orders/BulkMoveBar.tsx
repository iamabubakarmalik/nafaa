/**
 * Bar at the bottom of the board while orders are picked: move all of them
 * to any status, assign, follow-up, tag, courier booking (rate compare),
 * labels, cancel booking, slips, packing list, Excel export, combine, and
 * delete / restore. Each order reports its
 * own result; the ones that failed stay picked with the reason shown.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Download, Eraser, FileText, Loader2, Merge, PackageOpen, Printer, RotateCcw, Tag, Trash2, Truck, UserPlus, X, XCircle } from 'lucide-react';
import { confirmDialog } from '@/design-system/components';
import { usePrinter } from '@core/print';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, couriersApi, type OnlineOrder } from '../../api/online-orders.api';
import { orderBoardApi, type BoardStatus, type BulkResult, type CustomStage } from '../../api/order-board.api';
import { boardEntry, downloadCsv, ordersCsvRows, openInvoices } from '../../lib/orders';
import { ordersDoc } from '../../lib/print';
import { COURIERS_KEY } from '../couriers/CourierForms';
import { MoveDialog, type MoveExtra } from './MoveDialog';
import { OrderToolModal, reportBulk, type ToolKind } from './OrderTools';
import { StatusMenu } from './StatusMenu';
import { useBoardRefresh } from './useMoveOrder';
import { BookCourierDialog } from '../dispatch/BookCourierDialog';
import { CancelBookingDialog } from '../dispatch/DispatchDialogs';
import { t } from '@core/i18n';

export function BulkMoveBar({ orders, picked, custom, deletedView, onClear, onKeep }: {
  orders: OnlineOrder[];
  picked: Set<string>;
  custom: CustomStage[];
  /** On the Deleted tile: restore and permanent delete instead of moves. */
  deletedView: boolean;
  onClear: () => void;
  /** Keep only these ids picked (the ones that failed). */
  onKeep: (ids: string[]) => void;
}) {
  const refresh = useBoardRefresh();
  const { print } = usePrinter();
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<BoardStatus | null>(null);
  const [tool, setTool] = useState<ToolKind | null>(null);
  const [dialog, setDialog] = useState<'book' | 'cancel' | null>(null);
  const { data: accounts } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  const couriers = (accounts ?? []).filter((a) => a.connected && a.active);

  const sel = orders.filter((o) => picked.has(o.id));
  const ids = sel.map((o) => o.id);
  if (!picked.size) return null;

  const bookable = sel.filter((o) => o.nafaaSaleId && ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus) && !o.courierBooked && !o.dispatchedAt);
  const phones = new Set(sel.map((o) => (o.customerPhone ?? '').replace(/\D/g, '').slice(-10)));
  const canCombine = sel.length > 1 && sel.length <= 20 && phones.size === 1 && sel.every((o) => o.orderStatus === 'PENDING' && !o.nafaaSaleId);
  const staged = sel.filter((o) => o.stage).length;

  /** Runs a bulk call, reports it, keeps failures picked. */
  const run = async (call: () => Promise<{ results: BulkResult[] }>, done: string) => {
    setBusy(true);
    try {
      const failed = reportBulk((await call()).results, sel, done);
      if (failed.length) onKeep(failed); else onClear();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const move = (to: BoardStatus, extra: MoveExtra = {}) => {
    const label = boardEntry(to, custom)?.label ?? to;
    void run(async () => {
      const r = await orderBoardApi.bulkMove(ids, to, extra.reason);
      const unmatched = r.results.filter((x) => x.code === 'UNMATCHED_ITEMS').length;
      if (unmatched) toast.message(t('{{count}} orders ke items Nafaa product se jodne hain — order khol kar jorein', { count: unmatched }), { duration: 10_000 });
      return r;
    }, `→ ${label}`);
  };
  const pickMove = (to: BoardStatus) => (to === 'CANCELLED' || to === 'RETURNED' ? setAsk(to) : move(to));

  const booked = sel.filter((o) => o.trackingNumber && !['DELIVERED', 'CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus));
  const afterDialog = (failed: string[]) => { if (failed.length) onKeep(failed); else onClear(); refresh(); };
  const combine = async () => {
    const yes = await confirmDialog({ title: t('{{count}} orders ek karein?', { count: sel.length }), text: t('Sab cheezein sab se purane order me aa jayengi, baqi orders "Deleted" me chale jayenge.'), yes: t('Ek karein') });
    if (!yes) return;
    setBusy(true);
    try { await orderBoardApi.combine(ids); toast.success(t('Orders ek ho gaye')); onClear(); } catch (e) { toast.error(apiErrorMessage(e)); } finally { setBusy(false); refresh(); }
  };
  const remove = async () => {
    const yes = await confirmDialog({ title: t('{{count}} orders delete karein?', { count: sel.length }), text: t('Bill wale orders ka bill void hoga aur stock wapas aayega. "Deleted" se wapas la sakte hain.'), yes: t('Delete'), danger: true });
    if (yes) void run(() => orderBoardApi.bulkTool('delete', ids), t('delete'));
  };
  const permanent = async () => {
    const yes = await confirmDialog({ title: t('{{count}} orders hamesha ke liye mitayein?', { count: sel.length }), text: t('Ye wapas nahi aa sakenge.'), yes: t('Hamesha ke liye mitayein'), danger: true });
    if (!yes) return;
    void run(async () => ({
      results: await Promise.all(ids.map((id) => orderBoardApi.removePermanent(id).then(() => ({ id, ok: true })).catch((e) => ({ id, ok: false, error: apiErrorMessage(e) })))),
    }), t('mita diye'));
  };
  const exportCsv = () => {
    downloadCsv(`orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersCsvRows(sel));
    toast.success(t('{{count}} order CSV me', { count: sel.length }));
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 print:hidden">
      <div className="flex max-h-[40vh] max-w-full flex-wrap items-center gap-2 overflow-y-auto rounded-2xl bg-slate-900 px-3 py-2.5 text-white shadow-2xl ring-1 ring-white/10">
        <span className="px-1 text-sm font-bold">{t('{{count}} chune', { count: picked.size })}</span>
        {deletedView ? (
          <>
            <Pill disabled={busy} onClick={() => void run(() => orderBoardApi.bulkTool('restore', ids), t('wapas aa gaye'))}><RotateCcw className="h-3.5 w-3.5" />{t('Wapas layein')}</Pill>
            <Pill tone="danger" disabled={busy} onClick={() => void permanent()}><Trash2 className="h-3.5 w-3.5" />{t('Hamesha ke liye mitayein')}</Pill>
          </>
        ) : (
          <>
            <StatusMenu dark up align="start" custom={custom} busy={busy} onPick={pickMove} label={t('Status badlein')} />
            {staged > 0 && <Pill disabled={busy} onClick={() => void run(() => orderBoardApi.bulkTool('stage', ids, { stage: null }), t('stage hat gaya'))}><Eraser className="h-3.5 w-3.5" />{t('Normal')}</Pill>}
            <Pill disabled={busy} onClick={() => setTool('assign')}><UserPlus className="h-3.5 w-3.5" />{t('Assign')}</Pill>
            <Pill disabled={busy} onClick={() => setTool('follow-up')}><CalendarClock className="h-3.5 w-3.5" />{t('Follow-up')}</Pill>
            <Pill disabled={busy} onClick={() => setTool('tag')}><Tag className="h-3.5 w-3.5" />{t('Tag')}</Pill>
            {bookable.length > 0 && couriers.length > 0 && (
              <Pill disabled={busy} onClick={() => setDialog('book')}><Truck className="h-3.5 w-3.5" />{t('Book courier ({{count}})', { count: bookable.length })}</Pill>
            )}
            {booked.length > 0 && <Pill disabled={busy} onClick={() => window.open(`/online-orders/labels?ids=${booked.map((o) => o.id).join(',')}`, '_blank')}><Printer className="h-3.5 w-3.5" />{t('Labels')}</Pill>}
            {booked.length > 0 && <Pill disabled={busy} onClick={() => setDialog('cancel')}><XCircle className="h-3.5 w-3.5" />{t('Booking cancel')}</Pill>}
            <Pill disabled={busy} onClick={() => openInvoices(ids)}><FileText className="h-3.5 w-3.5" />{t('Slips')}</Pill>
            <Pill disabled={busy} onClick={() => void print(ordersDoc(sel, t('Packing list'), new Date().toLocaleDateString('en-PK'), '', sel.length))}><PackageOpen className="h-3.5 w-3.5" />{t('Packing list')}</Pill>
            <Pill disabled={busy} onClick={exportCsv}><Download className="h-3.5 w-3.5" />{t('Excel')}</Pill>
            {canCombine && <Pill disabled={busy} onClick={() => void combine()}><Merge className="h-3.5 w-3.5" />{t('Ek karein')}</Pill>}
            <Pill tone="danger" disabled={busy} onClick={() => void remove()}><Trash2 className="h-3.5 w-3.5" />{t('Delete')}</Pill>
          </>
        )}
        {busy && <span className="inline-flex items-center gap-1 text-xs text-white/70"><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('Ho raha hai…')}</span>}
        <button type="button" onClick={onClear} className="ms-1 rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label={t('Chhoro')}><X className="h-4 w-4" /></button>
      </div>
      {ask && boardEntry(ask, custom) && (
        <MoveDialog entry={boardEntry(ask, custom)!} count={ids.length} loading={busy} onClose={() => setAsk(null)}
          onConfirm={(extra) => { const to = ask; setAsk(null); move(to, extra); }} />
      )}
      {dialog === 'book' && <BookCourierDialog orders={bookable} onClose={() => setDialog(null)} onDone={afterDialog} />}
      {dialog === 'cancel' && <CancelBookingDialog orders={booked} onClose={() => setDialog(null)} onDone={afterDialog} />}
      {tool && <OrderToolModal kind={tool} orders={sel} onClose={() => setTool(null)} onDone={(failed) => (failed.length ? onKeep(failed) : onClear())} />}
    </div>
  );
}

function Pill({ tone, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'danger' }) {
  return (
    <button type="button" {...rest}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50',
        tone === 'danger' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-white/10 hover:bg-white/20', className)} />
  );
}
