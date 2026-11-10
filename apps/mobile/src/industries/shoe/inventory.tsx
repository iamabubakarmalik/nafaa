/**
 * Shoe products through the shared products list, editor and detail (web
 * ShoeProductWizardPage, ShoeProductDetailPage): who it is for, type,
 * article and season, the MRP on the box (Sale shows by itself below it), a
 * size x colour grid with a barcode per pair, fitting and material notes, and
 * a size grid on the detail with the sizes that ran out.
 */

import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Footprints, Grid3x3, ShieldCheck, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { SHOE_COLORS, SIZE_SYSTEMS, isAccessory, pairVariants, type SizeSystem } from '@nafaa/core/industries/shoe';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { queryClient } from '@/core/query/client';
import { Badge, Button, Card, Chip, ChipGroup, FormSection, Input, ListRow, MoneyInput, Row, Select, Switch, Text, useTheme } from '@/design';
import { variantsApi } from '@/modules/inventory/api/products';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { shoeProductsApi, type ShoeMeta, type SizeGrid } from './api';
import { GENDERS, META_KEY, SEASONS, SHOE_KINDS, SYSTEM_LABEL, genderLabel, opt, typeLabel } from './meta';

export interface ShoeExtra {
  gender: string; categoryType: string; modelCode: string; modelName: string; season: string; colorName: string; sizeSystem: SizeSystem; mrp: number | null;
  upperMaterial: string; soleMaterial: string; closureType: string; heelHeight: string; runsLarge: boolean; runsSmall: boolean; sizingNotes: string;
  isWaterproof: boolean; isOrthopedic: boolean; isHandmade: boolean; includesBox: boolean; warrantyMonths: number; careInstructions: string;
  isNewArrival: boolean; isBestSeller: boolean; isBridal: boolean; isEidSpecial: boolean;
  /** Size and colour behind each variant name made by the grid. */
  variantMeta: Record<string, { size?: string; color?: string; hex?: string }>;
}

const initial: ShoeExtra = {
  gender: 'MEN', categoryType: 'OTHER', modelCode: '', modelName: '', season: '', colorName: '', sizeSystem: 'UK', mrp: null,
  upperMaterial: '', soleMaterial: '', closureType: '', heelHeight: '', runsLarge: false, runsSmall: false, sizingNotes: '',
  isWaterproof: false, isOrthopedic: false, isHandmade: false, includesBox: true, warrantyMonths: 0, careInstructions: '',
  isNewArrival: true, isBestSeller: false, isBridal: false, isEidSpecial: false, variantMeta: {},
};

function Identity({ ctx }: { ctx: StepContext<ShoeExtra> }) {
  const x = ctx.draft.extra;
  // The shoe type comes from the shop category's kind (nearest parent); the editor shows no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, x.categoryType, (categoryType) => {
    ctx.setExtra({ categoryType, ...(categoryType === 'BRIDAL_SHOES' ? { isBridal: true } : {}) });
    if (isAccessory(categoryType) && ctx.draft.core.unit === 'pair') ctx.setCore({ unit: 'pcs' });
  });
  return (
    <FormSection title={t('Joota')}>
      <Text size="sm" weight="semibold" tone="secondary">{t('Kis ke liye')}</Text>
      <ChipGroup wrap value={x.gender} onChange={(gender) => ctx.setExtra({ gender })} options={GENDERS.map((g) => ({ value: g.value, label: t(g.label) }))} />
      <Input label={t('Article number')} value={x.modelCode} onChangeText={(modelCode) => ctx.setExtra({ modelCode })} placeholder={t('Jaise 821-4567')} maxLength={40} ltr hint={t('Dabbe par company ka article — search aur barcode me kaam aata hai')} />
      <Input label={t('Season / collection')} value={x.season} onChangeText={(season) => ctx.setExtra({ season })} placeholder={t('Summer, Winter, Eid…')} maxLength={40} hint={t('Season khatam ho to MRP se kam rate rakh kar Sale lagayein')} />
      <ChipGroup wrap value={x.season} onChange={(season) => ctx.setExtra({ season })} options={SEASONS.map((s) => ({ value: s, label: s }))} />
      <Input label={t('Rang (sirf ek rang ho to)')} value={x.colorName} onChangeText={(colorName) => ctx.setExtra({ colorName })} placeholder="Black" maxLength={30} hint={t('Kai rang hain to Stock step me size × rang chunein')} />
    </FormSection>
  );
}

function Mrp({ ctx }: { ctx: StepContext<ShoeExtra> }) {
  const x = ctx.draft.extra;
  const price = ctx.draft.core.price;
  const off = x.mrp && price > 0 && x.mrp > price ? Math.round(((x.mrp - price) / x.mrp) * 100) : 0;
  return (
    <FormSection title={t('MRP (dabbe par likhi qeemat)')} description={t('MRP se kam rate rakhein to Sale ka nishan khud lagta hai')}>
      <MoneyInput label={t('MRP')} value={x.mrp} onChangeValue={(mrp) => ctx.setExtra({ mrp })} />
      {off > 0 && <Badge tone="danger">{t('Sale {{off}}%', { off })}</Badge>}
      {!!x.mrp && price > x.mrp && <Text size="sm" tone="warning">{t('Rate MRP se zyada hai — check karein')}</Text>}
    </FormSection>
  );
}

function SizeGridMaker({ ctx }: { ctx: StepContext<ShoeExtra> }) {
  const c = ctx.draft.core;
  const x = ctx.draft.extra;
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [each, setEach] = useState('');
  const [barcodes, setBarcodes] = useState(true);
  if (isAccessory(x.categoryType)) return null;
  const sys = SIZE_SYSTEMS.find((s) => s.value === x.sizeSystem) ?? SIZE_SYSTEMS[0];
  const base = (x.modelCode || c.sku || c.name.replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'SH').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const prefix = x.sizeSystem === 'UK' ? 'PK' : x.sizeSystem;
  const picked = SHOE_COLORS.filter(([n]) => colors.includes(n));
  const combos = pairVariants(base, sizes, picked, c.variants.map((v) => v.name), barcodes, prefix);
  const make = () => {
    const meta = { ...x.variantMeta };
    const stock = ctx.isEdit ? 0 : Number(each) || 0;
    const added = combos.map((v) => {
      meta[v.name] = { size: v.size, color: v.color, hex: v.hex };
      return { name: v.name, sku: v.sku, barcode: v.barcode, colorHex: v.hex ?? '', price: null, costPrice: null, stock, isActive: true };
    });
    ctx.setCore({ variants: [...c.variants, ...added] });
    ctx.setExtra({ variantMeta: meta });
    setSizes([]); setColors([]);
  };
  return (
    <FormSection title={t('Size × rang')} description={t('Size (aur rang) chunein — har jor ka apna barcode aur joron ka stock ban jayega')}>
      <ChipGroup value={x.sizeSystem} onChange={(sizeSystem) => { ctx.setExtra({ sizeSystem: sizeSystem as SizeSystem }); setSizes([]); }} options={SIZE_SYSTEMS.map((s) => ({ value: s.value, label: t(SYSTEM_LABEL[s.value]) }))} />
      <ChipGroup multiple wrap value={sizes} onChange={setSizes} options={[...new Set([...sys.sizes, ...sizes])].map((s) => ({ value: s, label: s }))} />
      <Row gap={2}>
        <Button size="sm" variant="soft" onPress={() => setSizes([...sys.sizes])}>{t('Sab')}</Button>
        <Input containerStyle={{ flex: 1 }} size="sm" value={custom} onChangeText={setCustom} placeholder={t('Apna size + Enter')} returnKeyType="done" maxLength={8}
          onSubmitEditing={() => { if (custom.trim()) { setSizes([...new Set([...sizes, custom.trim()])]); setCustom(''); } }} />
      </Row>
      <ChipGroup multiple wrap value={colors} onChange={setColors} options={SHOE_COLORS.map(([n]) => ({ value: n, label: n }))} />
      {!ctx.isEdit && <Input label={t('Har size ke joray')} value={each} onChangeText={(v) => setEach(v.replace(/\D/g, ''))} keyboardType="number-pad" placeholder="0" />}
      <Switch value={barcodes} onChange={setBarcodes} label={t('Har jore ka barcode banayein')} />
      <Button icon={Grid3x3} disabled={!combos.length} onPress={make}>{combos.length ? t('{{count}} size banayein', { count: combos.length }) : t('Size chunein')}</Button>
    </FormSection>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pair', label: msg('Jora') }, { value: 'pcs', label: msg('Piece') }, { value: 'box', label: msg('Dabba') }],
  skuPrefix: 'SH', packs: true, variants: { presets: [{ group: msg('Size'), values: ['6', '7', '8', '9', '10'] }] }, markups: [30, 40, 50, 60, 80, 100],
};

const details: StepDef<ShoeExtra> = {
  id: 'shoe', title: msg('Fitting'), icon: Footprints,
  validate: (d): Record<string, string> => (d.extra.warrantyMonths < 0 || d.extra.warrantyMonths > 60 ? { warrantyMonths: t('Warranty 0 se 60 mahine') } : {}),
  render: (ctx) => {
    const x = ctx.draft.extra;
    const text = (k: 'upperMaterial' | 'soleMaterial' | 'closureType' | 'heelHeight' | 'sizingNotes' | 'careInstructions', label: string, ph: string, max = 60) => (
      <Input label={label} value={x[k]} onChangeText={(v) => ctx.setExtra({ [k]: v } as Partial<ShoeExtra>)} placeholder={ph} maxLength={max} />
    );
    return (
      <>
        <FormSection title={t('Nishan')} description={t('Card aur POS par dikhte hain')}>
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            <Chip label={t('Naya maal')} icon={Sparkles} selected={x.isNewArrival} onPress={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })} />
            <Chip label={t('Best seller')} selected={x.isBestSeller} onPress={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })} />
            <Chip label={t('Bridal')} selected={x.isBridal} onPress={() => ctx.setExtra({ isBridal: !x.isBridal })} />
            <Chip label={t('Eid')} selected={x.isEidSpecial} onPress={() => ctx.setExtra({ isEidSpecial: !x.isEidSpecial })} />
          </Row>
        </FormSection>
        <FormSection title={t('Fitting')} description={t('Customer ko sahi size batane ke liye')}>
          <Switch value={x.runsSmall} onChange={(v) => ctx.setExtra({ runsSmall: v, ...(v ? { runsLarge: false } : {}) })} label={t('Chhota aata hai')} description={t('Customer ko ek size bara dein')} />
          <Switch value={x.runsLarge} onChange={(v) => ctx.setExtra({ runsLarge: v, ...(v ? { runsSmall: false } : {}) })} label={t('Bara aata hai')} description={t('Customer ko ek size chhota dein')} />
          {text('sizingNotes', t('Fitting ki baat'), t('Jaise: paon chaura ho to ek size bara'), 200)}
        </FormSection>
        <FormSection title={t('Material aur warranty')}>
          {text('upperMaterial', t('Upar ka material'), t('Leather, synthetic, mesh'))}
          {text('soleMaterial', t('Sole'), t('Rubber, PU, TPR'))}
          {text('closureType', t('Band karne ka tareeqa'), t('Tasme, velcro, slip-on'))}
          {text('heelHeight', t('Heel'), t('2 inch'))}
          <Input label={t('Warranty (mahine)')} value={x.warrantyMonths ? String(x.warrantyMonths) : ''} keyboardType="number-pad" placeholder="0" error={ctx.errors.warrantyMonths}
            onChangeText={(v) => ctx.setExtra({ warrantyMonths: Number(v.replace(/\D/g, '')) || 0 })} />
          {text('careInstructions', t('Dekh bhaal'), t('Geela na karein, polish karein'), 200)}
          <Switch value={x.includesBox} onChange={(v) => ctx.setExtra({ includesBox: v })} label={t('Dabba saath')} />
          <Switch value={x.isWaterproof} onChange={(v) => ctx.setExtra({ isWaterproof: v })} label={t('Paani se bachao')} />
          <Switch value={x.isOrthopedic} onChange={(v) => ctx.setExtra({ isOrthopedic: v })} label={t('Medicated / soft')} />
          <Switch value={x.isHandmade} onChange={(v) => ctx.setExtra({ isHandmade: v })} label={t('Haath ka bana')} />
        </FormSection>
      </>
    );
  },
};

/** "PK 8 / Black" -> size 8, colour Black when the grid did not make it. */
function splitName(name: string): { size?: string; color?: string } {
  const [a, b] = name.split('/').map((s) => s.trim());
  return { size: a.replace(/^(PK|UK|US|EU|KIDS)\s+/i, '') || undefined, color: b || undefined };
}

const editor: EditorConfig<ShoeExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await shoeProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      return {
        gender: p.gender ?? 'UNISEX', categoryType: p.categoryType ?? 'OTHER', modelCode: p.modelCode ?? '', modelName: p.modelName ?? '', season: p.season ?? '', colorName: p.colorName ?? '',
        sizeSystem: (SIZE_SYSTEMS.some((s) => s.value === p.sizeSystem) ? p.sizeSystem : 'UK') as SizeSystem, mrp: p.mrp ?? null, upperMaterial: p.upperMaterial ?? '', soleMaterial: p.soleMaterial ?? '',
        closureType: p.closureType ?? '', heelHeight: p.heelHeight ?? '', runsLarge: p.runsLarge, runsSmall: p.runsSmall, sizingNotes: p.sizingNotes ?? '', isWaterproof: p.isWaterproof,
        isOrthopedic: p.isOrthopedic, isHandmade: p.isHandmade, includesBox: p.includesBox, warrantyMonths: p.warrantyMonths ?? 0, careInstructions: p.careInstructions ?? '',
        isNewArrival: p.isNewArrival, isBestSeller: p.isBestSeller, isBridal: p.isBridal, isEidSpecial: p.isEidSpecial,
      };
    },
    save: async (productId, d) => {
      const x = d.extra;
      await shoeProductsApi.upsert({
        productId, gender: x.gender, categoryType: x.categoryType, modelCode: opt(x.modelCode), modelName: opt(x.modelName), season: opt(x.season), colorName: opt(x.colorName),
        sizeSystem: x.sizeSystem, mrp: x.mrp ?? undefined, upperMaterial: opt(x.upperMaterial), soleMaterial: opt(x.soleMaterial), closureType: opt(x.closureType), heelHeight: opt(x.heelHeight),
        runsLarge: x.runsLarge, runsSmall: x.runsSmall, sizingNotes: opt(x.sizingNotes), isWaterproof: x.isWaterproof, isOrthopedic: x.isOrthopedic, isHandmade: x.isHandmade,
        includesBox: x.includesBox, warrantyMonths: x.warrantyMonths, careInstructions: opt(x.careInstructions), isNewArrival: x.isNewArrival, isBestSeller: x.isBestSeller,
        isBridal: x.isBridal, isEidSpecial: x.isEidSpecial, isFeatured: d.core.isFeatured,
      });
      if (d.core.variants.length) {
        const saved = await variantsApi.list(productId);
        const items = saved.map((v) => {
          const m = x.variantMeta[v.name] ?? splitName(v.name);
          return { variantId: v.id, size: m.size, color: m.color ?? (x.colorName || undefined), colorHex: (m as { hex?: string }).hex ?? v.colorHex ?? undefined };
        });
        if (items.length) await shoeProductsApi.saveVariantSizes(productId, items);
      }
      void queryClient.invalidateQueries({ queryKey: [META_KEY] });
    },
  },
  steps: [
    basicStep<ShoeExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: msg('Jaise: Bata Loafer Brown 8231') }),
    priceStep<ShoeExtra>(core, { extra: (ctx) => <Mrp ctx={ctx} /> }),
    stockStep<ShoeExtra>(core, { extra: (ctx) => <SizeGridMaker ctx={ctx} />, quick: [1, 2, 3, 6, 12] }),
    details,
  ],
  summary: (d) => [
    [t('Maal'), [genderLabel(d.extra.gender), typeLabel(d.extra.categoryType)].filter((v) => v !== '—').join(' · ')],
    ...(d.core.variants.length ? [[t('Size / rang'), String(d.core.variants.length)] as [string, string]] : []),
    ...(d.extra.mrp && d.core.price > 0 && d.extra.mrp > d.core.price ? [[t('Sale'), `${Math.round(((d.extra.mrp - d.core.price) / d.extra.mrp) * 100)}%`] as [string, string]] : []),
  ],
};

interface DetailExtra { profile: Awaited<ReturnType<typeof shoeProductsApi.byProduct>>; grid: SizeGrid | null }

function SizeTable({ grid }: { grid: SizeGrid }) {
  const th = useTheme();
  const tone = (v: { stock: number; lowStockAlert: number }) => (v.stock <= 0 ? 'danger' : v.stock <= v.lowStockAlert ? 'warning' : 'success');
  const colors = grid.colors.length ? grid.colors : [''];
  const matrix = grid.sizes.length > 0 && grid.variants.every((v) => v.size);
  if (!matrix) {
    return (
      <Card flush title={t('Size / rang')}>
        {grid.variants.map((v, i) => <ListRow key={v.id} dense divider={i < grid.variants.length - 1} title={v.name} subtitle={v.barcode ?? undefined} trailing={<Text weight="bold" tone={tone(v)} ltr>{v.stock}</Text>} />)}
      </Card>
    );
  }
  return (
    <Card title={t('Size × rang — stock')}>
      <View style={{ gap: th.space(2) }}>
        <Row gap={2}><Text size="xs" weight="bold" style={{ width: 56 }}>{t('Size')}</Text>{colors.map((c) => <Text key={c} size="xs" weight="bold" style={{ flex: 1 }} align="center" numberOfLines={1}>{c || t('Stock')}</Text>)}</Row>
        {grid.sizes.map((s) => (
          <Row key={s} gap={2} style={{ alignItems: 'center' }}>
            <Text weight="bold" style={{ width: 56 }}>{s}</Text>
            {colors.map((c) => {
              const v = grid.variants.find((x) => (x.size ?? '') === s && (x.colorName ?? '') === c);
              if (!v) return <Text key={c} tone="muted" align="center" style={{ flex: 1 }}>—</Text>;
              const tn = th.colors[tone(v)];
              return <View key={c} style={{ flex: 1, alignItems: 'center', backgroundColor: tn.soft, borderRadius: th.radius('md'), paddingVertical: 6 }}><Text weight="bold" ltr style={{ color: tn.text }}>{v.stock}</Text></View>;
            })}
          </Row>
        ))}
      </View>
    </Card>
  );
}

registerInventoryIndustry({
  id: 'shoe',
  label: msg('Shoes'),
  categoryKinds: SHOE_KINDS,
  list: {
    noun: 'joota',
    filters: ['tags'],
    extras: (item) => {
      const m = (queryClient.getQueryData([META_KEY]) as { items: ShoeMeta[] } | undefined)?.items.find((s) => s.productId === item.id);
      if (!m) return {};
      return {
        badges: [...(m.onSale ? [{ label: t('Sale {{offPct}}%', { offPct: m.offPct }), tone: 'danger' as const }] : []), ...(m.isNewArrival ? [{ label: t('Naya'), tone: 'info' as const }] : []), ...(m.isBridal ? [{ label: t('Bridal'), tone: 'accent' as const }] : [])],
        line: [m.onSale && m.mrp ? t('MRP {{mrp}}', { mrp: formatMoney(m.mrp) }) : null, genderLabel(m.gender) !== '—' ? genderLabel(m.gender) : null, m.categoryType ? typeLabel(m.categoryType) : null, m.modelCode].filter(Boolean).join(' · ') || undefined,
      };
    },
    guide: [{ icon: BadgePercent, title: msg('MRP aur Sale'), text: msg('MRP likhein aur rate us se kam rakhein — Sale ka nishan khud lag jata hai.') }],
  },
  editor,
  detail: {
    extra: {
      key: 'shoe-product-detail',
      load: async (id): Promise<DetailExtra> => {
        const [profile, grid] = await Promise.all([shoeProductsApi.byProduct(id).catch(() => null), shoeProductsApi.sizeGrid(id).catch(() => null)]);
        return { profile, grid };
      },
    },
    badges: ({ extra, product }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      const off = p.mrp && product.price > 0 && p.mrp > product.price ? Math.round(((p.mrp - product.price) / p.mrp) * 100) : 0;
      return [
        ...(off ? [{ label: t('Sale {{off}}%', { off }), tone: 'danger' as const }] : []), ...(p.isNewArrival ? [{ label: t('Naya maal'), tone: 'info' as const }] : []),
        ...(p.isBridal ? [{ label: t('Bridal'), tone: 'accent' as const }] : []), ...(p.isBestSeller ? [{ label: t('Best seller'), tone: 'success' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      return ([
        [t('Kis ke liye'), genderLabel(p.gender)], [t('Type'), typeLabel(p.categoryType)], ...(p.modelCode ? [[t('Article'), p.modelCode]] : []), ...(p.season ? [[t('Season'), p.season]] : []),
        ...(p.mrp ? [[t('MRP'), formatMoney(p.mrp)]] : []), ...(p.upperMaterial ? [[t('Upar ka material'), p.upperMaterial]] : []), ...(p.soleMaterial ? [[t('Sole'), p.soleMaterial]] : []),
        ...(p.warrantyMonths ? [[t('Warranty'), t('{{n}} mahine', { n: p.warrantyMonths })]] : []),
        ...(p.runsSmall ? [[t('Fitting'), t('Chhota aata hai')]] : p.runsLarge ? [[t('Fitting'), t('Bara aata hai')]] : []),
      ] as Array<[string, string]>).filter(([, v]) => v && v !== '—');
    },
    alerts: ({ extra }) => {
      const grid = (extra as DetailExtra | undefined)?.grid;
      const gone = grid?.variants.filter((v) => v.isActive && v.stock <= 0 && v.sold30 > 0) ?? [];
      if (!gone.length) return null;
      return <Card tone="warning"><Text size="sm">{t('{{count}} size khatam hain jo bik rahe the: {{list}}', { count: gone.length, list: gone.slice(0, 6).map((v) => v.name).join(', ') })}</Text></Card>;
    },
    tabs: [{ id: 'sizes', label: msg('Size grid'), icon: ShieldCheck, when: ({ extra }) => !!(extra as DetailExtra | undefined)?.grid?.variants.length, render: ({ extra }) => <SizeTable grid={(extra as DetailExtra).grid!} /> }],
    stockChips: [1, 2, 3, 6, 12],
  },
});
