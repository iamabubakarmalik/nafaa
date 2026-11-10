/**
 * Electronics products through the shared products list, editor and detail
 * (web ElectronicsProductEditor / Products / Detail): model, type, condition
 * and colour; specs that fit the type; warranty and box contents; and the
 * serial or IMEI of every unit (scan, paste or type) with the opening stock.
 */

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Barcode, Cpu, ScanLine, Shield, Sparkles, Wrench } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { BOX_CONTENT_OPTIONS, CATEGORY_GROUPS, CONDITION_TYPES, CONNECTIVITY_OPTIONS, SERIAL_SUGGESTED, WARRANTY_PRESETS, categoryTypeFromName, parseSerialLines, type CategoryType, type ConditionType } from '@nafaa/core/industries/electronics';
import { formatDate } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Badge, Button, Card, Chip, ChipGroup, Input, ListRow, Row, Select, Switch, Text, TextArea, useTheme } from '@/design';
import { categoriesApi } from '@/modules/inventory/api/taxonomy';
import { Tiles, NumberInput } from '@/modules/inventory/components/fields';
import { adjustmentsApi } from '@/modules/inventory/stock/api';
import { registerDeviceSource } from '@/modules/inventory/industry/devices';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { CameraScan } from '@/modules/pos/components/CameraScan';
import { electronicsProductsApi, serialTrackingApi, type ElectronicsSerial } from './api';
import { CATEGORY_LABEL, categoryEmoji, categoryLabel, conditionLabel, CONDITION_META, groupLabel, opt, refreshElectronics, SERIAL_KEYS, serialStatusOf, metaText } from './meta';
import './pos';

interface Serial { serialNumber: string; imei: string; imei2: string; macAddress: string }
export interface ElectronicsExtra {
  model: string; partNumber: string; categoryType: CategoryType; condition: ConditionType; colorName: string; mrp: number | null; isBestSeller: boolean; isNewArrival: boolean; isTrending: boolean;
  batteryCapacity: string; powerRating: string; connectivity: string[]; screenSize: string; resolution: string; refreshRate: string; waterResistance: string;
  warrantyMonths: number; warrantyType: string; international: boolean; boxContents: string[]; hasManual: boolean; hasWarrantyCard: boolean;
  tracked: boolean; hasImei: boolean; serials: Serial[]; serialsOnShelf: number;
}
const initial: ElectronicsExtra = {
  model: '', partNumber: '', categoryType: 'OTHER', condition: 'BRAND_NEW', colorName: '', mrp: null, isBestSeller: false, isNewArrival: true, isTrending: false,
  batteryCapacity: '', powerRating: '', connectivity: [], screenSize: '', resolution: '', refreshRate: '', waterResistance: '',
  warrantyMonths: 0, warrantyType: 'Shop Warranty', international: false, boxContents: [], hasManual: true, hasWarrantyCard: true, tracked: false, hasImei: false, serials: [], serialsOnShelf: 0,
};
const WARRANTY_TYPES: Array<[string, string]> = [['Manufacturer', msg('Company khud degi')], ['Local Dealer', msg('Pakistan ka dealer dega')], ['Shop Warranty', msg('Aap ki dukaan ki zimmedari')], ['Extended', msg('Alag se khareedi hui')], ['International', msg('Duniya bhar mein')]];
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const addMonths = (iso: string, months: number) => { if (!iso || !months) return undefined; const d = new Date(iso); d.setMonth(d.getMonth() + months); return d.toISOString().slice(0, 10); };

function Identity({ ctx }: { ctx: StepContext<ElectronicsExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const cats = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list(), staleTime: 5 * 60_000 });
  const catName = (cats.data ?? []).find((c) => c.id === ctx.draft.core.categoryId)?.name;
  // The product type follows the shop category's kind; the name hint only fills in when the category has no kind.
  const kind = useCategoryKindSync(ctx.draft.core.categoryId, x.categoryType, (k) => ctx.setExtra({ categoryType: k as CategoryType }));
  useEffect(() => {
    if (kind || !catName || x.categoryType !== 'OTHER') return;
    const ty = categoryTypeFromName(catName);
    if (ty !== 'OTHER') ctx.setExtra({ categoryType: ty });
  }, [catName]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ gap: th.space(3) }}>
      <Row gap={2}>
        <Input containerStyle={{ flex: 1 }} label={t('Model number')} value={x.model} onChangeText={(model) => ctx.setExtra({ model })} placeholder="SM-A155F" ltr />
        <Input containerStyle={{ flex: 1 }} label={t('Part number')} value={x.partNumber} onChangeText={(partNumber) => ctx.setExtra({ partNumber })} ltr />
      </Row>
      {SERIAL_SUGGESTED.includes(x.categoryType) && !x.tracked && <Text size="xs" tone="info">{t('Is type ke har piece ka serial/IMEI aam tor par rakha jata hai — Stock step me serial chalu karein.')}</Text>}
      <Text size="sm" weight="semibold" tone="secondary">{t('Halat')}</Text>
      <Tiles value={x.condition} onChange={(condition) => ctx.setExtra({ condition })} columns={2} options={CONDITION_TYPES.map((c) => ({ value: c, label: conditionLabel(c) }))} />
      <Text size="xs" tone="muted">{t(CONDITION_META[x.condition].hint)}</Text>
      <Input label={t('Rang')} value={x.colorName} onChangeText={(colorName) => ctx.setExtra({ colorName })} />
      <NumberInput label={t('MRP (company rate)')} value={x.mrp} onChangeValue={(mrp) => ctx.setExtra({ mrp })} />
      <Row gap={2} wrap>
        <Chip label={t('Best seller')} selected={x.isBestSeller} onPress={() => ctx.setExtra({ isBestSeller: !x.isBestSeller })} />
        <Chip label={t('Naya')} icon={Sparkles} selected={x.isNewArrival} onPress={() => ctx.setExtra({ isNewArrival: !x.isNewArrival })} />
        <Chip label={t('Trending')} selected={x.isTrending} onPress={() => ctx.setExtra({ isTrending: !x.isTrending })} />
      </Row>
    </View>
  );
}

const specs: StepDef<ElectronicsExtra> = {
  id: 'specs', title: msg('Specs'), icon: Cpu,
  render: (ctx) => {
    const x = ctx.draft.extra;
    return (
      <View style={{ gap: 12 }}>
        <Text size="sm" weight="semibold" tone="secondary">{t('Connectivity')}</Text>
        <ChipGroup wrap multiple value={x.connectivity} onChange={(connectivity) => ctx.setExtra({ connectivity })} options={CONNECTIVITY_OPTIONS.map((c) => ({ value: c, label: c }))} />
        <Row gap={2}><Input containerStyle={{ flex: 1 }} label={t('Battery')} value={x.batteryCapacity} onChangeText={(batteryCapacity) => ctx.setExtra({ batteryCapacity })} placeholder="5000 mAh" ltr /><Input containerStyle={{ flex: 1 }} label={t('Power')} value={x.powerRating} onChangeText={(powerRating) => ctx.setExtra({ powerRating })} placeholder="20W" ltr /></Row>
        <Row gap={2}><Input containerStyle={{ flex: 1 }} label={t('Screen size')} value={x.screenSize} onChangeText={(screenSize) => ctx.setExtra({ screenSize })} placeholder={'6.5"'} ltr /><Input containerStyle={{ flex: 1 }} label={t('Resolution')} value={x.resolution} onChangeText={(resolution) => ctx.setExtra({ resolution })} placeholder="FHD" ltr /></Row>
        <Row gap={2}><Input containerStyle={{ flex: 1 }} label={t('Refresh rate')} value={x.refreshRate} onChangeText={(refreshRate) => ctx.setExtra({ refreshRate })} placeholder="120Hz" ltr /><Input containerStyle={{ flex: 1 }} label={t('Water resistance')} value={x.waterResistance} onChangeText={(waterResistance) => ctx.setExtra({ waterResistance })} placeholder="IP67" ltr /></Row>
      </View>
    );
  },
};

const warranty: StepDef<ElectronicsExtra> = {
  id: 'warranty', title: msg('Warranty'), icon: Shield,
  render: (ctx) => {
    const x = ctx.draft.extra;
    return (
      <View style={{ gap: 12 }}>
        <Text size="sm" weight="semibold" tone="secondary">{t('Warranty (mahine)')}</Text>
        <ChipGroup wrap value={String(x.warrantyMonths)} onChange={(v) => ctx.setExtra({ warrantyMonths: Number(v) })} options={WARRANTY_PRESETS.map((m) => ({ value: String(m), label: m === 0 ? t('Koi nahi') : t('{{m}} mahine', { m }) }))} />
        {x.warrantyMonths > 0 && (
          <>
            <Text size="sm" weight="semibold" tone="secondary">{t('Warranty kaun deta hai')}</Text>
            <ChipGroup wrap value={x.warrantyType} onChange={(warrantyType) => ctx.setExtra({ warrantyType })} options={WARRANTY_TYPES.map(([v, l]) => ({ value: v, label: t(l) }))} />
            <Switch value={x.international} onChange={(international) => ctx.setExtra({ international })} label={t('International warranty')} />
          </>
        )}
        <Text size="sm" weight="semibold" tone="secondary">{t('Dabbe mein kya hai')}</Text>
        <ChipGroup wrap multiple value={x.boxContents} onChange={(boxContents) => ctx.setExtra({ boxContents })} options={BOX_CONTENT_OPTIONS.map((c) => ({ value: c, label: c }))} />
        <Switch value={x.hasManual} onChange={(hasManual) => ctx.setExtra({ hasManual })} label={t('Manual saath hai')} />
        <Switch value={x.hasWarrantyCard} onChange={(hasWarrantyCard) => ctx.setExtra({ hasWarrantyCard })} label={t('Warranty card saath hai')} />
      </View>
    );
  },
};

function Serials({ ctx }: { ctx: StepContext<ElectronicsExtra> }) {
  const th = useTheme();
  const x = ctx.draft.extra;
  const [text, setText] = useState('');
  const [scan, setScan] = useState(false);
  const known = useMemo(() => new Set(x.serials.map((s) => s.serialNumber.toLowerCase())), [x.serials]);
  const { entries, repeated } = useMemo(() => parseSerialLines(text), [text]);
  const fresh = entries.filter((e) => !known.has(e.serialNumber.toLowerCase()));
  const toRow = (e: { serialNumber: string; imei?: string; imei2?: string; macAddress?: string }): Serial => ({ serialNumber: e.serialNumber, imei: e.imei ?? '', imei2: e.imei2 ?? '', macAddress: e.macAddress ?? '' });
  return (
    <View style={{ gap: th.space(3) }}>
      <Text size="base" weight="bold">{t('Serial / IMEI')}</Text>
      <Switch value={x.tracked} onChange={(tracked) => ctx.setExtra({ tracked })} label={t('Har piece ka serial rakhein')} description={t('Mehngi cheezein: TV, laptop, camera')} />
      {x.tracked && (
        <>
          <Switch value={x.hasImei} onChange={(hasImei) => ctx.setExtra({ hasImei })} label={t('IMEI bhi hai')} />
          {ctx.isEdit && <Text size="sm" tone="secondary">{t('Abhi shelf par {{count}} unit hain. Yahan sirf naye serial daalein.', { count: x.serialsOnShelf })}</Text>}
          <TextArea label={t('Serial numbers')} value={text} onChangeText={setText} ltr placeholder={'SN123456, 356789012345678\nSN123457'} hint={t('Har line me ek unit: serial, IMEI, IMEI 2, MAC (comma se alag)')} />
          <Row gap={2}>
            <Button style={{ flex: 1 }} variant="soft" disabled={!fresh.length} onPress={() => { ctx.setExtra({ serials: [...x.serials, ...fresh.map(toRow)] }); setText(''); }}>{t('{{count}} jorein', { count: fresh.length })}</Button>
            <Button style={{ flex: 1 }} variant="secondary" icon={ScanLine} onPress={() => setScan(true)}>{t('Scan karein')}</Button>
          </Row>
          {repeated > 0 && <Text size="xs" tone="warning">{t('{{count}} serial do dafa likhe the', { count: repeated })}</Text>}
          {x.serials.length > 0 && (
            <Card flush title={t('{{count}} naye unit', { count: x.serials.length })}>
              {x.serials.map((s, i) => <ListRow key={s.serialNumber} dense divider={i < x.serials.length - 1} title={<Text ltr weight="semibold">{s.serialNumber}</Text>} subtitle={s.imei || undefined} trailing={<Text size="xs" tone="danger" onPress={() => ctx.setExtra({ serials: x.serials.filter((_, j) => j !== i) })}>{t('Hatayein')}</Text>} />)}
            </Card>
          )}
          {ctx.errors.serials ? <Text size="sm" tone="danger">{ctx.errors.serials}</Text> : null}
        </>
      )}
      {scan && <CameraScan title={t('Serial scan karein')} continuous onClose={() => setScan(false)} onCode={(c) => { const code = c.trim(); if (!code || known.has(code.toLowerCase())) return false; ctx.setExtra({ serials: [...ctx.draft.extra.serials, toRow({ serialNumber: code })] }); return true; }} footer={<Text size="sm" tone="inverse">{t('{{count}} unit', { count: x.serials.length })}</Text>} />}
    </View>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Pieces') }, { value: 'pack', label: msg('Pack') }, { value: 'set', label: msg('Set') }, { value: 'box', label: msg('Box') }],
  skuPrefix: 'EL', packs: true, variants: { presets: [{ group: msg('Rang'), values: ['Black', 'White', 'Silver', 'Blue'] }, { group: msg('Storage'), values: ['64GB', '128GB', '256GB', '512GB'] }] }, markups: [5, 8, 10, 15, 20, 30],
};
const stock = stockStep<ElectronicsExtra>(core, { extra: (ctx) => <Serials ctx={ctx} />, quick: [1, 5, 10, 25, 50] });
const stockWithSerials: StepDef<ElectronicsExtra> = {
  ...stock,
  validate: (d, isEdit) => {
    const e = stock.validate?.(d, isEdit) ?? {};
    if (d.extra.tracked && d.extra.serials.length && !d.core.variants.length && d.core.stock > 0 && d.core.stock !== d.extra.serials.length) e.serials = t('Serial wali cheez ka stock serials ki ginti se banta hai — stock 0 rakhein ya serials ke barabar.');
    return e;
  },
};

const editor: EditorConfig<ElectronicsExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [p, serials] = await Promise.all([electronicsProductsApi.byProduct(productId).catch(() => null), serialTrackingApi.list({ productId, status: 'IN_STOCK' }).catch(() => [])]);
      if (!p) return {};
      return {
        model: p.modelNumber ?? '', partNumber: p.partNumber ?? '', categoryType: (p.categoryType ?? 'OTHER') as CategoryType, condition: (p.conditionType ?? 'BRAND_NEW') as ConditionType, colorName: p.colorName ?? '', mrp: p.mrp ?? null,
        isBestSeller: p.isBestSeller, isNewArrival: p.isNewArrival, isTrending: p.isTrending, batteryCapacity: p.batteryCapacity ?? '', powerRating: p.powerRating ?? '', connectivity: p.connectivity ?? [], screenSize: p.screenSize ?? '',
        resolution: p.resolution ?? '', refreshRate: p.refreshRate ?? '', waterResistance: p.waterResistance ?? '', warrantyMonths: p.warrantyMonths ?? 0, warrantyType: p.warrantyType ?? 'Shop Warranty', international: p.hasInternationalWarranty,
        boxContents: p.boxContents ?? [], hasManual: p.hasManual, hasWarrantyCard: p.hasWarrantyCard, tracked: p.requiresSerial, hasImei: p.hasImei, serialsOnShelf: (serials as unknown[]).length,
      };
    },
    // With serials on, a new product's stock is the number of serials entered.
    product: (d, payload) => (!payload.stock && d.extra.tracked && d.extra.serials.length && !d.core.variants.length ? { ...payload, stock: d.extra.serials.length } : payload),
    save: async (productId, d, { isEdit, shopId }) => {
      const x = d.extra;
      const c = d.core;
      await electronicsProductsApi.upsert({
        productId, brandId: c.brandId ?? undefined, categoryType: x.categoryType, conditionType: x.condition, modelNumber: opt(x.model), partNumber: opt(x.partNumber), colorName: opt(x.colorName), connectivity: x.connectivity,
        powerRating: opt(x.powerRating), batteryCapacity: opt(x.batteryCapacity), waterResistance: opt(x.waterResistance), screenSize: opt(x.screenSize), resolution: opt(x.resolution), refreshRate: opt(x.refreshRate),
        warrantyMonths: x.warrantyMonths, warrantyType: x.warrantyMonths ? x.warrantyType : 'No Warranty', hasInternationalWarranty: x.international, requiresSerial: x.tracked, hasImei: x.hasImei, boxContents: x.boxContents,
        hasManual: x.hasManual, hasWarrantyCard: x.hasWarrantyCard, mrp: x.mrp ?? undefined, costPrice: c.costPrice, wholesalePrice: c.wholesalePrice ?? undefined, retailPrice: c.price, isFeatured: c.isFeatured,
        isBestSeller: x.isBestSeller, isNewArrival: x.isNewArrival, isTrending: x.isTrending,
      } as Partial<ElectronicsSerial> as never);
      const entries = x.tracked ? x.serials.filter((s) => s.serialNumber.trim()).map((s) => ({ serialNumber: s.serialNumber.trim(), imei: opt(s.imei), imei2: opt(s.imei2), macAddress: opt(s.macAddress) })) : [];
      if (entries.length) {
        const today = new Date().toISOString().slice(0, 10);
        const res = await serialTrackingApi.bulkCreate({ productId, shopId: shopId ?? undefined, entries, purchasePrice: c.costPrice, warrantyStartDate: x.warrantyMonths ? today : undefined, warrantyEndDate: addMonths(today, x.warrantyMonths) });
        // New pieces on an existing product: stock rises by the serials actually added.
        if (isEdit && res.created > 0) await adjustmentsApi.batch({ shopId: shopId ?? undefined, reason: 'Naye serial/IMEI aaye', items: [{ productId, type: 'OPENING_BALANCE', quantity: res.created }] }).catch(() => undefined);
      }
      refreshElectronics(SERIAL_KEYS);
    },
  },
  steps: [
    basicStep<ElectronicsExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: msg('Jaise: Samsung LED 43 inch') }),
    priceStep<ElectronicsExtra>(core),
    specs, warranty, stockWithSerials,
  ],
  summary: (d) => [
    [t('Type'), `${categoryEmoji(d.extra.categoryType)} ${categoryLabel(d.extra.categoryType)} · ${conditionLabel(d.extra.condition)}`],
    ...(d.extra.warrantyMonths > 0 ? [[t('Warranty'), t('{{m}} mahine', { m: d.extra.warrantyMonths })] as [string, string]] : []),
    ...(d.extra.tracked ? [[t('Serial'), t('{{count}} naye unit', { count: d.extra.serials.length })] as [string, string]] : []),
  ],
};

interface DetailExtra { units: Array<ElectronicsSerial & { status: string }> }

registerInventoryIndustry({
  id: 'electronics',
  label: msg('Electronics'),
  categoryKinds: CATEGORY_GROUPS.flatMap((g) => g.items).filter((c) => c !== 'OTHER').map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
  list: {
    noun: 'cheez',
    filters: ['tags', 'etype', 'condition', 'serial'],
    facetLabels: { etype: Object.fromEntries(Object.entries(CATEGORY_LABEL).map(([k, v]) => [k, v])), condition: Object.fromEntries(CONDITION_TYPES.map((c) => [c, CONDITION_META[c].label])) },
    extras: (item) => {
      const e = item.electronics;
      if (!e) return {};
      return {
        badges: [...(e.tracked ? [{ label: t('Serial'), tone: 'neutral' as const }] : []), ...(e.condition && e.condition !== 'BRAND_NEW' ? [{ label: conditionLabel(e.condition), tone: 'warning' as const }] : [])],
        line: [e.categoryType ? categoryLabel(e.categoryType) : null, e.model, e.warrantyMonths ? t('{{m}} mahine warranty', { m: e.warrantyMonths }) : null].filter(Boolean).join(' · ') || undefined,
      };
    },
    actions: [{ icon: Barcode, label: msg('Serial / IMEI'), href: '/electronics/serials' }, { icon: Shield, label: msg('Warranty claims'), href: '/electronics/warranty-claims' }],
    guide: [
      { icon: Barcode, title: msg('Serial wali cheezein'), text: msg('TV, laptop, camera jaisi cheezon ka har piece serial se chalta hai — stock, bill aur warranty usi se.') },
      { icon: Shield, title: msg('Warranty'), text: msg('Product par warranty ke mahine likhein — bechne par har unit ki warranty khud shuru hoti hai.') },
    ],
  },
  editor,
  detail: {
    extra: { key: 'electronics-product-detail', load: async (id): Promise<DetailExtra> => ({ units: (await serialTrackingApi.list({ productId: id }).catch(() => [])) as DetailExtra['units'] }) },
    badges: ({ product }) => { void product; return []; },
    tabs: [{
      id: 'serials', label: msg('Serial'), icon: Barcode, when: ({ extra }) => ((extra as DetailExtra | undefined)?.units.length ?? 0) > 0,
      render: ({ extra, product }) => {
        const units = (extra as DetailExtra | undefined)?.units ?? [];
        return (
          <Card flush title={t('Har unit ke saath')} action={<Button size="sm" variant="ghost" onPress={() => router.push({ pathname: '/electronics/serials', params: { product: product.id } } as never)}>{t('Register kholein')}</Button>}>
            {units.slice(0, 50).map((u, i) => (
              <ListRow key={u.id} dense divider={i < Math.min(units.length, 50) - 1} title={<Text ltr weight="semibold">{u.serialNumber}</Text>} subtitle={u.imei ?? undefined}
                trailing={<View style={{ alignItems: 'flex-end', gap: 2 }}><Badge tone={serialStatusOf(u.status).tone}>{metaText(serialStatusOf(u.status))}</Badge>{u.warrantyEndDate ? <Text size="2xs" tone="muted">{formatDate(u.warrantyEndDate)}</Text> : null}</View>} />
            ))}
          </Card>
        );
      },
    }],
    stockChips: [1, 5, 10, 25],
  },
});

// Single serial units for stock transfers and write-offs.
registerDeviceSource('electronics', {
  kind: 'serial', label: msg('Serial units'), icon: Barcode, transferField: 'serialId',
  load: async (shopId) => (await serialTrackingApi.list({ status: 'IN_STOCK', shopId })).map((u) => ({ id: u.id, kind: 'serial', productId: u.productId, name: u.product?.name ?? u.serialNumber, ref: u.serialNumber, sub: u.imei ?? undefined, cost: Number(u.purchasePrice) || 0 })),
  writeOff: (row, how, reason) => (how === 'DAMAGE' ? serialTrackingApi.markDefective(row.id, reason || 'Kharab') : serialTrackingApi.returnSerial(row.id, reason || 'Gum')),
});
