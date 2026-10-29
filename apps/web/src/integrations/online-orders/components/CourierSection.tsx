import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, ExternalLink, Loader2, Printer, RefreshCw, X, Zap } from 'lucide-react';
import { Alert, Badge, Button, Card, confirmDialog, controlClass, Field, Input, Modal, Segmented, type BadgeVariant } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { apiErrorMessage, couriersApi, type CourierState, type OnlineOrderDetail } from '../api/online-orders.api';
import { rs, whenText } from '../lib/labels';
import { BrandLogo, brandForCourier } from '@/assets/brands/BrandLogo';

import { COURIERS_KEY } from './couriers/CourierForms';
import { CourierHint } from './couriers/CourierHint';
export { COURIERS_KEY };

/** COD the courier collects: the total less every advance received (payment links and manual), as the API books it. */
const codDue = (o: OnlineOrderDetail) => {
  if (o.money) return Math.round(o.money.codDue);
  if (o.paymentStatus === 'PAID') return 0;
  const paid = (((o.metadata as any)?.payments ?? []) as Array<{ status: string; amount: number }>)
    .filter((l) => l.status === 'PAID').reduce((s, l) => s + (Number(l.amount) || 0), 0);
  return Math.max(0, Math.round(o.total - paid));
};

const STATE_LABEL: Record<CourierState | 'BOOKING', { label: string; tone: BadgeVariant }> = {
  BOOKING: { label: 'Book ho raha…', tone: 'default' },
  BOOKED: { label: 'Book ho gaya — pickup ka intezar', tone: 'info' },
  PICKED_UP: { label: 'Courier le gaya', tone: 'info' },
  IN_TRANSIT: { label: 'Raste me', tone: 'accent' },
  OUT_FOR_DELIVERY: { label: 'Aaj deliver hoga', tone: 'accent' },
  ATTEMPTED: { label: 'Customer nahi mila — dobara koshish', tone: 'warning' },
  DELIVERED: { label: 'Deliver ho gaya', tone: 'success' },
  RETURNING: { label: 'Wapas aa raha hai', tone: 'danger' },
  RETURNED: { label: 'Wapas aa gaya (RTO)', tone: 'danger' },
  CANCELLED: { label: 'Booking cancel', tone: 'danger' },
  UNKNOWN: { label: 'Status nahi mila', tone: 'default' },
};

/**
 * Courier inside an order: "Book on <courier>" when a courier is connected
 * (CN and label from the courier); once booked, its status, label, refresh
 * and cancel.
 */
export function CourierSection({ order: o, onChanged }: { order: OnlineOrderDetail; onChanged: () => void }) {
  const qc = useQueryClient();
  const [bookOpen, setBookOpen] = useState(false);
  const { data: accounts } = useQuery({ queryKey: COURIERS_KEY, queryFn: couriersApi.list, staleTime: 5 * 60_000 });
  const connected = (accounts ?? []).filter((a) => a.connected && a.active);
  const mine = (accounts ?? []).find((a) => a.code === o.courierCode);
  const canLabel = mine?.connect?.features.label ?? true;
  const canCancel = mine?.connect?.features.cancel ?? true;

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
      <Card>
        <div className="flex items-start gap-3">
          <BrandLogo name={brandForCourier(o.courierCode)} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{o.courierLabel ?? 'Courier'}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 font-mono text-[0.8125rem] font-bold text-slate-700 hover:underline"
                onClick={() => navigator.clipboard?.writeText(o.trackingNumber!).then(() => toast.success('CN copy ho gaya'))}
              >
                {o.trackingNumber} <Copy className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge size="xs" variant={st.tone}>{st.label}</Badge>
              {o.courierTrail?.label && <span className="text-[0.6875rem] text-slate-500">“{o.courierTrail.label}”</span>}
              {o.courierStatusAt && <span className="text-[0.6875rem] text-slate-400">· {whenText(o.courierStatusAt)}</span>}
            </div>
          </div>
        </div>

        {history.length > 1 && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-bold text-slate-500">Courier ka safar ({history.length})</summary>
            <ol className="mt-2 space-y-1 border-l border-slate-200 pl-3">
              {[...history].reverse().map((h, i) => (
                <li key={i} className="text-slate-600">
                  {h.label}{h.at ? <span className="text-slate-400"> · {h.at}</span> : null}
                </li>
              ))}
            </ol>
          </details>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {canLabel && (
            <Button size="xs" variant="primary" loading={label.isPending} onClick={() => label.mutate()} leftIcon={<Printer className="h-3.5 w-3.5" />}>
              Label print
            </Button>
          )}
          <Button size="xs" variant="outline" loading={refresh.isPending} onClick={() => refresh.mutate()} leftIcon={<RefreshCw className="h-3.5 w-3.5" />}>
            Taaza status
          </Button>
          {o.courierSite && (
            <Button size="xs" variant="ghost" onClick={() => window.open(o.courierSite!, '_blank', 'noopener')} leftIcon={<ExternalLink className="h-3.5 w-3.5" />}>
              Courier site
            </Button>
          )}
          {o.courierStatus === 'BOOKED' && canCancel && (
            <Button
              size="xs" variant="critical" loading={cancel.isPending}
              onClick={async () => { if ((await confirmDialog({ title: 'Courier booking cancel karein?', text: 'CN khatam ho jayega.', danger: true }))) cancel.mutate(); }}
              leftIcon={<X className="h-3.5 w-3.5" />}
            >
              Booking cancel
            </Button>
          )}
        </div>
        <p className="mt-2 text-[0.6875rem] text-slate-400">Nafaa har 30 minute courier se status leta hai — deliver ya wapas (RTO) hote hi order khud update hota hai.</p>
      </Card>
    );
  }

  if (!canBook) return null;

  if (!connected.length) {
    return (
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4">
        <span className="flex gap-1">
          {(['postex', 'leopards', 'tcs'] as const).map((b) => <BrandLogo key={b} name={b} size={26} />)}
        </span>
        <div className="min-w-0 flex-1 text-xs text-slate-500">
          <span className="font-bold text-slate-700">Courier jorein</span> — phir yahin se ek click me booking, CN aur label.
        </div>
        <Link to="/online-store/couriers" className="text-xs font-bold text-brand-700 hover:underline">Couriers →</Link>
      </section>
    );
  }

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-3">
        {connected.length === 1
          ? <BrandLogo name={brandForCourier(connected[0].code)} size={36} />
          : <span className="flex gap-1">{connected.slice(0, 3).map((c) => <BrandLogo key={c.code} name={brandForCourier(c.code)} size={28} />)}</span>}
        <div className="min-w-[11rem] flex-1">
          <div className="text-sm font-bold text-slate-900">Courier par book karein</div>
          <div className="text-xs text-slate-500">CN khud banega · COD {codDue(o) ? rs(codDue(o)) : 'nahi (paid)'}</div>
        </div>
        <Button size="sm" variant="primary" onClick={() => setBookOpen(true)} leftIcon={<Zap className="h-3.5 w-3.5" />}>
          {connected.length === 1 ? `${connected[0].name} par book` : 'Book karein'}
        </Button>
        </div>
      </Card>
      {bookOpen && (
        <BookModal
          order={o}
          couriers={connected.map((c) => ({ code: c.code, name: c.name, defaultWeightKg: c.settings?.defaultWeightKg ?? null, missing: c.missingSettings, label: !!c.connect?.features.label }))}
          onClose={() => setBookOpen(false)}
          onBooked={(tn, name, hasLabel) => {
            setBookOpen(false);
            onChanged();
            qc.invalidateQueries({ queryKey: COURIERS_KEY });
            toast.success(`${name} par book ho gaya · CN ${tn}`, hasLabel ? {
              description: 'Label print karke parcel par lagayein',
              action: { label: 'Label print', onClick: () => couriersApi.openLabel(o.id).catch((e) => toast.error(apiErrorMessage(e))) },
            } : { description: `Label ${name} portal se print karein` });
          }}
        />
      )}
    </>
  );
}

function BookModal({ order: o, couriers, onClose, onBooked }: {
  order: OnlineOrderDetail;
  couriers: { code: string; name: string; defaultWeightKg: number | null; missing: string[]; label: boolean }[];
  onClose: () => void;
  onBooked: (trackingNumber: string, courierName: string, hasLabel: boolean) => void;
}) {
  const [courier, setCourier] = useState(couriers[0].code);
  const current = couriers.find((c) => c.code === courier)!;
  const pieces0 = o.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0) || 1;
  const [weight, setWeight] = useState(String(current.defaultWeightKg ?? 0.5));
  const [pieces, setPieces] = useState(String(pieces0));
  const [cod, setCod] = useState(String(codDue(o)));
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
    onSuccess: (r) => onBooked(r.trackingNumber, current.name, current.label),
    onError: (e) => toast.error(apiErrorMessage(e, 'Booking nahi hui')),
  });

  const cityName = opts?.cities.find((c) => c.id === cityId)?.name;
  const valid = !current.missing.length && !!cityId && Number(weight) > 0 && Number(pieces) >= 1 && Number(cod) >= 0;

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
        {current.missing.length > 0 && (
          <Alert tone="warning">
            {current.name} ki settings poori karein: {current.missing.join(', ')} —{' '}
            <Link to={`/online-store/couriers/${current.code.toLowerCase()}?tab=settings`} className="font-semibold underline">Settings kholein</Link>
          </Alert>
        )}
        {couriers.length > 1 && (
          <Segmented label="Courier" value={courier} onChange={setCourier} className="flex-wrap"
            items={couriers.map((c) => ({ value: c.code, label: <><BrandLogo name={brandForCourier(c.code)} size={18} />{c.name}</> }))} />
        )}
        <CourierHint orderId={o.id} current={courier} pickable={couriers.map((c) => c.code)} onPick={setCourier} />

        <Field label={<>Shehar {o.customerCity ? <span className="font-normal text-slate-400">(customer ne likha: {o.customerCity})</span> : null}</>}>
          {(id) => optsLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {current.name} ke shehar aa rahe hain…</div>
          ) : optsError ? (
            <div className="text-xs text-rose-600">{apiErrorMessage(optsError)}</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={cityQ} onChange={(e) => setCityQ(e.target.value)} placeholder="Shehar search…" aria-label="Shehar search" className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')} />
              <select id={id} value={cityId} onChange={(e) => setCityId(e.target.value)} className={cn(controlClass(), 'h-9 px-3 text-[0.8125rem]')}>
                <option value="">— chunein —</option>
                {cityId && !cities.some((c) => c.id === cityId) && cityName && <option value={cityId}>{cityName}</option>}
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </Field>

        <div className="grid grid-cols-3 gap-2">
          <Input size="sm" label="Wazan (kg)" type="number" min="0.01" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <Input size="sm" label="Pieces" type="number" min="1" step="1" value={pieces} onChange={(e) => setPieces(e.target.value)} />
          <Input size="sm" label="COD (Rs)" type="number" min="0" step="1" value={cod} onChange={(e) => setCod(e.target.value)} />
        </div>
        {Number(cod) !== codDue(o) && (
          <p className="-mt-2 text-[0.6875rem] font-semibold text-amber-700">Customer se lena {rs(codDue(o))} hai — COD alag rakh rahe hain</p>
        )}
        {codDue(o) > 0 && codDue(o) < Math.round(o.total) && (
          <p className="-mt-2 text-[0.6875rem] text-slate-500">Advance {rs(Math.round(o.total) - codDue(o))} mil chuka — COD utna kam</p>
        )}

        <Input size="sm" label="Courier ke liye note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fragile, call karke aayein…" maxLength={200} />
      </div>
    </Modal>
  );
}
