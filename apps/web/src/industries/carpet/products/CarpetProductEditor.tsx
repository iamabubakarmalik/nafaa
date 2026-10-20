/**
 * Carpet product editor on the shared product editor.
 *
 * Roll goods (sold by sqft, sq meter, sq gaz, running ft or meter): designs
 * or colours as variants, and on a new product the opening rolls (width ×
 * length, cost and rate per sqft). Their stock is only the rolls and pieces,
 * never a typed number. Rugs, dari, underlay and fitting items (pcs or
 * service) use the normal stock step.
 */

import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Layers, Palette, Plus, Ruler, Scissors, Trash2 } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Section, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, EditorDraft, Errors, StepContext, StepDef, VariantDraft } from '@modules/inventory/products/editor/types';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { formatPKR } from '@core/lib/format';
import { carpetRollsApi } from '../api/carpet-rolls.api';
import { ROLLS_KEY, SUMMARY_KEY, ftIn, isCarpetUnit, r2, realFt, unitLabel } from '../lib/meta';

interface RollDraft { design: string; rollNumber: string; widthFt: string; widthInch: string; lengthFt: string; lengthInch: string; cost: string; rate: string; rack: string }
export interface CarpetExtra { rolls: RollDraft[] }

const blankRoll = (design = ''): RollDraft => ({ design, rollNumber: '', widthFt: '12', widthInch: '', lengthFt: '', lengthInch: '', cost: '', rate: '', rack: '' });
const n = (v: string) => (v.trim() === '' ? 0 : Number(v));
const rollSqft = (r: RollDraft) => r2(realFt(n(r.widthFt), n(r.widthInch)) * realFt(n(r.lengthFt), n(r.lengthInch)));
const cell = `${inputClass} h-10 px-2.5 text-[0.875rem] tabular-nums`;
const digits = (v: string) => v.replace(/[^\d.]/g, '');

const core: CoreOptions = {
  units: [
    { value: 'sqft', label: 'Sq ft' }, { value: 'sqyd', label: 'Sq gaz' }, { value: 'sqm', label: 'Sq meter' },
    { value: 'ft', label: 'Running ft' }, { value: 'm', label: 'Running meter' }, { value: 'pcs', label: 'Piece (rug)' }, { value: 'service', label: 'Service (fitting)' },
  ],
  skuPrefix: 'CPT',
  packs: false,
  variants: { presets: [
    { group: 'Rang', values: ['Red', 'Maroon', 'Beige', 'Grey', 'Blue', 'Green', 'Brown', 'Cream'] },
    { group: 'Design', values: ['Plain', 'Floral', 'Irani', 'Modern', 'Border'] },
  ] },
  batches: false,
  markups: [20, 30, 40, 50],
};

/* ── Designs (variants) for roll goods ── */
function Designs({ ctx }: { ctx: StepContext<CarpetExtra> }) {
  const vs = ctx.draft.core.variants;
  const set = (i: number, patch: Partial<VariantDraft>) => ctx.setCore({ variants: vs.map((v, j) => (j === i ? { ...v, ...patch } : v)) });
  const add = (name = '') => ctx.setCore({ variants: [...vs, { name, sku: '', barcode: '', colorHex: '', price: null, costPrice: null, stock: 0, isActive: true }] });
  return (
    <Section icon={Palette} title="Designs / rang" hint="Ek carpet ke alag design ya rang — har roll kisi design ka hota hai. Ek hi design hai to khaali chhorein.">
      <div className="space-y-2">
        {vs.map((v, i) => (
          <div key={v.id ?? i} className="flex flex-wrap items-center gap-2">
            <input aria-label="Design ka naam" value={v.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Jaise: Maroon Irani" className={`${cell} min-w-[10rem] flex-1`} disabled={!v.isActive} />
            <input aria-label="Rang" type="color" value={v.colorHex || '#94a3b8'} onChange={(e) => set(i, { colorHex: e.target.value })} className="h-10 w-12 rounded-lg border border-slate-200" />
            <input aria-label="Alag rate" inputMode="decimal" value={v.price ?? ''} onChange={(e) => set(i, { price: e.target.value ? Number(digits(e.target.value)) : null })} placeholder="Rate (khaali = product ka)" className={`${cell} w-44`} />
            {v.id ? (
              <button type="button" onClick={() => set(i, { isActive: !v.isActive })} className="h-10 rounded-lg px-3 text-[0.8125rem] font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">{v.isActive ? 'Band karein' : 'Chalu karein'}</button>
            ) : (
              <button type="button" aria-label="Hatayein" onClick={() => ctx.setCore({ variants: vs.filter((_, j) => j !== i) })} className="flex h-10 w-10 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => add()} className="inline-flex h-8 items-center gap-1 rounded-lg bg-brand-50 px-2.5 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-100"><Plus className="h-3.5 w-3.5" />Design</button>
          {core.variants && core.variants.presets[0].values.filter((p) => !vs.some((v) => v.name.toLowerCase() === p.toLowerCase())).slice(0, 6).map((p) => (
            <button key={p} type="button" onClick={() => add(p)} className="h-8 rounded-lg bg-slate-100 px-2.5 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-200">+ {p}</button>
          ))}
        </div>
        {ctx.errors.variants && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.variants}</p>}
      </div>
    </Section>
  );
}

/* ── Opening rolls (new product) or the rolls it has (edit) ── */
function Rolls({ ctx }: { ctx: StepContext<CarpetExtra> }) {
  const c = ctx.draft.core;
  const rolls = ctx.draft.extra.rolls;
  const designs = c.variants.filter((v) => v.isActive && v.name.trim()).map((v) => v.name.trim());
  const set = (i: number, patch: Partial<RollDraft>) => ctx.setExtra({ rolls: rolls.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const totalSqft = rolls.reduce((s, r) => s + rollSqft(r), 0);

  if (ctx.isEdit) return <ExistingRolls productId={ctx.productId} />;
  return (
    <Section icon={Layers} title="Shuru ke rolls" hint="Dukaan me abhi jo rolls pare hain — har roll ki chaurai, lambai aur sqft ki cost / rate. Baad ke rolls Purchase ya Rolls page se aate hain."
      actions={<button type="button" onClick={() => ctx.setExtra({ rolls: [...rolls, blankRoll(designs[0] ?? '')] })} className="inline-flex h-9 items-center gap-1 rounded-lg bg-brand-600 px-3 text-[0.8125rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Roll</button>}>
      {rolls.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">Abhi koi roll nahi — "Roll" dabayein. Bina roll ke ye carpet counter par nahi bikega.</p>
      ) : (
        <div className="space-y-2">
          {rolls.map((r, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                {designs.length > 0 && (
                  <select aria-label="Design" value={r.design} onChange={(e) => set(i, { design: e.target.value })} className={`${cell} col-span-2`}>
                    {designs.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                )}
                <input aria-label="Roll number" value={r.rollNumber} onChange={(e) => set(i, { rollNumber: e.target.value })} placeholder="Roll # (khud)" className={`${cell} col-span-2 sm:col-span-1`} />
                <input aria-label="Chaurai ft" inputMode="decimal" value={r.widthFt} onChange={(e) => set(i, { widthFt: digits(e.target.value) })} placeholder="Chaurai ft" className={cell} />
                <input aria-label="Chaurai inch" inputMode="decimal" value={r.widthInch} onChange={(e) => set(i, { widthInch: digits(e.target.value) })} placeholder="inch" className={cell} />
                <input aria-label="Lambai ft" inputMode="decimal" value={r.lengthFt} onChange={(e) => set(i, { lengthFt: digits(e.target.value) })} placeholder="Lambai ft" className={cell} />
                <input aria-label="Lambai inch" inputMode="decimal" value={r.lengthInch} onChange={(e) => set(i, { lengthInch: digits(e.target.value) })} placeholder="inch" className={cell} />
                <input aria-label="Cost per sqft" inputMode="decimal" value={r.cost} onChange={(e) => set(i, { cost: digits(e.target.value) })} placeholder={`Cost/sqft${c.costPrice && c.unit === 'sqft' ? ` (${c.costPrice})` : ''}`} className={cell} />
                <input aria-label="Rate per sqft" inputMode="decimal" value={r.rate} onChange={(e) => set(i, { rate: digits(e.target.value) })} placeholder={`Rate/sqft${c.price && c.unit === 'sqft' ? ` (${c.price})` : ''}`} className={cell} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.75rem] text-slate-600">
                <input aria-label="Rack" value={r.rack} onChange={(e) => set(i, { rack: e.target.value })} placeholder="Rack / jagah" className={`${cell} h-8 w-36`} />
                <span className="tabular-nums">{ftIn(n(r.widthFt), n(r.widthInch))} × {ftIn(n(r.lengthFt), n(r.lengthInch))} = <b>{rollSqft(r)} sqft</b></span>
                {ctx.errors[`roll${i}`] && <span className="font-medium text-rose-600">{ctx.errors[`roll${i}`]}</span>}
                <button type="button" onClick={() => ctx.setExtra({ rolls: rolls.filter((_, j) => j !== i) })} className="ml-auto inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"><Trash2 className="h-3.5 w-3.5" />Hatayein</button>
              </div>
            </div>
          ))}
          <p className="text-[0.8125rem] text-slate-700">Kul: <b className="tabular-nums">{rolls.length} roll · {r2(totalSqft)} sqft</b></p>
        </div>
      )}
    </Section>
  );
}

function ExistingRolls({ productId }: { productId?: string }) {
  const { data } = useQuery({
    queryKey: [ROLLS_KEY, 'product', productId],
    queryFn: () => carpetRollsApi.list({ productId, inStockOnly: true, limit: 100 }),
    enabled: !!productId,
  });
  const items = data?.items ?? [];
  return (
    <Section icon={Layers} title="Is carpet ke rolls" hint="Stock rolls aur tukron se banta hai — naya roll Purchase ya Rolls page se, lambai Adjust se badlein"
      actions={<Link to={`/carpet-rolls?productId=${productId}`} className="text-[0.8125rem] font-semibold text-brand-700 hover:underline">Rolls kholein</Link>}>
      {items.length === 0 ? <p className="text-[0.8125rem] text-slate-500">Koi chalu roll nahi.</p> : (
        <ul className="divide-y divide-slate-100 text-[0.8125rem]">
          {items.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-mono font-semibold text-slate-900">{r.rollNumber}{r.variant?.name ? <span className="ml-2 font-sans font-normal text-slate-500">{r.variant.name}</span> : null}</span>
              <span className="tabular-nums text-slate-600">{ftIn(r.widthFt, r.widthInch)} × {ftIn(r.remainingLengthFt, r.remainingLengthInch)} · {r2(r.remainingSqft)} sqft · {formatPKR(r.salePricePerSqft)}/sqft</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function rollErrors(d: EditorDraft<CarpetExtra>, isEdit: boolean): Errors {
  if (isEdit) return {};
  const e: Errors = {};
  const seen = new Set<string>();
  d.extra.rolls.forEach((r, i) => {
    if (!(realFt(n(r.widthFt), n(r.widthInch)) > 0)) e[`roll${i}`] = 'Chaurai likhein';
    else if (!(realFt(n(r.lengthFt), n(r.lengthInch)) > 0)) e[`roll${i}`] = 'Lambai likhein';
    else if (n(r.widthInch) >= 12 || n(r.lengthInch) >= 12) e[`roll${i}`] = 'Inch 12 se kam likhein';
    else if (r.rollNumber.trim() && seen.has(r.rollNumber.trim())) e[`roll${i}`] = 'Roll number do dafa hai';
    seen.add(r.rollNumber.trim());
  });
  return e;
}

const isRollGood = (d: EditorDraft<CarpetExtra>) => isCarpetUnit(d.core.unit);

const designsStep: StepDef<CarpetExtra> = {
  id: 'rolls', title: 'Designs aur rolls', hint: 'Rang, roll ki naap', icon: Ruler, when: isRollGood,
  validate: (d, isEdit) => {
    const names = d.core.variants.map((v) => v.name.trim().toLowerCase());
    const e: Errors = names.some((x) => !x) ? { variants: 'Har design ka naam likhein' } : new Set(names).size !== names.length ? { variants: 'Do designs ka naam ek jaisa hai' } : {};
    return { ...e, ...rollErrors(d, isEdit) };
  },
  render: (ctx) => <div className="space-y-4"><Designs ctx={ctx} /><Rolls ctx={ctx} /></div>,
};

const plainStock = stockStep<CarpetExtra>(core, { quick: [1, 2, 5, 10, 20] });

const config: EditorConfig<CarpetExtra> = {
  label: 'Carpet',
  draftKey: 'nafaa.product-editor.carpet',
  paths: { list: '/products', detail: (id) => `/carpet-products/${id}`, create: '/carpet-products/new' },
  core,
  extra: {
    initial: { rolls: [] },
    // Roll goods hold no typed stock: rolls and pieces make it.
    product: (d, payload) => (isCarpetUnit(d.core.unit) && 'stock' in payload ? { ...payload, stock: 0 } : payload),
    save: async (productId, d, { isEdit, shopId }) => {
      if (isEdit || !isCarpetUnit(d.core.unit) || !d.extra.rolls.length) return;
      const variants = await productVariantsApi.list(productId).catch(() => []);
      const variantOf = (name: string) => variants.find((v) => v.name.trim().toLowerCase() === name.trim().toLowerCase())?.id;
      // Rates in the product's unit are turned into per-sqft only for sqft products; others enter per-sqft on the roll.
      const fallbackCost = d.core.unit === 'sqft' ? d.core.costPrice : 0;
      const fallbackRate = d.core.unit === 'sqft' ? d.core.price : 0;
      const res = await carpetRollsApi.bulkOpening(d.extra.rolls.map((r) => ({
        productId,
        variantId: r.design ? variantOf(r.design) : undefined,
        shopId,
        rollNumber: r.rollNumber.trim() || undefined,
        widthFt: n(r.widthFt), widthInch: n(r.widthInch),
        originalLengthFt: n(r.lengthFt), originalLengthInch: n(r.lengthInch),
        costPerSqft: r.cost ? n(r.cost) : fallbackCost,
        salePricePerSqft: r.rate ? n(r.rate) : fallbackRate,
        rackNumber: r.rack.trim() || undefined,
        sourceType: 'OPENING_STOCK',
      })));
      const errors: Array<{ index: number; error: string }> = res?.errors ?? [];
      if (errors.length) toast.error(`${errors.length} roll save nahi hue: ${errors.map((e) => `Roll ${e.index + 1}: ${e.error}`).join(' • ')} — Rolls page se dobara daalein`, { duration: 12000 });
    },
  },
  steps: [
    basicStep<CarpetExtra>(core, {
      namePlaceholder: 'Jaise: Turkish Shaggy 12ft ya Irani Rug 5×7',
      categorySuggestions: ['Wall to wall', 'Rugs', 'Dari', 'Mats', 'Vinyl / floor', 'Artificial grass', 'Underlay', 'Fitting'],
    }),
    priceStep<CarpetExtra>(core, { allowZeroPrice: true }),
    designsStep,
    { ...plainStock, when: (d) => !isRollGood(d) && d.core.unit !== 'service' },
  ],
  summary: (d) => (isCarpetUnit(d.core.unit) ? (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-700">
      <p className="inline-flex items-center gap-1.5"><Scissors className="h-3.5 w-3.5" />{unitLabel(d.core.unit)} me kat kar bikta hai</p>
      {d.core.variants.length > 0 && <p>{d.core.variants.length} design</p>}
      {d.extra.rolls.length > 0 && <p>{d.extra.rolls.length} roll · {r2(d.extra.rolls.reduce((s, r) => s + rollSqft(r), 0))} sqft</p>}
    </div>
  ) : null),
  refresh: [ROLLS_KEY, SUMMARY_KEY, 'carpet-product-detail'],
  guide: [
    { icon: Ruler, color: '#059669', title: 'Unit', text: 'Wall to wall carpet sq ft (ya sq gaz / running ft) me; rug aur dari piece me; fitting service me.' },
    { icon: Palette, color: '#7c3aed', title: 'Design', text: 'Ek carpet ke kai rang ya design hon to design banayein — har roll kisi design ka hota hai.' },
    { icon: Layers, color: '#0891b2', title: 'Rolls', text: 'Roll goods ka stock sirf rolls se — naye product par shuru ke rolls yahin likhein, baad me Purchase ya Rolls page se.' },
  ],
};

export default function CarpetProductEditor() {
  return <ProductEditorPage config={config} />;
}
