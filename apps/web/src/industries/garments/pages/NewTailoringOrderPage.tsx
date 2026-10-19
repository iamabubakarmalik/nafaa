/**
 * New stitching order, or changes to an open one (`?edit=<id>`): the
 * customer and their naap, each garment with whose fabric it is and the
 * stitching rate, the promised day, karigar and design, and the advance
 * with how it was paid. Money already taken is never edited here.
 *
 * Keys: Ctrl+S save · Esc back · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, CalendarClock, GraduationCap, Package, Plus, Ruler, Scissors, Shirt, Trash2, UserRound, Wallet,
} from 'lucide-react';
import { Button, Card, Input, Kbd, PageShell, Select, Skeleton, Textarea } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { PaymentMethodPicker } from '@modules/pos/components';
import { ImagesField } from '@modules/inventory/products/editor/fields';
import { customersApi } from '@modules/customers/customers/api/customers.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { measurementsApi, type MeasurementProfile } from '../api/measurements.api';
import { tailoringApi, type Priority, type TailoringInput, type TailoringOrder } from '../api/tailoring.api';
import { CustomerField, TailorSelect, emptyCustomer, type CustomerValue } from '../components/fields';
import { MeasurementModal } from '../components/MeasurementModal';
import { GARMENT_TYPES, MEASURE_KEY, MONEY_KEYS, PRIORITIES, TAILORING_KEY, apiError, dayInput, garmentLabel, opt, plusDays, r2 } from '../components/meta';
import { ProductPick, type PickedProduct } from '../components/ProductPick';
import { measureLines, printTailoringSlip } from '../components/slips';
import { useGarmentsCan } from '../components/permissions';

type FabricFrom = 'customer' | 'stock' | 'shop';

interface Line {
  key: string;
  categoryType: string;
  garmentName: string;
  quantity: string;
  size: string;
  colorName: string;
  fabricFrom: FabricFrom;
  fabric: PickedProduct | null;
  fabricMeters: string;
  fabricCost: string;
  stitching: string;
  embroidery: string;
  accessory: string;
  designNotes: string;
}

const newLine = (type = 'SHALWAR_KAMEEZ'): Line => ({
  key: Math.random().toString(36).slice(2), categoryType: type, garmentName: garmentLabel(type), quantity: '1', size: '', colorName: '',
  fabricFrom: 'customer', fabric: null, fabricMeters: '', fabricCost: '', stitching: '', embroidery: '', accessory: '', designNotes: '',
});

const n = (v: string) => Number(v) || 0;
const qtyOf = (l: Line) => Math.max(Math.floor(n(l.quantity)), 1);
const lineTotal = (l: Line) => r2((n(l.stitching) + n(l.embroidery) + n(l.accessory)) * qtyOf(l) + (l.fabricFrom === 'customer' ? 0 : n(l.fabricCost)));
const QUICK_DAYS = [3, 5, 7, 10, 15];
const RATES = [800, 1200, 1500, 2000, 2500, 3500];

export default function NewTailoringOrderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const fromCustomer = params.get('customer');
  const fromNaap = params.get('naap');
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { manage } = useGarmentsCan();
  const guide = usePageGuide();
  const lock = useRef(false);
  useReceiptSetup();

  const orderQ = useQuery({ queryKey: [TAILORING_KEY, 'one', editId], queryFn: () => tailoringApi.getOne(editId!), enabled: !!editId });
  const order = orderQ.data;

  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [profileId, setProfileId] = useState('');
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [promised, setPromised] = useState(plusDays(7));
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [tailorId, setTailorId] = useState('');
  const [design, setDesign] = useState('');
  const [images, setImages] = useState<Array<{ url: string }>>([]);
  const [notes, setNotes] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [discount, setDiscount] = useState('');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [startAs, setStartAs] = useState<'CONFIRMED' | 'QUOTED'>('CONFIRMED');
  const [naapOpen, setNaapOpen] = useState(false);
  const [touched, setTouched] = useState(false);

  /* Prefill when editing. */
  useEffect(() => {
    if (!order) return;
    setCustomer({ customerId: order.customerId ?? '', name: order.customerName ?? '', phone: order.customerPhone ?? '', balance: order.customer?.balance });
    setProfileId(order.measurementProfileId ?? '');
    setLines(order.items.map((i) => ({
      key: i.id, categoryType: i.categoryType ?? 'OTHER', garmentName: i.garmentName, quantity: String(i.quantity), size: i.size ?? '', colorName: i.colorName ?? '',
      fabricFrom: i.fabricProductId ? 'stock' : i.fabricCost > 0 ? 'shop' : 'customer',
      fabric: i.fabricProductId ? { productId: i.fabricProductId, variantId: i.fabricVariantId ?? undefined, name: i.fabricName ?? 'Kapra', price: i.fabricMeters ? r2(i.fabricCost / i.fabricMeters) : 0, unit: 'meter' } : null,
      fabricMeters: i.fabricMeters ? String(i.fabricMeters) : '', fabricCost: i.fabricCost ? String(i.fabricCost) : '',
      stitching: i.quantity ? String(r2(i.stitchingCost / i.quantity) || '') : '', embroidery: i.quantity ? String(r2(i.embroideryCost / i.quantity) || '') : '',
      accessory: i.quantity ? String(r2(i.accessoryCost / i.quantity) || '') : '', designNotes: i.designNotes ?? '',
    })));
    setPromised(dayInput(order.promisedDate));
    setPriority(order.priority);
    setTailorId(order.tailorId ?? '');
    setDesign(order.designInstructions ?? '');
    setImages((order.designReferenceUrls ?? []).map((url) => ({ url })));
    setNotes(order.internalNotes ?? '');
    setCustomerNotes(order.customerNotes ?? '');
    setDiscount(order.discount ? String(order.discount) : '');
  }, [order]);

  /* Started from a measurement card: that customer and naap. */
  const startQ = useQuery({ queryKey: ['customers', 'one', fromCustomer], queryFn: () => customersApi.getOne(fromCustomer!), enabled: !!fromCustomer && !editId });
  useEffect(() => {
    const c = startQ.data;
    if (!c) return;
    setCustomer({ customerId: c.id, name: c.name, phone: c.phone ?? '', balance: Number(c.balance ?? 0) });
    if (fromNaap) setProfileId(fromNaap);
  }, [startQ.data, fromNaap]);

  const profilesQ = useQuery({
    queryKey: [MEASURE_KEY, 'customer', customer.customerId],
    queryFn: () => measurementsApi.byCustomer(customer.customerId),
    enabled: !!customer.customerId,
  });
  const profiles = profilesQ.data ?? [];
  // A customer's main naap is picked by itself.
  useEffect(() => {
    if (!profiles.length || profileId) return;
    setProfileId((profiles.find((p) => p.isDefault) ?? profiles[0]).id);
  }, [profiles, profileId]);
  const profile = profiles.find((p) => p.id === profileId) ?? null;

  const subtotal = r2(lines.reduce((s, l) => s + lineTotal(l), 0));
  const disc = r2(n(discount));
  const total = r2(Math.max(subtotal - disc, 0));
  const adv = r2(n(advance));
  const paidBefore = Number(order?.paidAmount ?? 0);
  const editing = !!editId;

  const problems = useMemo(() => {
    const out: string[] = [];
    if (!customer.customerId && !customer.name.trim()) out.push('Customer ka naam likhein');
    if (!lines.length) out.push('Kam az kam ek kapra likhein');
    lines.forEach((l, i) => {
      const tag = l.garmentName.trim() || `Kapra ${i + 1}`;
      if (!l.garmentName.trim()) out.push(`Kapra ${i + 1}: naam likhein`);
      if (!(n(l.quantity) >= 1)) out.push(`${tag}: kitne piece`);
      if (l.fabricFrom === 'stock' && !l.fabric) out.push(`${tag}: dukaan ka kapra chunein`);
      if (l.fabricFrom === 'stock' && !(n(l.fabricMeters) > 0)) out.push(`${tag}: kitne meter kapra lagega`);
      if (lineTotal(l) <= 0) out.push(`${tag}: silai ka rate likhein`);
    });
    if (disc > subtotal) out.push('Discount kul amount se zyada nahi ho sakta');
    if (!editing && adv > total + 0.01) out.push(`Advance ${formatPKR(total)} se zyada nahi ho sakta`);
    if (!editing && adv > 0 && !customer.customerId && !customer.name.trim()) out.push('Advance ke liye customer ka naam zaroori hai');
    if (editing && total + 0.01 < paidBefore) out.push(`${formatPKR(paidBefore)} pehle mil chuke — kul is se kam nahi ho sakta`);
    if (promised && promised < dayInput(new Date().toISOString()) && !editing) out.push('Dene ki date guzar chuki hai');
    return out;
  }, [customer, lines, disc, subtotal, adv, total, editing, paidBefore, promised]);

  const save = useMutation({
    mutationFn: async (): Promise<TailoringOrder> => {
      if (problems.length) throw new Error(problems[0]);
      const items = lines.map((l) => ({
        garmentName: l.garmentName.trim(), categoryType: l.categoryType || undefined, quantity: qtyOf(l),
        size: opt(l.size), colorName: opt(l.colorName), designNotes: opt(l.designNotes),
        stitchingCost: n(l.stitching), embroideryCost: n(l.embroidery), accessoryCost: n(l.accessory),
        fabricCost: l.fabricFrom === 'customer' ? 0 : n(l.fabricCost),
        ...(l.fabricFrom === 'stock' && l.fabric ? { fabricProductId: l.fabric.productId, fabricVariantId: l.fabric.variantId, fabricMeters: n(l.fabricMeters) } : {}),
      }));
      const body: Omit<TailoringInput, 'status' | 'advanceAmount' | 'advanceMethod'> = {
        customerId: customer.customerId || undefined, customerName: customer.name.trim() || undefined, customerPhone: opt(customer.phone),
        customerNotes: opt(customerNotes), measurementProfileId: profileId || undefined, priority, tailorId: tailorId || undefined,
        promisedDate: promised || undefined, discount: disc, designReferenceUrls: images.map((i) => i.url),
        designInstructions: opt(design), internalNotes: opt(notes), items,
      };
      if (editing) return tailoringApi.update(editId!, body);
      return tailoringApi.create({ ...body, status: startAs, ...(adv > 0 ? { advanceAmount: adv, advanceMethod: method } : {}) });
    },
    onSuccess: (o) => {
      [TAILORING_KEY, MEASURE_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? `${o.orderNumber} badal gaya` : `Order ${o.orderNumber} ban gaya`, editing ? undefined : {
        action: { label: 'Parchi', onClick: () => printTailoringSlip(o, shopName) },
      });
      navigate(`/garments/tailoring/${o.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Order save nahi hua')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => { setTouched(true); if (lock.current || save.isPending) return; if (problems.length) { toast.error(problems[0]); return; } lock.current = true; save.mutate(); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const setLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  if (!manage) return <PageShell><p className="rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] text-amber-900 ring-1 ring-amber-200">Order likhne ke liye POS chalane ki permission chahiye.</p></PageShell>;
  if (editId && orderQ.isLoading) return <PageShell><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-96 rounded-2xl" /></PageShell>;
  if (editId && (!order || order.orderStatus === 'DELIVERED' || order.orderStatus === 'CANCELLED')) {
    return <PageShell><div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">{order ? 'Yeh order band ho chuka — badla nahi ja sakta' : 'Order nahi mila'}</p><Button className="mt-3" variant="secondary" onClick={() => navigate('/garments/tailoring')}>Orders par wapas</Button></div></PageShell>;
  }

  return (
    <PageShell>
      <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-4 text-white shadow-lg sm:p-5">
        <button type="button" onClick={() => navigate(-1)} aria-label="Wapas (Esc)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><ArrowLeft className="h-4 w-4" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{editing ? `${order?.orderNumber} — badlein` : 'Naya silai order'}</h1>
          <p className="text-[0.8125rem] text-white/75">{editing ? 'Kapre, rate, date aur karigar badal sakte hain — mila hua paisa yahan nahi badalta' : 'Customer, naap, kapre aur rate — advance lein aur parchi dein'}</p>
        </div>
        <span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> save</span>
        <button type="button" onClick={guide.open} title="Guide (G)" className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 hover:bg-white/25"><GraduationCap className="h-4 w-4" /></button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={UserRound}>Customer</T>}>
            <div className="space-y-3">
              <CustomerField value={customer} locked={editing && paidBefore > 0} onChange={(c) => { setCustomer(c); setProfileId(''); }}
                error={touched && !customer.customerId && !customer.name.trim() ? 'Naam likhein' : undefined} />
              <Input label="Customer ki khaas baat" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} maxLength={500} placeholder="Shaam ko call karein, beta lene aayega…" hint="Marzi hai" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Ruler}>Naap</T>}
            actions={<Button size="sm" variant="secondary" onClick={() => setNaapOpen(true)} disabled={!customer.customerId && !customer.name.trim()} leftIcon={<Plus className="h-4 w-4" />}>Naya naap</Button>}>
            {!customer.customerId ? (
              <p className="text-[0.8125rem] text-slate-500">{customer.name.trim() ? '"Naya naap" se is customer ka naap likhein — customer khud ban jayega.' : 'Pehle customer chunein ya naam likhein.'}</p>
            ) : profilesQ.isLoading ? <Skeleton className="h-16 rounded-xl" /> : !profiles.length ? (
              <p className="text-[0.8125rem] text-slate-500">Is customer ka koi naap save nahi — "Naya naap" dabayein.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {profiles.map((p) => (
                    <button key={p.id} type="button" onClick={() => setProfileId(p.id)}
                      className={cn('h-8 rounded-lg px-3 text-[0.8125rem] font-medium ring-1', p.id === profileId ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
                      {p.profileName}{p.isDefault ? ' ★' : ''}
                    </button>
                  ))}
                  {profileId && <button type="button" onClick={() => setProfileId('')} className="h-8 px-2 text-[0.75rem] text-slate-500 hover:underline">Naap ke baghair</button>}
                </div>
                {profile && <NaapPreview p={profile} />}
              </div>
            )}
          </Card>

          <Card className="rounded-2xl" title={<T icon={Shirt}>Kapre aur silai</T>} description="Har kapra alag line — silai, kadhai aur accessories ka rate ek piece ka"
            actions={<Button size="sm" variant="secondary" onClick={() => setLines((ls) => [...ls, newLine(ls[ls.length - 1]?.categoryType)])} leftIcon={<Plus className="h-4 w-4" />}>Kapra</Button>}>
            <div className="space-y-3">
              {lines.map((l, i) => (
                <div key={l.key} className="space-y-3 rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.75rem] font-bold uppercase tracking-wide text-slate-500">Kapra {i + 1}</span>
                    <span className="ml-auto mr-2 text-[0.875rem] font-bold tabular-nums text-slate-900">{formatPKR(lineTotal(l))}</span>
                    {lines.length > 1 && <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Line hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_6rem]">
                    <Select label="Kya silna hai" value={l.categoryType}
                      onChange={(e) => { const t = e.target.value; setLine(l.key, { categoryType: t, garmentName: GARMENT_TYPES.some((g) => g.label === l.garmentName) || !l.garmentName ? garmentLabel(t) : l.garmentName }); }}
                      options={GARMENT_TYPES.filter((g) => g.value !== 'FABRIC').map((g) => ({ value: g.value, label: g.label }))} />
                    <Input label="Naam (parchi par)" value={l.garmentName} onChange={(e) => setLine(l.key, { garmentName: e.target.value })} maxLength={120} error={touched && !l.garmentName.trim() ? 'Naam likhein' : undefined} />
                    <Input label="Piece" inputMode="numeric" value={l.quantity} onChange={(e) => setLine(l.key, { quantity: e.target.value.replace(/\D/g, '') })} className="text-right tabular-nums" />
                  </div>
                  <div>
                    <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kapra kis ka</span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {([['customer', 'Customer laya'], ['stock', 'Dukaan ka (stock se)'], ['shop', 'Dukaan ka (bina stock)']] as Array<[FabricFrom, string]>).map(([v, label]) => (
                        <button key={v} type="button" onClick={() => setLine(l.key, { fabricFrom: v })}
                          className={cn('h-9 rounded-lg px-2 text-[0.75rem] font-semibold ring-1', l.fabricFrom === v ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{label}</button>
                      ))}
                    </div>
                  </div>
                  {l.fabricFrom === 'stock' && (
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <ProductPick label="Dukaan ka kapra" value={l.fabric} placeholder="Lawn, latha, wash & wear…"
                        onChange={(p) => setLine(l.key, { fabric: p, fabricCost: p && n(l.fabricMeters) ? String(r2(p.price * n(l.fabricMeters))) : l.fabricCost })}
                        hint="Suit dete waqt itna kapra stock se nikalega" />
                      <Input label="Meter" inputMode="decimal" value={l.fabricMeters} className="text-right tabular-nums"
                        onChange={(e) => { const m = e.target.value.replace(/[^\d.]/g, ''); setLine(l.key, { fabricMeters: m, fabricCost: l.fabric ? String(r2(l.fabric.price * n(m))) : l.fabricCost }); }} hint="Kitna lagega" />
                      <Input label="Kapre ki amount" inputMode="decimal" value={l.fabricCost} className="text-right tabular-nums" onChange={(e) => setLine(l.key, { fabricCost: e.target.value.replace(/[^\d.]/g, '') })} hint="Poori line ki" />
                    </div>
                  )}
                  {l.fabricFrom === 'shop' && (
                    <Input label="Kapre ki amount" inputMode="decimal" value={l.fabricCost} className="text-right tabular-nums" onChange={(e) => setLine(l.key, { fabricCost: e.target.value.replace(/[^\d.]/g, '') })}
                      hint="Bahar se mangwaya kapra — amount bill me judegi, stock nahi badlega" />
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Input label="Silai (1 pc)" inputMode="decimal" value={l.stitching} className="text-right tabular-nums" onChange={(e) => setLine(l.key, { stitching: e.target.value.replace(/[^\d.]/g, '') })} />
                      <div className="mt-1 flex flex-wrap gap-1">{RATES.map((r) => <button key={r} type="button" onClick={() => setLine(l.key, { stitching: String(r) })} className="h-6 rounded-md bg-white px-1.5 text-[0.6875rem] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100">{r}</button>)}</div>
                    </div>
                    <Input label="Kadhai (1 pc)" inputMode="decimal" value={l.embroidery} className="text-right tabular-nums" onChange={(e) => setLine(l.key, { embroidery: e.target.value.replace(/[^\d.]/g, '') })} hint="Marzi hai" />
                    <Input label="Button / lace (1 pc)" inputMode="decimal" value={l.accessory} className="text-right tabular-nums" onChange={(e) => setLine(l.key, { accessory: e.target.value.replace(/[^\d.]/g, '') })} hint="Marzi hai" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input label="Size" value={l.size} onChange={(e) => setLine(l.key, { size: e.target.value })} maxLength={40} placeholder="M, 40…" hint="Marzi hai" />
                    <Input label="Rang" value={l.colorName} onChange={(e) => setLine(l.key, { colorName: e.target.value })} maxLength={60} hint="Marzi hai" />
                    <Input label="Design ki baat" value={l.designNotes} onChange={(e) => setLine(l.key, { designNotes: e.target.value })} maxLength={500} placeholder="Ban collar, 2 jeb…" hint="Karigar parchi par" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Scissors}>Design aur note</T>}>
            <div className="space-y-3">
              <Textarea label="Design ki hidayat" value={design} onChange={(e) => setDesign(e.target.value)} rows={3} maxLength={4000} placeholder="Gala gol, daman seedha, pancha 8 inch…" hint="Customer aur karigar dono parchiyon par" />
              <div><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Design ki tasveer</span><ImagesField value={images} onChange={setImages} max={6} /></div>
              <Textarea label="Andar ka note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={4000} placeholder="Customer ne pehle shikayat ki thi…" hint="Sirf staff ke liye — customer parchi par nahi" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl" title={<T icon={CalendarClock}>Kab dena hai</T>}>
            <div className="space-y-3">
              <Input label="Dene ki date" type="date" value={promised} onChange={(e) => setPromised(e.target.value)} hint="Is din ke 'Aaj dena hai' me aayega" />
              <div className="flex flex-wrap gap-1">
                {QUICK_DAYS.map((d) => <button key={d} type="button" onClick={() => setPromised(plusDays(d))} className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-semibold ring-1', promised === plusDays(d) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>{d} din</button>)}
              </div>
              <div>
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kitni jaldi</span>
                <div className="grid grid-cols-4 gap-1">
                  {PRIORITIES.map((p) => <button key={p.value} type="button" onClick={() => setPriority(p.value)} className={cn('h-9 rounded-lg text-[0.75rem] font-semibold ring-1', priority === p.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{p.label}</button>)}
                </div>
              </div>
              <TailorSelect value={tailorId} onChange={setTailorId} />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<T icon={Wallet}>Paisa</T>}>
            <div className="space-y-3">
              <dl className="space-y-1.5 text-[0.875rem]">
                {lines.map((l, i) => <div key={l.key} className="flex justify-between gap-3 text-slate-600"><dt className="truncate">{qtyOf(l) > 1 ? `${qtyOf(l)}x ` : ''}{l.garmentName || `Kapra ${i + 1}`}</dt><dd className="tabular-nums">{formatPKR(lineTotal(l))}</dd></div>)}
                <div className="flex justify-between border-t border-slate-100 pt-1.5 font-medium"><dt>Kul</dt><dd className="tabular-nums">{formatPKR(subtotal)}</dd></div>
              </dl>
              <Input label="Discount (Rs)" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums" hint="Marzi hai" error={disc > subtotal ? 'Kul se zyada' : undefined} />
              <div className="flex items-baseline justify-between rounded-xl bg-slate-900 px-4 py-3 text-white"><span className="text-[0.8125rem] text-white/70">Customer dega</span><span className="text-2xl font-bold tabular-nums">{formatPKR(total)}</span></div>
              {editing ? (
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-200">
                  Ab tak mila: <strong className="tabular-nums">{formatPKR(paidBefore)}</strong> · Baqi: <strong className="tabular-nums">{formatPKR(Math.max(total - paidBefore, 0))}</strong>. Naya paisa order ke safhe se "Paisa mila" se lein.
                </p>
              ) : (<>
                <Input label="Advance abhi (Rs)" inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ''))} className="text-right tabular-nums"
                  error={adv > total + 0.01 ? 'Kul se zyada' : undefined} hint={adv > 0 ? `Baqi ${formatPKR(Math.max(total - adv, 0))} suit lete waqt` : 'Customer ke khate me jama hoga, bill me kat jayega'} />
                <div className="flex flex-wrap gap-1">
                  {[0.25, 0.5, 1].map((f) => <button key={f} type="button" onClick={() => setAdvance(String(Math.round(total * f)))} disabled={!total} className="h-7 rounded-lg bg-white px-2 text-[0.75rem] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{f === 1 ? 'Poora' : `${f * 100}%`}</button>)}
                </div>
                {adv > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
                <div>
                  <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Order ki halat</span>
                  <div className="grid grid-cols-2 gap-1">
                    <button type="button" onClick={() => setStartAs('CONFIRMED')} className={cn('h-9 rounded-lg text-[0.8125rem] font-semibold ring-1', startAs === 'CONFIRMED' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>Pakka order</button>
                    <button type="button" onClick={() => setStartAs('QUOTED')} className={cn('h-9 rounded-lg text-[0.8125rem] font-semibold ring-1', startAs === 'QUOTED' ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200')}>Sirf rate bataya</button>
                  </div>
                </div>
              </>)}
            </div>
          </Card>
          {lines.some((l) => l.fabricFrom === 'stock') && (
            <p className="flex gap-2 rounded-2xl bg-sky-50 px-4 py-3 text-[0.8125rem] text-sky-900 ring-1 ring-sky-200"><Package className="mt-0.5 h-4 w-4 shrink-0" />Dukaan ka kapra suit dete waqt bill ke saath stock se nikalta hai — tab tak stock me hi dikhega.</p>
          )}
        </div>
      </div>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        {problems.length > 0 && (touched || customer.name || customer.customerId)
          ? <p className="mr-auto flex items-center gap-1.5 text-[0.8125rem] text-amber-800"><AlertTriangle className="h-4 w-4" />{problems[0]}</p>
          : <p className="mr-auto text-[0.8125rem] text-slate-500">{editing ? 'Save karein' : adv > 0 ? `${formatPKR(adv)} advance ke saath order banega` : 'Order banega — advance baad me bhi le sakte hain'}</p>}
        <Button variant="secondary" onClick={() => navigate(-1)}>Rehne dein</Button>
        <Button onClick={submit} loading={save.isPending}>{editing ? 'Save karein' : 'Order banayein'}</Button>
      </div>

      {naapOpen && (
        <MeasurementModal customer={customer} onClose={() => setNaapOpen(false)}
          onSaved={(m) => { setCustomer((c) => ({ ...c, customerId: m.customerId })); setProfileId(m.id); }} />
      )}

      {guide.isOpen && (
        <PageGuide title="Silai order — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: UserRound, color: '#2563eb', title: 'Customer', text: 'Purana customer naam ya phone se dhoondein. Naya ho to naam aur phone likh dein — advance lene par khata khud ban jata hai.' },
            { icon: Ruler, color: '#7c3aed', title: 'Naap', text: 'Customer ka main naap khud chun liya jata hai. Naya naap yahin se likh sakte hain; order ke saath naap ki copy save hoti hai.' },
            { icon: Shirt, color: '#db2777', title: 'Kapre', text: 'Kapra customer laya to sirf silai likhein. Dukaan ka kapra stock se ho to meter likhein — suit dete waqt itna stock se nikalega.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance customer ke khate me jama hota hai aur suit dete waqt bill me kat jata hai. Cash, card ya JazzCash — jo aaya woh chunein.' },
          ]}
          tips={['Ctrl+S se kahin se bhi save.', 'Eid ke din se pehle ki date dene se pehle "Aaj dena hai" ki ginti dekh lein.']}
          shortcuts={[['Ctrl+S', 'save'], ['Esc', 'wapas'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function NaapPreview({ p }: { p: MeasurementProfile }) {
  const lines = measureLines(p);
  if (!lines.length) return null;
  return <div className="rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] text-slate-700 ring-1 ring-slate-200">{lines.map((l) => <p key={l}>{l}</p>)}</div>;
}

const T = ({ icon: Icon, children }: { icon: typeof UserRound; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
