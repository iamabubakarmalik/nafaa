/**
 * Create or edit a combo. Parts are found by name, SKU or barcode (camera
 * too); each part can be a variant and a pack (dozen, carton). A live panel
 * shows the price of the parts bought separately, the customer's saving,
 * cost, profit, margin and how many can be made from stock. Image, barcode,
 * status, validity dates and limits are set here as well.
 * Keys: Ctrl+S save · G guide.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Barcode, Boxes, CalendarClock, Gift, GraduationCap, ImagePlus, Loader2, Minus, Percent, Plus, Save,
  ScanLine, ShoppingBag, Sparkles, Star, Tag, Trash2, Wand2,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { PrintButton } from '@core/print';
import { Button, PAGE_WIDTH_CLASS, Switch } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { productUnitsApi } from '@modules/inventory/products/api/product-units.api';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { ProductThumb } from '@modules/inventory/products/lib/productEmoji';
import { ProductSearch } from '@modules/inventory/stock-adjustments/components/ProductSearch';
import { uploadsApi } from '@modules/organization/settings/api/uploads.api';
import { usePurchaseSources, type Source, type UnitChoice } from '@modules/purchasing/purchases/editor/sources';
import { combosApi, type ComboPayload, type ComboStatus, type ProductCombo } from '../api/combos.api';
import { COMBO_KEY, COMBO_KEYS, STATUS, nameExample, qtyText, tagIdeas, useBranchName } from '../components/meta';
import { comboSheet } from '../components/print';

interface Part {
  key: string;
  productId: string;
  name: string;
  image?: string | null;
  category?: string | null;
  baseUnit: string;
  hasVariants: boolean;
  variantId: string | null;
  unitId: string | null;
  unitName: string;
  rate: number;
  quantity: string;
  /** Normal price of one chosen unit; empty = today's price. */
  price: string;
}

interface Form {
  name: string;
  tagLine: string;
  description: string;
  imageUrl: string;
  categoryId: string;
  comboPrice: string;
  barcode: string;
  sku: string;
  status: ComboStatus;
  isFeatured: boolean;
  validFrom: string;
  validTo: string;
  stockAvailable: string;
  maxPurchasePerCustomer: string;
}

const EMPTY: Form = {
  name: '', tagLine: '', description: '', imageUrl: '', categoryId: '', comboPrice: '', barcode: '', sku: '', status: 'ACTIVE',
  isFeatured: false, validFrom: '', validTo: '', stockAvailable: '', maxPurchasePerCustomer: '',
};

const input = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15';
const num = (v: string) => (v.trim() === '' ? NaN : Number(v));
const dateIn = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');
let seq = 0;
const partKey = () => `p${++seq}`;

/** In-store EAN-13 ("29…") with a correct check digit; the server checks it is free. */
function inStoreEan() {
  const body = `29${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const sum = body.split('').reduce((s, d, i) => s + Number(d) * (i % 2 ? 3 : 1), 0);
  return body + String((10 - (sum % 10)) % 10);
}

export default function ComboFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const industry = useCurrentIndustry();
  const { cost: costMoney, costHidden } = useMasked();
  const branch = useBranchName();
  const guide = usePageGuide();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Form>(EMPTY);
  const [parts, setParts] = useState<Part[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scanBarcode, setScanBarcode] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const { sources, byCode, loading } = usePurchaseSources(false);
  const source = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources]);
  const unitsQ = useQuery({ queryKey: ['pos-product-units'], queryFn: () => productUnitsApi.listAll(), staleTime: 5 * 60_000 });
  const unitPrice = useMemo(() => new Map((unitsQ.data ?? []).map((u) => [u.id, Number(u.price) || 0])), [unitsQ.data]);
  const categoriesQ = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });

  const existing = useQuery({ queryKey: [COMBO_KEY, 'one', id], queryFn: () => combosApi.getOne(id!), enabled: editing, staleTime: Infinity, refetchOnWindowFocus: false });
  useEffect(() => {
    const c = existing.data;
    if (!c) return;
    setF({
      name: c.name, tagLine: c.tagLine ?? '', description: c.description ?? '', imageUrl: c.imageUrl ?? '', categoryId: c.categoryId ?? '',
      comboPrice: String(c.comboPrice), barcode: c.barcode ?? '', sku: c.sku ?? '', status: c.status, isFeatured: c.isFeatured,
      validFrom: dateIn(c.validFrom), validTo: dateIn(c.validTo),
      stockAvailable: c.stockAvailable == null ? '' : String(c.stockAvailable),
      maxPurchasePerCustomer: c.maxPurchasePerCustomer == null ? '' : String(c.maxPurchasePerCustomer),
    });
    setParts(c.items.map((i) => ({
      key: partKey(), productId: i.productId, name: i.product?.name ?? 'Product', image: i.product?.images?.[0]?.url ?? null,
      category: i.product?.category?.name ?? null, baseUnit: i.product?.unit ?? 'pcs', hasVariants: !!i.product?.hasVariants,
      variantId: i.variantId ?? null, unitId: i.unitId ?? null, unitName: i.unit?.unitName ?? i.unitName ?? i.product?.unit ?? 'pcs',
      rate: Number(i.unit?.conversionRate) || 1, quantity: String(i.quantity), price: i.originalPrice ? String(i.originalPrice) : '',
    })));
  }, [existing.data]);

  const add = (s: Source, unit: UnitChoice) => {
    setParts((list) => {
      const same = list.find((p) => p.productId === s.id && p.unitId === unit.id && !p.variantId);
      if (same) return list.map((p) => (p === same ? { ...p, quantity: String((Number(p.quantity) || 0) + 1) } : p));
      return [...list, {
        key: partKey(), productId: s.id, name: s.name, image: s.image, category: s.category, baseUnit: s.baseUnit, hasVariants: !!s.hasVariants,
        variantId: null, unitId: unit.id, unitName: unit.name, rate: unit.rate, quantity: '1', price: '',
      }];
    });
  };
  const patch = (key: string, p: Partial<Part>) => setParts((list) => list.map((x) => (x.key === key ? { ...x, ...p } : x)));

  // Variant prices and stock, fetched once per product that has variants.
  const variantIds = [...new Set(parts.filter((p) => p.hasVariants).map((p) => p.productId))];
  const variantsQ = useQuery({
    queryKey: ['combo-form-variants', variantIds],
    queryFn: async () => Object.fromEntries(await Promise.all(variantIds.map(async (pid) => [pid, await productVariantsApi.list(pid).catch(() => [])] as const))),
    enabled: variantIds.length > 0,
    staleTime: 60_000,
  });

  /** Today's normal price, cost and stock of one part, in its chosen unit. */
  const figures = (p: Part) => {
    const s = source.get(p.productId);
    const v = p.variantId ? variantsQ.data?.[p.productId]?.find((x) => x.id === p.variantId) : undefined;
    const basePrice = v ? Number(v.price) : s?.price ?? 0;
    const baseCost = v ? Number(v.costPrice || s?.cost || 0) : s?.cost ?? 0;
    const stock = v ? Number(v.stock) : s?.stock ?? 0;
    const today = p.unitId && (unitPrice.get(p.unitId) ?? 0) > 0 ? unitPrice.get(p.unitId)! : basePrice * p.rate;
    const qty = Number(p.quantity) || 0;
    const price = p.price.trim() ? Number(p.price) || 0 : today;
    const baseQty = qty * p.rate;
    return { today, price, line: price * qty, cost: baseCost * baseQty, baseQty, stock, canMake: baseQty > 0 ? Math.floor(stock / baseQty + 1e-9) : 0 };
  };

  const rows = parts.map((p) => ({ p, x: figures(p) }));
  const separate = rows.reduce((s, r) => s + r.x.line, 0);
  const cost = rows.reduce((s, r) => s + r.x.cost, 0);
  const price = num(f.comboPrice);
  const saving = Number.isFinite(price) ? separate - price : 0;
  const profit = Number.isFinite(price) ? price - cost : 0;
  const margin = Number.isFinite(price) && price > 0 ? (profit / price) * 100 : 0;
  const limit = num(f.stockAvailable);
  const fromStock = rows.length ? Math.min(...rows.map((r) => r.x.canMake)) : 0;
  const canMake = Number.isFinite(limit) ? Math.min(limit, fromStock) : fromStock;
  const limiting = rows.length ? rows.reduce((a, b) => (b.x.canMake < a.x.canMake ? b : a)).p.name : '';

  const oneThing = parts.length === 1 && (Number(parts[0].quantity) || 0) <= 1;
  const badQty = parts.some((p) => !(Number(p.quantity) > 0));
  const datesWrong = !!f.validFrom && !!f.validTo && f.validTo < f.validFrom;
  const problems = [
    f.name.trim().length < 2 && 'Combo ka naam likhein',
    !parts.length && 'Kam az kam ek cheez daalein',
    oneThing && 'Do cheezein daalein, ya ek cheez ki miqdar 1 se zyada rakhein',
    badQty && 'Har cheez ki miqdar 0 se zyada honi chahiye',
    !(price > 0) && 'Combo ki qeemat likhein',
    datesWrong && 'Khatam ki tareekh shuru se pehle hai',
  ].filter(Boolean) as string[];

  const payload = (): ComboPayload => ({
    name: f.name.trim(),
    tagLine: f.tagLine.trim() || null,
    description: f.description.trim() || null,
    imageUrl: f.imageUrl || null,
    categoryId: f.categoryId || null,
    comboPrice: price,
    barcode: f.barcode.trim() || null,
    sku: f.sku.trim() || null,
    status: f.status,
    isFeatured: f.isFeatured,
    // Validity runs from the start of the first day to the end of the last.
    validFrom: f.validFrom ? new Date(`${f.validFrom}T00:00:00`).toISOString() : null,
    validTo: f.validTo ? new Date(`${f.validTo}T23:59:59`).toISOString() : null,
    stockAvailable: Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : null,
    maxPurchasePerCustomer: Number(f.maxPurchasePerCustomer) >= 1 ? Math.floor(Number(f.maxPurchasePerCustomer)) : null,
    items: parts.map((p) => ({
      productId: p.productId, variantId: p.variantId, unitId: p.unitId, quantity: Number(p.quantity), unitName: p.unitName,
      ...(p.price.trim() && Number(p.price) > 0 ? { originalPrice: Number(p.price) } : {}),
    })),
  });

  const save = useMutation({
    mutationFn: () => (editing ? combosApi.update(id!, payload()) : combosApi.create(payload())),
    onSuccess: (c) => {
      COMBO_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(editing ? 'Combo save ho gaya' : `${c.name} ban gaya${c.status === 'ACTIVE' ? ' — POS par dikhega' : ''}`);
      navigate('/combos');
    },
    onError: (e: { response?: { data?: { message?: string | string[] } } }) => {
      const m = e?.response?.data?.message;
      toast.error(Array.isArray(m) ? m[0] : m || 'Save nahi hua');
    },
  });
  const submit = () => {
    if (problems.length) { toast.error(problems[0]); return; }
    if (!save.isPending) save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); document.getElementById('combo-save')?.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const upload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast.error('Tasveer 10 MB se chhoti honi chahiye'); return; }
    setUploading(true);
    try {
      const r = await uploadsApi.single({ file, name: file.name, type: file.type }, { purpose: 'product-image' });
      set('imageUrl', r.url);
    } catch (e) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Tasveer upload nahi hui');
    } finally {
      setUploading(false);
    }
  };

  const priceAt = (off: number) => {
    if (!(separate > 0)) return;
    const raw = separate * (1 - off / 100);
    set('comboPrice', String(raw >= 100 ? Math.round(raw / 10) * 10 : Math.round(raw)));
  };

  if (editing && existing.isLoading) return <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>;
  if (editing && existing.isError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <p className="font-semibold text-slate-900">Combo nahi mila</p>
        <Button className="mt-4" variant="secondary" onClick={() => navigate('/combos')}>Combos par wapas</Button>
      </div>
    );
  }

  const ideas = tagIdeas(industry?.id);
  const preview: ProductCombo | null = existing.data ?? null;

  return (
    <form className={cn(PAGE_WIDTH_CLASS, 'space-y-4 pb-28')} onSubmit={(e) => { e.preventDefault(); submit(); }}>
      {scanBarcode && <BarcodeScanner title="Combo ka barcode" hint="Combo par lagne wala barcode dabbe me rakhein" onDetected={(c) => { setScanBarcode(false); set('barcode', c.trim()); }} onClose={() => setScanBarcode(false)} />}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => navigate('/combos')} aria-label="Wapas" className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></button>
        <div className="mr-auto min-w-0">
          <h1 className="truncate text-lg font-semibold text-slate-900">{editing ? `${existing.data?.name ?? 'Combo'} — badlein` : 'Naya combo'}</h1>
          <p className="text-[0.75rem] text-slate-500">Kai cheezein ek qeemat par — POS par ek line, stock har cheez ka apna ghatta hai</p>
        </div>
        {preview && <PrintButton doc={() => comboSheet(preview, !costHidden, branch)} size="sm" />}
        <Button type="button" variant="ghost" onClick={guide.open} leftIcon={<GraduationCap className="h-4 w-4" />}>Guide</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Section icon={<Gift className="h-4 w-4" />} title="Combo">
            <Field label="Naam *" hint="Customer aur cashier ko yahi naam dikhega — bill par bhi" span>
              <input autoFocus={!editing} value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} placeholder={nameExample(industry?.id)} className={input} />
            </Field>
            <Field label="Chhota tag" hint="POS card par chhota sa label — neeche se jaldi chunein" span>
              <input value={f.tagLine} onChange={(e) => set('tagLine', e.target.value)} maxLength={60} placeholder="Best deal" className={input} />
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ideas.map((t) => <button key={t} type="button" onClick={() => set('tagLine', f.tagLine === t ? '' : t)} className={cn('rounded-full px-2.5 py-0.5 text-[0.75rem] ring-1', f.tagLine === t ? 'bg-brand-600 text-white ring-brand-600' : 'text-slate-600 ring-slate-200 hover:bg-slate-50')}>{t}</button>)}
              </div>
            </Field>
            <Field label="Category" hint="Reports aur POS me chhantne ke liye (ikhtiyari)">
              <select value={f.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={input}>
                <option value="">Koi nahi</option>
                {(categoriesQ.data ?? []).filter((c) => c.isActive || c.id === f.categoryId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <div className="block text-[0.8125rem] font-medium text-slate-700">
              Tasveer
              <div className="mt-1 flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-brand-400">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : f.imageUrl ? <img src={f.imageUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-5 w-5" />}
                </button>
                <div className="flex flex-col items-start gap-1">
                  <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()} loading={uploading}>{f.imageUrl ? 'Badlein' : 'Tasveer lagayein'}</Button>
                  {f.imageUrl && <button type="button" onClick={() => set('imageUrl', '')} className="text-[0.75rem] text-rose-600 hover:underline">Hatayein</button>}
                </div>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ''; }} />
              </div>
              <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">Na lagayein to pehli cheez ki tasveer dikhegi</span>
            </div>
            <Field label="Tafseel" hint="Andar kya hai, kab tak — print sheet par aata hai (ikhtiyari)" span>
              <textarea value={f.description} onChange={(e) => set('description', e.target.value)} rows={2} maxLength={2000} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
            </Field>
          </Section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-semibold text-slate-900"><ShoppingBag className="h-4 w-4" />Is combo me kya hai</h2>
              <span className="text-[0.75rem] text-slate-500">{parts.length} cheezein</span>
            </div>
            <ProductSearch sources={sources} byCode={byCode} loading={loading} onPick={add} placeholder="Cheez ka naam, SKU ya barcode — Enter ya scan…" />
            <p className="mt-1.5 text-[0.75rem] text-slate-500">Pack ka barcode scan karein to wohi pack (dozen, carton) jur jata hai. Dobara same cheez daalein to miqdar barh jati hai.</p>

            {!parts.length ? (
              <div className="mt-4 rounded-2xl border-2 border-dashed border-slate-200 px-4 py-8 text-center">
                <Boxes className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-700">Upar se cheezein dhoondein</p>
                <p className="text-[0.75rem] text-slate-500">Misaal: 1 tel + 5 kg chawal + 1 kg cheeni</p>
              </div>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
                {rows.map(({ p, x }) => {
                  const s = source.get(p.productId);
                  const variants = variantsQ.data?.[p.productId] ?? [];
                  return (
                    <li key={p.key} className="flex flex-wrap items-start gap-3 p-3">
                      <ProductThumb name={p.name} category={p.category} url={p.image} size="sm" />
                      <div className="min-w-0 flex-1 basis-48">
                        <p className="truncate text-sm font-semibold text-slate-900">{p.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {p.hasVariants && (
                            <select value={p.variantId ?? ''} onChange={(e) => patch(p.key, { variantId: e.target.value || null })} aria-label="Qism"
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem]">
                              <option value="">Koi bhi qism</option>
                              {variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                          )}
                          {(s?.units.length ?? 0) > 1 ? (
                            <select value={p.unitId ?? ''} aria-label="Unit"
                              onChange={(e) => { const u = s!.units.find((uu) => (uu.id ?? '') === e.target.value) ?? s!.units[0]; patch(p.key, { unitId: u.id, unitName: u.name, rate: u.rate, price: '' }); }}
                              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem]">
                              {s!.units.map((u) => <option key={u.id ?? 'base'} value={u.id ?? ''}>{u.name}{u.rate !== 1 ? ` (${qtyText(u.rate)} ${p.baseUnit})` : ''}</option>)}
                            </select>
                          ) : <span className="rounded-lg bg-slate-100 px-2 py-1 text-[0.75rem] text-slate-600">{p.unitName}</span>}
                          <span className={cn('text-[0.75rem]', x.canMake <= 3 ? 'text-amber-700' : 'text-slate-500')}>
                            Stock {qtyText(x.stock)} {p.baseUnit} · {x.canMake} combo
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" aria-label="Kam" onClick={() => patch(p.key, { quantity: String(Math.max(0, (Number(p.quantity) || 0) - 1)) })} className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"><Minus className="h-3.5 w-3.5" /></button>
                        <input value={p.quantity} onChange={(e) => patch(p.key, { quantity: e.target.value })} inputMode="decimal" aria-label="Miqdar"
                          className={cn('h-9 w-16 rounded-lg border px-2 text-center text-sm tabular-nums outline-none focus:border-brand-500', Number(p.quantity) > 0 ? 'border-slate-200' : 'border-rose-300')} />
                        <button type="button" aria-label="Zyada" onClick={() => patch(p.key, { quantity: String((Number(p.quantity) || 0) + 1) })} className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                      <label className="w-28 text-right">
                        <span className="sr-only">Alag qeemat</span>
                        <input value={p.price} onChange={(e) => patch(p.key, { price: e.target.value })} inputMode="decimal" placeholder={String(Math.round(x.today))}
                          title="Ek unit ki normal qeemat — khali chhorein to aaj ki qeemat" className="h-9 w-full rounded-lg border border-slate-200 px-2 text-right text-sm tabular-nums outline-none focus:border-brand-500" />
                        <span className="mt-0.5 block text-[0.6875rem] tabular-nums text-slate-500">= {formatPKR(x.line)}</span>
                      </label>
                      <button type="button" onClick={() => setParts((l) => l.filter((y) => y.key !== p.key))} aria-label="Hatayein" className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </li>
                  );
                })}
              </ul>
            )}
            {!!parts.length && <p className="mt-2 text-[0.75rem] text-slate-500">Qeemat ka khana ek unit ki normal qeemat hai — bachat isi se nikalti hai. Khali chhorein to aaj ki qeemat lagegi.</p>}
          </section>

          <Section icon={<Percent className="h-4 w-4" />} title="Qeemat">
            <Field label="Combo ki qeemat *" hint={separate > 0 ? `Alag alag lene par ${formatPKR(separate)} — is se kam rakhein taake customer ko bachat dikhe` : 'Pehle cheezein daalein, phir qeemat'}>
              <input value={f.comboPrice} onChange={(e) => set('comboPrice', e.target.value)} inputMode="decimal" placeholder="0" className={cn(input, 'text-right text-base font-semibold tabular-nums')} />
            </Field>
            <div className="text-[0.8125rem] font-medium text-slate-700">
              Jaldi qeemat
              <div className="mt-1 flex flex-wrap gap-1.5">
                {[5, 10, 15, 20].map((off) => (
                  <button key={off} type="button" disabled={!(separate > 0)} onClick={() => priceAt(off)}
                    className="rounded-full px-3 py-1 text-[0.75rem] font-semibold text-brand-800 ring-1 ring-brand-200 hover:bg-brand-50 disabled:opacity-40">{off}% kam</button>
                ))}
              </div>
              <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">Alag qeemat se itna kam, gol rupay me</span>
            </div>
          </Section>

          <Section icon={<Barcode className="h-4 w-4" />} title="Barcode aur POS">
            <Field label="Barcode" hint="Combo par label lagayein to POS par scan ho jata hai — kisi aur cheez wala nahi ho sakta">
              <div className="flex gap-1.5">
                <input value={f.barcode} onChange={(e) => set('barcode', e.target.value.replace(/\s/g, ''))} maxLength={60} className={cn(input, 'font-mono')} />
                <button type="button" onClick={() => setScanBarcode(true)} title="Camera se scan" aria-label="Scan" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50"><ScanLine className="h-4 w-4" /></button>
                <button type="button" onClick={() => set('barcode', inStoreEan())} title="Naya barcode banayein" aria-label="Barcode banayein" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-slate-200 hover:bg-slate-50"><Wand2 className="h-4 w-4" /></button>
              </div>
            </Field>
            <Field label="SKU / code" hint="Apna chhota code — search me kaam aata hai (ikhtiyari)">
              <input value={f.sku} onChange={(e) => set('sku', e.target.value)} maxLength={60} className={cn(input, 'font-mono')} />
            </Field>
            <div className="sm:col-span-2">
              <p className="text-[0.8125rem] font-medium text-slate-700">Haal</p>
              <div className="mt-1 inline-flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
                {(['ACTIVE', 'DRAFT', 'INACTIVE'] as ComboStatus[]).map((s) => (
                  <button key={s} type="button" onClick={() => set('status', s)}
                    className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.8125rem] font-semibold', f.status === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600')}>
                    {(() => { const I = STATUS[s].icon; return <I className="h-3.5 w-3.5" style={{ color: STATUS[s].color }} />; })()}{STATUS[s].label}
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-[0.75rem] text-slate-500">Sirf "Chalu" combo POS par dikhta hai. Kacha = abhi tayyar ho raha hai. Band = kuch der ke liye roka hua.</span>
            </div>
            <div className="sm:col-span-2">
              <Switch checked={f.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} label={<span className="inline-flex items-center gap-1.5"><Star className="h-4 w-4 text-amber-500" />Featured</span>} description="POS ke Combos tab me sab se upar dikhega" />
            </div>
          </Section>

          <Section icon={<CalendarClock className="h-4 w-4" />} title="Muddat aur had">
            <Field label="Kab se" hint="Khali = abhi se">
              <input type="date" value={f.validFrom} onChange={(e) => set('validFrom', e.target.value)} className={input} />
            </Field>
            <Field label="Kab tak" hint={datesWrong ? 'Ye tareekh shuru se pehle hai' : 'Khali = hamesha. Is din ke baad POS se khud hat jata hai'}>
              <input type="date" value={f.validTo} min={f.validFrom || undefined} onChange={(e) => set('validTo', e.target.value)} className={cn(input, datesWrong && 'border-rose-400')} />
            </Field>
            <Field label="Zyada se zyada kitne bechne hain" hint="Offer sirf itne combo tak — khali = jitne stock se ban sakein">
              <input value={f.stockAvailable} onChange={(e) => set('stockAvailable', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="Koi had nahi" className={cn(input, 'tabular-nums')} />
            </Field>
            <Field label="Ek customer kitne le sakta hai" hint="Yaad dihani ke liye — khali = koi had nahi">
              <input value={f.maxPurchasePerCustomer} onChange={(e) => set('maxPurchasePerCustomer', e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="Koi had nahi" className={cn(input, 'tabular-nums')} />
            </Field>
          </Section>
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100">
                {f.imageUrl || parts[0]?.image ? <img src={f.imageUrl || parts[0]?.image || ''} alt="" className="h-full w-full object-cover" /> : <Gift className="absolute inset-0 m-auto h-6 w-6 text-brand-500" />}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{f.name.trim() || 'Combo ka naam'}</p>
                {f.tagLine && <p className="inline-flex items-center gap-1 text-[0.75rem] text-brand-700"><Sparkles className="h-3 w-3" />{f.tagLine}</p>}
              </div>
            </div>
            <dl className="space-y-1.5 text-sm">
              <Row label="Alag alag lene par" value={formatPKR(separate)} />
              <Row label="Combo ki qeemat" value={Number.isFinite(price) ? formatPKR(price) : '—'} strong />
              <Row label="Customer ki bachat" value={Number.isFinite(price) && separate > 0 ? `${formatPKR(Math.max(saving, 0))} (${Math.max(0, Math.round((saving / separate) * 100))}%)` : '—'} tone={saving > 0 ? 'emerald' : undefined} />
              <div className="my-2 border-t border-dashed border-slate-200" />
              <Row label="Lagat" value={costMoney(cost)} />
              <Row label="Munafa" value={Number.isFinite(price) ? costMoney(profit) : '—'} tone={profit < 0 ? 'rose' : 'emerald'} />
              <Row label="Margin" value={costHidden ? '••••' : Number.isFinite(price) && price > 0 ? `${Math.round(margin)}%` : '—'} />
              <div className="my-2 border-t border-dashed border-slate-200" />
              <Row label="Stock se ban sakte" value={parts.length ? String(Math.max(0, canMake)) : '—'} tone={parts.length && canMake <= 3 ? 'amber' : undefined} />
              {parts.length > 0 && limiting && <p className="text-right text-[0.6875rem] text-slate-500">{Number.isFinite(limit) && limit <= fromStock ? 'Aap ki had' : `${limiting} se had`}</p>}
            </dl>
            {Number.isFinite(price) && price > 0 && separate > 0 && saving <= 0 && <Warn>Combo alag alag lene se mehnga ya barabar hai — customer ko koi bachat nahi.</Warn>}
            {!costHidden && Number.isFinite(price) && price > 0 && profit < 0 && <Warn>Qeemat lagat se kam hai — har combo par nuqsan hoga.</Warn>}
            {parts.length > 0 && canMake === 0 && <Warn>Kisi cheez ka stock nahi — abhi ek bhi combo nahi ban sakta.</Warn>}
            <p className="text-[0.6875rem] text-slate-400">Stock product list se — save ke baad Combos list par {branch} ka pakka hisaab</p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className={cn(PAGE_WIDTH_CLASS, 'flex items-center justify-end gap-2')}>
          {problems.length > 0 && <span className="mr-auto hidden items-center gap-1.5 text-[0.8125rem] text-amber-700 sm:inline-flex"><AlertTriangle className="h-4 w-4" />{problems[0]}</span>}
          <Button type="button" variant="secondary" onClick={() => navigate('/combos')}>Rehne dein</Button>
          <Button id="combo-save" type="submit" loading={save.isPending} disabled={problems.length > 0} leftIcon={<Save className="h-4 w-4" />}>{editing ? 'Save karein' : 'Combo banayein'}</Button>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide title="Combo kaise banayein" onClose={guide.close}
          steps={[
            { icon: Tag, color: '#16a34a', title: 'Naam aur tag', text: 'Aisa naam likhein jo customer foran samjhe. Tag (Best deal, Family pack) POS card par chhota label banta hai.' },
            { icon: ShoppingBag, color: '#2563eb', title: 'Cheezein daalein', text: 'Naam likh kar Enter, ya barcode scan karein. Miqdar + − se badlein. Pack wale product me dozen/carton chun sakte hain; qismon wale me qism.' },
            { icon: Percent, color: '#7c3aed', title: 'Qeemat', text: 'Upar "alag alag" ki raqam dikhti hai. "10% kam" jaise button se jaldi qeemat lagayein. Daayein panel me bachat, munafa aur margin live dikhte hain.' },
            { icon: Boxes, color: '#d97706', title: 'Stock se kitne', text: 'Har cheez ke saath likha hai us ke stock se kitne combo bante hain — sab se kam wali cheez hi had hai.' },
            { icon: CalendarClock, color: '#e11d48', title: 'Muddat', text: 'Offer ki tareekhen daalein — muddat ke bahar POS par nahi dikhta. "Zyada se zyada" se offer ko gine chune combo tak rakhein.' },
            { icon: Barcode, color: '#0891b2', title: 'Barcode', text: 'Jadoo wale button se naya barcode banayein ya camera se scan karein. Label print karke combo par lagayein — POS par scan ho jayega.' },
          ]}
          tips={[
            'Bill me combo ki har cheez alag line banti hai, is liye stock aur reports sahi rehte hain.',
            'Ek hi cheez ka combo bhi ban sakta hai — misaal: 3 sabun ek qeemat par.',
            'Lagat aur munafa sirf unhein dikhte hain jin ke paas lagat dekhne ki ijazat hai.',
          ]}
          shortcuts={[['Ctrl+S', 'save'], ['Enter', 'pehli cheez jorein'], ['G', 'guide']]}
        />
      )}
    </form>
  );
}

function Section({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">{icon}{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, span, children }: { label: string; hint?: string; span?: boolean; children: ReactNode }) {
  return (
    <label className={cn('block text-[0.8125rem] font-medium text-slate-700', span && 'sm:col-span-2')}>
      {label}<div className="mt-1">{children}</div>{hint && <span className="mt-1 block text-[0.75rem] font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: 'rose' | 'emerald' | 'amber' }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'text-base font-bold text-slate-900' : 'font-semibold', tone === 'rose' ? 'text-rose-700' : tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : !strong && 'text-slate-800')}>{value}</dd>
    </div>
  );
}

function Warn({ children }: { children: ReactNode }) {
  return <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[0.75rem] text-amber-900 ring-1 ring-amber-100"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{children}</p>;
}
