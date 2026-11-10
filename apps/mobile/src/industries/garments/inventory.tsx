/**
 * Garment products through the shared products list, editor and detail (web
 * GarmentProductWizardPage, GarmentProductDetailPage): who it is for, type,
 * season and collection, ready-made / stitched / unstitched fabric, and a
 * size x colour grid that makes every variant with its barcode and opening
 * stock. Size and colour of each variant are saved with it so the size grid,
 * reorder and counter filters can read them.
 */

import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Grid3x3, Shirt, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { GARMENT_COLORS, SIZE_SETS, gridVariants, splitVariantName, type GridVariant } from '@nafaa/core/industries/garments';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import { Button, Card, Chip, ChipGroup, FormSection, Input, ListRow, Row, Select, Switch, Text, useTheme } from '@/design';
import { Tiles } from '@/modules/inventory/components/fields';
import { variantsApi } from '@/modules/inventory/api/products';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { collectionsApi, garmentProductsApi, sizeChartsApi, type GarmentMeta, type SizeGrid } from './api';
import { COLLECTION_KEY, FABRICS, GENDERS, META_KEY, SEASONS, SIZE_CHART_KEY, WORK_TYPES, fabricLabel, garmentLabel, genderLabel, opt, seasonLabel } from './meta';

type Kind = 'ready' | 'stitched' | 'fabric';

export interface GarmentExtra {
  gender: string; categoryType: string; season: string; collectionId: string; sizeChartId: string; fabricType: string; workType: string; styleCode: string;
  careInstructions: string; kind: Kind; allowAlteration: boolean; allowReservation: boolean; allowLayaway: boolean; isNewArrival: boolean; isBestSeller: boolean; isOnSale: boolean;
  /** Size and colour behind each variant name made by the grid. */
  variantMeta: Record<string, { size?: string; color?: string; hex?: string }>;
}

const initial: GarmentExtra = {
  gender: 'MEN', categoryType: 'OTHER', season: 'ALL_SEASON', collectionId: '', sizeChartId: '', fabricType: '', workType: 'PLAIN', styleCode: '', careInstructions: '',
  kind: 'ready', allowAlteration: true, allowReservation: true, allowLayaway: false, isNewArrival: true, isBestSeller: false, isOnSale: false, variantMeta: {},
};

const SET_LABEL: Record<string, string> = { letters: msg('S-M-L'), numbers: msg('Number'), desi: msg('Desi'), kids: msg('Bachay'), free: msg('Free size') };
const KINDS: Array<{ value: Kind; label: string }> = [
  { value: 'ready', label: msg('Ready-made') }, { value: 'stitched', label: msg('Silai bhi hoti hai') }, { value: 'fabric', label: msg('Unstitched kapra') },
];

function Identity({ ctx }: { ctx: StepContext<GarmentExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const collections = useQuery({ queryKey: [COLLECTION_KEY, 'list'], queryFn: () => collectionsApi.list(), staleTime: 60_000, enabled: ctx.online });
  const charts = useQuery({ queryKey: [SIZE_CHART_KEY], queryFn: () => sizeChartsApi.list(), staleTime: 60_000, enabled: ctx.online });
  const setKind = (kind: Kind) => {
    ctx.setExtra({ kind, ...(kind === 'fabric' ? { categoryType: 'FABRIC', allowAlteration: false } : {}) });
    if (kind === 'fabric' && !['meter', 'yard', 'suit'].includes(ctx.draft.core.unit)) ctx.setCore({ unit: 'meter' });
  };
  return (
    <FormSection title={t('Garment')}>
      <Text size="sm" weight="semibold" tone="secondary">{t('Maal kis tarah ka hai')}</Text>
      <Tiles value={x.kind} onChange={setKind} options={KINDS.map((k) => ({ value: k.value, label: t(k.label) }))} />
      <Text size="sm" weight="semibold" tone="secondary">{t('Kis ke liye')}</Text>
      <ChipGroup wrap value={x.gender} onChange={(gender) => ctx.setExtra({ gender })} options={GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))} />
      <View style={{ gap: th.space(3) }}>
        <Select label={t('Season')} value={x.season} onChange={(season) => ctx.setExtra({ season })} options={SEASONS.map((s) => ({ value: s.value, label: t(s.label) }))} />
        <Select label={t('Collection')} value={x.collectionId} onChange={(collectionId) => ctx.setExtra({ collectionId })} placeholder={t('— Koi nahi —')}
          options={[{ value: '', label: t('— Koi nahi —') }, ...(collections.data ?? []).filter((c) => c.isActive || c.id === x.collectionId).map((c) => ({ value: c.id, label: c.name }))]} />
        <Select label={t('Kapra')} value={x.fabricType} onChange={(fabricType) => ctx.setExtra({ fabricType })} options={[{ value: '', label: '—' }, ...FABRICS.map((f) => ({ value: f, label: fabricLabel(f) }))]} />
        {x.kind !== 'fabric' && (
          <Select label={t('Size chart')} value={x.sizeChartId} onChange={(sizeChartId) => ctx.setExtra({ sizeChartId })} placeholder={t('— Koi nahi —')}
            options={[{ value: '', label: t('— Koi nahi —') }, ...(charts.data ?? []).filter((c) => c.isActive || c.id === x.sizeChartId).map((c) => ({ value: c.id, label: c.name }))]} />
        )}
        <Input label={t('Design / article code')} value={x.styleCode} onChangeText={(styleCode) => ctx.setExtra({ styleCode })} placeholder="LS-2401" maxLength={40} ltr
          hint={t('Company ka article number — search me milta hai')} />
      </View>
    </FormSection>
  );
}

/** Size x colour grid: pick sizes and colours, make every pair as a variant. */
function SizeGridMaker({ ctx }: { ctx: StepContext<GarmentExtra> }) {
  const th = useTheme();
  const c = ctx.draft.core;
  const [set, setSet] = useState(0);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [each, setEach] = useState('');
  const [barcodes, setBarcodes] = useState(true);
  const picked = GARMENT_COLORS.filter(([n]) => colors.includes(n));
  const base = c.sku || c.name.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'GR';
  const combos = gridVariants(base, sizes, picked, c.variants.map((v) => v.name), barcodes);
  const make = () => {
    const meta = { ...ctx.draft.extra.variantMeta };
    const stock = ctx.isEdit ? 0 : Number(each) || 0;
    const added = combos.map((v: GridVariant) => {
      meta[v.name] = { size: v.size, color: v.color, hex: v.hex };
      return { name: v.name, sku: v.sku, barcode: v.barcode, colorHex: v.hex ?? '', price: null, costPrice: null, stock, isActive: true };
    });
    ctx.setCore({ variants: [...c.variants, ...added] });
    ctx.setExtra({ variantMeta: meta });
    setSizes([]); setColors([]);
  };
  return (
    <FormSection title={t('Size × rang')} description={t('Size aur rang chunein — har jor ka variant apne barcode aur stock ke saath ban jayega')}>
      <ChipGroup value={String(set)} onChange={(v) => setSet(Number(v))} options={SIZE_SETS.map((s, i) => ({ value: String(i), label: t(SET_LABEL[s.key]) }))} />
      <ChipGroup multiple wrap value={sizes} onChange={setSizes} options={[...new Set([...SIZE_SETS[set].values, ...sizes])].map((s) => ({ value: s, label: s }))} />
      <Input value={custom} onChangeText={setCustom} placeholder={t('Apna size + Enter')} returnKeyType="done" onSubmitEditing={() => { if (custom.trim()) { setSizes([...sizes, custom.trim()]); setCustom(''); } }} />
      <ChipGroup multiple wrap value={colors} onChange={setColors} options={GARMENT_COLORS.map(([n]) => ({ value: n, label: n }))} />
      {!ctx.isEdit && <Input label={t('Har variant ka stock')} value={each} onChangeText={(v) => setEach(v.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder="0" />}
      <Switch value={barcodes} onChange={setBarcodes} label={t('Har variant ka barcode banayein')} />
      <Button icon={Grid3x3} disabled={!combos.length} onPress={make}>{combos.length ? t('{{count}} variant banayein', { count: combos.length }) : t('Size ya rang chunein')}</Button>
      <Text size="xs" tone="muted" style={{ marginTop: th.space(1) }}>{t('Neeche ki table me har variant ka rate, stock aur barcode badal sakte hain. Barcode label "Barcode labels" se print karein.')}</Text>
    </FormSection>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Piece') }, { value: 'suit', label: msg('Suit') }, { value: 'set', label: msg('Set') }, { value: 'pair', label: msg('Jora') }, { value: 'meter', label: msg('Meter') }, { value: 'yard', label: msg('Yard') }],
  skuPrefix: 'GR', packs: true, variants: { presets: [{ group: msg('Size'), values: ['S', 'M', 'L', 'XL'] }] }, markups: [30, 40, 50, 60, 80, 100],
};

const flags: StepDef<GarmentExtra> = {
  id: 'garment', title: msg('Garment'), icon: Shirt,
  render: (ctx) => {
    const x = ctx.draft.extra;
    return (
      <>
        <FormSection title={t('Nishan')} description={t('Card aur POS par dikhte hain')}>
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            <Chip label={t('Naya maal')} icon={Sparkles} selected={x.isNewArrival} onPress={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })} />
            <Chip label={t('Best seller')} selected={x.isBestSeller} onPress={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })} />
            <Chip label={t('Sale')} icon={BadgePercent} selected={x.isOnSale} onPress={() => ctx.setExtra({ isOnSale: !x.isOnSale })} />
          </Row>
        </FormSection>
        <FormSection title={t('Is maal par kya ho sakta hai')}>
          <Switch value={x.allowAlteration} onChange={(v) => ctx.setExtra({ allowAlteration: v })} label={t('Alteration')} description={t('Lambai, fitting')} />
          <Switch value={x.allowReservation} onChange={(v) => ctx.setExtra({ allowReservation: v })} label={t('Hold')} description={t('Customer ke liye rakhna')} />
          <Switch value={x.allowLayaway} onChange={(v) => ctx.setExtra({ allowLayaway: v })} label={t('Qist')} description={t('Qiston me bechna')} />
        </FormSection>
        <FormSection title={t('Kaam aur dhulai')}>
          <Select label={t('Kaam')} value={x.workType} onChange={(workType) => ctx.setExtra({ workType })} options={WORK_TYPES.map((w) => ({ value: w, label: w.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (ch) => ch.toUpperCase()) }))} />
          <Input label={t('Dhulai ki hidayat')} value={x.careInstructions} onChangeText={(careInstructions) => ctx.setExtra({ careInstructions })} placeholder={t('Thande paani me, ulta istri')} maxLength={300} />
        </FormSection>
      </>
    );
  },
};

const editor: EditorConfig<GarmentExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await garmentProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        gender: p.gender ?? '', categoryType: p.categoryType ?? 'OTHER', season: p.season ?? 'ALL_SEASON', collectionId: p.collectionId ?? '', sizeChartId: p.sizeChartId ?? '',
        fabricType: p.fabricType ?? '', workType: p.workType ?? 'PLAIN', styleCode: p.styleCode ?? '', careInstructions: p.careInstructions ?? '',
        kind: p.isFabricOnly ? 'fabric' : p.isStitchable ? 'stitched' : 'ready', allowAlteration: p.allowAlteration, allowReservation: p.allowReservation, allowLayaway: p.allowLayaway,
        isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isOnSale: p.isOnSale,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await garmentProductsApi.upsert({
        productId, gender: x.gender || undefined, categoryType: x.categoryType || undefined, season: x.season, collectionId: x.collectionId || undefined, sizeChartId: x.sizeChartId || undefined,
        fabricType: x.fabricType || undefined, workType: x.workType, styleCode: opt(x.styleCode), careInstructions: opt(x.careInstructions),
        isReadyMade: x.kind !== 'fabric', isStitchable: x.kind !== 'ready', isFabricOnly: x.kind === 'fabric',
        allowAlteration: x.allowAlteration, allowReservation: x.allowReservation, allowLayaway: x.allowLayaway,
        isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller, isOnSale: x.isOnSale, isFeatured: d.core.isFeatured,
      });
      if (d.core.variants.length) {
        const saved = await variantsApi.list(productId);
        const items = saved.map((v, i) => {
          const m = x.variantMeta[v.name] ?? splitVariantName(v.name);
          const hex = (m as { hex?: string }).hex ?? v.colorHex ?? undefined;
          return { variantId: v.id, size: m.size, colorName: m.color, colorHex: hex || undefined, displayOrder: i };
        });
        if (items.length) await garmentProductsApi.saveVariantProfiles(productId, items);
      }
      void queryClient.invalidateQueries({ queryKey: [META_KEY] });
    },
  },
  steps: [
    basicStep<GarmentExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: msg('Jaise: Gul Ahmed Lawn 3pc — LS-2401') }),
    priceStep<GarmentExtra>(core),
    stockStep<GarmentExtra>(core, { extra: (ctx) => <SizeGridMaker ctx={ctx} />, quick: [1, 3, 6, 12, 24, 50] }),
    flags,
  ],
  summary: (d) => [
    [t('Maal'), [genderLabel(d.extra.gender), garmentLabel(d.extra.categoryType), seasonLabel(d.extra.season)].filter((v) => v !== '—').join(' · ')],
    ...(d.core.variants.length ? [[t('Size / rang'), String(d.core.variants.length)] as [string, string]] : []),
    ...(d.extra.isOnSale ? [[t('Sale'), t('Sale par')] as [string, string]] : []),
  ],
};

interface DetailExtra { profile: Awaited<ReturnType<typeof garmentProductsApi.byProduct>>; grid: SizeGrid | null }

/** Size rows x colour columns; a plain list when variants carry no size/colour. */
function GridTable({ grid }: { grid: SizeGrid }) {
  const th = useTheme();
  const cell = (s: string, c: string) => grid.variants.find((v) => (v.size ?? '') === s && (v.colorName ?? '') === c);
  const matrix = grid.sizes.length > 0 && grid.variants.every((v) => v.size);
  const tone = (v: { stock: number; lowStockAlert: number }) => (v.stock <= 0 ? 'danger' : v.stock <= v.lowStockAlert ? 'warning' : 'success');
  if (!matrix) {
    return (
      <Card flush title={t('Size / rang')}>
        {grid.variants.map((v, i) => (
          <ListRow key={v.id} dense divider={i < grid.variants.length - 1} title={v.name} subtitle={v.barcode ?? undefined}
            trailing={<Text weight="bold" tone={tone(v)} ltr>{v.stock}{v.reserved > 0 ? ` · ${t('{{reserved}} hold', { reserved: v.reserved })}` : ''}</Text>} />
        ))}
      </Card>
    );
  }
  const colors = grid.colors.length ? grid.colors : [''];
  return (
    <Card title={t('Size × rang — stock')}>
      <View style={{ gap: th.space(2) }}>
        <Row gap={2}>
          <Text size="xs" weight="bold" style={{ width: 56 }}>{t('Size')}</Text>
          {colors.map((c) => <Text key={c} size="xs" weight="bold" style={{ flex: 1 }} align="center" numberOfLines={1}>{c || t('Stock')}</Text>)}
        </Row>
        {grid.sizes.map((s) => (
          <Row key={s} gap={2} style={{ alignItems: 'center' }}>
            <Text weight="bold" style={{ width: 56 }}>{s}</Text>
            {colors.map((c) => {
              const v = cell(s, c);
              if (!v) return <Text key={c} tone="muted" align="center" style={{ flex: 1 }}>—</Text>;
              const tn = th.colors[tone(v)];
              return (
                <View key={c} style={{ flex: 1, alignItems: 'center', backgroundColor: tn.soft, borderRadius: th.radius('md'), paddingVertical: 6 }}>
                  <Text weight="bold" ltr style={{ color: tn.text }}>{v.stock}</Text>
                  {v.reserved > 0 ? <Text size="2xs" tone="muted">{t('{{reserved}} hold', { reserved: v.reserved })}</Text> : null}
                </View>
              );
            })}
          </Row>
        ))}
      </View>
    </Card>
  );
}

registerInventoryIndustry({
  id: 'garments',
  label: msg('Garments'),
  list: {
    noun: 'kapra',
    filters: ['tags'],
    extras: (item) => {
      const g = (queryClient.getQueryData([META_KEY]) as { items: GarmentMeta[] } | undefined)?.items.find((m) => m.productId === item.id);
      if (!g) return {};
      return {
        badges: [...(g.isOnSale ? [{ label: t('Sale'), tone: 'danger' as const }] : []), ...(g.isNewArrival ? [{ label: t('Naya'), tone: 'info' as const }] : [])],
        line: [genderLabel(g.gender) !== '—' ? genderLabel(g.gender) : null, g.categoryType && g.categoryType !== 'FABRIC' ? garmentLabel(g.categoryType) : null, g.styleCode].filter(Boolean).join(' · ') || undefined,
      };
    },
    guide: [{ icon: Grid3x3, title: msg('Size × rang'), text: msg('Stock step me size aur rang chun kar "variant banayein" — har jor ka apna barcode, rate aur stock.') }],
  },
  editor,
  detail: {
    extra: {
      key: 'garments-product-detail',
      load: async (id): Promise<DetailExtra> => {
        const [profile, grid] = await Promise.all([garmentProductsApi.byProduct(id).catch(() => null), garmentProductsApi.sizeGrid(id).catch(() => null)]);
        return { profile, grid };
      },
    },
    badges: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      return [
        ...(p.isOnSale ? [{ label: t('Sale'), tone: 'danger' as const }] : []),
        ...(p.isNewArrival ? [{ label: t('Naya maal'), tone: 'info' as const }] : []),
        ...(p.isBestSeller ? [{ label: t('Best seller'), tone: 'success' as const }] : []),
        ...(p.isFabricOnly ? [{ label: t('Unstitched'), tone: 'neutral' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      return ([
        [t('Kis ke liye'), genderLabel(p.gender)], [t('Type'), garmentLabel(p.categoryType)], [t('Season'), seasonLabel(p.season)],
        ...(p.fabricType ? [[t('Kapra'), fabricLabel(p.fabricType)]] : []), ...(p.styleCode ? [[t('Article code'), p.styleCode]] : []),
      ] as Array<[string, string]>).filter(([, v]) => v && v !== '—');
    },
    alerts: ({ extra }) => {
      const grid = (extra as DetailExtra | undefined)?.grid;
      const empty = grid?.variants.filter((v) => v.isActive && v.stock <= 0 && v.sold30 > 0) ?? [];
      if (!empty.length) return null;
      return <Card tone="warning"><Text size="sm">{t('{{count}} size khatam hain jo bik rahe the: {{list}}', { count: empty.length, list: empty.slice(0, 6).map((v) => v.name).join(', ') })}</Text></Card>;
    },
    tabs: [{
      id: 'sizes', label: msg('Size grid'), icon: Grid3x3, when: ({ extra }) => !!(extra as DetailExtra | undefined)?.grid?.variants.length,
      render: ({ extra }) => <GridTable grid={(extra as DetailExtra).grid!} />,
    }],
    stockChips: [1, 3, 6, 12, 24],
  },
});
