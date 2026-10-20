/**
 * Florist item editor on the shared product editor: what kind of item it
 * is (stem, bouquet, decoration, plant, gift), the flower, colour and stem
 * count, how many days it stays fresh, occasions, and a wedding rate.
 * Stems are sold by stem, bunch or dozen through units and packs.
 */

import { Calendar, Flower2, Gift, Leaf, Sparkles } from 'lucide-react';
import { Input } from '@/design-system/components';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { floristProductsApi, type FloristCategoryType } from '../api/products.api';
import { CATEGORY_GROUPS, FLORIST_KEYS, OCCASIONS, categoryGroup, categoryLabel, dayKey } from '../lib/meta';

interface FloristExtra {
  categoryType: FloristCategoryType | '';
  flowerType: string; color: string; stemLengthCm: number | null; stemCount: number | null; bouquetSize: string; wrapType: string;
  isPreArranged: boolean; daysToWither: number | null; arrivalDate: string; isImported: boolean; origin: string;
  occasions: string[]; isCustomizable: boolean; minLeadTimeHours: number | null; weddingPrice: number | null; careInstructions: string;
}

const initial: FloristExtra = {
  categoryType: '', flowerType: '', color: '', stemLengthCm: null, stemCount: null, bouquetSize: '', wrapType: '',
  isPreArranged: false, daysToWither: null, arrivalDate: '', isImported: false, origin: '',
  occasions: [], isCustomizable: false, minLeadTimeHours: null, weddingPrice: null, careInstructions: '',
};

const COLORS = ['Laal', 'Safed', 'Gulabi', 'Peela', 'Narangi', 'Jamni', 'Mix'];
const SIZES = ['Chhota', 'Darmiyana', 'Bara', 'Bohat bara'];
const WRAPS = ['Kaghaz', 'Jute', 'Box', 'Tokri', 'Vase'];
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);

function Kind({ ctx }: { ctx: StepContext<FloristExtra> }) {
  const x = ctx.draft.extra;
  return (
    <div className="space-y-2">
      <span className="block text-[0.8125rem] font-medium text-slate-700">Ye kya hai</span>
      {CATEGORY_GROUPS.map((g) => (
        <div key={g.id}>
          <p className="mb-1 text-[0.75rem] font-semibold text-slate-500">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map(([v, l]) => <Chip key={v} on={x.categoryType === v} onClick={() => ctx.setExtra({ categoryType: x.categoryType === v ? '' : v })}>{l}</Chip>)}
          </div>
        </div>
      ))}
      <p className="text-[0.75rem] text-slate-500">Isi se counter ke filter (khule phool, bouquet, paude) aur taazgi ka hisaab chalta hai.</p>
    </div>
  );
}

function Flower({ ctx }: { ctx: StepContext<FloristExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const group = categoryGroup(x.categoryType || null);
  const fresh = group === 'stem' || group === 'made' || group === 'decor';
  return (
    <div className="space-y-4">
      <Section icon={Flower2} title="Phool" hint="Bill aur counter par naam ke neeche dikhta hai">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="Phool" value={x.flowerType} onChange={(flowerType) => set({ flowerType })} placeholder="Gulab, motia, lily" />
          <TextField label="Rang" value={x.color} onChange={(color) => set({ color })} placeholder="Laal" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{COLORS.map((c) => <Chip key={c} on={x.color === c} onClick={() => set({ color: x.color === c ? '' : c })}>{c}</Chip>)}</div>
        {group === 'stem' && (
          <div className="mt-3"><NumberField label="Dandi ki lambai" allowEmpty value={x.stemLengthCm} onChange={(stemLengthCm) => set({ stemLengthCm })} suffix="cm" hint="Marzi hai" /></div>
        )}
      </Section>
      {(group === 'made' || group === 'decor') && (
        <Section icon={Gift} title="Bouquet / sajawat" hint="Kitne phool aur kaisa — asal phool stock se nikalne ke liye Combo (bouquet recipe) banayein">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Kitne phool" allowEmpty value={x.stemCount} onChange={(stemCount) => set({ stemCount: stemCount == null ? null : Math.round(stemCount) })} />
            <TextField label="Wrapping" value={x.wrapType} onChange={(wrapType) => set({ wrapType })} placeholder="Kaghaz, jute, box" />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SIZES.map((v) => <Chip key={v} on={x.bouquetSize === v} onClick={() => set({ bouquetSize: x.bouquetSize === v ? '' : v })}>{v}</Chip>)}
            {WRAPS.map((v) => <Chip key={v} on={x.wrapType === v} onClick={() => set({ wrapType: x.wrapType === v ? '' : v })}>{v}</Chip>)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle on={x.isPreArranged} onChange={(isPreArranged) => set({ isPreArranged })} icon={Sparkles} title="Pehle se tayyar" hint="Shelf par bana hua rakha hai" />
            <Toggle on={x.isCustomizable} onChange={(isCustomizable) => set({ isCustomizable })} title="Order par banta hai" hint="Customer apni marzi ke phool chun sakta hai" />
          </div>
          {x.isCustomizable && <div className="mt-3"><NumberField label="Banane me kitne ghante" allowEmpty value={x.minLeadTimeHours} onChange={(minLeadTimeHours) => set({ minLeadTimeHours })} suffix="ghante" /></div>}
        </Section>
      )}
      {fresh && (
        <Section icon={Leaf} title="Taazgi" hint="Freshness page aur counter par 'murjha gaya' isi se aata hai">
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label="Kitne din fresh rehta hai" allowEmpty value={x.daysToWither} onChange={(daysToWither) => set({ daysToWither: daysToWither == null ? null : Math.round(daysToWither) })} suffix="din" error={ctx.errors.daysToWither} hint="Gulab 4–5, motia 1, lily 7" />
            <Input label="Maal kab aaya" type="date" max={dayKey()} value={x.arrivalDate} onChange={(e) => set({ arrivalDate: e.target.value })} hint="Fresh ki date isi se ginti hai" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle on={x.isImported} onChange={(isImported) => set({ isImported })} title="Bahar se aaya (imported)" />
            {x.isImported && <TextField label="Kahan se" value={x.origin} onChange={(origin) => set({ origin })} placeholder="Holland, Kenya" />}
          </div>
        </Section>
      )}
      <Section icon={Calendar} title="Mauqa" hint="Counter par 'birthday' ya 'shaadi' likhne se ye cheez milti hai">
        <div className="flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => <Chip key={o} on={x.occasions.includes(o)} onClick={() => set({ occasions: x.occasions.includes(o) ? x.occasions.filter((v) => v !== o) : [...x.occasions, o] })}>{o}</Chip>)}
        </div>
        <div className="mt-3"><TextField label="Dekh bhaal (marzi)" value={x.careInstructions} onChange={(careInstructions) => set({ careInstructions })} placeholder="Roz paani badlein, dhoop se door" /></div>
      </Section>
    </div>
  );
}

function WeddingRate({ ctx }: { ctx: StepContext<FloristExtra> }) {
  return (
    <Section title="Shaadi ka rate (marzi)" hint="Shaadi ke contract me quote banate waqt yaad rakhne ke liye">
      <NumberField label="Shaadi rate" prefix="Rs" allowEmpty value={ctx.draft.extra.weddingPrice} onChange={(weddingPrice) => ctx.setExtra({ weddingPrice })} />
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'stem', label: 'Dandi (stem)' }, { value: 'bunch', label: 'Gucha (bunch)' }, { value: 'dozen', label: 'Darjan' }, { value: 'pcs', label: 'Adad' },
    { value: 'kg', label: 'Kg (genda, patti)' }, { value: 'set', label: 'Set' },
  ],
  skuPrefix: 'FL',
  packs: true,
  variants: { presets: [{ group: 'Rang', values: COLORS }, { group: 'Size', values: SIZES }] },
  batches: false,
  markups: [30, 50, 80, 100],
};

const flowerStep: StepDef<FloristExtra> = { id: 'flower', title: 'Phool aur taazgi', hint: 'Phool, rang, kitne din', icon: Flower2, render: (ctx) => <Flower ctx={ctx} />,
  validate: (d) => {
    const e: Errors = {};
    if (d.extra.daysToWither != null && (d.extra.daysToWither < 1 || d.extra.daysToWither > 365)) e.daysToWither = '1 se 365 din';
    return e;
  } };

const config: EditorConfig<FloristExtra> = {
  label: 'Florist',
  draftKey: 'nafaa.product-editor.florist',
  paths: { list: '/products', detail: (id) => `/florist-products/${id}`, create: '/florist-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await floristProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', flowerType: p.flowerType ?? '', color: p.color ?? '', stemLengthCm: p.stemLengthCm ?? null,
        stemCount: p.stemCount ?? null, bouquetSize: p.bouquetSize ?? '', wrapType: p.wrapType ?? '', isPreArranged: p.isPreArranged,
        daysToWither: p.daysToWither ?? null, arrivalDate: p.arrivalDate?.slice(0, 10) ?? '', isImported: p.isImported, origin: p.origin ?? '',
        occasions: p.occasions ?? [], isCustomizable: p.isCustomizable, minLeadTimeHours: p.minLeadTimeHours ?? null,
        weddingPrice: p.weddingPrice ?? null, careInstructions: p.careInstructions ?? '',
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body = {
        productId, categoryType: x.categoryType || undefined, flowerType: opt(x.flowerType), color: opt(x.color), stemLengthCm: num(x.stemLengthCm),
        stemCount: num(x.stemCount), bouquetSize: opt(x.bouquetSize), wrapType: opt(x.wrapType), isPreArranged: x.isPreArranged,
        daysToWither: num(x.daysToWither), arrivalDate: x.arrivalDate || undefined, isImported: x.isImported, origin: opt(x.origin),
        occasions: x.occasions, isCustomizable: x.isCustomizable, minLeadTimeHours: num(x.minLeadTimeHours), weddingPrice: num(x.weddingPrice),
        careInstructions: opt(x.careInstructions), costPrice: num(d.core.costPrice), retailPrice: num(d.core.price),
      };
      await floristProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    basicStep<FloristExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: 'Jaise: Laal gulab ya Birthday bouquet (12 gulab)',
      categorySuggestions: ['Khule phool', 'Bouquet', 'Haar aur sehra', 'Paude', 'Gift'],
    }),
    flowerStep,
    priceStep<FloristExtra>(core, { extra: (ctx) => <WeddingRate ctx={ctx} /> }),
    stockStep<FloristExtra>(core, { quick: [10, 25, 50, 100, 200] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const facts = [x.categoryType ? categoryLabel(x.categoryType) : null, x.flowerType, x.color, x.stemCount ? `${x.stemCount} phool` : null].filter(Boolean);
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {facts.length > 0 && <p className="text-slate-700">{facts.join(' · ')}</p>}
        {x.daysToWither != null && <p className="text-slate-600">{x.daysToWither} din fresh</p>}
        {x.occasions.length > 0 && <p className="text-slate-600">{x.occasions.join(', ')}</p>}
      </div>
    );
  },
  refresh: [FLORIST_KEYS.profiles, FLORIST_KEYS.freshness, 'florist-product-detail'],
  guide: [
    { icon: Flower2, color: '#db2777', title: 'Dandi, gucha, darjan', text: 'Base unit "dandi" rakhein; Price step me "Gucha = 10" ya "Darjan = 12" pack jorein — dono tarah bikta hai, stock dandi me ginta hai.' },
    { icon: Leaf, color: '#16a34a', title: 'Taazgi', text: '"Kitne din fresh" aur "kab aaya" likhein — counter aur Freshness page par murjhane se pehle khabar milti hai.' },
    { icon: Gift, color: '#7c3aed', title: 'Bouquet recipe', text: 'Bouquet ke phool stock se kam karne ke liye Combo banayein (12 gulab + wrapping) aur counter par Combo bechein.' },
  ],
};

export default function FloristProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
