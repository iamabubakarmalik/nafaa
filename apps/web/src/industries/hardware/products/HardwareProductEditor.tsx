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
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';
import { hardwareProductsApi, type CategoryType } from '../api/products.api';
import { bulkPricingApi } from '../api/bulk-pricing.api';
import { reorderRulesApi } from '../api/reorder-rules.api';
import { FACTS_KEY, TIERS_KEY } from '../hooks/useHardwareFacts';
import { CATEGORY, categoryLabel, errorText, isPaint, slipUnit } from '../lib/meta';
import { t as tr } from '@core/i18n';

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

/* ── Basic step addition: the item type follows the shop category's kind (no separate picker) ── */
function Kind({ ctx }: { ctx: StepContext<HardwareExtra> }) {
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (kind) => ctx.setExtra({ categoryType: kind as CategoryType }));
  return null;
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
        <Section icon={Ruler} title={tr('Size')} hint={tr('Bill aur challan par naam ke saath likha jata hai — har size ka rate alag ho to Stock step me size ko variant banayein')}>
          <TextField label={tr('Size / dia')} value={x.diameter} onChange={(diameter) => set({ diameter })} placeholder={tr('3/4", 4 inch, 2.5 mm')} />
          <div className="mt-2 flex flex-wrap gap-1.5">{SIZES.map((v) => <Chip key={v} on={x.diameter === v} onClick={() => set({ diameter: x.diameter === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3"><TextField label={tr('Class / grade')} value={x.grade} onChange={(grade) => set({ grade })} placeholder={tr('Class B, PN-10, Schedule 40')} /></div>
        </Section>
      )}
      {steel && (
        <Section icon={Ruler} title={tr('Sarya')} hint={tr('Sootar aur grade — contractor isi se maangta hai')}>
          <div className="flex flex-wrap gap-1.5">{STEEL.map((v) => <Chip key={v} on={x.diameter === v} onClick={() => set({ diameter: x.diameter === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextField label={tr('Grade')} value={x.grade} onChange={(grade) => set({ grade })} placeholder="40 / 60" />
            <NumberField label={tr('Ek ton me kitne kg')} allowEmpty value={x.bagWeight} onChange={(bagWeight) => set({ bagWeight })} suffix="kg" hint={tr('Marzi hai')} />
          </div>
        </Section>
      )}
      {cement && (
        <Section icon={Layers} title={tr('Cement')} hint={tr('Bag ka wazan aur type')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label={tr('Bag ka wazan')} allowEmpty value={x.bagWeight} onChange={(bagWeight) => set({ bagWeight })} suffix="kg" placeholder="50" />
            <TextField label={tr('Type')} value={x.gradeStrength} onChange={(gradeStrength) => set({ gradeStrength })} placeholder={tr('OPC, SRC, White')} />
          </div>
        </Section>
      )}
      {tile && (
        <Section icon={Layers} title={tr('Tiles')} hint={tr('Dabbe me kitni tiles aur kitne square feet — customer ke kamre ke hisaab se dabbe nikalte hain')}>
          <div className="flex flex-wrap gap-1.5">{TILE.map((v) => <Chip key={v} on={x.tileSize === v} onClick={() => set({ tileSize: x.tileSize === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <TextField label={tr('Size')} value={x.tileSize} onChange={(tileSize) => set({ tileSize })} placeholder={tr('24x24')} />
            <NumberField label={tr('Ek dabbe me tiles')} allowEmpty value={x.piecesPerBox} onChange={(piecesPerBox) => set({ piecesPerBox: piecesPerBox == null ? null : Math.round(piecesPerBox) })} />
            <NumberField label={tr('Ek dabba = sq ft')} allowEmpty value={x.sqftPerBox} onChange={(sqftPerBox) => set({ sqftPerBox })} suffix="sq ft" />
          </div>
          <div className="mt-3"><TextField label={tr('Finish')} value={x.finishType} onChange={(finishType) => set({ finishType })} placeholder={tr('Glossy, Matt, Rustic')} /></div>
        </Section>
      )}
      {paint && (
        <Section icon={Paintbrush} title={tr('Paint')} hint={tr('Shade aur finish — tinting wala shade POS par har line par likha ja sakta hai')}>
          <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <TextField label={tr('Shade ka naam')} value={x.colorName} onChange={(colorName) => set({ colorName })} placeholder={tr('Off white, Sky blue, Base A')} />
            <TextField label={tr('Shade code')} value={x.colorCode} onChange={(colorCode) => set({ colorCode })} placeholder="1234" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{SHEEN.map((v) => <Chip key={v} on={x.finishSheen === v} onClick={() => set({ finishSheen: x.finishSheen === v ? '' : v })}>{v}</Chip>)}</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <NumberField label={tr('Dabba (liter)')} allowEmpty value={x.litersPerCan} onChange={(litersPerCan) => set({ litersPerCan })} suffix="L" hint={tr('Quarter 0.9 · Gallon 3.64 · Drum 18.2')} />
            <NumberField label={tr('Kitni deewar (sq ft per liter)')} allowEmpty value={x.coverage} onChange={(coverage) => set({ coverage })} suffix="sq ft" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">{CANS.map((v) => <Chip key={v} on={x.litersPerCan === v} onClick={() => set({ litersPerCan: v })}>{tr('{{v}} L', { v })}</Chip>)}</div>
        </Section>
      )}
      <Section icon={Truck} title={tr('Delivery aur company')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresTruck} onChange={(requiresTruck) => set({ requiresTruck })} icon={Truck} title={tr('Gaari me jata hai')} hint={tr('Cement, sarya, ret — bill ke baad challan yaad dilaya jata hai')} />
          <Toggle on={x.isFastMoving} onChange={(isFastMoving) => set({ isFastMoving })} title={tr('Tez bikne wala')} hint={tr('Reorder list me upar aata hai')} />
        </div>
        <div className="mt-3"><TextField label={tr('Kahan bana')} value={x.manufacturingLocation} onChange={(manufacturingLocation) => set({ manufacturingLocation })} placeholder={tr('Pakistan, China, Iran')} /></div>
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
    <Section icon={Tags} title={tr('Quantity rate (bulk)')} hint={tr('Zyada {{value}} lene par kam rate — POS par quantity likhte hi lag jata hai', { value: c.unit || 'maal' })}
      actions={<button type="button" onClick={() => set([...x.tiers, { minQuantity: null, price: null, label: '' }])} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50"><Plus className="h-4 w-4" />{tr('Rate jorein')}</button>}>
      {x.tiers.length === 0 ? (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">{tr('Koi quantity rate nahi. Jaise: 50 bag se upar Rs 1,180 ek bag.')}</p>
      ) : (
        <ul className="space-y-2">
          {x.tiers.map((t, i) => (
            <li key={t.id ?? i} className="grid grid-cols-[1fr_1fr_auto] gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto]">
              <NumberField label={tr('Kam se kam ({{value}})', { value: c.unit || 'qty' })} allowEmpty value={t.minQuantity} onChange={(minQuantity) => update(i, { minQuantity })} />
              <NumberField label={tr('Ek ka rate')} prefix="Rs" allowEmpty value={t.price} onChange={(price) => update(i, { price })} />
              <label className="col-span-2 block sm:col-span-1">
                <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{tr('Naam (marzi)')}</span>
                <input value={t.label} onChange={(e) => update(i, { label: e.target.value })} placeholder={tr('Thekedar rate')} className={inputClass} />
              </label>
              <button type="button" onClick={() => remove(i)} aria-label={tr('Hatayein')} className="mt-6 flex h-11 w-11 items-center justify-center self-start rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
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
    <Section title={tr('Kab mangwana hai (reorder)')} hint={tr('Stock is had se neeche aaye to Reorder list aur dashboard par aata hai — khali chhor dein to nahi')}>
      <div className="grid gap-3 sm:grid-cols-3">
        <NumberField label={tr('Reorder point')} allowEmpty value={x.reorderPoint} onChange={(reorderPoint) => set({ reorderPoint })} error={ctx.errors.reorder} hint={tr('Itna reh jaye to mangwayein')} />
        <NumberField label={tr('Kam se kam (khatra)')} allowEmpty value={x.minStock} onChange={(minStock) => set({ minStock })} />
        <NumberField label={tr('Kitna mangwana')} allowEmpty value={x.reorderQty} onChange={(reorderQty) => set({ reorderQty })} />
      </div>
      <div className="mt-3"><TextField label={tr('Kis se mangwana')} value={x.preferredSupplier} onChange={(preferredSupplier) => set({ preferredSupplier })} placeholder={tr('Supplier ka naam / phone')} /></div>
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: tr('Adad (pcs)') }, { value: 'feet', label: tr('Feet') }, { value: 'meter', label: tr('Meter') }, { value: 'kg', label: tr('Kg') },
    { value: 'bag', label: tr('Bag') }, { value: 'box', label: tr('Box / dabba') }, { value: 'gallon', label: tr('Gallon') }, { value: 'liter', label: tr('Liter') },
    { value: 'sqft', label: tr('Sq ft') }, { value: 'ton', label: tr('Ton') }, { value: 'bundle', label: tr('Bundle') }, { value: 'sheet', label: tr('Sheet') },
    { value: 'roll', label: tr('Roll') }, { value: 'cft', label: tr('Cft (ret/bajri)') }, { value: 'set', label: tr('Set') },
  ],
  skuPrefix: 'HW',
  packs: true,
  variants: { presets: [
    { group: tr('Pipe / fitting size'), values: SIZES },
    { group: tr('Sarya'), values: STEEL },
    { group: tr('Paint dabba'), values: ['Quarter', 'Gallon', 'Drum'] },
    { group: tr('Rang'), values: ['White', 'Black', 'Grey', 'Ivory', 'Chrome'] },
  ] },
  batches: false,
  markups: [5, 8, 10, 15, 20],
};

const specsStep: StepDef<HardwareExtra> = { id: 'specs', title: tr('Size / shade'), hint: tr('Size, grade, paint'), icon: Ruler, render: (ctx) => <Specs ctx={ctx} /> };

const config: EditorConfig<HardwareExtra> = {
  label: tr('Hardware'),
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
        }).catch((e) => toast.error(errorText(e, tr('Reorder point save nahi hua'))));
      }
    },
  },
  steps: [
    basicStep<HardwareExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: tr('Jaise: PPR Pipe 3/4" ya Lucky Cement'),
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
        {x.tiers.length > 0 && <p className={cn('text-slate-600')}>{tr('{{count}} quantity rate', { count: x.tiers.length })}</p>}
        {x.reorderPoint != null && <p className="text-slate-600">{tr('Reorder: {{reorderPoint}} par', { reorderPoint: x.reorderPoint })}</p>}
      </div>
    );
  },
  refresh: [FACTS_KEY, TIERS_KEY, 'hardware-product-detail', 'hardware-reorder'],
  guide: [
    { icon: Layers, color: '#a16207', title: tr('Khula aur pack'), text: tr('Base unit feet ya piece rakhein; Price step me "Lambai = 20 feet" ya "Dabba = 100" pack jorein — dono tarah bikta hai, stock base unit me ginta hai.') },
    { icon: Tags, color: '#16a34a', title: tr('Retail, wholesale, quantity rate'), text: tr('Wholesale rate thekedar ke liye; quantity rate zyada lene par khud lagta hai (50 bag se upar).') },
    { icon: Ruler, color: '#0891b2', title: tr('Size'), text: tr('Har size ka rate aur stock alag ho to Stock step me size ko variant banayein (1/2", 3/4"…).') },
  ],
};

function tierErrors(x: HardwareExtra, price: number): Errors {
  const mins = x.tiers.map((t) => Number(t.minQuantity));
  if (x.tiers.some((t) => !(Number(t.minQuantity) > 0) || !(Number(t.price) > 0))) return { tiers: tr('Har quantity rate me kam se kam quantity aur rate likhein') };
  if (new Set(mins).size !== mins.length) return { tiers: tr('Do rate ek hi quantity par hain') };
  if (price > 0 && x.tiers.some((t) => Number(t.price) > price)) return { tiers: tr('Quantity rate asal qeemat se zyada nahi hona chahiye') };
  return {};
}

function reorderErrors(x: HardwareExtra): Errors {
  if (x.reorderPoint == null) return {};
  if (x.reorderPoint < 0 || (x.minStock ?? 0) < 0) return { reorder: tr('Had manfi nahi ho sakti') };
  if (x.minStock != null && x.minStock > x.reorderPoint) return { reorder: tr('Kam se kam wali had reorder point se bari nahi ho sakti') };
  return {};
}

export default function HardwareProductEditor() {
  return <ProductEditorPage config={config} />;
}
