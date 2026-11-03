/**
 * Sports products through the shared products list, editor and detail (web
 * SportsProducts, SportsProductWizard, SportsProductDetail): sport and type,
 * age group, bat / ball / kit specs that show only for that kind of item,
 * MRP and the team rate (with minimum pieces and team discount), sizes for
 * kits and shoes as variants, warranty and marks.
 */

import { Shirt, Trophy, Users, Wrench } from 'lucide-react-native';
import { View } from 'react-native';
import { isApparel, isBall, isBat, salePct } from '@nafaa/core/industries/sports';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { ChipGroup, FormSection, Input, MoneyInput, Select, Switch, Text, useTheme } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { sportsProductsApi, type SportsMeta, type SportsProductProfile } from './api';
import { AGE_GROUPS, APPAREL_SIZES, BAT_SIZES, KIDS_SIZES, META_KEY, SPORTS, SPORT_TYPES, typeLabel } from './meta';
import { queryClient } from '@/core/query/client';

export interface SportsExtra {
  sport: string; categoryType: string; ageGroup: string;
  batWood: string; batGrade: string; batSize: string; batWeightGrams: string; handleType: string;
  ballType: string; ballWeight: string; size: string; material: string; fit: string; weight: string;
  mrp: number | null; teamPrice: number | null; minTeamOrder: string; bulkDiscountPct: string;
  isTeamOrderable: boolean; hasCustomization: boolean;
  warrantyMonths: number; warrantyType: string; careInstructions: string;
  isNewArrival: boolean; isBestSeller: boolean; isProfessional: boolean;
}
const initial: SportsExtra = {
  sport: 'Cricket', categoryType: 'CRICKET_BAT', ageGroup: 'ADULT', batWood: '', batGrade: '', batSize: '', batWeightGrams: '', handleType: '',
  ballType: '', ballWeight: '', size: '', material: '', fit: '', weight: '', mrp: null, teamPrice: null, minTeamOrder: '', bulkDiscountPct: '',
  isTeamOrderable: false, hasCustomization: false, warrantyMonths: 0, warrantyType: '', careInstructions: '', isNewArrival: true, isBestSeller: false, isProfessional: false,
};
const opt = (v: string) => v.trim() || undefined;
const s = (v?: string | null) => v ?? '';
const digits = (v: string) => v.replace(/\D/g, '');

function TextField({ ctx, k, title, ph, max = 60, ltr }: { ctx: StepContext<SportsExtra>; k: keyof SportsExtra; title: string; ph?: string; max?: number; ltr?: boolean }) {
  return <Input label={title} value={String(ctx.draft.extra[k] ?? '')} onChangeText={(v) => ctx.setExtra({ [k]: v } as Partial<SportsExtra>)} placeholder={ph} maxLength={max} ltr={ltr} />;
}

function Identity({ ctx }: { ctx: StepContext<SportsExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const types = SPORT_TYPES.filter((v) => v.sport === x.sport || v.sport === 'Other');
  return (
    <View style={{ gap: th.space(3) }}>
      <Text size="sm" weight="medium" tone="secondary">{t('Sport')}</Text>
      <ChipGroup wrap value={x.sport} onChange={(v) => ctx.setExtra({ sport: v, categoryType: SPORT_TYPES.find((tp) => tp.sport === v)?.value ?? 'OTHER' })} options={SPORTS.map((v) => ({ value: v, label: t(v) }))} />
      <Select label={t('Item ki type')} value={x.categoryType} onChange={(v) => ctx.setExtra({ categoryType: v })} options={types.map((tp) => ({ value: tp.value, label: t(tp.label) }))} />
      <Text size="xs" tone="muted">{t('Bat, ball ya kit ki tafseel isi se khulti hai')}</Text>
      <Text size="sm" weight="medium" tone="secondary">{t('Kis ke liye')}</Text>
      <ChipGroup wrap value={x.ageGroup} onChange={(v) => ctx.setExtra({ ageGroup: v })} options={AGE_GROUPS.map((a) => ({ value: a.value, label: t(a.label) }))} />
    </View>
  );
}

function TeamRate({ ctx }: { ctx: StepContext<SportsExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  return (
    <View style={{ gap: th.space(4) }}>
      <FormSection title={t('MRP')} description={t('MRP se kam rate ho to Sale ka nishan lagta hai')}>
        <MoneyInput label={t('MRP')} value={x.mrp} onChangeValue={(v) => ctx.setExtra({ mrp: v })} />
      </FormSection>
      <FormSection title={t('Team / school order')} description={t('Bulk order me yahi rate khud lagta hai')}>
        <Switch label={t('Team order me bikta hai')} description={t('Kit, ball, bat — team ke liye')} value={x.isTeamOrderable} onChange={(v) => ctx.setExtra({ isTeamOrderable: v })} />
        {x.isTeamOrderable && (
          <>
            <MoneyInput label={t('Team rate (har piece)')} value={x.teamPrice} onChangeValue={(v) => ctx.setExtra({ teamPrice: v })} />
            <NumberInput label={t('Kam se kam piece')} value={x.minTeamOrder ? Number(x.minTeamOrder) : null} integer placeholder="11" onChangeValue={(v) => ctx.setExtra({ minTeamOrder: v ? String(v) : '' })} />
            <NumberInput label={t('Team discount %')} value={x.bulkDiscountPct ? Number(x.bulkDiscountPct) : null} onChangeValue={(v) => ctx.setExtra({ bulkDiscountPct: v ? String(v) : '' })} error={ctx.errors.bulkDiscountPct} />
          </>
        )}
      </FormSection>
    </View>
  );
}

function Specs({ ctx }: { ctx: StepContext<SportsExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  return (
    <View style={{ gap: th.space(5) }}>
      {isBat(x.categoryType) && (
        <FormSection title={t('Bat')}>
          <TextField ctx={ctx} k="batWood" title={t('Lakri')} ph={t('English willow, Kashmir willow')} />
          <TextField ctx={ctx} k="batGrade" title={t('Grade')} ph={t('1, 2, Players')} max={20} />
          <TextField ctx={ctx} k="batSize" title={t('Size')} ph={t('SH, LH, Size 6')} max={20} />
          <NumberInput label={t('Wazan (gram)')} value={x.batWeightGrams ? Number(x.batWeightGrams) : null} integer placeholder="1180" onChangeValue={(v) => ctx.setExtra({ batWeightGrams: v ? String(v) : '' })} />
          <TextField ctx={ctx} k="handleType" title={t('Handle')} ph={t('Round, oval')} max={30} />
        </FormSection>
      )}
      {isBall(x.categoryType) && (
        <FormSection title={t('Ball')}>
          <TextField ctx={ctx} k="ballType" title={t('Type')} ph={t('Hard, tape, tennis, size 5')} />
          <TextField ctx={ctx} k="ballWeight" title={t('Wazan')} ph="156 g" max={20} />
        </FormSection>
      )}
      {isApparel(x.categoryType) && (
        <FormSection title={t('Kit / jersey')} description={t('Sizes Stock step me variant bana kar daalein')}>
          <TextField ctx={ctx} k="material" title={t('Kapra')} ph={t('Dri-fit, polyester')} />
          <TextField ctx={ctx} k="fit" title={t('Fitting')} ph={t('Regular, slim')} max={30} />
          <Switch label={t('Naam / number print hota hai')} description={t('Team order me printing ka rate alag lagta hai')} value={x.hasCustomization} onChange={(v) => ctx.setExtra({ hasCustomization: v })} />
        </FormSection>
      )}
      <FormSection title={t('Warranty aur nishan')}>
        <TextField ctx={ctx} k="weight" title={t('Wazan / size')} ph={t('5 kg, 20 inch')} max={30} />
        <NumberInput label={t('Warranty (mahine)')} value={x.warrantyMonths || null} integer placeholder="0" error={ctx.errors.warrantyMonths} onChangeValue={(v) => ctx.setExtra({ warrantyMonths: v ?? 0 })} />
        <TextField ctx={ctx} k="warrantyType" title={t('Warranty kis cheez ki')} ph={t('Handle crack, silai')} />
        <TextField ctx={ctx} k="careInstructions" title={t('Dekh bhaal')} ph={t('Naye bat ko oil aur knocking karein')} max={200} />
        <Switch label={t('Naya maal')} value={x.isNewArrival} onChange={(v) => ctx.setExtra({ isNewArrival: v })} />
        <Switch label={t('Best seller')} value={x.isBestSeller} onChange={(v) => ctx.setExtra({ isBestSeller: v })} />
        <Switch label={t('Pro / match ka')} value={x.isProfessional} onChange={(v) => ctx.setExtra({ isProfessional: v })} />
      </FormSection>
    </View>
  );
}

const specsStep: StepDef<SportsExtra> = {
  id: 'sports', title: msg('Tafseel'), icon: Trophy,
  validate: (d) => {
    const e: Errors = {};
    if (Number(d.extra.bulkDiscountPct) > 100) e.bulkDiscountPct = t('Discount 100% se zyada nahi');
    if (d.extra.warrantyMonths < 0 || d.extra.warrantyMonths > 60) e.warrantyMonths = t('Warranty 0 se 60 mahine');
    return e;
  },
  render: (ctx) => <Specs ctx={ctx} />,
};

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece') }, { value: 'pair', label: msg('Jora') }, { value: 'set', label: msg('Set') }, { value: 'box', label: msg('Dabba') }, { value: 'kg', label: msg('Kg') }],
  skuPrefix: 'SP', packs: true,
  variants: { presets: [{ group: msg('Kit size'), values: APPAREL_SIZES }, { group: msg('Bachon ki kit'), values: KIDS_SIZES }, { group: msg('Bat size'), values: BAT_SIZES }] },
  markups: [20, 30, 40, 50, 80, 100],
};

const editor: EditorConfig<SportsExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await sportsProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        sport: s(p.sport) || 'Other', categoryType: s(p.categoryType) || 'OTHER', ageGroup: p.ageGroup ?? 'ADULT', batWood: s(p.batWood), batGrade: s(p.batGrade), batSize: s(p.batSize),
        batWeightGrams: p.batWeightGrams ? String(p.batWeightGrams) : '', handleType: s(p.handleType), ballType: s(p.ballType), ballWeight: s(p.ballWeight), size: s(p.size), material: s(p.material),
        fit: s(p.fit), weight: s(p.weight), mrp: p.mrp ?? null, teamPrice: p.teamPrice ?? null, minTeamOrder: p.minTeamOrder ? String(p.minTeamOrder) : '', bulkDiscountPct: p.bulkDiscountPct ? String(p.bulkDiscountPct) : '',
        isTeamOrderable: p.isTeamOrderable, hasCustomization: p.hasCustomization, warrantyMonths: p.warrantyMonths ?? 0, warrantyType: s(p.warrantyType), careInstructions: s(p.careInstructions),
        isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isProfessional: p.isProfessional,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await sportsProductsApi.upsert({
        productId, sport: x.sport, categoryType: x.categoryType, ageGroup: x.ageGroup, batWood: opt(x.batWood), batGrade: opt(x.batGrade), batSize: opt(x.batSize),
        batWeightGrams: x.batWeightGrams ? Number(x.batWeightGrams) : undefined, handleType: opt(x.handleType), ballType: opt(x.ballType), ballWeight: opt(x.ballWeight), size: opt(x.size),
        material: opt(x.material), fit: opt(x.fit), weight: opt(x.weight), mrp: x.mrp ?? undefined, teamPrice: x.isTeamOrderable ? x.teamPrice ?? undefined : undefined,
        minTeamOrder: x.isTeamOrderable && x.minTeamOrder ? Number(x.minTeamOrder) : undefined, bulkDiscountPct: x.isTeamOrderable && x.bulkDiscountPct ? Number(x.bulkDiscountPct) : undefined,
        isTeamOrderable: x.isTeamOrderable, hasCustomization: x.hasCustomization, warrantyMonths: x.warrantyMonths, warrantyType: opt(x.warrantyType), careInstructions: opt(x.careInstructions),
        isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller, isProfessional: x.isProfessional, isFeatured: d.core.isFeatured,
      });
      void queryClient.invalidateQueries({ queryKey: [META_KEY] });
    },
  },
  steps: [
    basicStep<SportsExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: t('Jaise: CA Plus 15000 English Willow Bat') }),
    priceStep<SportsExtra>(core, { extra: (ctx) => <TeamRate ctx={ctx} /> }),
    stockStep<SportsExtra>(core, { quick: [1, 6, 12, 24, 50] }),
    specsStep,
  ],
  summary: (d) => [
    [t('Sport'), [d.extra.sport && t(d.extra.sport), typeLabel(d.extra.categoryType)].filter(Boolean).join(' · ')],
    ...(d.extra.isTeamOrderable && d.extra.teamPrice ? [[t('Team rate'), formatMoney(d.extra.teamPrice)] as [string, string]] : []),
    ...(d.core.variants.length > 0 ? [[t('Sizes'), String(d.core.variants.length)] as [string, string]] : []),
  ],
};

registerInventoryIndustry({
  id: 'sports',
  label: msg('Sports'),
  list: {
    noun: 'item',
    filters: ['tags'],
    actions: [
      { icon: Users, label: msg('Team orders'), href: '/sports/team-orders' },
      { icon: Wrench, label: msg('Repairs'), href: '/sports/repair-services' },
    ],
    extras: (item) => {
      const m = (queryClient.getQueryData([META_KEY]) as { items: SportsMeta[] } | undefined)?.items.find((x) => x.productId === item.id);
      if (!m) return {};
      const off = salePct(m.mrp, Number(item.price));
      return {
        line: [m.sport && t(m.sport), m.categoryType ? typeLabel(m.categoryType) : null, m.teamPrice ? t('Team {{rate}}', { rate: formatMoney(m.teamPrice) }) : null].filter(Boolean).join(' · '),
        badges: [...(off ? [{ label: t('Sale {{off}}%', { off }), tone: 'danger' as const }] : []), ...(m.isNewArrival ? [{ label: t('Naya'), tone: 'info' as const }] : []), ...(m.isProfessional ? [{ label: t('Pro'), tone: 'neutral' as const }] : [])],
      };
    },
    stockChips: () => [1, 6, 12, 24, 50],
    guide: [
      { icon: Users, title: msg('Team rate'), text: msg('Jo item team ya school ke liye zyada bikta hai us ka team rate likhein — team order me khud lagta hai.') },
      { icon: Shirt, title: msg('Kit ke sizes'), text: msg('Jersey, kit aur shoes ke har size ka stock alag. Laal size khatam ho chuka hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'sports-product-detail', load: (id) => sportsProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra, product }) => {
      const p = extra as SportsProductProfile | null | undefined;
      if (!p) return [];
      const off = salePct(p.mrp, Number(product.price));
      return [
        ...(p.sport ? [{ label: t(p.sport), tone: 'info' as const }] : []), ...(off ? [{ label: t('Sale {{off}}%', { off }), tone: 'danger' as const }] : []),
        ...(p.isTeamOrderable ? [{ label: t('Team'), tone: 'brand' as const }] : []), ...(p.isProfessional ? [{ label: t('Pro'), tone: 'neutral' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = extra as SportsProductProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Type'), p.categoryType ? typeLabel(p.categoryType) : undefined], [t('MRP'), p.mrp ? formatMoney(p.mrp) : undefined],
        [t('Team rate'), p.teamPrice ? `${formatMoney(p.teamPrice)}${p.minTeamOrder ? ` · ${t('kam se kam {{n}}', { n: p.minTeamOrder })}` : ''}` : undefined],
        [t('Lakri'), p.batWood ?? undefined], [t('Grade'), p.batGrade ?? undefined], [t('Bat size'), p.batSize ?? undefined], [t('Wazan'), p.batWeightGrams ? `${p.batWeightGrams} g` : p.weight ?? undefined],
        [t('Ball'), p.ballType ?? undefined], [t('Kapra'), p.material ?? undefined], [t('Fitting'), p.fit ?? undefined], [t('Warranty'), p.warrantyMonths ? t('{{n}} mahine', { n: p.warrantyMonths }) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    stockChips: [1, 6, 12, 24, 50],
  },
});
