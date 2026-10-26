/**
 * Book or change a bulk order: who it is for, the event (kind, date, time,
 * place, guests), the lines with rates (linked to own products so the bill
 * takes stock), delivery and setup, and the price with advance and balance.
 * Money already received is never changed here — only through payments.
 *
 * Keys: Ctrl+Enter save · Esc back.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Building2, CalendarDays, Package, Plus, Search, Trash2, Truck, Wallet } from 'lucide-react';
import { Button, Card, Input, Kbd, PageHero, PageShell, Skeleton, Switch, Textarea, controlClass } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { fetchAllProducts } from '@modules/inventory/products/api/fetchAllProducts';
import { bulkOrdersApi, type BulkOrder } from '../api/bulk-orders.api';
import type { OrderPayMethod } from '../api/cake-orders.api';
import { bulkLines } from '../components/bulk/useBulkActions';
import { BULK_KEY, BULK_TYPES, PAY_METHODS, apiError, isClosed } from '../components/meta';

interface Line { key: string; productId?: string; name: string; qty: string; rate: string; unit?: string }
interface Draft {
  organizationName: string; contactPerson: string; contactPhone: string; contactEmail: string;
  orderType: string; eventDate: string; eventTime: string; venue: string; totalGuests: string;
  requiresDelivery: boolean; deliveryAddress: string; requiresSetup: boolean; setupTime: string; specialInstructions: string;
  finalPrice: string; advancePaid: string; payMethod: OrderPayMethod; confirmed: boolean;
}
const EMPTY: Draft = {
  organizationName: '', contactPerson: '', contactPhone: '', contactEmail: '', orderType: 'WEDDING', eventDate: '', eventTime: '', venue: '', totalGuests: '',
  requiresDelivery: true, deliveryAddress: '', requiresSetup: false, setupTime: '', specialInstructions: '', finalPrice: '', advancePaid: '', payMethod: 'CASH', confirmed: true,
};
const pad = (n: number) => String(n).padStart(2, '0');
const digits = (v: string) => v.replace(/[^\d.]/g, '');

/** Date and time typed here are this device's local time; no time means end of that day. */
function eventIso(date: string, time: string) {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '23:59').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0).toISOString();
}

function fromOrder(o: BulkOrder): { f: Draft; lines: Line[] } {
  const d = new Date(o.eventDate);
  return {
    f: {
      ...EMPTY,
      organizationName: o.organizationName ?? '', contactPerson: o.contactPerson ?? '', contactPhone: o.contactPhone ?? '', contactEmail: o.contactEmail ?? '',
      orderType: o.orderType || 'OTHER', eventDate: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      eventTime: o.eventTime ?? `${pad(d.getHours())}:${pad(d.getMinutes())}`, venue: o.venue ?? '', totalGuests: o.totalGuests ? String(o.totalGuests) : '',
      requiresDelivery: !!o.requiresDelivery, deliveryAddress: o.deliveryAddress ?? '', requiresSetup: !!o.requiresSetup, setupTime: o.setupTime ?? '',
      specialInstructions: o.specialInstructions ?? '', finalPrice: o.finalPrice != null ? String(o.finalPrice) : '',
    },
    lines: bulkLines(o).map((l, i) => ({ key: `${l.productId ?? 'free'}-${i}`, productId: l.productId, name: l.name, qty: String(l.qty || ''), rate: String(l.rate || ''), unit: l.unit })),
  };
}

export default function BakeryBulkOrderFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lock = useRef(false);
  const orderQ = useQuery({ queryKey: [BULK_KEY, 'one', id], queryFn: () => bulkOrdersApi.getOne(id!), enabled: editing });
  const productsQ = useQuery({ queryKey: ['bakery-all-products'], queryFn: () => fetchAllProducts({ isActive: undefined }), staleTime: 60_000 });
  const [f, setF] = useState<Draft>(EMPTY);
  const [lines, setLines] = useState<Line[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [term, setTerm] = useState('');
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => { if (orderQ.data && !loaded) { const r = fromOrder(orderQ.data); setF(r.f); setLines(r.lines); setLoaded(true); } }, [orderQ.data, loaded]);

  const products = ((productsQ.data?.items ?? []) as Array<{ id: string; name: string; price?: number; unit?: string; sku?: string; barcode?: string; isActive?: boolean }>).filter((p) => p.isActive !== false);
  const t = term.trim().toLowerCase();
  const options = useMemo(() => {
    const chosen = new Set(lines.map((l) => l.productId).filter(Boolean));
    return products.filter((p) => !chosen.has(p.id) && (!t || `${p.name} ${p.sku ?? ''} ${p.barcode ?? ''}`.toLowerCase().includes(t))).slice(0, 12);
  }, [products, t, lines]);

  const linesTotal = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const price = Number(f.finalPrice) > 0 ? Number(f.finalPrice) : linesTotal;
  const paid = editing ? Number(orderQ.data?.paidAmount || 0) : Number(f.advancePaid) || 0;
  const balance = Math.max(price - paid, 0);
  const iso = f.eventDate ? eventIso(f.eventDate, f.eventTime) : '';

  const problems = useMemo(() => {
    const out: string[] = [];
    if (editing && orderQ.data && isClosed(orderQ.data.status)) out.push('Mukammal ya cancel order badla nahi ja sakta');
    if (!f.organizationName.trim()) out.push('Kis ka order hai — naam likhein');
    if (f.contactPhone.replace(/\D/g, '').length < 10) out.push('Poora phone number likhein');
    if (!f.eventDate) out.push('Event ki date chunein');
    if (!lines.length) out.push('Kam se kam ek cheez daalein');
    for (const l of lines) {
      if (!l.name.trim()) { out.push('Har line ka naam likhein'); break; }
      if (!(Number(l.qty) > 0)) { out.push(`"${l.name}" ki quantity likhein`); break; }
      if (!(Number(l.rate) > 0)) { out.push(`"${l.name}" ka rate likhein`); break; }
    }
    if (f.requiresDelivery && !f.deliveryAddress.trim() && !f.venue.trim()) out.push('Pahunchana hai to pata ya jagah likhein');
    if (!editing && paid > price) out.push('Advance kul rakam se zyada nahi ho sakta');
    if (editing && price + 0.005 < paid) out.push(`${formatPKR(paid)} pehle mil chuka — kul rakam is se kam nahi ho sakti`);
    return out;
  }, [f, lines, editing, orderQ.data, paid, price]);

  const save = useMutation({
    mutationFn: async () => {
      if (problems.length) throw new Error(problems[0]);
      const body: Record<string, unknown> = {
        organizationName: f.organizationName.trim(), contactPerson: f.contactPerson.trim(), contactPhone: f.contactPhone.trim(), contactEmail: f.contactEmail.trim(),
        orderType: f.orderType, eventDate: iso, eventTime: f.eventTime, venue: f.venue.trim(), totalGuests: Number(f.totalGuests) || undefined,
        items: lines.map((l) => ({ productId: l.productId, name: l.name.trim(), qty: Number(l.qty), rate: Number(l.rate), unit: l.unit, total: Number(l.qty) * Number(l.rate) })),
        quotedPrice: Math.round(linesTotal * 100) / 100, finalPrice: Number(f.finalPrice) > 0 ? Number(f.finalPrice) : null,
        requiresDelivery: f.requiresDelivery, deliveryAddress: f.requiresDelivery ? f.deliveryAddress.trim() || f.venue.trim() : '',
        requiresSetup: f.requiresSetup, setupTime: f.requiresSetup ? f.setupTime : '', specialInstructions: f.specialInstructions.trim(),
      };
      if (editing) return bulkOrdersApi.update(id!, body);
      return bulkOrdersApi.create({ ...body, advancePaid: paid, ...(paid > 0 && { paymentMethod: f.payMethod }), status: f.confirmed || paid > 0 ? 'CONFIRMED' : 'QUOTED' });
    },
    onSuccess: (o) => { toast.success(editing ? 'Order save ho gaya' : `Order ${o.orderNumber} ban gaya`); qc.invalidateQueries({ queryKey: [BULK_KEY] }); navigate('/bakery/bulk-orders'); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { if (lock.current || save.isPending) return; lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing && orderQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-[32rem] rounded-2xl" /></PageShell>;
  if (editing && !orderQ.data) return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Yeh order nahi mila</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/bakery/bulk-orders')}>Orders par wapas</Button></div></PageShell>;

  const update = (key: string, patch: Partial<Line>) => setLines((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  return (
    <PageShell>
      <PageHero
        back={() => navigate(-1)}
        backLabel="Wapas (Esc)"
        title={editing ? `${orderQ.data?.orderNumber} — badlein` : 'Naya bara order'}
        subtitle={editing ? 'Mila hua paisa yahan se nahi badalta — order ki list me "Paisa mila" se' : 'Shadi, daftar, school — cheezein, rate, event aur advance'}
        meta={<span className="inline-flex items-center gap-1.5"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Building2}>Kis ka order</T>}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Idara / naam" required value={f.organizationName} onChange={(e) => set('organizationName', e.target.value)} placeholder="Ahmed sahib ki shadi, ABC School…" wrapperClassName="sm:col-span-2" data-autofocus />
              <Input label="Rabta (kis se baat hui)" value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} placeholder="Ahmed" hint="Marzi hai" />
              <Input label="Phone" required inputMode="tel" value={f.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} placeholder="03001234567" hint="WhatsApp isi par" />
              <Input label="Email" type="email" value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} hint="Marzi hai" wrapperClassName="sm:col-span-2" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={CalendarDays}>Event</T>}>
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {BULK_TYPES.map((x) => <button key={x.value} type="button" onClick={() => set('orderType', x.value)} className={cn('inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', f.orderType === x.value ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{x.emoji} {x.label}</button>)}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Date" required type="date" value={f.eventDate} onChange={(e) => set('eventDate', e.target.value)} />
                <Input label="Waqt" type="time" value={f.eventTime} onChange={(e) => set('eventTime', e.target.value)} hint="Na likhein to din ke aakhir tak" />
                <Input label="Mehmaan" inputMode="numeric" value={f.totalGuests} onChange={(e) => set('totalGuests', e.target.value.replace(/\D/g, ''))} hint="Marzi hai" />
              </div>
              <Input label="Jagah" value={f.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Hall ka naam, ghar ka pata" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Package}>Cheezein</T>} description="Apne maal se jorein — bill me stock khud ghatega aur kitchen list me stock milega">
            <div className="space-y-3">
              {lines.length > 0 && (
                <ul className="space-y-2">
                  {lines.map((l) => (
                    <li key={l.key} className="grid grid-cols-[minmax(0,1fr)_5rem_6rem_auto] items-center gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200">
                      {l.productId ? <span className="truncate text-[0.875rem] font-medium text-slate-900">{l.name}</span> : <Input size="sm" value={l.name} onChange={(e) => update(l.key, { name: e.target.value })} placeholder="Cheez ka naam" />}
                      <input inputMode="decimal" value={l.qty} onChange={(e) => update(l.key, { qty: digits(e.target.value) })} placeholder="Kitne" aria-label="Kitne" className={cn(controlClass(), 'h-9 px-2 text-right text-[0.875rem] tabular-nums')} />
                      <input inputMode="decimal" value={l.rate} onChange={(e) => update(l.key, { rate: digits(e.target.value) })} placeholder="Rate" aria-label="Rate" className={cn(controlClass(), 'h-9 px-2 text-right text-[0.875rem] tabular-nums')} />
                      <button type="button" aria-label="Hatayein" onClick={() => setLines((xs) => xs.filter((x) => x.key !== l.key))} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                      <span className="col-span-4 -mt-1 text-right text-[0.6875rem] tabular-nums text-slate-500">{l.unit ? `${l.unit} · ` : ''}{formatPKR((Number(l.qty) || 0) * (Number(l.rate) || 0))}{!l.productId && ' · maal se nahi juri'}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Cheez search — naam, SKU, barcode…" leftIcon={<Search className="h-4 w-4" />} />
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                {options.map((p) => (
                  <button key={p.id} type="button" onClick={() => { setLines((xs) => [...xs, { key: p.id, productId: p.id, name: p.name, qty: '', rate: p.price ? String(p.price) : '', unit: p.unit }]); setTerm(''); }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg bg-white px-2.5 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400"><Plus className="h-3.5 w-3.5 text-brand-600" />{p.name}{p.price ? <span className="text-slate-400">· {formatPKR(p.price)}</span> : null}</button>
                ))}
                {t && <button type="button" onClick={() => { setLines((xs) => [...xs, { key: `free-${Date.now()}`, name: term.trim(), qty: '', rate: '' }]); setTerm(''); }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-2.5 text-[0.8125rem] font-medium text-slate-500"><Plus className="h-3.5 w-3.5" />"{term.trim()}" — bina maal ke</button>}
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={Truck}>Pahunchana aur setup</T>}>
            <div className="space-y-3">
              <Switch checked={f.requiresDelivery} onChange={(e) => set('requiresDelivery', e.target.checked)} label="Hum pahunchayenge" description="Band ho to customer khud le jayega" />
              {f.requiresDelivery && <Textarea label="Pata" value={f.deliveryAddress} onChange={(e) => set('deliveryAddress', e.target.value)} rows={2} placeholder="Khali chhorein to jagah wala pata" />}
              <Switch checked={f.requiresSetup} onChange={(e) => set('requiresSetup', e.target.checked)} label="Wahan setup karna hai" description="Table, stand, sajawat" />
              {f.requiresSetup && <Input label="Setup ka waqt" type="time" value={f.setupTime} onChange={(e) => set('setupTime', e.target.value)} />}
              <Textarea label="Hidayat" value={f.specialInstructions} onChange={(e) => set('specialInstructions', e.target.value)} rows={3} maxLength={1000} placeholder="Packing, naam ki chit, alag dabbe…" hint="Parchi par chhapti hai" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Rakam</T>}>
            <div className="space-y-3">
              <dl className="space-y-1 rounded-xl bg-slate-50 p-3 text-[0.8125rem]">
                <div className="flex justify-between"><dt className="text-slate-500">Cheezon ka jor</dt><dd className="font-medium tabular-nums">{formatPKR(linesTotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Kul</dt><dd className="text-base font-bold tabular-nums text-slate-900">{formatPKR(price)}</dd></div>
              </dl>
              <Input label="Pakki rakam" inputMode="decimal" value={f.finalPrice} onChange={(e) => set('finalPrice', digits(e.target.value))} placeholder={String(Math.round(linesTotal))} hint="Sirf tab likhein jab tay hui rakam jor se alag ho (discount ya extra)" />
              {editing ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600">Ab tak mila: <b className="tabular-nums text-slate-900">{formatPKR(paid)}</b></p>
              ) : (
                <>
                  <Input label="Advance mila" inputMode="decimal" value={f.advancePaid} onChange={(e) => set('advancePaid', digits(e.target.value))} placeholder="0" hint="Advance aate hi order pakka ho jata hai" />
                  <div className="flex flex-wrap gap-1.5">{[25, 50, 100].map((p) => <Button key={p} size="xs" variant="secondary" onClick={() => set('advancePaid', String(Math.round((price * p) / 100)))}>{p}% · {formatPKR(Math.round((price * p) / 100))}</Button>)}</div>
                  {paid > 0 && (
                    <div role="radiogroup" aria-label="Advance kaise mila" className="flex flex-wrap gap-1.5">
                      {PAY_METHODS.map((m) => <Button key={m.id} size="xs" role="radio" aria-checked={f.payMethod === m.id} variant={f.payMethod === m.id ? 'primary' : 'secondary'} onClick={() => set('payMethod', m.id)}>{m.label}</Button>)}
                    </div>
                  )}
                  {!(paid > 0) && <Switch checked={f.confirmed} onChange={(e) => set('confirmed', e.target.checked)} label="Order pakka hai" description={f.confirmed ? 'Bina advance ke bhi pakka' : 'Sirf rate bataya — abhi pakka nahi'} />}
                </>
              )}
              <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5 ring-1 ring-brand-100">
                <span className="text-[0.8125rem] font-medium text-brand-900">Baqi</span>
                <span className="text-lg font-bold tabular-nums text-brand-900">{formatPKR(balance)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (f.organizationName || lines.length || editing)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{lines.length} cheezein · kul <b className="tabular-nums text-slate-900">{formatPKR(price)}</b> · baqi <b className="tabular-nums text-slate-900">{formatPKR(balance)}</b></p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Order banayein'}</Button>
      </div>
    </PageShell>
  );
}

const T = ({ icon: Icon, children }: { icon: typeof Package; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
