/**
 * Garment product editor on the shared editor: who it is for, garment type,
 * season and collection, ready-made / stitched / unstitched fabric (sold by
 * meter or suit), and a size × colour grid that makes every variant with
 * its own barcode and opening stock. Size and colour of each variant are
 * saved with it, so the size grid, reorder and POS filters can read them.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Grid3x3, Palette, Shirt, Sparkles } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, Section, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef, VariantDraft } from '@modules/inventory/products/editor/types';
import { productVariantsApi } from '@modules/inventory/products/api/product-variants.api';
import { collectionsApi } from '../api/collections.api';
import { garmentProductsApi, type GarmentCategoryType, type GarmentFabricType, type GarmentGender, type GarmentWorkType } from '../api/products.api';
import { sizeChartsApi } from '../api/size-charts.api';
import { COLLECTION_KEY, FABRICS, GARMENT_TYPES, GENDERS, META_KEY, SEASONS, SIZE_CHART_KEY, fabricLabel, garmentLabel, genderLabel, opt, seasonLabel } from '../components/meta';

type Kind = 'ready' | 'stitched' | 'fabric';

export interface GarmentExtra {
  gender: string; categoryType: string; season: string; collectionId: string; sizeChartId: string;
  fabricType: string; workType: string; styleCode: string; careInstructions: string;
  kind: Kind; allowAlteration: boolean; allowReservation: boolean; allowLayaway: boolean;
  isNewArrival: boolean; isBestSeller: boolean; isOnSale: boolean;
  /** Size and colour behind each variant name made by the grid. */
  variantMeta: Record<string, { size?: string; color?: string; hex?: string }>;
}

const initial: GarmentExtra = {
  gender: 'MEN', categoryType: 'SHALWAR_KAMEEZ', season: 'ALL_SEASON', collectionId: '', sizeChartId: '', fabricType: '', workType: 'PLAIN',
  styleCode: '', careInstructions: '', kind: 'ready', allowAlteration: true, allowReservation: true, allowLayaway: false,
  isNewArrival: true, isBestSeller: false, isOnSale: false, variantMeta: {},
};

const SIZE_SETS: Array<{ label: string; values: string[] }> = [
  { label: 'S-M-L', values: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] },
  { label: 'Number', values: ['28', '30', '32', '34', '36', '38', '40', '42', '44'] },
  { label: 'Desi', values: ['Small', 'Medium', 'Large', 'XL'] },
  { label: 'Bachay', values: ['1-2 saal', '2-3 saal', '3-4 saal', '4-5 saal', '6-7 saal', '8-9 saal', '10-11 saal', '12-13 saal'] },
  { label: 'Free size', values: ['Free size'] },
];
const COLORS: Array<[string, string]> = [
  ['Black', '#000000'], ['White', '#ffffff'], ['Off white', '#f8f0e3'], ['Beige', '#f5f5dc'], ['Grey', '#808080'], ['Navy', '#1e3a8a'],
  ['Sky blue', '#87ceeb'], ['Maroon', '#800000'], ['Red', '#dc2626'], ['Pink', '#f9a8d4'], ['Purple', '#7e22ce'], ['Green', '#16a34a'],
  ['Mint', '#98ff98'], ['Mustard', '#e1ad01'], ['Peach', '#ffdab9'], ['Brown', '#795548'], ['Golden', '#d4af37'],
];
const KINDS: Array<{ value: Kind; label: string; hint: string }> = [
  { value: 'ready', label: 'Ready-made', hint: 'Sila hua, size me' },
  { value: 'stitched', label: 'Silai bhi hoti hai', hint: 'Ready ya order par' },
  { value: 'fabric', label: 'Unstitched kapra', hint: 'Meter ya suit me' },
];

/** Short code for barcodes: "Off white" → "OW", "M" → "M". */
const code = (s: string) => s.split(/\s+/).map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 3) || s.slice(0, 3).toUpperCase();

/* ── Basic step additions: who, what, season, collection, kind ── */
function Identity({ ctx }: { ctx: StepContext<GarmentExtra> }) {
  const x = ctx.draft.extra;
  const { data: collections = [] } = useQuery({ queryKey: [COLLECTION_KEY, 'list'], queryFn: () => collectionsApi.list(), staleTime: 60_000 });
  const { data: charts = [] } = useQuery({ queryKey: [SIZE_CHART_KEY], queryFn: () => sizeChartsApi.list(), staleTime: 60_000 });
  const setKind = (kind: Kind) => {
    ctx.setExtra({ kind, ...(kind === 'fabric' ? { categoryType: 'FABRIC', allowAlteration: false } : {}) });
    if (kind === 'fabric' && !['meter', 'yard', 'suit'].includes(ctx.draft.core.unit)) ctx.setCore({ unit: 'meter' });
  };
  return (
    <div className="space-y-4">
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Maal kis tarah ka hai</span>
        <Tiles value={x.kind} onChange={setKind} options={KINDS} columns="grid-cols-3" />
      </div>
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kis ke liye</span>
        <div className="flex flex-wrap gap-1.5">{GENDERS.map((g) => <Chip key={g.value} on={x.gender === g.value} onClick={() => ctx.setExtra({ gender: g.value })}>{g.label}</Chip>)}</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kapre ki type</span>
          <select value={x.categoryType} onChange={(e) => ctx.setExtra({ categoryType: e.target.value })} className={inputClass}>
            {GARMENT_TYPES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <span className="mt-1 block text-[0.75rem] text-slate-500">POS ke filter aur reports isi se</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Season</span>
          <select value={x.season} onChange={(e) => ctx.setExtra({ season: e.target.value })} className={inputClass}>
            {SEASONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Collection</span>
          <select value={x.collectionId} onChange={(e) => ctx.setExtra({ collectionId: e.target.value })} className={inputClass}>
            <option value="">— Koi nahi —</option>
            {collections.filter((c) => c.isActive || c.id === x.collectionId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <span className="mt-1 block text-[0.75rem] text-slate-500">Season khatam ho to poori collection Sale par</span>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kapra</span>
          <select value={x.fabricType} onChange={(e) => ctx.setExtra({ fabricType: e.target.value })} className={inputClass}>
            <option value="">—</option>
            {FABRICS.map((f) => <option key={f} value={f}>{fabricLabel(f)}</option>)}
          </select>
        </label>
        {x.kind !== 'fabric' && (
          <label className="block">
            <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Size chart</span>
            <select value={x.sizeChartId} onChange={(e) => ctx.setExtra({ sizeChartId: e.target.value })} className={inputClass}>
              <option value="">— Koi nahi —</option>
              {charts.filter((c) => c.isActive || c.id === x.sizeChartId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Design / article code</span>
          <input value={x.styleCode} onChange={(e) => ctx.setExtra({ styleCode: e.target.value })} placeholder="LS-2401" className={inputClass} maxLength={40} />
          <span className="mt-1 block text-[0.75rem] text-slate-500">Company ka article number — search me milta hai</span>
        </label>
      </div>
    </div>
  );
}

/* ── Stock step addition: size × colour grid ── */
function SizeGrid({ ctx }: { ctx: StepContext<GarmentExtra> }) {
  const c = ctx.draft.core;
  const [set, setSet] = useState(0);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<Array<[string, string]>>([]);
  const [custom, setCustom] = useState('');
  const [each, setEach] = useState('');
  const [barcodes, setBarcodes] = useState(true);
  const toggle = <T,>(list: T[], v: T, eq: (a: T, b: T) => boolean) => (list.some((x) => eq(x, v)) ? list.filter((x) => !eq(x, v)) : [...list, v]);
  const combos = (sizes.length ? sizes : ['']).flatMap((s) => (colors.length ? colors : [['', ''] as [string, string]]).map(([cn2, hex]) => ({ s, cn: cn2, hex })))
    .filter((v) => v.s || v.cn);
  const base = (c.sku || c.name.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'GR').toUpperCase();
  const make = () => {
    const have = new Set(c.variants.map((v) => v.name.toLowerCase()));
    const meta = { ...ctx.draft.extra.variantMeta };
    const added: VariantDraft[] = [];
    for (const v of combos) {
      const name = [v.s, v.cn].filter(Boolean).join(' / ');
      if (have.has(name.toLowerCase())) continue;
      meta[name] = { size: v.s || undefined, color: v.cn || undefined, hex: v.hex || undefined };
      added.push({
        name, sku: `${base}-${[v.s, v.cn && code(v.cn)].filter(Boolean).join('-')}`.replace(/\s+/g, ''),
        barcode: barcodes ? `${base}${code(v.s || 'X')}${v.cn ? code(v.cn) : ''}`.replace(/[^A-Z0-9]/g, '') : '',
        colorHex: v.hex, price: null, costPrice: null, stock: ctx.isEdit ? 0 : Number(each) || 0, isActive: true,
      });
    }
    ctx.setCore({ variants: [...c.variants, ...added] });
    ctx.setExtra({ variantMeta: meta });
    setSizes([]); setColors([]);
  };
  return (
    <Section icon={Grid3x3} title="Size × rang" hint="Size aur rang chunein — har jor ka variant apne barcode aur stock ke saath ban jayega">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1">{SIZE_SETS.map((g, i) => <button key={g.label} type="button" onClick={() => setSet(i)} className={cn('h-7 rounded-lg px-2 text-[0.75rem] font-semibold ring-1', set === i ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200')}>{g.label}</button>)}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {SIZE_SETS[set].values.map((s) => <Chip key={s} on={sizes.includes(s)} onClick={() => setSizes(toggle(sizes, s, (a, b) => a === b))}>{s}</Chip>)}
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Apna size + Enter" className="h-8 w-32 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none"
            onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { e.preventDefault(); setSizes([...sizes, custom.trim()]); setCustom(''); } }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map(([n, hex]) => (
            <button key={n} type="button" onClick={() => setColors(toggle(colors, [n, hex] as [string, string], (a, b) => a[0] === b[0]))}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium ring-1', colors.some((x) => x[0] === n) ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} />{n}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          {!ctx.isEdit && (
            <label className="block">
              <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Har variant ka stock</span>
              <input inputMode="decimal" value={each} onChange={(e) => setEach(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0" className={cn(inputClass, 'h-9 w-24 tabular-nums')} />
            </label>
          )}
          <label className="flex items-center gap-2 text-[0.8125rem] text-slate-700"><input type="checkbox" checked={barcodes} onChange={(e) => setBarcodes(e.target.checked)} className="h-4 w-4 rounded" /><Barcode className="h-4 w-4" />Har variant ka barcode khud banayein</label>
          <button type="button" disabled={!combos.length} onClick={make} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <Grid3x3 className="h-4 w-4" />{combos.length ? `${combos.length} variant banayein` : 'Size ya rang chunein'}
          </button>
        </div>
        <p className="text-[0.75rem] text-slate-500">Neeche ki table me har variant ka rate, stock aur barcode badal sakte hain. Barcode label "Barcode labels" se print karein.</p>
      </div>
    </Section>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Piece' }, { value: 'suit', label: 'Suit' }, { value: 'set', label: 'Set' }, { value: 'pair', label: 'Jora' }, { value: 'meter', label: 'Meter' }, { value: 'yard', label: 'Gaz' }],
  skuPrefix: 'GR',
  packs: true,
  variants: { presets: [{ group: 'Size', values: ['S', 'M', 'L', 'XL'] }] },
  markups: [30, 40, 50, 60, 80, 100],
};

const flags: StepDef<GarmentExtra> = {
  id: 'garment', title: 'Garment', hint: 'Silai, hold, qist, nishan', icon: Shirt,
  render: (ctx) => {
    const x = ctx.draft.extra;
    return (
      <div className="space-y-4">
        <Section icon={Sparkles} title="Nishan" hint="Card aur POS par dikhte hain">
          <div className="flex flex-wrap gap-1.5">
            <Chip on={x.isNewArrival} onClick={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })}>Naya maal</Chip>
            <Chip on={x.isBestSeller} onClick={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })}>Best seller</Chip>
            <Chip on={x.isOnSale} onClick={() => ctx.setExtra({ isOnSale: !x.isOnSale })}>Sale</Chip>
          </div>
        </Section>
        <Section icon={Shirt} title="Is maal par kya ho sakta hai">
          <div className="grid gap-2 sm:grid-cols-3">
            <Toggle on={x.allowAlteration} onChange={(v) => ctx.setExtra({ allowAlteration: v })} title="Alteration" hint="Lambai, fitting" />
            <Toggle on={x.allowReservation} onChange={(v) => ctx.setExtra({ allowReservation: v })} title="Hold" hint="Customer ke liye rakhna" />
            <Toggle on={x.allowLayaway} onChange={(v) => ctx.setExtra({ allowLayaway: v })} title="Qist" hint="Qiston me bechna" />
          </div>
        </Section>
        <Section icon={Palette} title="Kaam aur dhulai">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Kaam</span>
              <select value={x.workType} onChange={(e) => ctx.setExtra({ workType: e.target.value })} className={inputClass}>
                {['PLAIN', 'PRINTED', 'EMBROIDERED', 'HAND_EMBROIDERED', 'DIGITAL_PRINTED', 'BLOCK_PRINTED', 'SEQUIN_WORK', 'ZARI_WORK', 'MIRROR_WORK', 'LACE_WORK', 'OTHER'].map((w) => <option key={w} value={w}>{w.replace(/_/g, ' ').toLowerCase()}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Dhulai ki hidayat</span>
              <input value={x.careInstructions} onChange={(e) => ctx.setExtra({ careInstructions: e.target.value })} placeholder="Thande paani me, ulta istri" className={inputClass} maxLength={300} />
            </label>
          </div>
        </Section>
      </div>
    );
  },
};

/** "M / Black" → size M, colour Black when the grid did not make it. */
function splitName(name: string): { size?: string; color?: string } {
  const [a, b] = name.split('/').map((s) => s.trim());
  return b ? { size: a, color: b } : { size: a };
}

const config: EditorConfig<GarmentExtra> = {
  label: 'Garments',
  draftKey: 'nafaa.product-editor.garments',
  paths: { list: '/garments/products', detail: (id) => `/garment-products/${id}`, create: '/garment-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await garmentProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        gender: p.gender ?? '', categoryType: p.categoryType ?? 'OTHER', season: p.season ?? 'ALL_SEASON', collectionId: p.collectionId ?? '',
        sizeChartId: p.sizeChartId ?? '', fabricType: p.fabricType ?? '', workType: p.workType ?? 'PLAIN', styleCode: p.styleCode ?? '',
        careInstructions: p.careInstructions ?? '', kind: p.isFabricOnly ? 'fabric' : p.isStitchable ? 'stitched' : 'ready',
        allowAlteration: p.allowAlteration, allowReservation: p.allowReservation, allowLayaway: p.allowLayaway,
        isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isOnSale: p.isOnSale,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await garmentProductsApi.upsert({
        productId, gender: (x.gender || undefined) as GarmentGender | undefined, categoryType: (x.categoryType || undefined) as GarmentCategoryType | undefined,
        season: x.season, collectionId: x.collectionId || undefined, sizeChartId: x.sizeChartId || undefined,
        fabricType: (x.fabricType || undefined) as GarmentFabricType | undefined, workType: x.workType as GarmentWorkType,
        styleCode: opt(x.styleCode), careInstructions: opt(x.careInstructions),
        isReadyMade: x.kind !== 'fabric', isStitchable: x.kind !== 'ready', isFabricOnly: x.kind === 'fabric',
        allowAlteration: x.allowAlteration, allowReservation: x.allowReservation, allowLayaway: x.allowLayaway,
        isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller, isOnSale: x.isOnSale, isFeatured: d.core.isFeatured,
      });
      if (!d.core.variants.length) return;
      const saved = await productVariantsApi.list(productId);
      const items = saved.map((v, i) => {
        const m = x.variantMeta[v.name] ?? splitName(v.name);
        const hex = (m as { hex?: string }).hex ?? v.colorHex ?? undefined;
        return { variantId: v.id, size: m.size, colorName: m.color, colorHex: hex || undefined, displayOrder: i };
      });
      if (items.length) await garmentProductsApi.saveVariantProfiles(productId, items);
    },
  },
  steps: [
    basicStep<GarmentExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: 'Jaise: Gul Ahmed Lawn 3pc — LS-2401', categorySuggestions: ['Gents', 'Ladies', 'Bachay', 'Unstitched', 'Accessories'] }),
    priceStep<GarmentExtra>(core),
    stockStep<GarmentExtra>(core, { extra: (ctx) => <SizeGrid ctx={ctx} />, quick: [1, 3, 6, 12, 24, 50] }),
    flags,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      <p className="text-slate-600">{[genderLabel(d.extra.gender), garmentLabel(d.extra.categoryType), seasonLabel(d.extra.season)].filter((v) => v !== '—').join(' · ')}</p>
      {d.extra.kind === 'fabric' && <p className="text-sky-700">Unstitched — {d.core.unit} me bikta hai</p>}
      {d.core.variants.length > 0 && <p className="text-violet-700">{d.core.variants.length} size/rang</p>}
      {d.extra.isOnSale && <p className="font-semibold text-rose-700">Sale par</p>}
    </div>
  ),
  refresh: [META_KEY, 'garment-products-pos', COLLECTION_KEY],
  guide: [
    { icon: Grid3x3, color: '#7c3aed', title: 'Size × rang', text: 'Stock step me size aur rang chun kar "variant banayein" — har jor ka apna barcode, rate aur stock.' },
    { icon: Shirt, color: '#db2777', title: 'Unstitched', text: 'Kapra meter ya suit me bikta ho to "Unstitched kapra" chunein — POS par meter likh kar bechein.' },
  ],
};

export default function GarmentProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
