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
import { t } from '@core/i18n';
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';

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
  // The item type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (kind) => ctx.setExtra({ categoryType: kind as FloristCategoryType }));
  return null;
}

function Flower({ ctx }: { ctx: StepContext<FloristExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const group = categoryGroup(x.categoryType || null);
  const fresh = group === 'stem' || group === 'made' || group === 'decor';
  return (
    <div className="space-y-4">
      <Section icon={Flower2} title={t('Phool')} hint={t('Bill aur counter par naam ke neeche dikhta hai')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t('Phool')} value={x.flowerType} onChange={(flowerType) => set({ flowerType })} placeholder={t('Gulab, motia, lily')} />
          <TextField label={t('Rang')} value={x.color} onChange={(color) => set({ color })} placeholder={t('Laal')} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">{COLORS.map((c) => <Chip key={c} on={x.color === c} onClick={() => set({ color: x.color === c ? '' : c })}>{c}</Chip>)}</div>
        {group === 'stem' && (
          <div className="mt-3"><NumberField label={t('Dandi ki lambai')} allowEmpty value={x.stemLengthCm} onChange={(stemLengthCm) => set({ stemLengthCm })} suffix="cm" hint={t('Marzi hai')} /></div>
        )}
      </Section>
      {(group === 'made' || group === 'decor') && (
        <Section icon={Gift} title={t('Bouquet / sajawat')} hint={t('Kitne phool aur kaisa — asal phool stock se nikalne ke liye Combo (bouquet recipe) banayein')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label={t('Kitne phool')} allowEmpty value={x.stemCount} onChange={(stemCount) => set({ stemCount: stemCount == null ? null : Math.round(stemCount) })} />
            <TextField label={t('Wrapping')} value={x.wrapType} onChange={(wrapType) => set({ wrapType })} placeholder={t('Kaghaz, jute, box')} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SIZES.map((v) => <Chip key={v} on={x.bouquetSize === v} onClick={() => set({ bouquetSize: x.bouquetSize === v ? '' : v })}>{v}</Chip>)}
            {WRAPS.map((v) => <Chip key={v} on={x.wrapType === v} onClick={() => set({ wrapType: x.wrapType === v ? '' : v })}>{v}</Chip>)}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle on={x.isPreArranged} onChange={(isPreArranged) => set({ isPreArranged })} icon={Sparkles} title={t('Pehle se tayyar')} hint={t('Shelf par bana hua rakha hai')} />
            <Toggle on={x.isCustomizable} onChange={(isCustomizable) => set({ isCustomizable })} title={t('Order par banta hai')} hint={t('Customer apni marzi ke phool chun sakta hai')} />
          </div>
          {x.isCustomizable && <div className="mt-3"><NumberField label={t('Banane me kitne ghante')} allowEmpty value={x.minLeadTimeHours} onChange={(minLeadTimeHours) => set({ minLeadTimeHours })} suffix="ghante" /></div>}
        </Section>
      )}
      {fresh && (
        <Section icon={Leaf} title={t('Taazgi')} hint={t('Freshness page aur counter par \'murjha gaya\' isi se aata hai')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <NumberField label={t('Kitne din fresh rehta hai')} allowEmpty value={x.daysToWither} onChange={(daysToWither) => set({ daysToWither: daysToWither == null ? null : Math.round(daysToWither) })} suffix="din" error={ctx.errors.daysToWither} hint={t('Gulab 4–5, motia 1, lily 7')} />
            <Input label={t('Maal kab aaya')} type="date" max={dayKey()} value={x.arrivalDate} onChange={(e) => set({ arrivalDate: e.target.value })} hint={t('Fresh ki date isi se ginti hai')} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Toggle on={x.isImported} onChange={(isImported) => set({ isImported })} title={t('Bahar se aaya (imported)')} />
            {x.isImported && <TextField label={t('Kahan se')} value={x.origin} onChange={(origin) => set({ origin })} placeholder={t('Holland, Kenya')} />}
          </div>
        </Section>
      )}
      <Section icon={Calendar} title={t('Mauqa')} hint={t('Counter par \'birthday\' ya \'shaadi\' likhne se ye cheez milti hai')}>
        <div className="flex flex-wrap gap-1.5">
          {OCCASIONS.map((o) => <Chip key={o} on={x.occasions.includes(o)} onClick={() => set({ occasions: x.occasions.includes(o) ? x.occasions.filter((v) => v !== o) : [...x.occasions, o] })}>{o}</Chip>)}
        </div>
        <div className="mt-3"><TextField label={t('Dekh bhaal (marzi)')} value={x.careInstructions} onChange={(careInstructions) => set({ careInstructions })} placeholder={t('Roz paani badlein, dhoop se door')} /></div>
      </Section>
    </div>
  );
}

function WeddingRate({ ctx }: { ctx: StepContext<FloristExtra> }) {
  return (
    <Section title={t('Shaadi ka rate (marzi)')} hint={t('Shaadi ke contract me quote banate waqt yaad rakhne ke liye')}>
      <NumberField label={t('Shaadi rate')} prefix="Rs" allowEmpty value={ctx.draft.extra.weddingPrice} onChange={(weddingPrice) => ctx.setExtra({ weddingPrice })} />
    </Section>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'stem', label: t('Dandi (stem)') }, { value: 'bunch', label: t('Gucha (bunch)') }, { value: 'dozen', label: t('Darjan') }, { value: 'pcs', label: t('Adad') },
    { value: 'kg', label: t('Kg (genda, patti)') }, { value: 'set', label: t('Set') },
  ],
  skuPrefix: 'FL',
  packs: true,
  variants: { presets: [{ group: t('Rang'), values: COLORS }, { group: t('Size'), values: SIZES }] },
  batches: false,
  markups: [30, 50, 80, 100],
};

const flowerStep: StepDef<FloristExtra> = { id: 'flower', title: t('Phool aur taazgi'), hint: t('Phool, rang, kitne din'), icon: Flower2, render: (ctx) => <Flower ctx={ctx} />,
  validate: (d) => {
    const e: Errors = {};
    if (d.extra.daysToWither != null && (d.extra.daysToWither < 1 || d.extra.daysToWither > 365)) e.daysToWither = t('1 se 365 din');
    return e;
  } };

const config: EditorConfig<FloristExtra> = {
  label: t('Florist'),
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
      namePlaceholder: t('Jaise: Laal gulab ya Birthday bouquet (12 gulab)'),
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
        {x.daysToWither != null && <p className="text-slate-600">{t('{{daysToWither}} din fresh', { daysToWither: x.daysToWither })}</p>}
        {x.occasions.length > 0 && <p className="text-slate-600">{x.occasions.join(', ')}</p>}
      </div>
    );
  },
  refresh: [FLORIST_KEYS.profiles, FLORIST_KEYS.freshness, 'florist-product-detail'],
  guide: [
    { icon: Flower2, color: '#db2777', title: t('Dandi, gucha, darjan'), text: t('Base unit "dandi" rakhein; Price step me "Gucha = 10" ya "Darjan = 12" pack jorein — dono tarah bikta hai, stock dandi me ginta hai.') },
    { icon: Leaf, color: '#16a34a', title: t('Taazgi'), text: t('"Kitne din fresh" aur "kab aaya" likhein — counter aur Freshness page par murjhane se pehle khabar milti hai.') },
    { icon: Gift, color: '#7c3aed', title: t('Bouquet recipe'), text: t('Bouquet ke phool stock se kam karne ke liye Combo banayein (12 gulab + wrapping) aur counter par Combo bechein.') },
  ],
};

export default function FloristProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
