/**
 * Auto parts through the shared products list, editor and detail (web PartsPage,
 * AutoPartWizardPage, AutoPartDetailPage): name and part number (the part
 * number is the SKU unless one is typed), OEM and other numbers, the part's
 * group, genuine / local / used, brand, warranty, the vehicles it fits, and
 * opening stock.
 */

import { BadgeCheck, Car, Hash, ShieldCheck, Star, Wrench, X, Zap } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { msg, t } from '@/core/i18n';
import { Button, Card, Chip, ChipGroup, FormSection, Input, Row, Switch, Text } from '@/design';
import { NumberInput, Tiles } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { partProfilesApi, type PartCategory, type PartCondition, type PartFitment, type PartProfile } from './api';
import { FitmentEditor, yearText } from './components/FitmentEditor';
import { usePartFacts } from './components/PartFacts';
import { CATEGORIES, CONDITIONS, PART_FACTS_KEY, categoryOf, conditionOf, km, opt } from './meta';

export interface PartExtra {
  partNumber: string; oemNumber: string; alternateNumbers: string[]; category: PartCategory; condition: PartCondition;
  brand: string; countryOfOrigin: string; warrantyMonths: number; warrantyKm: number | null;
  isFastMoving: boolean; isCritical: boolean; universal: boolean; fitments: PartFitment[];
}
const initial: PartExtra = {
  partNumber: '', oemNumber: '', alternateNumbers: [], category: 'OTHER', condition: 'NEW', brand: '', countryOfOrigin: '',
  warrantyMonths: 0, warrantyKm: null, isFastMoving: false, isCritical: false, universal: false, fitments: [],
};
const POPULAR: PartCategory[] = ['ENGINE', 'BRAKES', 'FILTERS', 'OILS_FLUIDS', 'SUSPENSION', 'ELECTRICAL', 'LIGHTING', 'BATTERY', 'TIRES_WHEELS', 'BODY', 'IGNITION', 'BELTS_HOSES'];
const BRANDS = ['Toyota Genuine', 'Honda Genuine', 'Suzuki Genuine', 'Denso', 'Bosch', 'NGK', 'Shell', 'Total', 'Zic', 'Exide', 'AGS', 'Osaka'];
const ORIGINS = ['Japan', 'China', 'Taiwan', 'Thailand', 'Pakistan', 'Korea'];

/** Basic step addition: numbers and group. */
function Numbers({ ctx }: { ctx: StepContext<PartExtra> }) {
  const x = ctx.draft.extra;
  const [alt, setAlt] = useState('');
  const [more, setMore] = useState(POPULAR.includes(x.category) ? false : x.category !== 'OTHER');
  const addAlt = () => {
    const v = alt.trim();
    if (v && !x.alternateNumbers.includes(v)) ctx.setExtra({ alternateNumbers: [...x.alternateNumbers, v] });
    setAlt('');
  };
  return (
    <FormSection title={t('Part ke number')}>
      <Input label={t('Part number')} value={x.partNumber} onChangeText={(partNumber) => ctx.setExtra({ partNumber })} placeholder="04465-02220" ltr hint={t('Dabbe ya part par likha number — SKU khali ho to yahi SKU banta hai')} />
      <Input label={t('OEM number')} value={x.oemNumber} onChangeText={(oemNumber) => ctx.setExtra({ oemNumber })} placeholder={t('Company ka asal number')} ltr hint={t('Marzi hai')} />
      <Input label={t('Doosre number (cross reference)')} value={alt} onChangeText={setAlt} placeholder={t('Doosri company ka number likh kar Enter')} ltr returnKeyType="done" onSubmitEditing={addAlt}
        trailing={<Button size="sm" variant="soft" onPress={addAlt}>{t('Jorein')}</Button>} />
      {x.alternateNumbers.length > 0 && (
        <Row gap={2} wrap>{x.alternateNumbers.map((a) => <Chip key={a} selected label={a} icon={X} onPress={() => ctx.setExtra({ alternateNumbers: x.alternateNumbers.filter((y) => y !== a) })} />)}</Row>
      )}
      <Text size="sm" weight="medium" tone="secondary">{t('Part ka group')}</Text>
      <ChipGroup wrap value={x.category} onChange={(c) => ctx.setExtra({ category: x.category === c ? 'OTHER' : (c as PartCategory) })} options={(more ? CATEGORIES : POPULAR).map((c) => ({ value: c, label: categoryOf(c) }))} />
      {!more && <Button size="sm" variant="link" onPress={() => setMore(true)}>{t('Aur…')}</Button>}
    </FormSection>
  );
}

/** Details step: quality, brand, warranty. */
function Quality({ ctx }: { ctx: StepContext<PartExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const pick = (cur: string, v: string) => (cur === v ? '' : v);
  return (
    <View style={{ gap: 16 }}>
      <FormSection title={t('Part kaisa hai')} description={t('Card aur bill par likha aata hai — customer ko pata ho ke genuine hai ya local')}>
        <Tiles value={x.condition} onChange={(condition) => set({ condition })} columns={2} options={CONDITIONS.map((c) => ({ value: c, label: t(conditionOf(c).label) }))} />
      </FormSection>
      <FormSection title={t('Brand aur kahan ka bana')}>
        <Input label={t('Brand')} value={x.brand} onChangeText={(brand) => set({ brand })} placeholder={t('Denso, Bosch, Toyota Genuine…')} />
        <ChipGroup wrap value={x.brand} onChange={(b) => set({ brand: pick(x.brand, b) })} options={BRANDS.map((b) => ({ value: b, label: b }))} />
        <Text size="sm" weight="medium" tone="secondary">{t('Bana:')}</Text>
        <ChipGroup wrap value={x.countryOfOrigin} onChange={(o) => set({ countryOfOrigin: pick(x.countryOfOrigin, o) })} options={ORIGINS.map((o) => ({ value: o, label: o }))} />
      </FormSection>
      <FormSection title={t('Warranty')} description={t('Counter par bechte waqt bill me khud lag jati hai')}>
        <NumberInput label={t('Kitne mahine')} integer value={x.warrantyMonths} onChangeValue={(v) => set({ warrantyMonths: Math.max(0, Math.round(v ?? 0)) })} error={ctx.errors.warranty} />
        <ChipGroup wrap value={String(x.warrantyMonths)} onChange={(m) => set({ warrantyMonths: Number(m) })} options={[0, 1, 3, 6, 12].map((m) => ({ value: String(m), label: m ? t('{{m}} mahine', { m }) : t('Koi nahi') }))} />
        <NumberInput label={t('Ya kitne km')} integer value={x.warrantyKm} onChangeValue={(warrantyKm) => set({ warrantyKm })} hint={t('Marzi hai')} />
      </FormSection>
      <Switch value={x.isFastMoving} onChange={(isFastMoving) => set({ isFastMoving })} label={t('Zyada bikne wala')} description={t('Counter par aage aur “Zyada bikta” ka nishan')} />
      <Switch value={x.isCritical} onChange={(isCritical) => set({ isCritical })} label={t('Hamesha stock me rakhna hai')} description={t('Khatam hone se pehle mangwayein')} />
    </View>
  );
}

const core: CoreOptions = {
  units: [
    { value: 'pcs', label: msg('Adad (pcs)') }, { value: 'set', label: msg('Set') }, { value: 'pair', label: msg('Joda') }, { value: 'liter', label: msg('Liter') },
    { value: 'ml', label: 'ml' }, { value: 'meter', label: msg('Meter') }, { value: 'feet', label: msg('Feet') }, { value: 'kg', label: msg('Kg') },
  ],
  skuPrefix: 'AP', packs: true, variants: false, batches: false, markups: [10, 15, 20, 25, 30],
};

const fitStep: StepDef<PartExtra> = { id: 'fitment', title: msg('Gaari'), icon: Car, render: (ctx) => <FitmentEditor universal={ctx.draft.extra.universal} fitments={ctx.draft.extra.fitments} onChange={(v) => ctx.setExtra(v)} /> };
const qualityStep: StepDef<PartExtra> = {
  id: 'quality', title: msg('Quality'), icon: BadgeCheck, render: (ctx) => <Quality ctx={ctx} />,
  validate: (d): Errors => (d.extra.warrantyMonths > 120 ? { warranty: t('120 mahine se zyada nahi') } : {}),
};

const editor: EditorConfig<PartExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await partProfilesApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      const c = p.compatibility;
      return {
        partNumber: p.partNumber ?? '', oemNumber: p.oemNumber ?? '', alternateNumbers: p.alternateNumbers ?? [], category: p.category, condition: p.condition,
        brand: p.brand ?? '', countryOfOrigin: p.countryOfOrigin ?? '', warrantyMonths: p.warrantyMonths ?? 0, warrantyKm: p.warrantyKm ?? null,
        isFastMoving: p.isFastMoving, isCritical: p.isCritical, universal: !!c?.isUniversal, fitments: Array.isArray(c?.fitments) ? c!.fitments! : [],
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await partProfilesApi.upsert({
        productId, partNumber: opt(x.partNumber), oemNumber: opt(x.oemNumber), alternateNumbers: x.alternateNumbers, category: x.category, condition: x.condition, brand: opt(x.brand),
        countryOfOrigin: opt(x.countryOfOrigin), warrantyMonths: x.warrantyMonths, warrantyKm: x.warrantyKm ?? undefined, isFastMoving: x.isFastMoving, isCritical: x.isCritical,
        compatibility: { isUniversal: x.universal, fitments: x.universal ? [] : x.fitments },
      });
    },
    // The part number is the SKU unless the owner typed one.
    product: (d, payload) => (!String(payload.sku ?? '').trim() && d.extra.partNumber.trim() ? { ...payload, sku: d.extra.partNumber.trim() } : payload),
  },
  steps: [
    basicStep<PartExtra>(core, { extra: (ctx) => <Numbers ctx={ctx} />, namePlaceholder: msg('Jaise: Brake pad Corolla 2015 (front)') }),
    priceStep<PartExtra>(core),
    fitStep,
    qualityStep,
    stockStep<PartExtra>(core, { quick: [1, 2, 5, 10, 20, 50] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const fits = x.universal ? t('Har gaari') : x.fitments.map((f) => [f.makeName, f.modelName].filter(Boolean).join(' ')).join(', ');
    return [
      ...(x.partNumber ? [[t('Part number'), `${x.partNumber}${x.oemNumber ? t(' · OEM {{oemNumber}}', { oemNumber: x.oemNumber }) : ''}`] as [string, string]] : []),
      [t('Quality'), [categoryOf(x.category), t(conditionOf(x.condition).label), x.brand].filter(Boolean).join(' · ')],
      ...(fits ? [[t('Gaari'), fits] as [string, string]] : []),
      ...(x.warrantyMonths > 0 ? [[t('Warranty'), t('{{warrantyMonths}} mahine warranty', { warrantyMonths: x.warrantyMonths })] as [string, string]] : []),
    ];
  },
};

registerInventoryIndustry({
  id: 'autoparts',
  label: msg('Auto Parts'),
  list: {
    noun: 'part',
    filters: ['tags'],
    useSource: () => usePartFacts(),
    extras: (item, ctx) => {
      const f = (ctx.source as ReturnType<typeof usePartFacts> | undefined)?.get(item.id);
      if (!f) return {};
      const c = conditionOf(f.condition);
      return {
        line: [f.partNumber, f.brand, f.universal ? t('Har gaari') : f.fitment].filter(Boolean).join(' · ') || undefined,
        badges: [...(f.condition !== 'NEW' ? [{ label: t(c.label), tone: c.tone }] : []), ...(f.isFastMoving ? [{ label: t('Zyada bikta'), tone: 'brand' as const }] : [])],
        chips: f.category !== 'OTHER' ? [categoryOf(f.category)] : undefined,
      };
    },
    actions: [{ icon: Car, label: msg('Gaariyan'), href: '/autoparts/makes' }, { icon: Wrench, label: msg('Workshop'), href: '/autoparts/jobs' }],
    stockChips: () => [1, 2, 5, 10, 20],
    guide: [
      { icon: Hash, title: msg('Part number'), text: msg('Har part ka number likhein — SKU wahi banta hai aur search me milta hai. OEM aur doosre number counter par dhoondne ke kaam aate hain.') },
      { icon: Car, title: msg('Kis gaari ka'), text: msg('Part kholein → Edit → "Gaari" step. Card par likha aata hai aur counter par "corolla brake" se part milta hai.') },
      { icon: BadgeCheck, title: msg('Genuine / local / used'), text: msg('Grahak ko sach batayein — wapsi kam hoti hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'autoparts-part-detail', load: (id) => partProfilesApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const p = extra as PartProfile | null | undefined;
      if (!p) return [];
      const c = conditionOf(p.condition);
      return [{ label: t(c.label), tone: c.tone }, ...(p.isFastMoving ? [{ label: t('Zyada bikta'), tone: 'brand' as const }] : [])];
    },
    facts: ({ extra }) => {
      const p = extra as PartProfile | null | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Part number'), p.partNumber || undefined], [t('OEM number'), p.oemNumber || undefined], [t('Doosre number'), p.alternateNumbers?.length ? p.alternateNumbers.join(', ') : undefined],
        [t('Group'), p.category !== 'OTHER' ? categoryOf(p.category) : undefined], [t('Quality'), `${t(conditionOf(p.condition).label)}${conditionOf(p.condition).hint ? ` — ${t(conditionOf(p.condition).hint)}` : ''}`],
        [t('Brand'), p.brand || undefined], [t('Bana'), p.countryOfOrigin || undefined],
        [t('Warranty'), p.warrantyMonths > 0 || p.warrantyKm ? [p.warrantyMonths > 0 && t('{{m}} mahine', { m: p.warrantyMonths }), p.warrantyKm && km(p.warrantyKm)].filter(Boolean).join(` ${t('ya')} `) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    alerts: ({ extra }) => ((extra as PartProfile | null | undefined)?.isCritical ? <Card tone="warning"><Text size="sm" weight="medium">{t('Ye part hamesha stock me rakhna hai — khatam hone se pehle purchase karein')}</Text></Card> : null),
    tabs: [{
      id: 'fitment', label: msg('Gaariyan'), icon: Car, when: ({ extra }) => !!extra,
      render: ({ extra }) => {
        const p = extra as PartProfile | null | undefined;
        const fits = p?.compatibility?.fitments ?? [];
        return (
          <Card flush title={t('Kis gaari me lagta hai')} description={t('Counter par in gaariyon ke naam se ye part milta hai')}>
            {p?.compatibility?.isUniversal ? <View style={{ padding: 16 }}><Text size="sm" tone="secondary">{t('Har gaari me lagta hai')}</Text></View>
              : fits.length === 0 ? <View style={{ padding: 16 }}><Text size="sm" tone="muted">{t('Koi gaari nahi likhi — Edit → Gaari me jorein')}</Text></View>
                : fits.map((f, i) => (
                  <Row key={i} justify="between" style={{ padding: 12 }}><Text weight="medium" style={{ flex: 1 }}>{[f.makeName, f.modelName ?? t('sab model')].join(' ')}</Text><Text size="sm" tone="muted" ltr>{yearText(f)}</Text></Row>
                ))}
          </Card>
        );
      },
    }],
    stockChips: [1, 2, 5, 10, 20],
  },
});
