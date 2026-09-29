import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowRight, Ban, CheckCircle2, Loader2, Truck, X, Zap } from 'lucide-react';
import { apiErrorMessage, couriersApi, onlineOrdersApi, type OnlineOrder } from '../api/online-orders.api';
import { LIVE_ORDERS_KEY } from '../hooks/useLiveOnlineOrders';
import { COURIERS_KEY } from './couriers/CourierForms';
import { cn } from '@core/lib/cn';

type Action = 'accept' | 'next' | 'confirm' | 'cancel' | 'book';

const isClosed = (o: OnlineOrder) => ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);

/**
 * Chune hue orders par ek saath kaam — neeche chipki patti. Har order ka
 * natija alag: jo ho gaye woh chune se nikal jate hain, jo reh gaye un ki
 * wajah dikhti hai.
 */
export function BulkBar({ orders, picked, onClear, onKeep }: {
  orders: OnlineOrder[];
  picked: Set<string>;
  onClear: () => void;
  /** Sirf ye ids chune rehne dein (jo fail hue) */
  onKeep: (ids: string[]) => void;
}) {
  const qc = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const { data: accounts } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  const couriers = (accounts ?? []).filter((a) => a.connected && a.active);
  const [courier, setCourier] = useState('');

  const sel = orders.filter((o) => picked.has(o.id));
  const n = {
    accept: sel.filter((o) => o.orderStatus === 'PENDING').length,
    next: sel.filter((o) => !!o.nextStatus && o.nafaaSaleId).length,
    confirm: sel.filter((o) => o.isCod && o.paymentStatus !== 'PAID' && !isClosed(o) && !o.dispatchedAt && o.confirmation?.result !== 'CONFIRMED').length,
    book: sel.filter((o) => o.nafaaSaleId && ['CONFIRMED', 'PREPARING', 'READY'].includes(o.orderStatus) && !o.courierBooked && !o.dispatchedAt).length,
    cancel: sel.filter((o) => !isClosed(o) && o.orderStatus !== 'DELIVERED' && !o.dispatchedAt).length,
  };

  const run = useMutation({
    mutationFn: async (action: Action) => {
      if (action === 'book') {
        const code = courier || couriers[0]?.code;
        if (!code) throw new Error('Pehle Couriers se koi courier jorein');
        const ids = sel.filter((o) => o.nafaaSaleId && !o.courierBooked && !o.dispatchedAt).map((o) => o.id);
        const r = await couriersApi.bulkBook(code, { orderIds: ids });
        return { done: r.booked, failed: r.failed, results: r.results.map((x) => ({ id: x.orderId, ok: x.ok, error: x.error })) };
      }
      return onlineOrdersApi.bulk(action, [...picked], action === 'cancel' ? reason.trim() : undefined);
    },
    onSuccess: (r, action) => {
      qc.invalidateQueries({ queryKey: ['online-orders'] });
      qc.invalidateQueries({ queryKey: LIVE_ORDERS_KEY });
      qc.invalidateQueries({ queryKey: COURIERS_KEY });
      const label = { accept: 'accept — bill bane', next: 'agle qadam par', confirm: 'confirm', cancel: 'cancel', book: 'courier par book' }[action];
      if (r.done) toast.success(`${r.done} order ${label} ✓`);
      const failed = r.results.filter((x) => !x.ok);
      if (failed.length) {
        const byId = new Map(orders.map((o) => [o.id, o]));
        toast.error(`${failed.length} order nahi hue`, {
          description: failed.slice(0, 3).map((f) => `#${byId.get(f.id)?.externalOrderNumber ?? byId.get(f.id)?.externalOrderId ?? ''}: ${f.error}`).join('\n'),
          duration: 10_000,
        });
        onKeep(failed.map((f) => f.id));
      } else {
        onClear();
      }
      setCancelOpen(false);
      setReason('');
    },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });

  if (!picked.size) return null;
  const busy = run.isPending;

  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 print:hidden">
      <div className="flex max-w-full flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2.5 text-white shadow-2xl ring-1 ring-white/10">
        <span className="px-1 text-sm font-black">{picked.size} chune</span>
        {cancelOpen ? (
          <>
            <input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Cancel ki wajah (jaise: Fake order)"
              className="h-8 w-56 rounded-lg border border-white/20 bg-white/10 px-2.5 text-xs text-white placeholder:text-white/50 outline-none" />
            <Pill tone="danger" disabled={!reason.trim() || busy} onClick={() => run.mutate('cancel')}>{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />} Haan, {n.cancel} cancel</Pill>
            <Pill onClick={() => setCancelOpen(false)}>Rehne dein</Pill>
          </>
        ) : (
          <>
            {n.accept > 0 && <Pill tone="success" disabled={busy} onClick={() => run.mutate('accept')}><CheckCircle2 className="h-3.5 w-3.5" /> {n.accept} accept</Pill>}
            {n.confirm > 0 && <Pill disabled={busy} onClick={() => run.mutate('confirm')}><CheckCircle2 className="h-3.5 w-3.5" /> {n.confirm} confirm</Pill>}
            {n.next > 0 && <Pill disabled={busy} onClick={() => run.mutate('next')}><ArrowRight className="h-3.5 w-3.5" /> {n.next} agla qadam</Pill>}
            {n.book > 0 && couriers.length > 0 && (
              <span className="inline-flex items-center gap-1">
                {couriers.length > 1 && (
                  <select value={courier || couriers[0].code} onChange={(e) => setCourier(e.target.value)}
                    className="h-8 rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white outline-none">
                    {couriers.map((c) => <option key={c.code} value={c.code} className="text-slate-900">{c.name}</option>)}
                  </select>
                )}
                <Pill disabled={busy} onClick={() => run.mutate('book')}><Truck className="h-3.5 w-3.5" /> {n.book} book{couriers.length === 1 ? ` (${couriers[0].name})` : ''}</Pill>
              </span>
            )}
            {n.cancel > 0 && <Pill tone="danger" disabled={busy} onClick={() => setCancelOpen(true)}><Ban className="h-3.5 w-3.5" /> Cancel</Pill>}
            {busy && <span className="inline-flex items-center gap-1 text-xs text-white/70"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Ho raha hai…</span>}
            {!busy && n.accept + n.next + n.confirm + n.book + n.cancel === 0 && <span className="text-xs text-white/60"><Zap className="mr-1 inline h-3 w-3" />In orders par abhi koi ek-saath kaam nahi</span>}
          </>
        )}
        <button onClick={onClear} className="ml-1 rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label="Chhoro"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function Pill({ tone, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'success' | 'danger' }) {
  return (
    <button {...rest}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50',
        tone === 'success' ? 'bg-emerald-500 hover:bg-emerald-400' : tone === 'danger' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-white/10 hover:bg-white/20',
        className)} />
  );
}
