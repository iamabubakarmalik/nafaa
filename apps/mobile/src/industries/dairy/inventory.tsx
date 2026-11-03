/**
 * Dairy items through the shared products list, editor and detail (web
 * DairyProductEditor, DairyProducts, DairyProductDetail): what it is (doodh,
 * dahi, makhan…), fat and SNF, morning / evening / home delivery / bulk rates,
 * shelf life and fridge, and which milk is the shop's main milk (the one gawala
 * intake and home deliveries use).
 */

import { useQuery } from '@tanstack/react-query';
import { Factory, Milk, Sunset } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { isMilkType, profileUnit } from '@nafaa/core/industries/dairy';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { ChipGroup, FormSection, Switch } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { dairyProductsApi, type DairyProduct, type DairyProductType } from './api';
import { DAIRY_KEYS, PRODUCT_TYPES, typeLabel } from './meta';

export interface DairyExtra {
  productType: DairyProductType; fatContent: number | null; snfContent: number | null; morningPrice: number | null; eveningPrice: number | null; homeDeliveryPrice: number | null;
  bulkPrice: number | null; minBulkQty: number | null; shelfLifeHours: number | null; requiresRefrigeration: boolean; isFeatured: boolean;
  availableMorning: boolean; availableEvening: boolean; homeDeliveryAvailable: boolean; isPasteurized: boolean;
}
const initial: DairyExtra = {
  productType: 'FRESH_MILK', fatContent: null, snfContent: null, morningPrice: null, eveningPrice: null, homeDeliveryPrice: null, bulkPrice: null, minBulkQty: null, shelfLifeHours: null,
  requiresRefrigeration: true, isFeatured: false, availableMorning: true, availableEvening: true, homeDeliveryAvailable: true, isPasteurized: false,
};
const SHELF = [12, 24, 48, 72, 168];
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const life = (h?: number | null) => (!h ? null : h >= 48 ? t('{{count}} din', { count: Math.round(h / 24) }) : t('{{count}} ghante', { count: h }));

function Kind({ ctx }: { ctx: StepContext<DairyExtra> }) {
  const x = ctx.draft.extra;
  return (
    <FormSection title={t('Ye kya hai')} description={t('Doodh wali cheez gawale ki entry aur ghar delivery me kaam aati hai; dahi, makhan production me.')}>
      <ChipGroup wrap value={x.productType} onChange={(productType) => ctx.setExtra({ productType: productType as DairyProductType })} options={PRODUCT_TYPES.map((o) => ({ value: o.value, label: t(o.label) }))} />
    </FormSection>
  );
}

function Milkish({ ctx }: { ctx: StepContext<DairyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  return (
    <View style={{ gap: 16 }}>
      {isMilkType(x.productType) && (
        <FormSection title={t('Asal doodh')} description={t('Gawale se aya doodh isi ke stock me jata hai aur ghar delivery isi se bikti hai')}>
          <Switch value={x.isFeatured} onChange={(isFeatured) => set({ isFeatured })} label={t('Ye dukaan ka asal doodh hai')} description={t('Ek hi doodh par lagayein; do par laga ho to upar wala chalta hai')} />
        </FormSection>
      )}
      <FormSection title={t('Fat aur SNF')} description={t('Marzi hai — bill aur quality report par dikhta hai')}>
        <NumberInput label={t('Fat %')} value={x.fatContent} onChangeValue={(fatContent) => set({ fatContent })} error={ctx.errors.fat} placeholder="6.5" />
        <NumberInput label={t('SNF %')} value={x.snfContent} onChangeValue={(snfContent) => set({ snfContent })} error={ctx.errors.snf} placeholder="8.5" />
      </FormSection>
      <FormSection title={t('Kitni der chalta hai')} description={t('Card par dikhta hai — purana maal pehle bechein')}>
        <NumberInput label={t('Shelf life')} integer value={x.shelfLifeHours} onChangeValue={(shelfLifeHours) => set({ shelfLifeHours })} hint={t('ghante')} error={ctx.errors.shelf} />
        <ChipGroup wrap value={String(x.shelfLifeHours ?? '')} onChange={(v) => set({ shelfLifeHours: Number(v) })} options={SHELF.map((h) => ({ value: String(h), label: h >= 48 ? t('{{value}} din', { value: h / 24 }) : t('{{h}} ghante', { h }) }))} />
        <Switch value={x.requiresRefrigeration} onChange={(requiresRefrigeration) => set({ requiresRefrigeration })} label={t('Fridge me rakhna hai')} />
        <Switch value={x.isPasteurized} onChange={(isPasteurized) => set({ isPasteurized })} label={t('Pasteurized / packed')} />
      </FormSection>
    </View>
  );
}

function Rates({ ctx }: { ctx: StepContext<DairyExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const unit = ctx.draft.core.unit || 'liter';
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Subah aur shaam ka rate')} description={t('Khali chhor dein to upar wali qeemat lagti hai. Counter par 3 baje ke baad shaam ka rate lagta hai (ek {{unit}})', { unit })}>
        <NumberInput label={t('Subah ka rate')} value={x.morningPrice} onChangeValue={(morningPrice) => set({ morningPrice })} />
        <NumberInput label={t('Shaam ka rate')} value={x.eveningPrice} onChangeValue={(eveningPrice) => set({ eveningPrice })} />
        <Switch value={x.availableMorning} onChange={(availableMorning) => set({ availableMorning })} label={t('Subah milta hai')} />
        <Switch value={x.availableEvening} onChange={(availableEvening) => set({ availableEvening })} label={t('Shaam milta hai')} />
      </FormSection>
      <FormSection title={t('Ghar delivery')} description={t('Delivery customer ka apna rate na ho to ye lagta hai')}>
        <Switch value={x.homeDeliveryAvailable} onChange={(homeDeliveryAvailable) => set({ homeDeliveryAvailable })} label={t('Ghar delivery hoti hai')} />
        <NumberInput label={t('Delivery rate')} value={x.homeDeliveryPrice} onChangeValue={(homeDeliveryPrice) => set({ homeDeliveryPrice })} hint={t('Khali = subah / shaam ka rate')} />
      </FormSection>
      <FormSection title={t('Zyada lene par rate (bulk)')} description={t('Hotel, chai wale — itna ya zyada lein to counter par khud kam rate lagta hai')}>
        <NumberInput label={t('Kam se kam ({{unit}})', { unit })} value={x.minBulkQty} onChangeValue={(minBulkQty) => set({ minBulkQty })} error={ctx.errors.bulk} />
        <NumberInput label={t('Bulk rate')} value={x.bulkPrice} onChangeValue={(bulkPrice) => set({ bulkPrice })} />
      </FormSection>
    </View>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'liter', label: msg('Liter') }, { value: 'kg', label: msg('Kg') }, { value: 'gram', label: msg('Gram') }, { value: 'ml', label: 'ml' }, { value: 'piece', label: msg('Adad (pcs)') },
    { value: 'cup', label: msg('Cup') }, { value: 'plate', label: msg('Plate') }, { value: 'bottle', label: msg('Bottle') }, { value: 'packet', label: msg('Packet') },
  ],
  skuPrefix: 'DRY', packs: true, variants: false, batches: false, markups: [10, 15, 20, 25, 30],
};

function rateErrors(x: DairyExtra): Errors {
  const e: Errors = {};
  if ((x.bulkPrice != null) !== (x.minBulkQty != null)) e.bulk = t('Bulk ke liye quantity aur rate dono likhein');
  else if (x.minBulkQty != null && !(x.minBulkQty > 0)) e.bulk = t('Quantity 0 se zyada likhein');
  if ([x.morningPrice, x.eveningPrice, x.homeDeliveryPrice, x.bulkPrice].some((v) => v != null && v < 0)) e.bulk = t('Rate manfi nahi ho sakta');
  return e;
}
function profileErrors(x: DairyExtra): Errors {
  const e: Errors = {};
  if (x.fatContent != null && (x.fatContent < 0 || x.fatContent > 15)) e.fat = t('Fat 0 se 15 ke beech');
  if (x.snfContent != null && (x.snfContent < 0 || x.snfContent > 15)) e.snf = t('SNF 0 se 15 ke beech');
  if (x.shelfLifeHours != null && x.shelfLifeHours <= 0) e.shelf = t('Ghante 0 se zyada likhein');
  return e;
}

const profileStep: StepDef<DairyExtra> = { id: 'dairy', title: msg('Doodh ki details'), icon: Milk, render: (ctx) => <Milkish ctx={ctx} />, validate: (d) => profileErrors(d.extra) };
const price = priceStep<DairyExtra>(core, { extra: (ctx) => <Rates ctx={ctx} /> });

const editor: EditorConfig<DairyExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await dairyProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        productType: p.productType, fatContent: p.fatContent ?? null, snfContent: p.snfContent ?? null, morningPrice: p.morningPrice ?? null, eveningPrice: p.eveningPrice ?? null, homeDeliveryPrice: p.homeDeliveryPrice ?? null,
        bulkPrice: p.bulkPrice ?? null, minBulkQty: p.minBulkQty ?? null, shelfLifeHours: p.shelfLifeHours ?? p.bestBeforeHours ?? null, requiresRefrigeration: p.requiresRefrigeration, isFeatured: p.isFeatured,
        availableMorning: p.availableMorning, availableEvening: p.availableEvening, homeDeliveryAvailable: p.homeDeliveryAvailable, isPasteurized: p.isPasteurized,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body = {
        productId, productType: x.productType, unit: profileUnit(d.core.unit), fatContent: num(x.fatContent), snfContent: num(x.snfContent), morningPrice: num(x.morningPrice), eveningPrice: num(x.eveningPrice),
        homeDeliveryPrice: num(x.homeDeliveryPrice), bulkPrice: num(x.bulkPrice), minBulkQty: num(x.minBulkQty), shelfLifeHours: num(x.shelfLifeHours), requiresRefrigeration: x.requiresRefrigeration,
        isFeatured: isMilkType(x.productType) && x.isFeatured, availableMorning: x.availableMorning, availableEvening: x.availableEvening, homeDeliveryAvailable: x.homeDeliveryAvailable,
        isPasteurized: x.isPasteurized, isRaw: x.productType === 'RAW_MILK', retailPrice: num(d.core.price), wholesalePrice: num(d.core.wholesalePrice ?? null),
      };
      await dairyProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    basicStep<DairyExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Bhains ka doodh, Dahi, Desi ghee') }),
    profileStep,
    { ...price, validate: (d, e) => ({ ...price.validate?.(d, e), ...rateErrors(d.extra) }) },
    stockStep<DairyExtra>(core, { quick: [5, 10, 20, 40, 100] }),
  ],
  summary: (d) => {
    const x = d.extra;
    return [
      [t('Ye kya hai'), [typeLabel(x.productType), x.fatContent ? t('Fat {{fatContent}}%', { fatContent: x.fatContent }) : null, x.isFeatured && isMilkType(x.productType) ? t('Asal doodh') : null].filter(Boolean).join(' · ')],
      ...(x.morningPrice || x.eveningPrice ? [[t('Rate'), t('Subah {{value}} · Shaam {{value2}}', { value: x.morningPrice ?? '—', value2: x.eveningPrice ?? '—' })] as [string, string]] : []),
    ];
  },
};

/** Dairy profiles by product id (one request, shared by every row). */
function useProfiles() {
  const q = useQuery({ queryKey: [DAIRY_KEYS.profiles], queryFn: () => dairyProductsApi.list({}).catch(() => [] as DairyProduct[]), staleTime: 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}

registerInventoryIndustry({
  id: 'dairy',
  label: msg('Dairy'),
  list: {
    noun: 'cheez',
    filters: ['tags'],
    useSource: useProfiles,
    stockChips: (item) => (['kg', 'liter', 'litre', 'l'].includes((item.unit ?? '').toLowerCase()) ? [5, 10, 20, 40, 100] : [1, 5, 10, 25]),
    extras: (item, ctx) => {
      const p = (ctx.source as Map<string, DairyProduct> | undefined)?.get(item.id);
      if (!p) return {};
      const shelf = life(p.shelfLifeHours ?? p.bestBeforeHours);
      return {
        line: [typeLabel(p.productType), p.fatContent ? t('Fat {{fatContent}}%', { fatContent: p.fatContent }) : null].filter(Boolean).join(' · ') || undefined,
        badges: [...(p.isFeatured ? [{ label: t('Asal doodh'), tone: 'info' as const }] : []), ...(p.requiresRefrigeration ? [{ label: t('Fridge'), tone: 'info' as const }] : []), ...(shelf ? [{ label: shelf, tone: 'neutral' as const }] : [])],
        chips: [
          ...(p.morningPrice ? [t('Subah {{morningPrice}}', { morningPrice: formatMoney(p.morningPrice) })] : []), ...(p.eveningPrice ? [t('Shaam {{eveningPrice}}', { eveningPrice: formatMoney(p.eveningPrice) })] : []),
          ...(p.bulkPrice && p.minBulkQty ? [t('{{minBulkQty}}+ par {{bulkPrice}}', { minBulkQty: p.minBulkQty, bulkPrice: formatMoney(p.bulkPrice) })] : []),
        ],
      };
    },
    actions: [{ icon: Factory, label: msg('Dahi / makhan banayein'), href: '/dairy/production' }],
    guide: [
      { icon: Milk, title: msg('Asal doodh'), text: msg('Jis doodh par "Asal doodh" ka sitara hai wohi gawale ki entry me stock me jata hai aur ghar delivery me bikta hai.') },
      { icon: Sunset, title: msg('Subah aur shaam rate'), text: msg('Edit me subah aur shaam ka rate alag likh sakte hain — counter par waqt ke hisaab se khud lagta hai.') },
      { icon: Factory, title: msg('Dahi aur makhan'), text: msg('"Dahi / makhan banayein" se doodh stock se nikal kar dahi stock me aata hai, doodh ki cost ke saath.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'dairy-product-detail', load: (id) => dairyProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const p = extra as DairyProduct | null | undefined;
      return p ? [{ label: typeLabel(p.productType), tone: 'info' as const }, ...(p.isFeatured ? [{ label: t('Asal doodh'), tone: 'info' as const }] : []), ...(p.requiresRefrigeration ? [{ label: t('Fridge'), tone: 'neutral' as const }] : [])] : [];
    },
    facts: ({ extra }) => {
      const p = extra as DairyProduct | null | undefined;
      if (!p) return [];
      const hours = p.shelfLifeHours ?? p.bestBeforeHours;
      const rows: Array<[string, string | undefined]> = [
        [t('Fat'), p.fatContent ? `${p.fatContent}%` : undefined], ['SNF', p.snfContent ? `${p.snfContent}%` : undefined], [t('Shelf life'), life(hours) ?? undefined],
        [t('Ghar delivery'), p.homeDeliveryAvailable ? t('Hoti hai') : t('Nahi')],
        [t('Subah'), p.morningPrice ? formatMoney(p.morningPrice) : undefined], [t('Shaam (3 baje ke baad)'), p.eveningPrice ? formatMoney(p.eveningPrice) : undefined],
        [t('Ghar delivery'), p.homeDeliveryPrice ? formatMoney(p.homeDeliveryPrice) : undefined], [p.minBulkQty ? t('{{minBulkQty}}+ {{unit}} (bulk)', { minBulkQty: p.minBulkQty, unit: p.unit }) : t('Bulk'), p.bulkPrice ? formatMoney(p.bulkPrice) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    stockChips: [5, 10, 20, 40],
  },
});
