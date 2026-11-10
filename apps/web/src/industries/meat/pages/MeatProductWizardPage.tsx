/**
 * Meat item editor on the shared product editor: the animal and cut (they
 * drive the counter filters and order lines), fresh or frozen, halal
 * certificate and source, sold by kg with an optional pack ("pao", "1 kg
 * pack"), and the restaurant rate as the wholesale price.
 */

import { Beef, Leaf, ShieldCheck, Snowflake } from 'lucide-react';
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { meatProductsApi, type AnimalType, type CutCategory, type FreshnessType, type SaleUnit } from '../api/products.api';
import { KEYS, animalOf, cutLabel } from '../lib/meta';
import { t } from '@core/i18n';

export interface MeatExtra {
  animalType: AnimalType | '';
  cutCategory: CutCategory | '';
  freshnessType: FreshnessType;
  isBoneless: boolean;
  isFrozen: boolean;
  isMarinated: boolean;
  isHalalCertified: boolean;
  halalCertNumber: string;
  halalCertBy: string;
  halalCertExpiry: string;
  farmName: string;
  slaughterhouseName: string;
  shelfLifeDays: number | null;
  minOrderKg: number | null;
}

const initial: MeatExtra = {
  animalType: '', cutCategory: '', freshnessType: 'FRESH_SLAUGHTERED', isBoneless: false, isFrozen: false, isMarinated: false,
  isHalalCertified: true, halalCertNumber: '', halalCertBy: '', halalCertExpiry: '', farmName: '', slaughterhouseName: '',
  shelfLifeDays: null, minOrderKg: null,
};

const FRESH: Array<{ value: FreshnessType; label: string }> = [
  { value: 'LIVE', label: t('Zinda') }, { value: 'FRESH_SLAUGHTERED', label: t('Taaza zibah') }, { value: 'FRESH_CHILLED', label: t('Thanda (chiller)') },
  { value: 'FROZEN', label: t('Frozen') }, { value: 'MARINATED', label: t('Masala laga') }, { value: 'PROCESSED', label: t('Tayyar (kabab, nuggets)') },
];
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const saleUnitOf = (unit: string): SaleUnit => (['gram', 'g'].includes(unit) ? 'GRAM' : ['pcs', 'piece'].includes(unit) ? 'PIECE' : unit === 'dozen' ? 'DOZEN' : 'KG');

function Kind({ ctx }: { ctx: StepContext<MeatExtra> }) {
  const x = ctx.draft.extra;
  // The animal comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  // The cut is no longer asked here: an existing product keeps its stored cut.
  useCategoryKindSync(ctx.draft.core.categoryId, x.animalType, (animalType) => ctx.setExtra({ animalType: animalType as AnimalType }));
  return null;
}

function Details({ ctx }: { ctx: StepContext<MeatExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <div className="space-y-4">
      <Section icon={Snowflake} title={t('Halat')} hint={t('Taaza, frozen ya masala laga — bill aur order par dikhta hai')}>
        <div className="flex flex-wrap gap-1.5">{FRESH.map((f) => <Chip key={f.value} on={x.freshnessType === f.value} onClick={() => set({ freshnessType: f.value, isFrozen: f.value === 'FROZEN', isMarinated: f.value === 'MARINATED' })}>{f.label}</Chip>)}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.isBoneless} onChange={(isBoneless) => set({ isBoneless })} title={t('Boneless')} hint={t('Haddi ke bagair')} />
          <NumberField label={t('Kitne din chalta hai')} suffix="din" allowEmpty value={x.shelfLifeDays} onChange={(shelfLifeDays) => set({ shelfLifeDays })} hint={t('Frozen ke liye; khali = usi din')} />
        </div>
      </Section>
      <Section icon={ShieldCheck} title={t('Halal')} hint={t('Certificate ho to likhein — halal record aur bill par kaam aata hai')}>
        <Toggle on={x.isHalalCertified} onChange={(isHalalCertified) => set({ isHalalCertified })} title={t('Halal certified')} icon={ShieldCheck} />
        {x.isHalalCertified && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <TextField label={t('Certificate #')} value={x.halalCertNumber} onChange={(halalCertNumber) => set({ halalCertNumber })} placeholder={t('PHA-12345')} />
            <TextField label={t('Kis ne diya')} value={x.halalCertBy} onChange={(halalCertBy) => set({ halalCertBy })} placeholder={t('PHA, SANHA…')} />
            <label className="block">
              <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">{t('Kab tak')}</span>
              <input type="date" value={x.halalCertExpiry} onChange={(e) => set({ halalCertExpiry: e.target.value })} className="h-11 w-full rounded-xl bg-slate-100 px-3 text-[0.9375rem] outline-none focus:bg-white focus:ring-2 focus:ring-brand-500" />
              {ctx.errors.halalCertExpiry && <span className="mt-1 block text-[0.75rem] font-medium text-rose-600">{ctx.errors.halalCertExpiry}</span>}
            </label>
          </div>
        )}
      </Section>
      <Section icon={Leaf} title={t('Kahan se')} hint={t('Marzi hai')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={t('Farm / mandi')} value={x.farmName} onChange={(farmName) => set({ farmName })} placeholder={t('Shahpur poultry farm')} />
          <TextField label={t('Zibah khana')} value={x.slaughterhouseName} onChange={(slaughterhouseName) => set({ slaughterhouseName })} placeholder={t('Apni dukaan / municipal')} />
        </div>
      </Section>
    </div>
  );
}

function OrderMin({ ctx }: { ctx: StepContext<MeatExtra> }) {
  return (
    <NumberField label={t('Order par kam se kam')} suffix="kg" allowEmpty value={ctx.draft.extra.minOrderKg} onChange={(minOrderKg) => ctx.setExtra({ minOrderKg })}
      hint={t('Wazan wale order me isse kam likhne par yaad dilata hai — khali chhor dein to koi had nahi')} />
  );
}

const core: CoreOptions = {
  units: [
    { value: 'kg', label: t('Kg') }, { value: 'gram', label: t('Gram') }, { value: 'pcs', label: t('Adad (pcs)') }, { value: 'dozen', label: t('Darjan') },
  ],
  skuPrefix: 'MT',
  packs: true,
  variants: false,
  batches: false,
  markups: [10, 15, 20, 25, 30],
};

function meatErrors(x: MeatExtra): Errors {
  const e: Errors = {};
  if (x.isHalalCertified && x.halalCertExpiry && !/^\d{4}-\d{2}-\d{2}$/.test(x.halalCertExpiry)) e.halalCertExpiry = t('Tareekh theek likhein');
  return e;
}

const detailsStep: StepDef<MeatExtra> = { id: 'meat', title: t('Gosht'), hint: t('Halat, halal, source'), icon: Beef, render: (ctx) => <Details ctx={ctx} /> };

const config: EditorConfig<MeatExtra> = {
  label: t('Meat'),
  draftKey: 'nafaa.product-editor.meat',
  paths: { list: '/meat/products', detail: (id) => `/meat-products/${id}`, create: '/meat-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await meatProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        animalType: p.animalType, cutCategory: p.cutCategory, freshnessType: p.freshnessType, isBoneless: p.isBoneless, isFrozen: p.isFrozen,
        isMarinated: p.isMarinated, isHalalCertified: p.isHalalCertified, halalCertNumber: p.halalCertNumber ?? '', halalCertBy: p.halalCertBy ?? '',
        halalCertExpiry: p.halalCertExpiry ? p.halalCertExpiry.slice(0, 10) : '', farmName: p.farmName ?? '', slaughterhouseName: p.slaughterhouseName ?? '',
        shelfLifeDays: p.shelfLifeDays ?? null, minOrderKg: p.minOrderKg ?? null,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body = {
        productId, animalType: x.animalType || undefined, cutCategory: x.cutCategory || undefined, freshnessType: x.freshnessType,
        saleUnit: saleUnitOf(d.core.unit), pricePerKg: num(d.core.price), isBoneless: x.isBoneless, isBoneIn: !x.isBoneless,
        isFrozen: x.isFrozen, isMarinated: x.isMarinated, isHalalCertified: x.isHalalCertified,
        halalCertNumber: x.isHalalCertified ? opt(x.halalCertNumber) : undefined, halalCertBy: x.isHalalCertified ? opt(x.halalCertBy) : undefined,
        halalCertExpiry: x.isHalalCertified ? opt(x.halalCertExpiry) : undefined, farmName: opt(x.farmName), slaughterhouseName: opt(x.slaughterhouseName),
        shelfLifeDays: num(x.shelfLifeDays), minOrderKg: num(x.minOrderKg),
      };
      await meatProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    { ...basicStep<MeatExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: t('Jaise: Chicken boneless, Mutton qeema, Zinda murgi'),
      categorySuggestions: ['Murgi', 'Mutton', 'Beef', 'Machhli', 'Andar ka maal', 'Zinda maal', 'Frozen'],
    }) },
    detailsStep,
    priceStep<MeatExtra>(core),
    stockStep<MeatExtra>(core, { quick: [1, 5, 10, 25, 50], extra: (ctx) => <OrderMin ctx={ctx} /> }),
  ].map((s): StepDef<MeatExtra> => (s.id === 'basic' ? { ...s, validate: (d, e) => ({ ...s.validate?.(d, e), ...meatErrors(d.extra) }) } : s)),
  summary: (d) => {
    const x = d.extra;
    const facts = [x.animalType ? `${animalOf(x.animalType).emoji} ${animalOf(x.animalType).label}` : '', cutLabel(x.cutCategory), FRESH.find((f) => f.value === x.freshnessType)?.label, x.isHalalCertified ? t('Halal') : ''].filter(Boolean);
    return facts.length ? <p className="mt-3 border-t border-slate-100 pt-3 text-[0.8125rem] text-slate-700">{facts.join(' · ')}</p> : null;
  },
  refresh: [KEYS.profiles, 'meat-product-detail', KEYS.daySheet],
  guide: [
    { icon: Beef, color: '#dc2626', title: t('Janwar aur cut'), text: t('Pehle step me janwar aur cut zaroori hain — POS ke filter, cutting aur orders inhi se chalte hain.') },
    { icon: ShieldCheck, color: '#16a34a', title: t('Halal'), text: t('Certificate number aur tareekh likhein; khatam hone wali tareekh product par yaad dilati hai.') },
    { icon: Snowflake, color: '#0891b2', title: t('Kg aur pack'), text: t('Unit kg rakhein. Qeemat step me "Pao = 0.25" ya "1 kg pack" jorein — dono tarah bikta hai, stock kg me ginta hai. Wholesale qeemat = restaurant rate.') },
  ],
};

export default function MeatProductWizardPage() {
  return <ProductEditorPage config={config} />;
}
