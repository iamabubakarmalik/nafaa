/**
 * The three shared editor steps: who the product is, its prices (and packs),
 * and its stock (opening count, variants, batches). Industries reuse them and
 * add their own fields through the `extra` slots.
 */

import type { ReactNode } from 'react';
import { Boxes, CalendarClock, Layers, Package, Plus, Tag, Trash2, Wallet } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { BrandField, CategoryField, Chip, CodeFields, ImagesField, MarginCard, NumberField, Section, TagsField, TextField, Tiles, Toggle, inputClass } from './fields';
import { openingStock } from './save';
import type { BatchDraft, CoreOptions, Errors, StepContext, StepDef, UnitDraft, VariantDraft } from './types';

type Slot<X> = (ctx: StepContext<X>) => ReactNode;
const fmt = (n: number) => String(Number(Number(n).toFixed(3)));

/* ─────────────────────────── Step 1: basic ─────────────────────────── */

export function basicStep<X>(core: CoreOptions, opts: { extra?: Slot<X>; after?: Slot<X>; categorySuggestions?: string[]; namePlaceholder?: string } = {}): StepDef<X> {
  return {
    id: 'basic', title: 'Pehchaan', hint: 'Naam, category, code', icon: Tag,
    validate: (d) => {
      const e: Errors = {};
      if (!d.core.name.trim()) e.name = 'Naam likhein';
      if (!d.core.unit.trim()) e.unit = 'Unit chunein';
      return e;
    },
    render: (ctx) => {
      const c = ctx.draft.core;
      return (
        <div className="space-y-4">
          <Section icon={Tag} title="Cheez kya hai" hint="Wohi naam likhein jo grahak bolta hai — POS par isi se milegi">
            <div className="space-y-4">
              <TextField label="Naam" required big autoFocus value={c.name} onChange={(name) => ctx.setCore({ name })} onBlur={() => ctx.touch('name')}
                error={ctx.errors.name} placeholder={opts.namePlaceholder ?? 'Jaise: Tapal Danedar 95g'} />
              {opts.extra?.(ctx)}
              <CategoryField value={c.categoryId} onChange={(categoryId) => ctx.setCore({ categoryId })} suggestions={opts.categorySuggestions} />
              <BrandField value={c.brandId} onChange={(brandId) => ctx.setCore({ brandId })} />
              <CodeFields name={c.name} sku={c.sku} barcode={c.barcode} prefix={core.skuPrefix} onSku={(sku) => ctx.setCore({ sku })} onBarcode={(barcode) => ctx.setCore({ barcode })} />
            </div>
          </Section>
          <Section icon={Package} title="Kis hisaab se bikti hai" hint="Stock aur rate isi unit mein ginay jayenge">
            <Tiles value={c.unit} onChange={(unit) => ctx.setCore({ unit })} options={core.units} columns="grid-cols-3 sm:grid-cols-6" />
          </Section>
          <Section title="Tasveerein" hint="POS aur online store par yahi dikhegi">
            <ImagesField value={c.images} onChange={(images) => ctx.setCore({ images })} />
          </Section>
          <Section title="Aur" hint="Zaroori nahi — baad mein bhi bhar sakte hain">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Tafseel</span>
                <textarea value={c.description} onChange={(e) => ctx.setCore({ description: e.target.value })} rows={3} placeholder="Size, flavour, kis kaam aati hai…"
                  className={cn(inputClass, 'h-auto py-2.5')} />
              </label>
              <TagsField value={c.tagIds} onChange={(tagIds) => ctx.setCore({ tagIds })} />
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle on={c.isActive} onChange={(isActive) => ctx.setCore({ isActive })} title="Chalu" hint="Band ho to POS par nahi dikhti" />
                <Toggle on={c.isFeatured} onChange={(isFeatured) => ctx.setCore({ isFeatured })} title="Khaas" hint="POS aur store mein upar dikhti hai" />
                <Toggle on={c.isRawMaterial} onChange={(isRawMaterial) => ctx.setCore({ isRawMaterial })} title="Raw material (kacha maal)" hint="Sirf kharidari aur banane me — POS par nahi bikti" />
              </div>
              {opts.after?.(ctx)}
            </div>
          </Section>
        </div>
      );
    },
  };
}

/* ─────────────────────────── Step 2: price ─────────────────────────── */

const PACK_PRESETS: Array<{ name: string; rate: number; type: UnitDraft['conversionType'] }> = [
  { name: 'Aadha darjan', rate: 6, type: 'PACK' }, { name: 'Darjan', rate: 12, type: 'DOZEN' }, { name: 'Pack (10)', rate: 10, type: 'PACK' },
  { name: 'Dabba (24)', rate: 24, type: 'BOX' }, { name: 'Carton', rate: 120, type: 'CARTON' }, { name: 'Bori (50)', rate: 50, type: 'CUSTOM' },
];

function PacksEditor<X>({ ctx }: { ctx: StepContext<X> }) {
  const c = ctx.draft.core;
  const units = c.units;
  const set = (units: UnitDraft[]) => ctx.setCore({ units });
  const base = (): UnitDraft => ({ unitName: c.unit, conversionType: 'BASE', conversionRate: 1, isBase: true, price: c.price, costPrice: c.costPrice, wholesalePrice: c.wholesalePrice, mrpPrice: null, barcode: '', sku: '' });
  const add = (name: string, rate: number, type: UnitDraft['conversionType']) => {
    const list = units.length ? units : [base()];
    set([...list, { unitName: name, conversionType: type, conversionRate: rate, isBase: false, price: Math.round(c.price * rate), costPrice: Math.round(c.costPrice * rate), wholesalePrice: c.wholesalePrice ? Math.round(c.wholesalePrice * rate) : null, mrpPrice: null, barcode: '', sku: '' }]);
  };
  const update = (i: number, patch: Partial<UnitDraft>) => set(units.map((u, x) => (x === i ? { ...u, ...patch } : u)));
  return (
    <Section icon={Boxes} title="Packing (darjan, dabba, carton)" hint="Ek cheez kai tarah bikti ho to — POS par har packing ka apna rate aur barcode"
      actions={units.length > 0 ? <button type="button" onClick={() => set([])} className="text-[0.75rem] font-semibold text-rose-700 hover:underline">Sab hatayein</button> : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {PACK_PRESETS.filter((p) => !units.some((u) => u.unitName === p.name)).map((p) => (
          <button key={p.name} type="button" onClick={() => add(p.name, p.rate, p.type)} className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-100 px-3 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-200">
            <Plus className="h-3.5 w-3.5" />{p.name}
          </button>
        ))}
        <button type="button" onClick={() => add('Nayi packing', 2, 'CUSTOM')} className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-brand-400 px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-3.5 w-3.5" />Apni</button>
      </div>
      {units.length > 0 && (
        <div className="mt-4 space-y-2">
          {units.map((u, i) => {
            const perPiece = u.conversionRate ? u.price / u.conversionRate : 0;
            const saving = c.price > 0 && !u.isBase ? ((c.price - perPiece) / c.price) * 100 : 0;
            return (
              <div key={u.id ?? i} className={cn('rounded-xl border p-3', u.isBase ? 'border-brand-200 bg-brand-50/40' : 'border-slate-200')}>
                <div className="grid gap-2 sm:grid-cols-[1.4fr_0.8fr_1fr_1fr_1fr_auto] sm:items-end">
                  <label className="text-[0.75rem] font-medium text-slate-500">Naam
                    <input value={u.unitName} disabled={u.isBase} onChange={(e) => update(i, { unitName: e.target.value })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem]')} />
                  </label>
                  <label className="text-[0.75rem] font-medium text-slate-500">Kitne {c.unit}
                    <input inputMode="decimal" value={u.conversionRate || ''} disabled={u.isBase} onChange={(e) => update(i, { conversionRate: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem] tabular-nums')} />
                  </label>
                  <label className="text-[0.75rem] font-medium text-slate-500">Rate
                    <input inputMode="decimal" value={u.price || ''} onChange={(e) => update(i, { price: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem] tabular-nums')} />
                  </label>
                  <label className="text-[0.75rem] font-medium text-slate-500">Cost
                    <input inputMode="decimal" value={u.costPrice || ''} onChange={(e) => update(i, { costPrice: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem] tabular-nums')} />
                  </label>
                  <label className="text-[0.75rem] font-medium text-slate-500">Barcode
                    <input value={u.barcode} onChange={(e) => update(i, { barcode: e.target.value })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem]')} />
                  </label>
                  {!u.isBase ? (
                    <button type="button" onClick={() => set(units.filter((_, x) => x !== i))} aria-label="Hatayein" className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
                  ) : <span className="hidden h-10 w-10 sm:block" />}
                </div>
                {!u.isBase && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                    <span>Fi {c.unit}: <strong className="tabular-nums text-slate-700">{formatPKR(perPiece)}</strong></span>
                    {saving > 0.5 && <span className="rounded-full bg-success-50 px-2 py-0.5 font-semibold text-success-700">{saving.toFixed(0)}% sasta</span>}
                    <span className="ml-auto">Discount:</span>
                    {[0, 3, 5, 8, 10].map((d) => (
                      <button key={d} type="button" onClick={() => update(i, { price: Math.round(c.price * u.conversionRate * (1 - d / 100)) })}
                        className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 hover:bg-slate-200">{d}%</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export function priceStep<X>(core: CoreOptions, opts: { extra?: Slot<X>; allowZeroPrice?: boolean } = {}): StepDef<X> {
  const markups = core.markups ?? [10, 15, 20, 25, 30, 50];
  return {
    id: 'price', title: 'Qeemat', hint: 'Cost, rate, munafa', icon: Wallet,
    validate: (d) => {
      const e: Errors = {};
      if (!opts.allowZeroPrice && !(d.core.price > 0)) e.price = 'Bechne ki qeemat likhein';
      if (d.core.costPrice < 0) e.costPrice = 'Cost ulti nahi ho sakti';
      d.core.units.forEach((u, i) => {
        if (!u.unitName.trim()) e[`unit${i}`] = 'Packing ka naam likhein';
        if (!(u.conversionRate > 0)) e[`unit${i}`] = `${u.unitName || 'Packing'}: kitne aate hain likhein`;
      });
      const codes = d.core.units.map((u) => u.barcode.trim()).filter(Boolean);
      if (new Set(codes).size !== codes.length) e.units = 'Do packing ka barcode ek jaisa hai';
      return e;
    },
    render: (ctx) => {
      const c = ctx.draft.core;
      return (
        <div className="space-y-4">
          <Section icon={Wallet} title={`Ek ${c.unit} ki qeemat`} hint="Cost likhein to munafa khud nikal aata hai">
            <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="Khareed (cost)" prefix="Rs" value={c.costPrice} onChange={(v) => ctx.setCore({ costPrice: v ?? 0 })} allowEmpty error={ctx.errors.costPrice} />
                  <NumberField label="Bechne ki qeemat" prefix="Rs" required big value={c.price} onChange={(v) => ctx.setCore({ price: v ?? 0 })} onBlur={() => ctx.touch('price')} allowEmpty error={ctx.errors.price} />
                </div>
                {c.costPrice > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                    <span className="mr-1">Cost par munafa jorein:</span>
                    {markups.map((m) => {
                      const p = Math.round(c.costPrice * (1 + m / 100));
                      return <Chip key={m} on={c.price === p} onClick={() => ctx.setCore({ price: p })}>+{m}% · {p}</Chip>;
                    })}
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="Wholesale qeemat" prefix="Rs" value={c.wholesalePrice} allowEmpty onChange={(v) => ctx.setCore({ wholesalePrice: v })} hint="Dukandaron ko is rate par" />
                  <NumberField label="Tax" suffix="%" value={c.taxRate} allowEmpty onChange={(v) => ctx.setCore({ taxRate: v ?? 0 })} hint="Agar bill par tax lagta hai" />
                </div>
                {opts.extra?.(ctx)}
              </div>
              <MarginCard cost={c.costPrice} price={c.price} money={formatPKR} />
            </div>
          </Section>
          {core.packs && <PacksEditor ctx={ctx} />}
          {ctx.errors.units && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.units}</p>}
        </div>
      );
    },
  };
}

/* ─────────────────────────── Step 3: stock ─────────────────────────── */

function VariantsEditor<X>({ ctx, presets }: { ctx: StepContext<X>; presets: Array<{ group: string; values: string[] }> }) {
  const c = ctx.draft.core;
  const set = (variants: VariantDraft[]) => ctx.setCore({ variants });
  const add = (name: string) => {
    if (!name.trim() || c.variants.some((v) => v.name.toLowerCase() === name.trim().toLowerCase())) return;
    set([...c.variants, { name: name.trim(), sku: '', barcode: '', colorHex: '', price: null, costPrice: null, stock: 0, isActive: true }]);
  };
  const update = (i: number, patch: Partial<VariantDraft>) => set(c.variants.map((v, x) => (x === i ? { ...v, ...patch } : v)));
  return (
    <div className="space-y-3">
      {presets.map((p) => (
        <div key={p.group} className="flex flex-wrap items-center gap-1.5">
          <span className="w-16 text-[0.75rem] font-medium text-slate-500">{p.group}</span>
          {p.values.map((v) => <Chip key={v} on={c.variants.some((x) => x.name === v)} onClick={() => (c.variants.some((x) => x.name === v) ? set(c.variants.filter((x) => x.name !== v || x.id)) : add(v))}>{v}</Chip>)}
        </div>
      ))}
      <input placeholder="Apna variant likh kar Enter dabayein (jaise: Laal 128GB)" className={cn(inputClass, 'h-10 text-[0.875rem]')}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(e.currentTarget.value); e.currentTarget.value = ''; } }} />
      {c.variants.length > 0 && (
        <div className="overflow-x-auto rounded-xl ring-1 ring-slate-200">
          <table className="w-full min-w-[40rem] text-[0.8125rem]">
            <thead><tr className="bg-slate-50 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-3 py-2">Variant</th><th className="px-2 py-2">Stock</th><th className="px-2 py-2">Rate</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Barcode</th><th className="px-2 py-2">Rang</th><th />
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {c.variants.map((v, i) => (
                <tr key={v.id ?? i}>
                  <td className="px-3 py-1.5"><input value={v.name} onChange={(e) => update(i, { name: e.target.value })} className={cn(inputClass, 'h-9 text-[0.8125rem]')} /></td>
                  <td className="px-2 py-1.5">
                    {v.id ? <span className="block w-20 text-center tabular-nums text-slate-600" title="Stock badalne ke liye Maal page par Stock">{fmt(v.stock)}</span>
                      : <input inputMode="decimal" value={v.stock || ''} placeholder="0" onChange={(e) => update(i, { stock: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'h-9 w-20 text-[0.8125rem] tabular-nums')} />}
                  </td>
                  <td className="px-2 py-1.5"><input inputMode="decimal" value={v.price ?? ''} placeholder={String(c.price || '')} onChange={(e) => update(i, { price: e.target.value === '' ? null : Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'h-9 w-24 text-[0.8125rem] tabular-nums')} /></td>
                  <td className="px-2 py-1.5"><input value={v.sku} onChange={(e) => update(i, { sku: e.target.value })} className={cn(inputClass, 'h-9 w-28 text-[0.8125rem]')} /></td>
                  <td className="px-2 py-1.5"><input value={v.barcode} onChange={(e) => update(i, { barcode: e.target.value })} className={cn(inputClass, 'h-9 w-32 text-[0.8125rem]')} /></td>
                  <td className="px-2 py-1.5"><input type="color" value={v.colorHex || '#94a3b8'} onChange={(e) => update(i, { colorHex: e.target.value })} className="h-9 w-10 cursor-pointer rounded-lg border border-slate-200 bg-white p-1" aria-label="Rang" /></td>
                  <td className="px-2 py-1.5"><button type="button" onClick={() => set(c.variants.filter((_, x) => x !== i))} aria-label="Hatayein" className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BatchesEditor<X>({ ctx }: { ctx: StepContext<X> }) {
  const c = ctx.draft.core;
  const set = (batches: BatchDraft[]) => ctx.setCore({ batches });
  const update = (i: number, patch: Partial<BatchDraft>) => set(c.batches.map((b, x) => (x === i ? { ...b, ...patch } : b)));
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
  return (
    <div className="space-y-2">
      {c.batches.map((b, i) => {
        const tone = b.expiryDate && b.expiryDate < today ? 'border-rose-300 bg-rose-50/50' : b.expiryDate && b.expiryDate <= soon ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200';
        return (
          <div key={b.id ?? i} className={cn('grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_1fr_0.8fr_0.8fr_auto] sm:items-end', tone)}>
            <label className="text-[0.75rem] font-medium text-slate-500">Batch number<input value={b.batchNumber} onChange={(e) => update(i, { batchNumber: e.target.value })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem]')} /></label>
            <label className="text-[0.75rem] font-medium text-slate-500">Bani<input type="date" value={b.manufactureDate} onChange={(e) => update(i, { manufactureDate: e.target.value })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem]')} /></label>
            <label className="text-[0.75rem] font-medium text-slate-500">Expiry<input type="date" value={b.expiryDate} onChange={(e) => update(i, { expiryDate: e.target.value })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem]')} /></label>
            <label className="text-[0.75rem] font-medium text-slate-500">Kitna
              {b.id ? <span className="mt-1 flex h-10 items-center px-1 tabular-nums text-slate-700">{fmt(b.quantity)}</span>
                : <input inputMode="decimal" value={b.quantity || ''} onChange={(e) => update(i, { quantity: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem] tabular-nums')} />}
            </label>
            <label className="text-[0.75rem] font-medium text-slate-500">Cost<input inputMode="decimal" value={b.costPrice || ''} onChange={(e) => update(i, { costPrice: Number(e.target.value.replace(/[^\d.]/g, '')) })} className={cn(inputClass, 'mt-1 h-10 text-[0.875rem] tabular-nums')} /></label>
            <button type="button" onClick={() => set(c.batches.filter((_, x) => x !== i))} aria-label="Hatayein" className="flex h-10 w-10 items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
          </div>
        );
      })}
      <button type="button" onClick={() => set([...c.batches, { batchNumber: `B-${String(c.batches.length + 1).padStart(3, '0')}`, manufactureDate: '', expiryDate: '', quantity: 0, costPrice: c.costPrice, notes: '' }])}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-dashed border-brand-400 px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" />Batch jorein</button>
    </div>
  );
}

export function stockStep<X>(core: CoreOptions, opts: { extra?: Slot<X>; title?: string; quick?: number[] } = {}): StepDef<X> {
  const quick = opts.quick ?? [10, 25, 50, 100, 200, 500];
  return {
    id: 'stock', title: opts.title ?? 'Stock', hint: 'Kitna maal hai', icon: Layers,
    validate: (d) => {
      const e: Errors = {};
      const names = d.core.variants.map((v) => v.name.trim().toLowerCase());
      if (names.some((n) => !n)) e.variants = 'Har variant ka naam likhein';
      else if (new Set(names).size !== names.length) e.variants = 'Do variants ka naam ek jaisa hai';
      const codes = d.core.variants.map((v) => v.barcode.trim()).filter(Boolean);
      if (new Set(codes).size !== codes.length) e.variants = 'Do variants ka barcode ek jaisa hai';
      d.core.batches.forEach((b, i) => {
        if (!b.batchNumber.trim()) e[`batch${i}`] = 'Batch number likhein';
        else if (!b.id && !(b.quantity > 0)) e[`batch${i}`] = `${b.batchNumber}: kitna maal likhein`;
      });
      if (d.core.lowStockAlert < 0) e.lowStockAlert = 'Had ulti nahi ho sakti';
      return e;
    },
    render: (ctx) => {
      const c = ctx.draft.core;
      const simple = !c.variants.length && !c.batches.length;
      const batchErr = Object.entries(ctx.errors).find(([k]) => k.startsWith('batch'))?.[1];
      return (
        <div className="space-y-4">
          <Section icon={Layers} title={ctx.isEdit ? 'Abhi ka stock' : 'Shuru ka stock'}
            hint={ctx.isEdit ? 'Stock yahan nahi badalta — Maal page par "Stock" button se badlein, taake record bane' : 'Abhi shelf par kitna hai'}>
            <div className="grid gap-4 sm:grid-cols-2">
              {ctx.isEdit || !simple ? (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-[0.75rem] font-medium text-slate-500">{ctx.isEdit ? 'Abhi' : 'Variants / batches se'}</p>
                  <p className="text-[1.75rem] font-bold tabular-nums text-slate-900">{fmt(ctx.isEdit ? c.stock : openingStock(c))} <span className="text-[0.875rem] font-medium text-slate-500">{c.unit}</span></p>
                </div>
              ) : (
                <div>
                  <NumberField label={`Kitna ${c.unit}`} big value={c.stock} allowEmpty onChange={(v) => ctx.setCore({ stock: v ?? 0 })} />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {quick.map((q) => <button key={q} type="button" onClick={() => ctx.setCore({ stock: (Number(c.stock) || 0) + q })} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-semibold text-slate-700 hover:bg-slate-200">+{q}</button>)}
                    {c.stock > 0 && <button type="button" onClick={() => ctx.setCore({ stock: 0 })} className="h-8 rounded-lg px-2.5 text-[0.8125rem] font-semibold text-rose-700 hover:bg-rose-50">Saaf</button>}
                  </div>
                </div>
              )}
              <NumberField label="Kam hone ki had" value={c.lowStockAlert} allowEmpty onChange={(v) => ctx.setCore({ lowStockAlert: v ?? 0 })} error={ctx.errors.lowStockAlert}
                hint={`Itna ya kam bachne par "Kam" ki patti lagegi`} suffix={c.unit} />
            </div>
            {!ctx.isEdit && c.price > 0 && openingStock(c) > 0 && (
              <p className="mt-3 text-[0.8125rem] text-slate-600">
                Is stock ki qeemat: <strong className="tabular-nums">{formatPKR(openingStock(c) * c.costPrice)}</strong> cost · <strong className="tabular-nums">{formatPKR(openingStock(c) * c.price)}</strong> bechne par
              </p>
            )}
          </Section>
          {core.variants && (
            <Section icon={Boxes} title="Variants (size, rang, flavour)" hint="Ek hi cheez ki alag qismein — har ek ka apna stock aur rate">
              <VariantsEditor ctx={ctx} presets={core.variants.presets} />
              {ctx.errors.variants && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.variants}</p>}
            </Section>
          )}
          {core.batches && (
            <Section icon={CalendarClock} title="Batch aur expiry" hint="Dawai, khane ki cheezein — jo pehle expire ho woh pehle bechein">
              <BatchesEditor ctx={ctx} />
              {batchErr && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{batchErr}</p>}
            </Section>
          )}
          {opts.extra?.(ctx)}
        </div>
      );
    },
  };
}
