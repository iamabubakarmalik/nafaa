import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, ExternalLink, Loader2, Printer, RefreshCw, Truck, X, Zap } from 'lucide-react';
import { Button } from '@core/ui/Button';
import { Modal } from '@core/ui/Modal';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, couriersApi, type CourierState, type OnlineOrderDetail } from '../api/online-orders.api';
import { rs, whenText } from '../lib/labels';
import { inputCls } from './ui/kit';

export const COURIERS_KEY = ['courier-accounts'];

const STATE_LABEL: Record<CourierState | 'BOOKING', { label: string; tone: string }> = {
  BOOKING: { label: 'Book ho raha…', tone: 'bg-slate-100 text-slate-600' },
  BOOKED: { label: 'Book ho gaya — pickup ka intezar', tone: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300' },
  PICKED_UP: { label: 'Courier le gaya', tone: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300' },
  IN_TRANSIT: { label: 'Raste me', tone: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  OUT_FOR_DELIVERY: { label: 'Aaj deliver hoga', tone: 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300' },
  ATTEMPTED: { label: 'Customer nahi mila — dobara koshish', tone: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  DELIVERED: { label: 'Deliver ho gaya', tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  RETURNING: { label: 'Wapas aa raha hai', tone: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300' },
  RETURNED: { label: 'Wapas aa gaya (RTO)', tone: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300' },
  CANCELLED: { label: 'Booking cancel', tone: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  UNKNOWN: { label: 'Status nahi mila', tone: 'bg-slate-100 text-slate-600' },
};

/**
 * Order ke andar courier: jura hua courier ho to "PostEx par book karein"
 * (CN + label khud), book ho chuka ho to status, label, refresh, cancel.
 */
export function CourierSection({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const { data: accounts } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  const connected = (accounts ?? []).filter((a) => a.connected && a.active);

  const isClosed = ['CANCELLED', 'REJECTED', 'RETURNED'].includes(o.orderStatus);
  const canBook = !!o.nafaaSaleId && !isClosed && o.orderStatus !== 'DELIVERED' && !o.courierBooked && !o.dispatchedAt;

  const refresh = useMutation({
    mutationFn: () => couriersApi.refresh(o.id),
    onSuccess: (r) => { onChanged(); toast.success(r.label ? `Courier: ${r.label}` : 'Taaza status le liya'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const cancel = useMutation({
    mutationFn: () => couriersApi.cancel(o.id),
    onSuccess: () => { onChanged(); toast.success('Booking cancel ho gayi'); },
    onError: (e) => toast.error(apiErrorMessage(e)),
  });
  const label = useMutation({
    mutationFn: () => couriersApi.openLabel(o.id),
    onError: (e) => toast.error(apiErrorMessage(e, 'Label nahi khula')),
  });

  if (o.courierBooked && o.trackingNumber) {
    const st = STATE_LABEL[(o.courierStatus ?? 'BOOKED') as CourierState] ?? STATE_LABEL.UNKNOWN;
    const history = o.courierTrail?.history ?? [];
    return (
      <section className="rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
        <div className="flex items-start gap-3">
          <Truck className="mt-0.5 h-5 w-5 text-slate-400" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-black text-slate-900 dark:text-white">{o.courierLabel ?? 'Courier'}</span>
              <button
                className="inline-flex items-center gap-1 font-mono text-[13px] font-bold text-slate-700 hover:underline dark:text-slate-200"
                onClick={() => navigator.clipboard?.writeText(o.trackingNumber!).then(() => toast.success('CN copy ho gaya'))}
              >
                {o.trackingNumber} <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={cn('rounded-md px-2 py-0.5 text-[11px] font-black', st.tone)}>{st.label}</span>
              {o.courierTrail?.label && <span className="text-[11px] text-slate-500">“{o.courierTrail.label}”</span>}
              {o.courierStatusAt && <span className="text-[11px] text-slate-400">· {whenText(o.courierStatusAt)}</span>}
            </div>
          </div>
        </div>

        {history.length > 1 && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-bold text-slate-500">Courier ka safar ({history.length})</summary>
            <ol className="mt-2 space-y-1 border-l border-slate-200 pl-3 dark:border-neutral-700">
              {[...history].reverse().map((h, i) => (
                <li key={i} className="text-slate-600 dark:text-slate-300">
                  {h.label}{h.at ? <span className="text-slate-400"> · {h.at}</span> : null}
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="xs" variant="primary" loading={label.isPending} onClick={() => label.mutate()} leftIcon={<Printer className="h-3.5 w-3.5" />}>
            Label print
          </Button>
          <Button size="xs" variant="outline" loading={refresh.isPending} onClick={() => refresh.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Taaza status
          </Button>
          {o.courierSite && (
            <Button size="xs" variant="ghost" onClick={() => window.open(o.courierSite!, '_blank', 'noopener')} leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
              Courier site
            </Button>
          )}
          {o.courierStatus === 'BOOKED' && (
            <Button
              size="xs" variant="ghost" className="text-rose-600" loading={cancel.isPending}
              onClick={() => { if (window.confirm('Courier booking cancel karein? CN khatam ho jayega.')) cancel.mutate(); }}
              leftIcon={<X className="h-3.5 w-3.5" />}
            >
              Booking cancel
            </Button>
          )}
        </div>
        <p className="mt-2 text-[11px] text-slate-400">Nafaa har 30 minute courier se status leta hai — deliver ya wapas (RTO) hote hi order khud update hota hai.</p>
      </section>
    );
  }

  if (!canBook) return null;

  if (!connected.length) {
    return (
      <section className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-neutral-700">
        <Zap className="h-5 w-5 text-slate-400" />
        <div className="flex-1 text-xs text-slate-500">
          <span className="font-bold text-slate-700 dark:text-slate-200">PostEx ya Leopards jorein</span> — phir yahin se ek click me booking, CN aur label.
        </div>
        <Link to="/online-store/couriers" className="text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400">Jorein →</Link>
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 p-4 dark:border-neutral-800">
        <Truck className="h-5 w-5 text-slate-400" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-slate-900 dark:text-white">Courier par book karein</div>
          <div className="text-xs text-slate-500">CN aur label khud banega · COD {o.paymentStatus === 'PAID' ? 'nahi (paid)' : rs(o.total)}</div>
        </div>
        <Button size="sm" variant="primary" onClick={() => setBookOpen(true)} leftIcon={<Zap className="h-3.5 w-3.5" />}>
          {connected.length === 1 ? `${connected[0].name} par book` : 'Book karein'}
        </Button>
      </section>
      {bookOpen && (
        <BookModal
          order={o}
          couriers={connected.map((c) => ({ code: c.code, name: c.name, defaultWeightKg: c.settings?.defaultWeightKg ?? null }))}
          onClose={() => setBookOpen(false)}
          onBooked={(tn, name) => {
            setBookOpen(false);
            onChanged();
            qc.invalidateQueries({ queryKey: COURIERS_KEY });
            toast.success(`${name} par book ho gaya · CN ${tn}`, {
              description: 'Label print karke parcel par lagayein',
              action: { label: 'Label print', onClick: () => couriersApi.openLabel(o.id).catch((e) => toast.error(apiErrorMessage(e))) },
            });
          }}
        />
      )}
    </>
  );
}

function BookModal({ order: o, couriers, onClose, onBooked }: {
  order: OnlineOrderDetail;
  couriers: { code: string; name: string; defaultWeightKg: number | null }[];
  onClose: () => void;
  onBooked: (trackingNumber: string, courierName: string) => void;
}) {
  const [courier, setCourier] = useState(couriers[0].code);
  const current = couriers.find((c) => c.code === courier)!;
  const pieces0 = o.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || 1;
  const [weight, setWeight] = useState(String(current.defaultWeightKg ?? 0.5));
  const [pieces, setPieces] = useState(String(pieces0));
  const [cod, setCod] = useState(String(o.paymentStatus === 'PAID' ? 0 : Math.round(o.total)));
  const [notes, setNotes] = useState('');
  const [cityId, setCityId] = useState('');
  const [cityQ, setCityQ] = useState('');

  const { data: opts, isLoading: optsLoading, error: optsError } = useQuery({
    queryKey: ['courier-options', courier],
    queryFn: () => couriersApi.options(courier),
    staleTime: 30 * 60_000,
  });

  // Customer ka shehar list me khud dhoondo
  useEffect(() => {
    setWeight(String(current.defaultWeightKg ?? 0.5));
    if (!opts) return;
    const key = (s?: string | null) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '');
    const hit = opts.cities.find((c) => key(c.name) === key(o.customerCity));
    setCityId(hit?.id ?? '');
    setCityQ('');
  }, [opts, courier]); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(() => {
    const t = cityQ.trim().toLowerCase();
    return (opts?.cities ?? []).filter((c) => !t || c.name.toLowerCase().includes(t)).slice(0, 300);
  }, [opts, cityQ]);

  const book = useMutation({
    mutationFn: () => couriersApi.book(o.id, {
      courier, cityId: cityId || undefined, weightKg: Number(weight), pieces: Number(pieces), codAmount: Number(cod), notes: notes.trim() || undefined,
    }),
    onSuccess: (r) => onBooked(r.trackingNumber, current.name),
    onError: (e) => toast.error(apiErrorMessage(e, 'Booking nahi hui')),
  });

  const cityName = opts?.cities.find((c) => c.id === cityId)?.name;
  const valid = !!cityId && Number(weight) > 0 && Number(pieces) >= 1 && Number(cod) >= 0;

  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={`Order #${o.externalOrderNumber ?? o.externalOrderId} — courier booking`}
      description={`${o.customerName} · ${o.customerPhone ?? 'phone nahi'} · ${[o.customerAddress, o.customerCity].filter(Boolean).join(', ')}`}
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{cityName ? `${current.name} → ${cityName}` : 'Shehar chunein'}</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Chhoro</Button>
            <Button variant="primary" loading={book.isPending} disabled={!valid} onClick={() => book.mutate()} leftIcon={<Zap className="h-4 w-4" />}>
              Book karein
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {couriers.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {couriers.map((c) => (
              <button
                key={c.code}
                onClick={() => setCourier(c.code)}
                className={cn('rounded-lg border px-3 py-1.5 text-sm font-bold',
                  c.code === courier ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900' : 'border-slate-200 text-slate-700 dark:border-neutral-700 dark:text-slate-200')}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
            Shehar {o.customerCity ? <span className="font-normal text-slate-400">(customer ne likha: {o.customerCity})</span> : null}
          </span>
          {optsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {current.name} ke shehar aa rahe hain…</div>
          ) : optsError ? (
            <div className="text-xs text-rose-600">{apiErrorMessage(optsError)}</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={cityQ} onChange={(e) => setCityQ(e.target.value)} placeholder="Shehar dhoondein…" className={inputCls} />
              <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={inputCls}>
                <option value="">— chunein —</option>
                {cityId && !cities.some((c) => c.id === cityId) && cityName && <option value={cityId}>{cityName}</option>}
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Wazan (kg)</span>
            <input type="number" min="0.01" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Pieces</span>
            <input type="number" min="1" step="1" value={pieces} onChange={(e) => setPieces(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">COD (Rs)</span>
            <input type="number" min="0" step="1" value={cod} onChange={(e) => setCod(e.target.value)} className={inputCls} />
          </label>
        </div>
        {Number(cod) !== Math.round(o.total) && o.paymentStatus !== 'PAID' && (
          <p className="-mt-2 text-[11px] font-semibold text-amber-600">Order ka total {rs(o.total)} hai — COD alag rakh rahe hain</p>
        )}

        <label className="block">
          <span className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">Courier ke liye note (optional)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fragile, call karke aayein…" className={inputCls} maxLength={200} />
        </label>
      </div>
    </Modal>
  );
}
