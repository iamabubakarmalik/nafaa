/**
 * Shoe article editor on the shared editor: brand (core brand field), shoe
 * type, Gents / Ladies / Bachay, article code and season; MRP for sale /
 * clearance marks; a size × colour grid (PK/UK, EU, kids or US sizes) that
 * makes every variant with its own barcode per pair and opening stock;
 * and fit, material, warranty and marks. Size and colour of each variant
 * are saved on it, so the size grid, reorder and size requests can read them.
 */

import { useState } from 'react';
import { Barcode, BadgePercent, Footprints, Grid3x3, ShieldCheck, Sparkles } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, Section, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef, VariantDraft } from '@modules/inventory/products/editor/types';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { shoeProductsApi } from '../api/products.api';
import {
  COLORS, GENDERS, META_KEY, SEASONS, SHOE_TYPES, SIZE_SYSTEMS, code, genderLabel, isAccessory, opt, systemLabel, typeLabel, type SizeSystem,
} from '../components/meta';

export interface ShoeExtra {
  gender: string; categoryType: string; modelCode: string; modelName: string; season: string; colorName: string;
  sizeSystem: SizeSystem; mrp: number | null;
  upperMaterial: string; soleMaterial: string; closureType: string; heelHeight: string;
  runsLarge: boolean; runsSmall: boolean; sizingNotes: string;
  isWaterproof: boolean; isOrthopedic: boolean; isHandmade: boolean; includesBox: boolean;
  warrantyMonths: number; careInstructions: string;
  isNewArrival: boolean; isBestSeller: boolean; isBridal: boolean; isEidSpecial: boolean;
  /** Size and colour behind each variant name made by the grid. */
  variantMeta: Record<string, { size?: string; color?: string; hex?: string }>;
}

const initial: ShoeExtra = {
  gender: 'MEN', categoryType: 'MENS_FORMAL', modelCode: '', modelName: '', season: '', colorName: '', sizeSystem: 'UK', mrp: null,
  upperMaterial: '', soleMaterial: '', closureType: '', heelHeight: '', runsLarge: false, runsSmall: false, sizingNotes: '',
  isWaterproof: false, isOrthopedic: false, isHandmade: false, includesBox: true, warrantyMonths: 0, careInstructions: '',
  isNewArrival: true, isBestSeller: false, isBridal: false, isEidSpecial: false, variantMeta: {},
};

const label = (text: string) => <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{text}</span>;
const hint = (text: string) => <span className="mt-1 block text-[0.75rem] text-slate-500">{text}</span>;

/* ── Basic step additions: who, type, article, season ── */
function Identity({ ctx }: { ctx: StepContext<ShoeExtra> }) {
  const x = ctx.draft.extra;
  const groups = [...new Set(SHOE_TYPES.map((t) => t.group))];
  const setType = (categoryType: string) => {
    ctx.setExtra({ categoryType, ...(categoryType === 'BRIDAL_SHOES' ? { isBridal: true } : {}) });
    if (isAccessory(categoryType) && ctx.draft.core.unit === 'pair') ctx.setCore({ unit: 'pcs' });
  };
  return (
    <div className="space-y-4">
      <div>
        {label('Kis ke liye')}
        <div className="flex flex-wrap gap-1.5">{GENDERS.map((g) => <Chip key={g.value} on={x.gender === g.value} onClick={() => ctx.setExtra({ gender: g.value })}>{g.label}</Chip>)}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          {label('Joote ki type')}
          <select value={x.categoryType} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {groups.map((g) => <optgroup key={g} label={g}>{SHOE_TYPES.filter((t) => t.group === g).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</optgroup>)}
          </select>
          {hint('POS ke filter aur reports isi se')}
        </label>
        <label className="block">
          {label('Article number')}
          <input value={x.modelCode} onChange={(e) => ctx.setExtra({ modelCode: e.target.value })} placeholder="Jaise 821-4567" className={inputClass} maxLength={40} />
          {hint('Dabbe par company ka article — search aur barcode me kaam aata hai')}
        </label>
        <label className="block">
          {label('Season / collection')}
          <input list="shoe-seasons" value={x.season} onChange={(e) => ctx.setExtra({ season: e.target.value })} placeholder="Summer, Winter, Eid…" className={inputClass} maxLength={40} />
          <datalist id="shoe-seasons">{SEASONS.map((s) => <option key={s} value={s} />)}</datalist>
          {hint('Season khatam ho to MRP se kam rate rakh kar Sale lagayein')}
        </label>
        <label className="block">
          {label('Rang (sirf ek rang ho to)')}
          <input value={x.colorName} onChange={(e) => ctx.setExtra({ colorName: e.target.value })} placeholder="Black" className={inputClass} maxLength={30} />
          {hint('Kai rang hain to Stock step me size × rang chunein')}
        </label>
      </div>
    </div>
  );
}

/* ── Price step addition: MRP on the box ── */
function Mrp({ ctx }: { ctx: StepContext<ShoeExtra> }) {
  const x = ctx.draft.extra;
  const price = ctx.draft.core.price;
  const off = x.mrp && price > 0 && x.mrp > price ? Math.round(((x.mrp - price) / x.mrp) * 100) : 0;
  return (
    <Section icon={BadgePercent} title="MRP (dabbe par likhi qeemat)" hint="MRP se kam rate rakhein to Sale ka nishan khud lagta hai">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <input inputMode="decimal" value={x.mrp ?? ''} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ''); ctx.setExtra({ mrp: v ? Number(v) : null }); }}
            placeholder="0" className={cn(inputClass, 'w-36 tabular-nums')} />
        </label>
        {off > 0 && <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[0.8125rem] font-semibold text-rose-700 ring-1 ring-rose-200">Sale {off}% — customer ko MRP aur Sale rate dono dikhenge</span>}
        {!!x.mrp && price > x.mrp && <span className="text-[0.8125rem] font-medium text-amber-700">Rate MRP se zyada hai — check karein</span>}
      </div>
    </Section>
  );
}

/* ── Stock step addition: size × colour grid ── */
function SizeGrid({ ctx }: { ctx: StepContext<ShoeExtra> }) {
  const c = ctx.draft.core;
  const x = ctx.draft.extra;
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<Array<[string, string]>>([]);
  const [custom, setCustom] = useState('');
  const [each, setEach] = useState('');
  const [barcodes, setBarcodes] = useState(true);
  if (isAccessory(x.categoryType)) return null;
  const sys = SIZE_SYSTEMS.find((s) => s.value === x.sizeSystem) ?? SIZE_SYSTEMS[0];
  const toggle = <T,>(list: T[], v: T, eq: (a: T, b: T) => boolean) => (list.some((i) => eq(i, v)) ? list.filter((i) => !eq(i, v)) : [...list, v]);
  const combos = sizes.flatMap((s) => (colors.length ? colors : [['', ''] as [string, string]]).map(([cn2, hex]) => ({ s, cn: cn2, hex })));
  const base = (x.modelCode || c.sku || c.name.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'SH').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const prefix = x.sizeSystem === 'UK' ? 'PK' : x.sizeSystem;
  const make = () => {
    const have = new Set(c.variants.map((v) => v.name.toLowerCase()));
    const meta = { ...x.variantMeta };
    const added: VariantDraft[] = [];
    for (const v of combos) {
      const name = `${prefix} ${v.s}${v.cn ? ` / ${v.cn}` : ''}`;
      if (have.has(name.toLowerCase())) continue;
      meta[name] = { size: v.s, color: v.cn || undefined, hex: v.hex || undefined };
      added.push({
        name, sku: `${base}-${v.s}${v.cn ? `-${code(v.cn)}` : ''}`.replace(/\s+/g, ''),
        barcode: barcodes ? `${base}${code(v.s)}${v.cn ? code(v.cn) : ''}`.replace(/[^A-Z0-9.]/g, '') : '',
        colorHex: v.hex, price: null, costPrice: null, stock: ctx.isEdit ? 0 : Number(each) || 0, isActive: true,
      });
    }
    ctx.setCore({ variants: [...c.variants, ...added] });
    ctx.setExtra({ variantMeta: meta });
    setSizes([]); setColors([]);
  };
  return (
    <Section icon={Grid3x3} title="Size × rang" hint="Size (aur rang) chunein — har jor ka apna barcode aur joron ka stock ban jayega">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {SIZE_SYSTEMS.map((g) => (
            <button key={g.value} type="button" onClick={() => { ctx.setExtra({ sizeSystem: g.value }); setSizes([]); }}
              className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-semibold ring-1', x.sizeSystem === g.value ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200')}>{g.label}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {sys.sizes.map((s) => <Chip key={s} on={sizes.includes(s)} onClick={() => setSizes(toggle(sizes, s, (a, b) => a === b))}>{s}</Chip>)}
          <button type="button" onClick={() => setSizes([...sys.sizes])} className="h-8 rounded-full px-3 text-[0.8125rem] font-semibold text-brand-700 hover:bg-brand-50">Sab</button>
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Apna size + Enter" className="h-8 w-32 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { e.preventDefault(); setSizes([...new Set([...sizes, custom.trim().slice(0, 8)])]); setCustom(''); } }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map(([n, hex]) => (
            <button key={n} type="button" onClick={() => setColors(toggle(colors, [n, hex] as [string, string], (a, b) => a[0] === b[0]))}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium ring-1', colors.some((i) => i[0] === n) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} />{n}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          {!ctx.isEdit && (
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Har size ke joray</span>
              <input inputMode="numeric" value={each} onChange={(e) => setEach(e.target.value.replace(/\D/g, ''))} placeholder="0" className={cn(inputClass, 'h-9 w-24 tabular-nums')} />
            </label>
          )}
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700"><input type="checkbox" checked={barcodes} onChange={(e) => setBarcodes(e.target.checked)} className="h-4 w-4 rounded" /><Barcode className="h-4 w-4" />Har size ka barcode khud banayein</label>
          <button type="button" disabled={!combos.length} onClick={make} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <Grid3x3 className="h-4 w-4" />{combos.length ? `${combos.length} size banayein` : 'Size chunein'}
          </button>
        </div>
        <p className="text-[0.75rem] text-slate-500">Neeche ki table me har size ka rate, stock aur barcode badal sakte hain. Joron par barcode label "Barcode labels" se print karein — POS par scan karte hi wohi size bill me aata hai.</p>
      </div>
    </Section>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pair', label: 'Jora' }, { value: 'pcs', label: 'Piece' }, { value: 'box', label: 'Dabba' }],
  skuPrefix: 'SH',
  packs: true,
  variants: { presets: [{ group: 'Size', values: ['6', '7', '8', '9', '10'] }] },
  markups: [30, 40, 50, 60, 80, 100],
};

const details: StepDef<ShoeExtra> = {
  id: 'shoe', title: 'Fitting', hint: 'Fitting, material, nishan', icon: Footprints,
  validate: (d): Record<string, string> => (d.extra.warrantyMonths < 0 || d.extra.warrantyMonths > 60 ? { warrantyMonths: 'Warranty 0 se 60 mahine' } : {}),
  render: (ctx) => {
    const x = ctx.draft.extra;
    const text = (k: 'upperMaterial' | 'soleMaterial' | 'closureType' | 'heelHeight' | 'sizingNotes' | 'careInstructions', l: string, ph: string, max = 60) => (
      <label className="block">
        {label(l)}
        <input value={x[k]} onChange={(e) => ctx.setExtra({ [k]: e.target.value } as Partial<ShoeExtra>)} placeholder={ph} className={inputClass} maxLength={max} />
      </label>
    );
    return (
      <div className="space-y-4">
        <Section icon={Sparkles} title="Nishan" hint="Card aur POS par dikhte hain">
          <div className="flex flex-wrap gap-1.5">
            <Chip on={x.isNewArrival} onClick={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })}>Naya maal</Chip>
            <Chip on={x.isBestSeller} onClick={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })}>Best seller</Chip>
            <Chip on={x.isBridal} onClick={() => ctx.setExtra({ isBridal: !x.isBridal })}>Bridal</Chip>
            <Chip on={x.isEidSpecial} onClick={() => ctx.setExtra({ isEidSpecial: !x.isEidSpecial })}>Eid</Chip>
          </div>
        </Section>
        <Section icon={Footprints} title="Fitting" hint="Customer ko sahi size batane ke liye">
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle on={x.runsSmall} onChange={(v) => ctx.setExtra({ runsSmall: v, ...(v ? { runsLarge: false } : {}) })} title="Chhota aata hai" hint="Customer ko ek size bara dein" />
            <Toggle on={x.runsLarge} onChange={(v) => ctx.setExtra({ runsLarge: v, ...(v ? { runsSmall: false } : {}) })} title="Bara aata hai" hint="Customer ko ek size chhota dein" />
          </div>
          <div className="mt-3">{text('sizingNotes', 'Fitting ki baat', 'Jaise: paon chaura ho to ek size bara', 200)}</div>
        </Section>
        <Section icon={ShieldCheck} title="Material aur warranty">
          <div className="grid gap-3 sm:grid-cols-2">
            {text('upperMaterial', 'Upar ka material', 'Leather, synthetic, mesh')}
            {text('soleMaterial', 'Sole', 'Rubber, PU, TPR')}
            {text('closureType', 'Band karne ka tareeqa', 'Tasme, velcro, slip-on')}
            {text('heelHeight', 'Heel', '2 inch')}
            <label className="block">
              {label('Warranty (mahine)')}
              <input inputMode="numeric" value={x.warrantyMonths || ''} onChange={(e) => ctx.setExtra({ warrantyMonths: Number(e.target.value.replace(/\D/g, '')) || 0 })} placeholder="0" className={cn(inputClass, 'tabular-nums')} />
              {ctx.errors.warrantyMonths ? <span className="mt-1 block text-[0.75rem] text-rose-600">{ctx.errors.warrantyMonths}</span> : hint('Sole ya silai ki warranty; bill par likhi aati hai')}
            </label>
            {text('careInstructions', 'Dekh bhaal', 'Geela na karein, polish karein', 200)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <Toggle on={x.includesBox} onChange={(v) => ctx.setExtra({ includesBox: v })} title="Dabba saath" />
            <Toggle on={x.isWaterproof} onChange={(v) => ctx.setExtra({ isWaterproof: v })} title="Paani se bachao" />
            <Toggle on={x.isOrthopedic} onChange={(v) => ctx.setExtra({ isOrthopedic: v })} title="Medicated / soft" />
            <Toggle on={x.isHandmade} onChange={(v) => ctx.setExtra({ isHandmade: v })} title="Haath ka bana" />
          </div>
        </Section>
      </div>
    );
  },
};

/** "PK 8 / Black" → size 8, colour Black when the grid did not make it. */
function splitName(name: string): { size?: string; color?: string } {
  const [a, b] = name.split('/').map((s) => s.trim());
  return { size: a.replace(/^(PK|UK|US|EU|KIDS)\s+/i, '') || undefined, color: b || undefined };
}

const config: EditorConfig<ShoeExtra> = {
  label: 'Shoes',
  draftKey: 'nafaa.product-editor.shoe',
  paths: { list: '/shoe-products', detail: (id) => `/shoe-products/${id}`, create: '/shoe-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await shoeProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        gender: p.gender ?? 'UNISEX', categoryType: p.categoryType ?? 'OTHER', modelCode: p.modelCode ?? '', modelName: p.modelName ?? '',
        season: p.season ?? '', colorName: p.colorName ?? '', sizeSystem: (SIZE_SYSTEMS.some((s) => s.value === p.sizeSystem) ? p.sizeSystem : 'UK') as SizeSystem,
        mrp: p.mrp ?? null, upperMaterial: p.upperMaterial ?? '', soleMaterial: p.soleMaterial ?? '', closureType: p.closureType ?? '',
        heelHeight: p.heelHeight ?? '', runsLarge: p.runsLarge, runsSmall: p.runsSmall, sizingNotes: p.sizingNotes ?? '',
        isWaterproof: p.isWaterproof, isOrthopedic: p.isOrthopedic, isHandmade: p.isHandmade, includesBox: p.includesBox,
        warrantyMonths: p.warrantyMonths ?? 0, careInstructions: p.careInstructions ?? '',
        isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isBridal: p.isBridal, isEidSpecial: p.isEidSpecial,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await shoeProductsApi.upsert({
        productId, gender: x.gender, categoryType: x.categoryType, modelCode: opt(x.modelCode), modelName: opt(x.modelName),
        season: opt(x.season), colorName: opt(x.colorName), sizeSystem: x.sizeSystem, mrp: x.mrp ?? undefined,
        upperMaterial: opt(x.upperMaterial), soleMaterial: opt(x.soleMaterial), closureType: opt(x.closureType), heelHeight: opt(x.heelHeight),
        runsLarge: x.runsLarge, runsSmall: x.runsSmall, sizingNotes: opt(x.sizingNotes), isWaterproof: x.isWaterproof,
        isOrthopedic: x.isOrthopedic, isHandmade: x.isHandmade, includesBox: x.includesBox, warrantyMonths: x.warrantyMonths,
        careInstructions: opt(x.careInstructions), isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller,
        isBridal: x.isBridal, isEidSpecial: x.isEidSpecial, isFeatured: d.core.isFeatured,
      });
      if (!d.core.variants.length) return;
      const saved = await productVariantsApi.list(productId);
      const items = saved.map((v) => {
        const m = x.variantMeta[v.name] ?? splitName(v.name);
        return { variantId: v.id, size: m.size, color: m.color ?? (x.colorName || undefined), colorHex: (m as { hex?: string }).hex ?? v.colorHex ?? undefined };
      });
      if (items.length) await shoeProductsApi.saveVariantSizes(productId, items);
    },
  },
  steps: [
    basicStep<ShoeExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: 'Jaise: Bata Formal Oxford — Black', categorySuggestions: ['Gents', 'Ladies', 'Bachay', 'Joggers', 'Chappal', 'Saman'] }),
    priceStep<ShoeExtra>(core, { extra: (ctx) => <Mrp ctx={ctx} /> }),
    stockStep<ShoeExtra>(core, { extra: (ctx) => <SizeGrid ctx={ctx} />, quick: [1, 2, 6, 12, 24] }),
    details,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      <p className="text-slate-600">{[genderLabel(d.extra.gender), typeLabel(d.extra.categoryType), d.extra.modelCode].filter((v) => v && v !== '—').join(' · ')}</p>
      {d.core.variants.length > 0 && <p className="text-violet-700">{d.core.variants.length} size ({systemLabel(d.extra.sizeSystem)})</p>}
      {!!d.extra.mrp && d.extra.mrp > d.core.price && d.core.price > 0 && <p className="font-semibold text-rose-700">Sale {Math.round(((d.extra.mrp - d.core.price) / d.extra.mrp) * 100)}%</p>}
    </div>
  ),
  refresh: [META_KEY, 'shoe-dashboard-overview'],
  guide: [
    { icon: Grid3x3, color: '#ea580c', title: 'Size × rang', text: 'Stock step me size aur rang chun kar "size banayein" — har size ka apna barcode, rate aur joray.' },
    { icon: BadgePercent, color: '#e11d48', title: 'MRP aur Sale', text: 'Dabbe ki MRP likhein. Rate MRP se kam ho to card, POS aur bill par Sale % dikhta hai.' },
  ],
};

export default function ShoeProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
