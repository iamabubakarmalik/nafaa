/**
 * Hardware item editor on the shared product editor: what kind of item it
 * is (cement, pipe, paint…), its size, grade or shade, loose and pack sale
 * (feet and full length, piece and box), retail and wholesale rate,
 * quantity rates for bulk buyers, sizes as variants, and the reorder point.
 */

import { toast } from 'sonner';
import { Layers, Paintbrush, Plus, Ruler, Tags, Trash2, Truck } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { hardwareProductsApi, type CategoryType } from '../api/products.api';
import { bulkPricingApi } from '../api/bulk-pricing.api';
import { reorderRulesApi } from '../api/reorder-rules.api';
import { FACTS_KEY, TIERS_KEY } from '../hooks/useHardwareFacts';
import { CATEGORY, categoryLabel, errorText, isPaint, slipUnit } from '../lib/meta';

interface TierDraft { id?: string; minQuantity: number | null; price: number | null; label: string }

export interface HardwareExtra {
  categoryType: CategoryType | '';
  diameter: string; grade: string; gradeStrength: string; bagWeight: number | null;
  tileSize: string; finishType: string; piecesPerBox: number | null; sqftPerBox: number | null;
  colorName: string; colorCode: string; finishSheen: string; coverage: number | null; litersPerCan: number | null;
  manufacturingLocation: string; requiresTruck: boolean; isFastMoving: boolean;
  tiers: TierDraft[];
  /** Tier ids removed in this session; switched off on save. */
  removedTiers: string[];
  reorderPoint: number | null; minStock: number | null; reorderQty: number | null; preferredSupplier: string;
}

const initial: HardwareExtra = {
  categoryType: '', diameter: '', grade: '', gradeStrength: '', bagWeight: null, tileSize: '', finishType: '', piecesPerBox: null, sqftPerBox: null,
  colorName: '', colorCode: '', finishSheen: '', coverage: null, litersPerCan: null, manufacturingLocation: '', requiresTruck: false, isFastMoving: false,
  tiers: [], removedTiers: [], reorderPoint: null, minStock: null, reorderQty: null, preferredSupplier: '',
};

const SIZES = ['1/2"', '3/4"', '1"', '1-1/4"', '1-1/2"', '2"', '3"', '4"', '6"'];
const STEEL = ['3 sootar (10mm)', '4 sootar (12mm)', '5 sootar (16mm)', '6 sootar (20mm)'];
const TILE = ['12x12', '16x16', '24x24', '12x24', '24x48'];
const SHEEN = ['Matt', 'Silk', 'Gloss', 'Emulsion', 'Enamel', 'Weather shield'];
const CANS = [0.9, 3.64, 18.2];
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);

/* ── Basic step addition: kind of item ── */
function Kind({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Maal ka type</span>
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY.map((c) => <Chip key={c.value} on={x.categoryType === c.value} onClick={() => ctx.setExtra({ categoryType: x.categoryType === c.value ? '' : c.value })}>{c.label}</Chip>)}
      </div>
      <p className="mt-1.5 text-[0.75rem] text-slate-500">Isi se agla step size, grade ya shade poochta hai aur POS par paint ka shade likhne ka option aata hai.</p>
    </div>
  );
}

/* ── Specs step: size, grade, shade, pack ── */
function Specs({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const t = x.categoryType;
  const pipe = t === 'PLUMBING_PIPE' || t === 'PLUMBING_FITTING' || t === 'STEEL_PIPE' || t === 'ELECTRIC_CONDUIT';
  const steel = t === 'STEEL_REBAR';
  const cement = t === 'CEMENT';
  const tile = t === 'TILES_FLOOR' || t === 'TILES_WALL' || t === 'MARBLE' || t === 'GRANITE';
  const paint = isPaint(t || null) || t === 'THINNER';
  const any = !pipe && !steel && !cement && !tile && !paint;
  return (
    <div className="space-y-4">
      {(pipe || any) && (
        <Section icon={Ruler} title="Size" hint="Bill aur challan par naam ke saath likha jata hai — har size ka rate alag ho to Stock step me size ko variant banayein">
          <TextField label="Size / dia" value={x.diameter} onChange={(diameter) => set({ diameter })} placeholder='3/4", 4 inch, 2.5 mm' />
          <div className="mt-2 flex flex-wrap gap-1.5">{SIZES.map((v) => <Chip key={v} on={x.diameter === v} onClick={() => set({ diameter: x.diameter === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3"><TextField label="Class / grade" value={x.grade} onChange={(grade) => set({ grade })} placeholder="Class B, PN-10, Schedule 40" /></div>
        </Section>
      )}
      {steel && (
        <Section icon={Ruler} title="Sarya" hint="Sootar aur grade — contractor isi se maangta hai">
          <div className="flex flex-wrap gap-1.5">{STEEL.map((v) => <Chip key={v} on={x.diameter === v} onClick={() => set({ diameter: x.diameter === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label="Grade" value={x.grade} onChange={(grade) => set({ grade })} placeholder="40 / 60" />
            <NumberField label="Ek ton me kitne kg" allowEmpty value={x.bagWeight} onChange={(bagWeight) => set({ bagWeight })} suffix="kg" hint="Marzi hai" />
          </div>
        </Section>
      )}
      {cement && (
        <Section icon={Layers} title="Cement" hint="Bag ka wazan aur type">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Bag ka wazan" allowEmpty value={x.bagWeight} onChange={(bagWeight) => set({ bagWeight })} suffix="kg" placeholder="50" />
            <TextField label="Type" value={x.gradeStrength} onChange={(gradeStrength) => set({ gradeStrength })} placeholder="OPC, SRC, White" />
          </div>
        </Section>
      )}
      {tile && (
        <Section icon={Layers} title="Tiles" hint="Dabbe me kitni tiles aur kitne square feet — customer ke kamre ke hisaab se dabbe nikalte hain">
          <div className="flex flex-wrap gap-1.5">{TILE.map((v) => <Chip key={v} on={x.tileSize === v} onClick={() => set({ tileSize: x.tileSize === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <TextField label="Size" value={x.tileSize} onChange={(tileSize) => set({ tileSize })} placeholder="24x24" />
            <NumberField label="Ek dabbe me tiles" allowEmpty value={x.piecesPerBox} onChange={(piecesPerBox) => set({ piecesPerBox: piecesPerBox == null ? null : Math.round(piecesPerBox) })} />
            <NumberField label="Ek dabba = sq ft" allowEmpty value={x.sqftPerBox} onChange={(sqftPerBox) => set({ sqftPerBox })} suffix="sq ft" />
          </div>
          <div className="mt-3"><TextField label="Finish" value={x.finishType} onChange={(finishType) => set({ finishType })} placeholder="Glossy, Matt, Rustic" /></div>
        </Section>
      )}
      {paint && (
        <Section icon={Paintbrush} title="Paint" hint="Shade aur finish — tinting wala shade POS par har line par likha ja sakta hai">
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <TextField label="Shade ka naam" value={x.colorName} onChange={(colorName) => set({ colorName })} placeholder="Off white, Sky blue, Base A" />
            <TextField label="Shade code" value={x.colorCode} onChange={(colorCode) => set({ colorCode })} placeholder="1234" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{SHEEN.map((v) => <Chip key={v} on={x.finishSheen === v} onClick={() => set({ finishSheen: x.finishSheen === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField label="Dabba (liter)" allowEmpty value={x.litersPerCan} onChange={(litersPerCan) => set({ litersPerCan })} suffix="L" hint="Quarter 0.9 · Gallon 3.64 · Drum 18.2" />
            <NumberField label="Kitni deewar (sq ft per liter)" allowEmpty value={x.coverage} onChange={(coverage) => set({ coverage })} suffix="sq ft" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{CANS.map((v) => <Chip key={v} on={x.litersPerCan === v} onClick={() => set({ litersPerCan: v })}>{v} L</Chip>)}</div>
        </Section>
      )}
      <Section icon={Truck} title="Delivery aur company">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresTruck} onChange={(requiresTruck) => set({ requiresTruck })} icon={Truck} title="Gaari me jata hai" hint="Cement, sarya, ret — bill ke baad challan yaad dilaya jata hai" />
          <Toggle on={x.isFastMoving} onChange={(isFastMoving) => set({ isFastMoving })} title="Tez bikne wala" hint="Reorder list me upar aata hai" />
        </div>
        <div className="mt-3"><TextField label="Kahan bana" value={x.manufacturingLocation} onChange={(manufacturingLocation) => set({ manufacturingLocation })} placeholder="Pakistan, China, Iran" /></div>
      </Section>
    </div>
  );
}

/* ── Price step addition: quantity rates ── */
function Tiers({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  const c = ctx.draft.core;
  const set = (tiers: TierDraft[]) => ctx.setExtra({ tiers });
  const update = (i: number, patch: Partial<TierDraft>) => set(x.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const remove = (i: number) => {
    const t = x.tiers[i];
    ctx.setExtra({ tiers: x.tiers.filter((_, j) => j !== i), removedTiers: t.id ? [...x.removedTiers, t.id] : x.removedTiers });
  };
  return (
    <Section icon={Tags} title="Quantity rate (bulk)" hint={`Zyada ${c.unit || 'maal'} lene par kam rate — POS par quantity likhte hi lag jata hai`}
      actions={<button type="button" onClick={() => set([...x.tiers, { minQuantity: null, price: null, label: '' }])} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" />Rate jorein</button>}>
      {x.tiers.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">Koi quantity rate nahi. Jaise: 50 bag se upar Rs 1,180 ek bag.</p>
      ) : (
        <ul className="space-y-2">
          {x.tiers.map((t, i) => (
            <li key={t.id ?? i} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
              <NumberField label={`Kam se kam (${c.unit || 'qty'})`} allowEmpty value={t.minQuantity} onChange={(minQuantity) => update(i, { minQuantity })} />
              <NumberField label="Ek ka rate" prefix="Rs" allowEmpty value={t.price} onChange={(price) => update(i, { price })} />
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Naam (marzi)</span>
                <input value={t.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Thekedar rate" className={inputClass} />
              </label>
              <button type="button" onClick={() => remove(i)} aria-label="Hatayein" className="mt-6 flex h-11 w-11 items-center justify-center self-start rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
      {ctx.errors.tiers && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{ctx.errors.tiers}</p>}
    </Section>
  );
}

/* ── Stock step addition: reorder point ── */
function Reorder({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <Section title="Kab mangwana hai (reorder)" hint="Stock is had se neeche aaye to Reorder list aur dashboard par aata hai — khali chhor dein to nahi">
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label="Reorder point" allowEmpty value={x.reorderPoint} onChange={(reorderPoint) => set({ reorderPoint })} error={ctx.errors.reorder} hint="Itna reh jaye to mangwayein" />
        <NumberField label="Kam se kam (khatra)" allowEmpty value={x.minStock} onChange={(minStock) => set({ minStock })} />
        <NumberField label="Kitna mangwana" allowEmpty value={x.reorderQty} onChange={(reorderQty) => set({ reorderQty })} />
      </div>
      <div className="mt-3"><TextField label="Kis se mangwana" value={x.preferredSupplier} onChange={(preferredSupplier) => set({ preferredSupplier })} placeholder="Supplier ka naam / phone" /></div>
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: 'Adad (pcs)' }, { value: 'feet', label: 'Feet' }, { value: 'meter', label: 'Meter' }, { value: 'kg', label: 'Kg' },
    { value: 'bag', label: 'Bag' }, { value: 'box', label: 'Box / dabba' }, { value: 'gallon', label: 'Gallon' }, { value: 'liter', label: 'Liter' },
    { value: 'sqft', label: 'Sq ft' }, { value: 'ton', label: 'Ton' }, { value: 'bundle', label: 'Bundle' }, { value: 'sheet', label: 'Sheet' },
    { value: 'roll', label: 'Roll' }, { value: 'cft', label: 'Cft (ret/bajri)' }, { value: 'set', label: 'Set' },
  ],
  skuPrefix: 'HW',
  packs: true,
  variants: { presets: [
    { group: 'Pipe / fitting size', values: SIZES },
    { group: 'Sarya', values: STEEL },
    { group: 'Paint dabba', values: ['Quarter', 'Gallon', 'Drum'] },
    { group: 'Rang', values: ['White', 'Black', 'Grey', 'Ivory', 'Chrome'] },
  ] },
  batches: false,
  markups: [5, 8, 10, 15, 20],
};

const specsStep: StepDef<HardwareExtra> = { id: 'specs', title: 'Size / shade', hint: 'Size, grade, paint', icon: Ruler, render: (ctx) => <Specs ctx={ctx} /> };

const config: EditorConfig<HardwareExtra> = {
  label: 'Hardware',
  draftKey: 'nafaa.product-editor.hardware',
  paths: { list: '/hardware/products', detail: (id) => `/hardware-products/${id}`, create: '/hardware-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [p, rule] = await Promise.all([
        hardwareProductsApi.byProduct(productId).catch(() => null),
        reorderRulesApi.byProduct(productId).catch(() => null),
      ]);
      const out: Partial<HardwareExtra> = {};
      if (p) Object.assign(out, {
        categoryType: p.categoryType ?? '', diameter: p.diameter ?? '', grade: p.grade ?? '', gradeStrength: p.gradeStrength ?? '', bagWeight: p.bagWeight ?? null,
        tileSize: p.tileSize ?? '', finishType: p.finishType ?? '', piecesPerBox: p.piecesPerBox ?? null, sqftPerBox: p.sqftPerBox ?? null,
        colorName: p.colorName ?? '', colorCode: p.colorCode ?? '', finishSheen: p.finishSheen ?? '', coverage: p.coverage ?? null, litersPerCan: p.litersPerCan ?? null,
        manufacturingLocation: p.manufacturingLocation ?? '', requiresTruck: p.requiresTruck, isFastMoving: p.isFastMoving,
        tiers: (p.bulkPricing ?? []).map((t) => ({ id: t.id, minQuantity: t.minQuantity, price: t.price, label: t.label ?? '' })),
      });
      if (rule?.isActive) Object.assign(out, { reorderPoint: rule.reorderPoint, minStock: rule.minStock, reorderQty: rule.reorderQty, preferredSupplier: rule.preferredSupplier ?? '' });
      return out;
    },
    save: async (productId, d) => {
      const x = d.extra;
      const profile = {
        productId, categoryType: x.categoryType || undefined, unit: slipUnit(d.core.unit),
        diameter: opt(x.diameter), grade: opt(x.grade), gradeStrength: opt(x.gradeStrength), bagWeight: num(x.bagWeight),
        tileSize: opt(x.tileSize), finishType: opt(x.finishType), piecesPerBox: num(x.piecesPerBox), sqftPerBox: num(x.sqftPerBox),
        colorName: opt(x.colorName), colorCode: opt(x.colorCode), finishSheen: opt(x.finishSheen), coverage: num(x.coverage), litersPerCan: num(x.litersPerCan),
        manufacturingLocation: opt(x.manufacturingLocation), requiresTruck: x.requiresTruck, isFastMoving: x.isFastMoving,
        wholesalePrice: num(d.core.wholesalePrice), retailPrice: num(d.core.price),
      };
      await hardwareProductsApi.upsert(Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)));
      for (const id of x.removedTiers) await bulkPricingApi.remove(id);
      for (const t of x.tiers) {
        const body = { productId, minQuantity: Number(t.minQuantity), price: Number(t.price), label: opt(t.label) };
        if (t.id) await bulkPricingApi.update(t.id, body); else await bulkPricingApi.create(body);
      }
      // Reorder needs the buying permission; the item itself is saved either way.
      if (x.reorderPoint != null) {
        await reorderRulesApi.upsert({
          productId, reorderPoint: x.reorderPoint, minStock: x.minStock ?? 0, reorderQty: x.reorderQty ?? Math.max(x.reorderPoint * 2, 1),
          preferredSupplier: opt(x.preferredSupplier), isActive: true,
        }).catch((e) => toast.error(errorText(e, 'Reorder point save nahi hua')));
      }
    },
  },
  steps: [
    basicStep<HardwareExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: 'Jaise: PPR Pipe 3/4" ya Lucky Cement',
      categorySuggestions: ['Cement', 'Sarya', 'Pipe aur fitting', 'Sanitary', 'Paint', 'Electric', 'Tiles', 'Auzar', 'Kil aur pech'],
    }),
    specsStep,
    priceStep<HardwareExtra>(core, { extra: (ctx) => <Tiers ctx={ctx} /> }),
    stockStep<HardwareExtra>(core, { quick: [10, 50, 100, 500, 1000], extra: (ctx) => <Reorder ctx={ctx} /> }),
  ].map((s): StepDef<HardwareExtra> => (s.id === 'price' ? { ...s, validate: (d, e) => ({ ...s.validate?.(d, e), ...tierErrors(d.extra, d.core.price) }) }
    : s.id === 'stock' ? { ...s, validate: (d, e) => ({ ...s.validate?.(d, e), ...reorderErrors(d.extra) }) } : s)),
  summary: (d) => {
    const x = d.extra;
    const facts = [categoryLabel(x.categoryType || null), x.diameter, x.tileSize, [x.colorName, x.colorCode].filter(Boolean).join(' '), x.finishSheen].filter(Boolean);
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {facts.length > 0 && <p className="text-slate-700">{facts.join(' · ')}</p>}
        {x.tiers.length > 0 && <p className={cn('text-slate-600')}>{x.tiers.length} quantity rate</p>}
        {x.reorderPoint != null && <p className="text-slate-600">Reorder: {x.reorderPoint} par</p>}
      </div>
    );
  },
  refresh: [FACTS_KEY, TIERS_KEY, 'hardware-product-detail', 'hardware-reorder'],
  guide: [
    { icon: Layers, color: '#a16207', title: 'Khula aur pack', text: 'Base unit feet ya piece rakhein; Price step me "Lambai = 20 feet" ya "Dabba = 100" pack jorein — dono tarah bikta hai, stock base unit me ginta hai.' },
    { icon: Tags, color: '#16a34a', title: 'Retail, wholesale, quantity rate', text: 'Wholesale rate thekedar ke liye; quantity rate zyada lene par khud lagta hai (50 bag se upar).' },
    { icon: Ruler, color: '#0891b2', title: 'Size', text: 'Har size ka rate aur stock alag ho to Stock step me size ko variant banayein (1/2", 3/4"…).' },
  ],
};

function tierErrors(x: HardwareExtra, price: number): Errors {
  const mins = x.tiers.map((t) => Number(t.minQuantity));
  if (x.tiers.some((t) => !(Number(t.minQuantity) > 0) || !(Number(t.price) > 0))) return { tiers: 'Har quantity rate me kam se kam quantity aur rate likhein' };
  if (new Set(mins).size !== mins.length) return { tiers: 'Do rate ek hi quantity par hain' };
  if (price > 0 && x.tiers.some((t) => Number(t.price) > price)) return { tiers: 'Quantity rate asal qeemat se zyada nahi hona chahiye' };
  return {};
}

function reorderErrors(x: HardwareExtra): Errors {
  if (x.reorderPoint == null) return {};
  if (x.reorderPoint < 0 || (x.minStock ?? 0) < 0) return { reorder: 'Had manfi nahi ho sakti' };
  if (x.minStock != null && x.minStock > x.reorderPoint) return { reorder: 'Kam se kam wali had reorder point se bari nahi ho sakti' };
  return {};
}

export default function HardwareProductEditor() {
  return <ProductEditorPage config={config} />;
}
