/**
 * Florist items through the shared products list, editor and detail (web
 * FloristProducts, FloristProductWizardPage, FloristProductDetailPage): stems,
 * bouquets, garlands, plants and gifts with freshness (days to wilt, arrival),
 * occasions, bouquet size and a wedding rate.
 */

import { useQuery } from '@tanstack/react-query';
import { Layers, Leaf, Truck } from 'lucide-react-native';
import { useMemo } from 'react';
import { View } from 'react-native';
import { categoryGroup, daysUntil, freshState } from '@nafaa/core/industries/florist';
import { formatDate, formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Card, ChipGroup, DatePicker, FormSection, Input, MoneyInput, Row, Switch, Text } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { dateToKey, keyToDate, todayKey } from '../_shared/deskKit';
import { floristProductsApi, type FloristProfile } from './api';
import { CATEGORY_GROUPS, COLORS, FLORIST_KEYS, OCCASIONS, SIZES, WRAPS, categoryLabel } from './meta';

interface FloristExtra {
  categoryType: string; flowerType: string; color: string; stemLengthCm: number | null; stemCount: number | null; bouquetSize: string; wrapType: string;
  isPreArranged: boolean; daysToWither: number | null; arrivalDate: string; isImported: boolean; origin: string;
  occasions: string[]; isCustomizable: boolean; minLeadTimeHours: number | null; weddingPrice: number | null; careInstructions: string;
}
const initial: FloristExtra = {
  categoryType: '', flowerType: '', color: '', stemLengthCm: null, stemCount: null, bouquetSize: '', wrapType: '', isPreArranged: false, daysToWither: null, arrivalDate: '',
  isImported: false, origin: '', occasions: [], isCustomizable: false, minLeadTimeHours: null, weddingPrice: null, careInstructions: '',
};
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const pick = (cur: string, v: string) => (cur === v ? '' : v);

function Kind({ ctx }: { ctx: StepContext<FloristExtra> }) {
  const x = ctx.draft.extra;
  return (
    <FormSection title={t('Ye kya hai')} description={t('Isi se counter ke filter (khule phool, bouquet, paude) aur taazgi ka hisaab chalta hai.')}>
      {CATEGORY_GROUPS.map((g) => (
        <View key={g.id} style={{ gap: 6 }}>
          <Text size="xs" weight="semibold" tone="muted">{t(g.label)}</Text>
          <ChipGroup wrap value={x.categoryType} onChange={(v) => ctx.setExtra({ categoryType: pick(x.categoryType, v) })} options={g.items.map(([value, label]) => ({ value, label: t(label) }))} />
        </View>
      ))}
    </FormSection>
  );
}

function Flower({ ctx }: { ctx: StepContext<FloristExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const group = categoryGroup(x.categoryType || null);
  const fresh = group === 'stem' || group === 'made' || group === 'decor';
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Phool')} description={t('Bill aur counter par naam ke neeche dikhta hai')}>
        <Input label={t('Phool')} value={x.flowerType} onChangeText={(flowerType) => set({ flowerType })} placeholder={t('Gulab, motia, lily')} />
        <Input label={t('Rang')} value={x.color} onChangeText={(color) => set({ color })} placeholder={t('Laal')} />
        <ChipGroup wrap value={x.color} onChange={(v) => set({ color: pick(x.color, v) })} options={COLORS.map((c) => ({ value: t(c), label: t(c) }))} />
        {group === 'stem' && <NumberInput label={t('Dandi ki lambai (cm)')} value={x.stemLengthCm} onChangeValue={(stemLengthCm) => set({ stemLengthCm })} hint={t('Marzi hai')} />}
      </FormSection>
      {(group === 'made' || group === 'decor') && (
        <FormSection title={t('Bouquet / sajawat')} description={t('Kitne phool aur kaisa — asal phool stock se nikalne ke liye Combo (bouquet recipe) banayein')}>
          <NumberInput label={t('Kitne phool')} integer value={x.stemCount} onChangeValue={(stemCount) => set({ stemCount })} />
          <Input label={t('Wrapping')} value={x.wrapType} onChangeText={(wrapType) => set({ wrapType })} placeholder={t('Kaghaz, jute, box')} />
          <ChipGroup wrap value={x.bouquetSize} onChange={(v) => set({ bouquetSize: pick(x.bouquetSize, v) })} options={SIZES.map((v) => ({ value: t(v), label: t(v) }))} />
          <ChipGroup wrap value={x.wrapType} onChange={(v) => set({ wrapType: pick(x.wrapType, v) })} options={WRAPS.map((v) => ({ value: t(v), label: t(v) }))} />
          <Switch value={x.isPreArranged} onChange={(isPreArranged) => set({ isPreArranged })} label={t('Pehle se tayyar')} description={t('Shelf par bana hua rakha hai')} />
          <Switch value={x.isCustomizable} onChange={(isCustomizable) => set({ isCustomizable })} label={t('Order par banta hai')} description={t('Customer apni marzi ke phool chun sakta hai')} />
          {x.isCustomizable && <NumberInput label={t('Banane me kitne ghante')} value={x.minLeadTimeHours} onChangeValue={(minLeadTimeHours) => set({ minLeadTimeHours })} />}
        </FormSection>
      )}
      {fresh && (
        <FormSection title={t('Taazgi')} description={t("Freshness page aur counter par 'murjha gaya' isi se aata hai")}>
          <NumberInput label={t('Kitne din fresh rehta hai')} integer value={x.daysToWither} onChangeValue={(daysToWither) => set({ daysToWither })} error={ctx.errors.daysToWither} />
          <DatePicker label={t('Maal kab aaya')} value={keyToDate(x.arrivalDate)} maximumDate={new Date()} onChange={(d) => set({ arrivalDate: dateToKey(d) })} hint={t('Fresh ki date isi se ginti hai')} />
          <Switch value={x.isImported} onChange={(isImported) => set({ isImported })} label={t('Bahar se aaya (imported)')} />
          {x.isImported && <Input label={t('Kahan se')} value={x.origin} onChangeText={(origin) => set({ origin })} placeholder={t('Holland, Kenya')} />}
        </FormSection>
      )}
      <FormSection title={t('Mauqa')} description={t("Counter par 'birthday' ya 'shaadi' likhne se ye cheez milti hai")}>
        <ChipGroup wrap multiple value={x.occasions ?? []} onChange={(occasions) => set({ occasions })} options={OCCASIONS.map((o) => ({ value: t(o), label: t(o) }))} />
        <Input label={t('Dekh bhaal (marzi)')} value={x.careInstructions} onChangeText={(careInstructions) => set({ careInstructions })} placeholder={t('Roz paani badlein, dhoop se door')} />
      </FormSection>
    </View>
  );
}

const core: CoreOptions = {
  units: [{ value: 'stem', label: msg('Dandi (stem)') }, { value: 'bunch', label: msg('Gucha (bunch)') }, { value: 'dozen', label: msg('Darjan') }, { value: 'pcs', label: msg('Adad') }, { value: 'kg', label: msg('Kg (genda, patti)') }, { value: 'set', label: msg('Set') }],
  skuPrefix: 'FL',
  packs: true,
  variants: { presets: [{ group: msg('Rang'), values: COLORS }, { group: msg('Size'), values: SIZES }] },
  batches: false,
  markups: [30, 50, 80, 100],
};

const flowerStep: StepDef<FloristExtra> = {
  id: 'flower', title: msg('Phool aur taazgi'), icon: Leaf, render: (ctx) => <Flower ctx={ctx} />,
  validate: (d) => {
    const e: Errors = {};
    if (d.extra.daysToWither != null && (d.extra.daysToWither < 1 || d.extra.daysToWither > 365)) e.daysToWither = t('1 se 365 din');
    return e;
  },
};

const editor: EditorConfig<FloristExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await floristProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', flowerType: p.flowerType ?? '', color: p.color ?? '', stemLengthCm: p.stemLengthCm ?? null, stemCount: p.stemCount ?? null, bouquetSize: p.bouquetSize ?? '',
        wrapType: p.wrapType ?? '', isPreArranged: p.isPreArranged, daysToWither: p.daysToWither ?? null, arrivalDate: p.arrivalDate?.slice(0, 10) ?? '', isImported: p.isImported, origin: p.origin ?? '',
        occasions: p.occasions ?? [], isCustomizable: p.isCustomizable, minLeadTimeHours: p.minLeadTimeHours ?? null, weddingPrice: p.weddingPrice ?? null, careInstructions: p.careInstructions ?? '',
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const body: Record<string, unknown> = {
        productId, categoryType: x.categoryType || undefined, flowerType: opt(x.flowerType), color: opt(x.color), stemLengthCm: num(x.stemLengthCm), stemCount: num(x.stemCount),
        bouquetSize: opt(x.bouquetSize), wrapType: opt(x.wrapType), isPreArranged: x.isPreArranged, daysToWither: num(x.daysToWither), arrivalDate: x.arrivalDate || undefined,
        isImported: x.isImported, origin: opt(x.origin), occasions: x.occasions, isCustomizable: x.isCustomizable, minLeadTimeHours: num(x.minLeadTimeHours), weddingPrice: num(x.weddingPrice),
        careInstructions: opt(x.careInstructions), costPrice: num(d.core.costPrice), retailPrice: num(d.core.price),
      };
      await floristProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    basicStep<FloristExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Laal gulab ya Birthday bouquet (12 gulab)') }),
    flowerStep,
    priceStep<FloristExtra>(core, {
      extra: (ctx) => (
        <FormSection title={t('Shaadi ka rate (marzi)')} description={t('Shaadi ke contract me quote banate waqt yaad rakhne ke liye')}>
          <MoneyInput label={t('Shaadi rate')} value={ctx.draft.extra.weddingPrice} onChangeValue={(weddingPrice) => ctx.setExtra({ weddingPrice })} />
        </FormSection>
      ),
    }),
    stockStep<FloristExtra>(core, { quick: [10, 25, 50, 100, 200] }),
  ],
  summary: (d) => {
    const x = d.extra;
    return [
      ...(x.categoryType ? [[t('Ye kya hai'), categoryLabel(x.categoryType)] as [string, string]] : []),
      ...(x.daysToWither != null ? [[t('Taazgi'), t('{{daysToWither}} din fresh', { daysToWither: x.daysToWither })] as [string, string]] : []),
      ...(x.occasions.length ? [[t('Mauqa'), x.occasions.join(', ')] as [string, string]] : []),
    ];
  },
};

function useProfiles() {
  const q = useQuery({ queryKey: [FLORIST_KEYS.profiles], queryFn: () => floristProductsApi.list(), staleTime: 60_000 });
  return useMemo(() => new Map((q.data ?? []).map((p) => [p.productId, p])), [q.data]);
}
const lineOf = (p?: FloristProfile) => (p ? [p.flowerType, p.color, p.stemCount ? t('{{count}} phool', { count: p.stemCount }) : null, p.bouquetSize].filter(Boolean).join(' · ') : '');

registerInventoryIndustry({
  id: 'florist',
  label: msg('Florist'),
  list: {
    noun: 'cheez',
    filters: ['tags'],
    useSource: useProfiles,
    extras: (item, ctx) => {
      const p = (ctx.source as Map<string, FloristProfile> | undefined)?.get(item.id);
      const state = freshState(p?.freshUntil, todayKey());
      return {
        line: lineOf(p) || undefined,
        ribbon: state === 'wilted' ? { text: t('Murjha gaya'), tone: 'danger' } : state === 'today' ? { text: t('Aaj tak fresh'), tone: 'warning' } : undefined,
        badges: p?.isPreArranged ? [{ label: t('Tayyar'), tone: 'accent' }] : [],
        chips: p?.categoryType ? [categoryLabel(p.categoryType)] : [],
      };
    },
    actions: [
      { icon: Leaf, label: msg('Freshness'), href: '/florist/freshness' },
      { icon: Layers, label: msg('Bouquet recipe'), href: '/combos' },
      { icon: Truck, label: msg('Orders'), href: '/florist/orders' },
    ],
    stockChips: () => [10, 25, 50, 100],
    guide: [
      { icon: Leaf, title: msg('Taazgi'), text: msg('Phool ki "kitne din chalta hai" likhein; naya maal aaye to Freshness page par "Naya maal aaya" dabayein.') },
      { icon: Layers, title: msg('Bouquet recipe'), text: msg('Bouquet ko Combo banayein (12 gulab + 1 wrapping). Counter par bouquet bikte hi har phool stock se nikal jata hai.') },
      { icon: Truck, title: msg('Delivery'), text: msg('Counter par bill ke saath "Delivery / order" bharein — Orders page par tayyari se delivery tak chalta hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'florist-product-detail', load: (id) => floristProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => { const p = extra as FloristProfile | null | undefined; return p?.categoryType ? [{ label: categoryLabel(p.categoryType), tone: 'accent' as const }] : []; },
    facts: ({ extra }) => {
      const p = extra as FloristProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Phool'), p.flowerType], [t('Rang'), p.color], [t('Dandi'), p.stemLengthCm ? `${p.stemLengthCm} cm` : undefined], [t('Kitne phool'), p.stemCount ? String(p.stemCount) : undefined],
        [t('Size'), p.bouquetSize], [t('Wrapping'), p.wrapType], [t('Fresh rehta hai'), p.daysToWither ? t('{{count}} din', { count: p.daysToWither }) : undefined],
        [t('Maal aaya'), p.arrivalDate ? formatDate(p.arrivalDate, { year: true }) : undefined], [t('Kahan se'), p.isImported ? p.origin || t('Imported') : undefined],
        [t('Mauqa'), p.occasions?.length ? p.occasions.join(', ') : undefined], [t('Shaadi rate'), p.weddingPrice ? formatMoney(p.weddingPrice) : undefined], [t('Dekh bhaal'), p.careInstructions],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    tile: ({ extra }) => {
      const p = extra as FloristProfile | null | undefined;
      const left = daysUntil(p?.freshUntil, todayKey());
      if (left === null) return null;
      return { label: t('Fresh tak'), value: left < 0 ? t('Murjha gaya') : left === 0 ? t('Aaj') : t('{{left}} din', { left }), hint: p?.freshUntil ? formatDate(p.freshUntil, { year: true }) : undefined };
    },
    alerts: ({ extra, stock }) => {
      const p = extra as FloristProfile | null | undefined;
      const left = daysUntil(p?.freshUntil, todayKey());
      if (left === null || left > 1 || stock <= 0) return null;
      return <Card tone="warning"><Row gap={2}><Leaf size={16} /><Text size="sm" weight="medium" style={{ flex: 1 }}>{left < 0 ? t('Ye phool murjha chuke hain — bechein, sasta karein ya wastage likhein') : t('Ye phool aaj kal me murjha jayenge — bechein, sasta karein ya wastage likhein')}</Text></Row></Card>;
    },
    stockChips: [10, 25, 50, 100],
  },
});
