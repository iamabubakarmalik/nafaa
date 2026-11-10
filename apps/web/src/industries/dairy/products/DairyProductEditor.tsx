/**
 * Dairy item editor on the shared product editor: what it is (doodh, dahi,
 * makhan…), fat and SNF, morning / evening / home delivery / bulk rates,
 * shelf life and fridge, and which milk is the shop's main milk (the one
 * gawala collections and home deliveries use).
 */

import { Clock, Droplets, Milk, Snowflake, Star, Sunrise, Tags, Truck } from 'lucide-react';
import { useCategoryKindSync } from '@modules/inventory/categories/lib/kinds';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, Errors, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { dairyProductsApi, type DairyProductType } from '../api/products.api';
import { DAIRY_KEYS } from '../lib/meta';
import { isMilkType, profileUnit, typeLabel } from '../lib/productTypes';
import { t as tr } from '@core/i18n';

export interface DairyExtra {
  productType: DairyProductType;
  fatContent: number | null;
  snfContent: number | null;
  morningPrice: number | null;
  eveningPrice: number | null;
  homeDeliveryPrice: number | null;
  bulkPrice: number | null;
  minBulkQty: number | null;
  shelfLifeHours: number | null;
  requiresRefrigeration: boolean;
  isFeatured: boolean;
  availableMorning: boolean;
  availableEvening: boolean;
  homeDeliveryAvailable: boolean;
  isPasteurized: boolean;
}

const initial: DairyExtra = {
  productType: 'FRESH_MILK', fatContent: null, snfContent: null, morningPrice: null, eveningPrice: null, homeDeliveryPrice: null,
  bulkPrice: null, minBulkQty: null, shelfLifeHours: null, requiresRefrigeration: true, isFeatured: false,
  availableMorning: true, availableEvening: true, homeDeliveryAvailable: true, isPasteurized: false,
};

const SHELF = [12, 24, 48, 72, 168];
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);

function Kind({ ctx }: { ctx: StepContext<DairyExtra> }) {
  const x = ctx.draft.extra;
  // The dairy type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, x.productType, (productType) => ctx.setExtra({ productType: productType as DairyProductType }));
  return null;
}

function Milkish({ ctx }: { ctx: StepContext<DairyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const milk = isMilkType(x.productType);
  return (
    <div className="space-y-4">
      {milk && (
        <Section icon={Star} title={tr('Asal doodh')} hint={tr('Gawale se aya doodh isi ke stock me jata hai aur ghar delivery isi se bikti hai')}>
          <Toggle on={x.isFeatured} onChange={(isFeatured) => set({ isFeatured })} icon={Milk} title={tr('Ye dukaan ka asal doodh hai')} hint={tr('Ek hi doodh par lagayein; do par laga ho to upar wala chalta hai')} />
        </Section>
      )}
      <Section icon={Droplets} title={tr('Fat aur SNF')} hint={tr('Marzi hai — bill aur quality report par dikhta hai')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label={tr('Fat %')} allowEmpty value={x.fatContent} onChange={(fatContent) => set({ fatContent })} suffix="%" error={ctx.errors.fat} placeholder="6.5" />
          <NumberField label={tr('SNF %')} allowEmpty value={x.snfContent} onChange={(snfContent) => set({ snfContent })} suffix="%" error={ctx.errors.snf} placeholder="8.5" />
        </div>
      </Section>
      <Section icon={Clock} title={tr('Kitni der chalta hai')} hint={tr('Card par dikhta hai — purana maal pehle bechein')}>
        <NumberField label={tr('Shelf life')} allowEmpty value={x.shelfLifeHours} onChange={(v) => set({ shelfLifeHours: v == null ? null : Math.round(v) })} suffix="ghante" error={ctx.errors.shelf} />
        <div className="mt-2 flex flex-wrap gap-1.5">{SHELF.map((h) => <Chip key={h} on={x.shelfLifeHours === h} onClick={() => set({ shelfLifeHours: h })}>{h >= 48 ? tr('{{value}} din', { value: h / 24 }) : tr('{{h}} ghante', { h })}</Chip>)}</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.requiresRefrigeration} onChange={(requiresRefrigeration) => set({ requiresRefrigeration })} icon={Snowflake} title={tr('Fridge me rakhna hai')} />
          <Toggle on={x.isPasteurized} onChange={(isPasteurized) => set({ isPasteurized })} title={tr('Pasteurized / packed')} />
        </div>
      </Section>
    </div>
  );
}

function Rates({ ctx }: { ctx: StepContext<DairyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const unit = ctx.draft.core.unit || 'liter';
  return (
    <div className="space-y-4">
      <Section icon={Sunrise} title={tr('Subah aur shaam ka rate')} hint={tr('Khali chhor dein to upar wali qeemat lagti hai. Counter par 3 baje ke baad shaam ka rate lagta hai (ek {{unit}})', { unit })}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label={tr('Subah ka rate')} prefix="Rs" allowEmpty value={x.morningPrice} onChange={(morningPrice) => set({ morningPrice })} />
          <NumberField label={tr('Shaam ka rate')} prefix="Rs" allowEmpty value={x.eveningPrice} onChange={(eveningPrice) => set({ eveningPrice })} />
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Toggle on={x.availableMorning} onChange={(availableMorning) => set({ availableMorning })} title={tr('Subah milta hai')} />
          <Toggle on={x.availableEvening} onChange={(availableEvening) => set({ availableEvening })} title={tr('Shaam milta hai')} />
        </div>
      </Section>
      <Section icon={Truck} title={tr('Ghar delivery')} hint={tr('Delivery customer ka apna rate na ho to ye lagta hai')}>
        <Toggle on={x.homeDeliveryAvailable} onChange={(homeDeliveryAvailable) => set({ homeDeliveryAvailable })} title={tr('Ghar delivery hoti hai')} />
        <div className="mt-3"><NumberField label={tr('Delivery rate')} prefix="Rs" allowEmpty value={x.homeDeliveryPrice} onChange={(homeDeliveryPrice) => set({ homeDeliveryPrice })} hint={tr('Khali = subah / shaam ka rate')} /></div>
      </Section>
      <Section icon={Tags} title={tr('Zyada lene par rate (bulk)')} hint={tr('Hotel, chai wale — itna ya zyada lein to counter par khud kam rate lagta hai')}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label={tr('Kam se kam ({{unit}})', { unit })} allowEmpty value={x.minBulkQty} onChange={(minBulkQty) => set({ minBulkQty })} error={ctx.errors.bulk} />
          <NumberField label={tr('Bulk rate')} prefix="Rs" allowEmpty value={x.bulkPrice} onChange={(bulkPrice) => set({ bulkPrice })} />
        </div>
      </Section>
    </div>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'liter', label: tr('Liter') }, { value: 'kg', label: tr('Kg') }, { value: 'gram', label: tr('Gram') }, { value: 'ml', label: 'ml' },
    { value: 'piece', label: tr('Adad (pcs)') }, { value: 'cup', label: tr('Cup') }, { value: 'plate', label: tr('Plate') }, { value: 'bottle', label: tr('Bottle') }, { value: 'packet', label: tr('Packet') },
  ],
  skuPrefix: 'DRY',
  packs: true,
  variants: false,
  batches: false,
  markups: [10, 15, 20, 25, 30],
};

function rateErrors(x: DairyExtra): Errors {
  const e: Errors = {};
  if ((x.bulkPrice != null) !== (x.minBulkQty != null)) e.bulk = tr('Bulk ke liye quantity aur rate dono likhein');
  else if (x.minBulkQty != null && !(x.minBulkQty > 0)) e.bulk = tr('Quantity 0 se zyada likhein');
  if ([x.morningPrice, x.eveningPrice, x.homeDeliveryPrice, x.bulkPrice].some((v) => v != null && v < 0)) e.bulk = tr('Rate manfi nahi ho sakta');
  return e;
}
function profileErrors(x: DairyExtra): Errors {
  const e: Errors = {};
  if (x.fatContent != null && (x.fatContent < 0 || x.fatContent > 15)) e.fat = tr('Fat 0 se 15 ke beech');
  if (x.snfContent != null && (x.snfContent < 0 || x.snfContent > 15)) e.snf = tr('SNF 0 se 15 ke beech');
  if (x.shelfLifeHours != null && x.shelfLifeHours <= 0) e.shelf = tr('Ghante 0 se zyada likhein');
  return e;
}

const profileStep: StepDef<DairyExtra> = {
  id: 'dairy', title: tr('Doodh ki details'), hint: tr('Fat, shelf life, asal doodh'), icon: Milk,
  render: (ctx) => <Milkish ctx={ctx} />, validate: (d) => profileErrors(d.extra),
};

const config: EditorConfig<DairyExtra> = {
  label: tr('Dairy'),
  draftKey: 'nafaa.product-editor.dairy',
  paths: { list: '/dairy/products', detail: (id) => `/dairy-products/${id}`, create: '/dairy-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await dairyProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        productType: p.productType, fatContent: p.fatContent ?? null, snfContent: p.snfContent ?? null,
        morningPrice: p.morningPrice ?? null, eveningPrice: p.eveningPrice ?? null, homeDeliveryPrice: p.homeDeliveryPrice ?? null,
        bulkPrice: p.bulkPrice ?? null, minBulkQty: p.minBulkQty ?? null, shelfLifeHours: p.shelfLifeHours ?? p.bestBeforeHours ?? null,
        requiresRefrigeration: p.requiresRefrigeration, isFeatured: p.isFeatured, availableMorning: p.availableMorning,
        availableEvening: p.availableEvening, homeDeliveryAvailable: p.homeDeliveryAvailable, isPasteurized: p.isPasteurized,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body = {
        productId, productType: x.productType, unit: profileUnit(d.core.unit),
        fatContent: num(x.fatContent), snfContent: num(x.snfContent), morningPrice: num(x.morningPrice), eveningPrice: num(x.eveningPrice),
        homeDeliveryPrice: num(x.homeDeliveryPrice), bulkPrice: num(x.bulkPrice), minBulkQty: num(x.minBulkQty), shelfLifeHours: num(x.shelfLifeHours),
        requiresRefrigeration: x.requiresRefrigeration, isFeatured: isMilkType(x.productType) && x.isFeatured,
        availableMorning: x.availableMorning, availableEvening: x.availableEvening, homeDeliveryAvailable: x.homeDeliveryAvailable,
        isPasteurized: x.isPasteurized, isRaw: x.productType === 'RAW_MILK',
        retailPrice: num(d.core.price), wholesalePrice: num(d.core.wholesalePrice),
      };
      await dairyProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    basicStep<DairyExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: tr('Jaise: Bhains ka doodh, Dahi, Desi ghee'),
      categorySuggestions: ['Doodh', 'Dahi', 'Lassi', 'Makhan aur ghee', 'Mithai', 'Packed'],
    }),
    profileStep,
    ((s: StepDef<DairyExtra>): StepDef<DairyExtra> => ({ ...s, validate: (d, e) => ({ ...s.validate?.(d, e), ...rateErrors(d.extra) }) }))(
      priceStep<DairyExtra>(core, { extra: (ctx) => <Rates ctx={ctx} /> }),
    ),
    stockStep<DairyExtra>(core, { quick: [5, 10, 20, 40, 100] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const facts = [typeLabel(x.productType), x.fatContent ? tr('Fat {{fatContent}}%', { fatContent: x.fatContent }) : null, x.isFeatured && isMilkType(x.productType) ? tr('Asal doodh') : null].filter(Boolean);
    return (
      <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
        {facts.length > 0 && <p className="text-slate-700">{facts.join(' · ')}</p>}
        {(x.morningPrice || x.eveningPrice) && <p className="text-slate-600">{tr('Subah {{value}} · Shaam {{value2}}', { value: x.morningPrice ?? '—', value2: x.eveningPrice ?? '—' })}</p>}
      </div>
    );
  },
  refresh: [DAIRY_KEYS.profiles, 'dairy-product-detail'],
  guide: [
    { icon: Milk, color: '#0ea5e9', title: tr('Khula maal'), text: tr('Doodh liter me, dahi kg me rakhein — counter par wazan ya paison se dono tarah bikta hai (Rs 100 ka dahi).') },
    { icon: Sunrise, color: '#ea580c', title: tr('Subah / shaam'), text: tr('Shaam ka rate alag ho to Qeemat step me likhein; counter 3 baje ke baad khud badal deta hai.') },
    { icon: Star, color: '#0284c7', title: tr('Asal doodh'), text: tr('Jo doodh gawale se aata hai us par "asal doodh" lagayein — collection aur delivery ka stock usi me chalta hai.') },
  ],
};

export default function DairyProductEditor() {
  return <ProductEditorPage config={config} />;
}
