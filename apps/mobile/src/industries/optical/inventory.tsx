/**
 * Optical items through the shared products list, editor and detail (web
 * OpticalProductsPage, OpticalProductWizardPage, OpticalProductDetailPage):
 * what the item is (frame, sunglasses, stock lens, contact lens, solution),
 * brand, model and colour, frame size and shape, lens type and coating,
 * contact lens fit, which powers a lens can be made in, and warranty. Colours
 * can be variants; contact lenses and solutions keep batches with expiry.
 */

import { Eye, FileText, Glasses, Palette, Ruler, StickyNote } from 'lucide-react-native';
import { frameSize, kindOf, KIND_ORDER, KIND_TYPES, specErrors, type OpticalCategoryType, type OpticalKind } from '@nafaa/core/industries/optical';
import { msg, t } from '@/core/i18n';
import { Card, ChipGroup, FormSection, Input, Row, Switch, Text } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import type { Errors } from '@/modules/inventory/screens/editor/types';
import { opticalProductsApi, type OpticalFacts, type OpticalFrameMaterial, type OpticalFrameShape, type OpticalGender, type OpticalProfile } from './api';
import { useOpticalFacts } from './hooks';
import { COATINGS, KIND_LABEL, LENS_INDEX, LENS_MATERIAL, OPTICAL_KEYS, factLine, typeLabel, typeLabelKey } from './meta';
import { Choices, MultiChoices, SignedNumber } from './components/parts';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';

export interface OpticalExtra {
  categoryType: OpticalCategoryType | '';
  brand: string; modelNumber: string; collectionName: string; colorName: string; colorHex: string;
  frameShape: OpticalFrameShape | ''; frameMaterial: OpticalFrameMaterial | ''; gender: OpticalGender | '';
  frameSizeMm: number | null; bridgeSizeMm: number | null; templeLengthMm: number | null;
  lensType: string; lensIndex: string; lensMaterial: string; lensCoatings: string[];
  hasBlueCut: boolean; isPhotochromic: boolean; isPolarized: boolean; hasUvProtection: boolean;
  clDuration: string; clBaseCurve: string; clDiameter: string; clWaterContent: string; clForAstigmatism: boolean;
  supportsMinSph: number | null; supportsMaxSph: number | null; supportsMaxCyl: number | null; supportsProgressive: boolean;
  warrantyMonths: number | null;
}

const initial: OpticalExtra = {
  categoryType: '', brand: '', modelNumber: '', collectionName: '', colorName: '', colorHex: '',
  frameShape: '', frameMaterial: '', gender: '', frameSizeMm: null, bridgeSizeMm: null, templeLengthMm: null,
  lensType: '', lensIndex: '', lensMaterial: '', lensCoatings: [], hasBlueCut: false, isPhotochromic: false, isPolarized: false, hasUvProtection: false,
  clDuration: '', clBaseCurve: '', clDiameter: '', clWaterContent: '', clForAstigmatism: false,
  supportsMinSph: null, supportsMaxSph: null, supportsMaxCyl: null, supportsProgressive: false, warrantyMonths: 6,
};

const SHAPES: Array<[OpticalFrameShape, string]> = [['ROUND', msg('Gol')], ['SQUARE', msg('Square')], ['RECTANGLE', msg('Lamba')], ['OVAL', msg('Oval')], ['CAT_EYE', msg('Cat eye')], ['AVIATOR', msg('Aviator')], ['WAYFARER', msg('Wayfarer')], ['BROWLINE', msg('Browline')], ['GEOMETRIC', msg('Geometric')]];
const MATERIALS: Array<[OpticalFrameMaterial, string]> = [['ACETATE', msg('Acetate')], ['METAL', msg('Metal')], ['TITANIUM', msg('Titanium')], ['STAINLESS_STEEL', msg('Steel')], ['PLASTIC', msg('Plastic')], ['TR90', msg('TR90')], ['MIXED', msg('Mix')]];
const GENDERS: Array<[OpticalGender, string]> = [['MENS', msg('Mard')], ['WOMENS', msg('Aurat')], ['UNISEX', msg('Dono')], ['KIDS', msg('Bachay')]];
const BRANDS = ['Ray-Ban', 'Oakley', 'Vogue', 'Police', 'Carrera', 'Titan', 'Essilor', 'Hoya', 'Zeiss', 'Acuvue', 'Bausch + Lomb', 'FreshLook'];
const CL_DURATION = [msg('Daily'), msg('Monthly'), msg('Quarterly'), msg('Yearly')];
const COLOURS = ['Black', 'Brown', 'Gold', 'Silver', 'Gunmetal', 'Tortoise', 'Blue', 'Transparent'];

const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const toggleOne = <V extends string>(cur: V | '', v: V): V | '' => (cur === v ? '' : v);

const Label = ({ children }: { children: string }) => <Text size="sm" weight="semibold" tone="secondary">{children}</Text>;

/** Single choice from [value, source label] pairs; tapping the chosen one clears it. */
function Pick<V extends string>({ list, value, onChange }: { list: Array<[V, string]>; value: V | ''; onChange: (v: V | '') => void }) {
  return <ChipGroup wrap value={value as V} onChange={(v) => onChange(toggleOne(value, v))} options={list.map(([v, l]) => ({ value: v, label: t(l) }))} />;
}

function Kind({ ctx }: { ctx: StepContext<OpticalExtra> }) {
  // The item type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, ctx.draft.extra.categoryType, (kind) => ctx.setExtra({ categoryType: kind as OpticalCategoryType }));
  return null;
}

function Specs({ ctx }: { ctx: StepContext<OpticalExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const kind = kindOf(x.categoryType || null);
  const frame = kind === 'frame' || kind === 'sun';
  const lens = kind === 'lens' || kind === 'sun';
  const contact = kind === 'contact';
  const e = ctx.errors;
  return (
    <>
      <FormSection title={t('Brand aur model')} description={t('Counter aur bill par naam ke neeche dikhta hai')}>
        <Input label={t('Brand')} value={x.brand} onChangeText={(brand) => set({ brand })} placeholder={t('Ray-Ban, Titan, Acuvue')} />
        <Choices options={BRANDS} value={x.brand} onChange={(brand) => set({ brand })} clearable />
        <Input label={t('Model number')} value={x.modelNumber} onChangeText={(modelNumber) => set({ modelNumber })} placeholder={t('RB2140')} ltr />
        {frame && <Input label={t('Rang')} value={x.colorName} onChangeText={(colorName) => set({ colorName })} placeholder={t('Black, Gold')} hint={t('Har rang ka stock alag ho to Stock step me rang ko variant banayein')} />}
        {frame && <Choices options={COLOURS} value={x.colorName} onChange={(colorName) => set({ colorName })} clearable />}
      </FormSection>

      {frame && (
        <FormSection title={t('Frame')} description={t('Size frame ki dandi par likha hota hai: 52□18-145')}>
          <Row gap={2}>
            <NumberInput integer containerStyle={{ flex: 1 }} label={t('Lens width')} value={x.frameSizeMm} onChangeValue={(v) => set({ frameSizeMm: v == null ? null : Math.round(v) })} placeholder="52" />
            <NumberInput integer containerStyle={{ flex: 1 }} label={t('Bridge')} value={x.bridgeSizeMm} onChangeValue={(v) => set({ bridgeSizeMm: v == null ? null : Math.round(v) })} placeholder="18" />
            <NumberInput integer containerStyle={{ flex: 1 }} label={t('Dandi (temple)')} value={x.templeLengthMm} onChangeValue={(v) => set({ templeLengthMm: v == null ? null : Math.round(v) })} placeholder="145" />
          </Row>
          {e.size ? <Text size="xs" weight="medium" tone="danger">{e.size}</Text> : <Text size="xs" tone="muted" ltr>mm</Text>}
          <Label>{t('Shape')}</Label><Pick list={SHAPES} value={x.frameShape} onChange={(frameShape) => set({ frameShape })} />
          <Label>{t('Material')}</Label><Pick list={MATERIALS} value={x.frameMaterial} onChange={(frameMaterial) => set({ frameMaterial })} />
          <Label>{t('Kis ke liye')}</Label><Pick list={GENDERS} value={x.gender} onChange={(gender) => set({ gender })} />
        </FormSection>
      )}

      {lens && (
        <FormSection title={t('Lens')} description={t('Index jitna zyada, lens utna patla')}>
          <Label>{t('Index')}</Label>
          <ChipGroup wrap value={x.lensIndex} onChange={(v) => set({ lensIndex: x.lensIndex === v ? '' : v })} options={LENS_INDEX.map((v) => ({ value: v, label: v }))} />
          <Label>{t('Material')}</Label>
          <Choices options={LENS_MATERIAL} value={x.lensMaterial} onChange={(lensMaterial) => set({ lensMaterial })} clearable />
          <Label>{t('Coating')}</Label>
          <MultiChoices options={COATINGS} value={x.lensCoatings} onChange={(lensCoatings) => set({ lensCoatings })} />
          <Switch value={x.hasBlueCut} onChange={(hasBlueCut) => set({ hasBlueCut })} label={t('Blue cut')} description={t('Computer / mobile ke liye')} />
          <Switch value={x.isPhotochromic} onChange={(isPhotochromic) => set({ isPhotochromic })} label={t('Photochromic')} description={t('Dhoop me kala')} />
          <Switch value={x.isPolarized} onChange={(isPolarized) => set({ isPolarized })} label={t('Polarized')} description={t('Chamak kam')} />
          <Switch value={x.hasUvProtection} onChange={(hasUvProtection) => set({ hasUvProtection })} label={t('UV 400')} />
          {kind === 'lens' && (
            <>
              <Row gap={2}>
                <SignedNumber containerStyle={{ flex: 1 }} label={t('Kam se kam SPH')} value={x.supportsMinSph} onValue={(supportsMinSph) => set({ supportsMinSph })} placeholder="-6.00" />
                <SignedNumber containerStyle={{ flex: 1 }} label={t('Zyada se zyada SPH')} value={x.supportsMaxSph} onValue={(supportsMaxSph) => set({ supportsMaxSph })} placeholder="+4.00" />
              </Row>
              <SignedNumber label={t('Zyada se zyada CYL')} value={x.supportsMaxCyl} onValue={(supportsMaxCyl) => set({ supportsMaxCyl })} placeholder="-2.00" />
              {e.range ? <Text size="xs" weight="medium" tone="danger">{e.range}</Text> : null}
              <Switch value={x.supportsProgressive} onChange={(supportsProgressive) => set({ supportsProgressive })} label={t('Progressive ban sakta hai')} />
            </>
          )}
        </FormSection>
      )}

      {contact && (
        <FormSection title={t('Contact lens')} description={t('Dabbe par likha fit — customer ke nuskhe se milayein')}>
          <Label>{t('Kitne din chalta hai')}</Label>
          <Choices options={CL_DURATION} value={x.clDuration} onChange={(clDuration) => set({ clDuration })} clearable />
          <Row gap={2}>
            <Input containerStyle={{ flex: 1 }} label={t('Base curve (BC)')} value={x.clBaseCurve} onChangeText={(clBaseCurve) => set({ clBaseCurve })} placeholder="8.6" ltr />
            <Input containerStyle={{ flex: 1 }} label={t('Diameter (DIA)')} value={x.clDiameter} onChangeText={(clDiameter) => set({ clDiameter })} placeholder="14.2" ltr />
          </Row>
          <Input label={t('Pani (water %)')} value={x.clWaterContent} onChangeText={(clWaterContent) => set({ clWaterContent })} placeholder="38%" ltr />
          <Switch value={x.clForAstigmatism} onChange={(clForAstigmatism) => set({ clForAstigmatism })} label={t('Toric (cylinder wale ke liye)')} />
          <Text size="xs" tone="muted">{t('Expiry ke liye Stock step me batch aur expiry date likhein — counter pehle purani expiry wala bechta hai.')}</Text>
        </FormSection>
      )}

      <FormSection title={t('Warranty')}>
        <NumberInput integer label={t('Warranty')} value={x.warrantyMonths} onChangeValue={(v) => set({ warrantyMonths: v == null ? null : Math.round(v) })} trailing={<Text size="sm" tone="muted">{t('mahine')}</Text>} hint={t('0 = koi warranty nahi')} />
      </FormSection>
    </>
  );
}

const SPEC_TEXT = { frameSize: msg('Size sahi likhein: lens 30-80, bridge 10-30, dandi 100-160 mm'), warranty: msg('Warranty 0 se 60 mahine'), sphRange: msg('Kam se kam SPH zyada wale se bara hai') };

function validateSpecs(x: OpticalExtra): Errors {
  const e = specErrors(x);
  const out: Errors = {};
  if (e.size) out.size = t(SPEC_TEXT[e.size]);
  if (e.range) out.range = t(SPEC_TEXT[e.range]);
  return out;
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece') }, { value: 'pair', label: msg('Pair') }, { value: 'box', label: msg('Box') }, { value: 'pack', label: msg('Pack') }, { value: 'bottle', label: msg('Bottle') }],
  skuPrefix: 'OPT',
  packs: true,
  variants: { presets: [{ group: msg('Rang'), values: COLOURS }, { group: msg('Contact lens power'), values: ['-1.00', '-1.50', '-2.00', '-2.50', '-3.00', '-4.00'] }] },
  batches: true,
  markups: [30, 50, 80, 100],
};

const specsStep: StepDef<OpticalExtra> = {
  id: 'specs', title: msg('Tafseel'), icon: Glasses, render: (ctx) => <Specs ctx={ctx} />, validate: (d) => validateSpecs(d.extra),
};

const editor: EditorConfig<OpticalExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await opticalProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        categoryType: p.categoryType ?? '', brand: p.brand ?? '', modelNumber: p.modelNumber ?? '', collectionName: p.collectionName ?? '', colorName: p.colorName ?? '', colorHex: p.colorHex ?? '',
        frameShape: p.frameShape ?? '', frameMaterial: p.frameMaterial ?? '', gender: p.gender ?? '', frameSizeMm: p.frameSizeMm, bridgeSizeMm: p.bridgeSizeMm, templeLengthMm: p.templeLengthMm,
        lensType: p.lensType ?? '', lensIndex: p.lensIndex ?? '', lensMaterial: p.lensMaterial ?? '', lensCoatings: p.lensCoatings ?? [],
        hasBlueCut: p.hasBlueCut, isPhotochromic: p.isPhotochromic, isPolarized: p.isPolarized, hasUvProtection: !!p.hasUvProtection,
        clDuration: p.clDuration ?? '', clBaseCurve: p.clBaseCurve ?? '', clDiameter: p.clDiameter ?? '', clWaterContent: p.clWaterContent ?? '', clForAstigmatism: p.clForAstigmatism,
        supportsMinSph: p.supportsMinSph, supportsMaxSph: p.supportsMaxSph, supportsMaxCyl: p.supportsMaxCyl, supportsProgressive: p.supportsProgressive, warrantyMonths: p.warrantyMonths,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      const kind = kindOf(x.categoryType || null);
      const body: Record<string, unknown> = {
        productId, categoryType: x.categoryType || undefined,
        brand: opt(x.brand), modelNumber: opt(x.modelNumber), collectionName: opt(x.collectionName), colorName: opt(x.colorName), colorHex: opt(x.colorHex),
        frameShape: x.frameShape || undefined, frameMaterial: x.frameMaterial || undefined, gender: x.gender || undefined,
        frameSizeMm: num(x.frameSizeMm), bridgeSizeMm: num(x.bridgeSizeMm), templeLengthMm: num(x.templeLengthMm),
        lensType: opt(x.lensType), lensIndex: opt(x.lensIndex), lensMaterial: opt(x.lensMaterial), lensCoatings: x.lensCoatings,
        hasBlueCut: x.hasBlueCut, isPhotochromic: x.isPhotochromic, isPolarized: x.isPolarized, hasUvProtection: x.hasUvProtection,
        isContactLens: kind === 'contact', clDuration: opt(x.clDuration), clBaseCurve: opt(x.clBaseCurve), clDiameter: opt(x.clDiameter), clWaterContent: opt(x.clWaterContent), clForAstigmatism: x.clForAstigmatism,
        supportsMinSph: num(x.supportsMinSph), supportsMaxSph: num(x.supportsMaxSph), supportsMaxCyl: num(x.supportsMaxCyl), supportsProgressive: x.supportsProgressive,
        warrantyMonths: num(x.warrantyMonths), retailPrice: num(d.core.price), costPrice: num(d.core.costPrice),
      };
      await opticalProductsApi.upsert(Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined)));
    },
  },
  steps: [
    basicStep<OpticalExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Ray-Ban RB2140 Black ya Acuvue Oasys') }),
    specsStep,
    priceStep<OpticalExtra>(core),
    stockStep<OpticalExtra>(core, { quick: [1, 5, 10, 20] }),
  ],
  summary: (d) => {
    const x = d.extra;
    const line = [typeLabel(x.categoryType || null), [x.brand, x.modelNumber].filter(Boolean).join(' '), x.colorName, frameSize(x.frameSizeMm, x.bridgeSizeMm, x.templeLengthMm), x.lensIndex, x.clDuration].filter(Boolean);
    return line.length ? [[t('Tafseel'), line.join(' · ')]] : [];
  },
};

type FactsMap = Map<string, OpticalFacts>;

const pretty = (v?: string | null) => (v ? v.replace(/_/g, ' ').toLowerCase() : undefined);

registerInventoryIndustry({
  id: 'optical',
  label: msg('Optical'),
  categoryKinds: KIND_ORDER.flatMap((k) => KIND_TYPES[k].filter((v) => v !== 'OTHER').map((value) => ({ value, label: typeLabelKey(value) }))),
  list: {
    noun: 'item',
    filters: ['tags'],
    useSource: useOpticalFacts,
    extras: (item, ctx) => {
      const f = (ctx.source as FactsMap | undefined)?.get(item.id);
      if (!f) return {};
      return {
        line: factLine(f),
        badges: [...(f.hasBlueCut ? [{ label: t('Blue cut'), tone: 'info' as const }] : []), ...(f.isPolarized ? [{ label: t('Polarized'), tone: 'neutral' as const }] : [])],
        chips: [
          ...(f.categoryType ? [typeLabel(f.categoryType)] : []),
          ...(f.colorName && f.categoryType && !f.isContactLens ? [f.colorName] : []),
          ...(f.warrantyMonths ? [t('{{warrantyMonths}} mahine warranty', { warrantyMonths: f.warrantyMonths })] : []),
        ],
      };
    },
    actions: [
      { icon: Glasses, label: msg('Orders'), href: '/optical/lens-orders' },
      { icon: FileText, label: msg('Nuskhe'), href: '/optical/prescriptions' },
    ],
    stockChips: () => [1, 5, 10, 20],
    guide: [
      { icon: Ruler, title: msg('Frame ki pehchan'), text: msg('Har frame par brand, model, rang aur size (52-18-145) naam ke neeche — customer ka purana frame dhoondna aasaan.') },
      { icon: Palette, title: msg('Rang'), text: msg('Ek model ke kai rang hon to rang variant banayein — har rang ka stock alag.') },
      { icon: Eye, title: msg('Contact lens expiry'), text: msg('Contact lens aur solution ki expiry batch me — qareeb expiry wale upar "Expiry" filter me.') },
    ],
  },
  editor,
  detail: {
    extra: { key: OPTICAL_KEYS.profile, load: (id) => opticalProductsApi.byProduct(id).catch(() => null) },
    badges: ({ extra }) => {
      const p = extra as OpticalProfile | undefined;
      if (!p) return [];
      return [
        ...(p.categoryType ? [{ label: typeLabel(p.categoryType), tone: 'info' as const }] : []),
        ...(p.colorName ? [{ label: p.colorName, tone: 'neutral' as const }] : []),
        ...(p.hasBlueCut ? [{ label: t('Blue cut'), tone: 'info' as const }] : []),
        ...(p.isPolarized ? [{ label: t('Polarized'), tone: 'neutral' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = extra as OpticalProfile | undefined;
      if (!p) return [];
      const rows: Array<[string, string | undefined]> = [
        [t('Brand'), p.brand ?? undefined], [t('Model'), p.modelNumber ?? undefined], [t('Collection'), p.collectionName ?? undefined], [t('Rang'), p.colorName ?? undefined],
        [t('Size'), p.frameSizeMm ? `${p.frameSizeMm}□${p.bridgeSizeMm ?? '—'}-${p.templeLengthMm ?? '—'}` : undefined],
        [t('Shape'), pretty(p.frameShape)], [t('Material'), pretty(p.frameMaterial)],
        [t('Lens'), [p.lensIndex, p.lensMaterial, p.lensType].filter(Boolean).join(' · ') || undefined], [t('Coating'), p.lensCoatings?.length ? p.lensCoatings.join(', ') : undefined],
        [t('Contact lens'), p.isContactLens ? [p.clDuration, p.clBaseCurve && `BC ${p.clBaseCurve}`, p.clDiameter && `DIA ${p.clDiameter}`, p.clForAstigmatism && 'Toric'].filter(Boolean).join(' · ') : undefined],
        [t('Power range'), p.supportsMinSph != null || p.supportsMaxSph != null ? t('SPH {{value}} se {{value2}}{{value3}}', { value: p.supportsMinSph ?? '—', value2: p.supportsMaxSph ?? '—', value3: p.supportsMaxCyl != null ? t(' · CYL {{supportsMaxCyl}} tak', { supportsMaxCyl: p.supportsMaxCyl }) : '' }) : undefined],
        [t('Warranty'), p.warrantyMonths ? t('{{count}} mahine', { count: p.warrantyMonths }) : undefined],
      ];
      return rows.filter((r): r is [string, string] => !!r[1]);
    },
    tabs: [{
      id: 'notes', label: msg('Note'), icon: StickyNote, when: ({ extra }) => !!(extra as OpticalProfile | undefined)?.notes,
      render: ({ extra }) => <Card title={t('Note')}><Text size="sm" tone="secondary">{(extra as OpticalProfile)?.notes}</Text></Card>,
    }],
    stockChips: [1, 5, 10, 20],
  },
});
