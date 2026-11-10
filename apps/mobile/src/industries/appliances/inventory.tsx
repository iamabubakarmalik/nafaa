/**
 * Appliance products through the shared products list, editor and detail (web
 * ApplianceProductEditor / Products / ProductDetail): the type (guessed from
 * the name), model and size, energy rating, company and shop warranty with
 * compressor and motor months, fitting and delivery marks, and, for a new
 * product, the serial of every unit in the opening stock.
 */

import { Barcode, HardHat, Ruler, ShieldCheck } from 'lucide-react-native';
import { View } from 'react-native';
import { categoryFromName, categoryRule, isAc, isFridge, isTv, isWasher, parseSerials } from '@nafaa/core/industries/appliances';
import { formatMoney } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { Card, Chip, ChipGroup, FormSection, Input, ListRow, Row, Switch, Text, TextArea } from '@/design';
import { NumberInput } from '@/modules/inventory/components/fields';
import { useCategoryKindSync } from '@/modules/inventory/components/Pickers';
import { registerInventoryIndustry } from '@/modules/inventory/industry/registry';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@/modules/inventory/industry/types';
import { basicStep, priceStep, stockStep } from '@/modules/inventory/screens/editor/coreSteps';
import { queryClient } from '@/core/query/client';
import { applianceProductsApi, applianceSerialApi, type ApplianceProfile, type ApplianceSerial } from './api';
import { CATEGORY_LABEL, CATEGORY_TYPES, ENERGY, GROUPS, KEYS, catLabel, dayOnly, energyLabel, groupLabel, groupOf, serialStatus } from './meta';
import { opt } from '../_shared/trade/desk';
import { useApplianceProfiles } from './components/kit';
import { router } from 'expo-router';

export interface ApplianceExtra {
  categoryType: string; model: string; modelYear: number | null; colorName: string; acTonnage: string; fridgeLiters: number | null; washerKg: number | null; screenInch: number | null; capacity: string;
  energy: string; inverter: boolean; power: string; warrantyMonths: number; compressorMonths: number | null; motorMonths: number | null; shopMonths: number | null;
  install: boolean; installCharge: number | null; installFree: boolean; bigVehicle: boolean; freeDelivery: boolean; serialTracked: boolean; serials: string; mrp: number | null; bestSeller: boolean; newArrival: boolean;
}
const initial: ApplianceExtra = {
  categoryType: '', model: '', modelYear: null, colorName: '', acTonnage: '', fridgeLiters: null, washerKg: null, screenInch: null, capacity: '', energy: '', inverter: false, power: '',
  warrantyMonths: 12, compressorMonths: null, motorMonths: null, shopMonths: null, install: false, installCharge: null, installFree: false, bigVehicle: false, freeDelivery: false,
  serialTracked: true, serials: '', mrp: null, bestSeller: false, newArrival: false,
};
const TONS = ['0.75', '1', '1.5', '2', '2.5', '4'];
const WARRANTY = [0, 6, 12, 24, 36];
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const warrantyType = (company: number, shop: number) => (company > 0 && shop > 0 ? 'BOTH' : shop > 0 ? 'SHOP' : 'COMPANY');

/** Size line for a profile: "1.5 ton · inverter", "350 liter", "8 kg", "55 inch". */
export function sizeLine(p?: Partial<ApplianceProfile> | null) {
  if (!p) return '';
  return [
    p.acTonnage && `${p.acTonnage} ton`, p.fridgeCapacityLiters && `${p.fridgeCapacityLiters} liter`, p.washingCapacityKg && `${p.washingCapacityKg} kg`, p.screenSizeInch && `${p.screenSizeInch} inch`,
    !p.acTonnage && !p.fridgeCapacityLiters && !p.washingCapacityKg && !p.screenSizeInch ? p.capacity : '',
    p.isInverter ? t('Inverter') : energyLabel(p.energyRating) && p.energyRating !== 'NOT_RATED' ? energyLabel(p.energyRating) : '',
  ].filter(Boolean).join(' · ');
}

function Kind({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  // The appliance type follows the shop category's kind; there is no separate picker.
  useCategoryKindSync(ctx.draft.core.categoryId, x.categoryType, (type) => {
    const r = categoryRule(type);
    ctx.setExtra({ categoryType: type, install: r.needsInstall, bigVehicle: r.heavy, compressorMonths: isAc(type) || isFridge(type) ? x.compressorMonths ?? 60 : x.compressorMonths, motorMonths: isWasher(type) ? x.motorMonths ?? 24 : x.motorMonths });
  });
  return null;
}

function Specs({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const type = x.categoryType || null;
  return (
    <>
      <FormSection title={t('Model aur size')} description={t('Bill, warranty card aur POS par naam ke saath')}>
        <Input label={t('Model number')} value={x.model} onChangeText={(model) => set({ model })} placeholder={t('HSU-18HFCM')} ltr />
        <NumberInput label={t('Saal')} integer value={x.modelYear} onChangeValue={(modelYear) => set({ modelYear })} placeholder="2026" />
        <Input label={t('Rang')} value={x.colorName} onChangeText={(colorName) => set({ colorName })} placeholder={t('White, Silver')} />
        {isAc(type) && (<><Text size="sm" weight="semibold" tone="secondary">{t('Ton')}</Text><ChipGroup wrap value={x.acTonnage} onChange={(acTonnage) => set({ acTonnage })} options={TONS.map((v) => ({ value: v, label: v }))} /></>)}
        {isFridge(type) && <NumberInput label={t('Liter')} value={x.fridgeLiters} onChangeValue={(fridgeLiters) => set({ fridgeLiters })} placeholder="350" hint={t('14 cu ft ≈ 400 L')} />}
        {isWasher(type) && <NumberInput label={t('Kitne kg')} value={x.washerKg} onChangeValue={(washerKg) => set({ washerKg })} placeholder="8" />}
        {isTv(type) && <NumberInput label={t('Screen (inch)')} value={x.screenInch} onChangeValue={(screenInch) => set({ screenInch })} placeholder="55" />}
        {!isAc(type) && !isFridge(type) && !isWasher(type) && !isTv(type) && <Input label={t('Capacity')} value={x.capacity} onChangeText={(capacity) => set({ capacity })} placeholder={t('30 liter, 1200 watt, 10 kVA')} />}
        <Input label={t('Bijli (watt)')} value={x.power} onChangeText={(power) => set({ power })} placeholder={t('1500W')} />
      </FormSection>
      <FormSection title={t('Energy')} description={t('Customer bijli ka bill poochta hai')}>
        <ChipGroup wrap value={x.energy} onChange={(energy) => set({ energy: x.energy === energy ? '' : energy, inverter: energy === 'INVERTER' ? true : x.inverter })} options={ENERGY.map((e) => ({ value: e.value, label: t(e.label) }))} />
        <Switch value={x.inverter} onChange={(inverter) => set({ inverter })} label={t('Inverter / DC inverter')} description={t('Kam bijli — POS aur list par nishan')} />
      </FormSection>
    </>
  );
}

function Warranty({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const type = x.categoryType || null;
  return (
    <>
      <FormSection title={t('Warranty')} description={t('Bechne ke din se har unit ki warranty chalti hai — bill, warranty card aur warranty check par alag alag dikhti hai')}>
        <Text size="sm" weight="semibold" tone="secondary">{t('Company warranty')}</Text>
        <ChipGroup wrap value={String(x.warrantyMonths)} onChange={(m) => set({ warrantyMonths: Number(m) })} options={WARRANTY.map((m) => ({ value: String(m), label: m === 0 ? t('Koi nahi') : t('{{m}} mahine', { m }) }))} />
        <NumberInput label={t('Company warranty (mahine)')} integer value={x.warrantyMonths} onChangeValue={(v) => set({ warrantyMonths: Math.max(Math.round(v ?? 0), 0) })} hint={t('Poore unit ki, brand deta hai')} error={ctx.errors.warranty} />
        <NumberInput label={t('Dukaan ki warranty (mahine)')} integer value={x.shopMonths} onChangeValue={(v) => set({ shopMonths: v == null ? null : Math.max(Math.round(v), 0) })} hint={t('Apni taraf se — kharcha dukaan ka')} error={ctx.errors.shopWarranty} />
        {(isAc(type) || isFridge(type) || !type) && <NumberInput label={t('Compressor (mahine)')} integer value={x.compressorMonths} onChangeValue={(compressorMonths) => set({ compressorMonths })} hint={t('Aksar 5–10 saal')} />}
        {(isWasher(type) || !type) && <NumberInput label={t('Motor (mahine)')} integer value={x.motorMonths} onChangeValue={(motorMonths) => set({ motorMonths })} />}
      </FormSection>
      <FormSection title={t('Fitting aur delivery')} description={t('POS par bechte hi installation aur delivery book karne ka option inhi se aata hai')}>
        <Switch value={x.install} onChange={(install) => set({ install })} label={t('Fitting / installation hoti hai')} description={t('AC, geyser, washing machine, LED wall mount')} />
        {x.install && (
          <>
            <NumberInput label={t('Installation charge (Rs)')} value={x.installCharge} onChangeValue={(installCharge) => set({ installCharge })} placeholder="3000" hint={t('Kaam mukammal hone par bill')} error={ctx.errors.install} />
            <Switch value={x.installFree} onChange={(installFree) => set({ installFree })} label={t('Free installation')} description={t('Qeemat me shamil')} />
          </>
        )}
        <Switch value={x.bigVehicle} onChange={(bigVehicle) => set({ bigVehicle })} label={t('Bari gaari chahiye')} description={t('Fridge, AC, deep freezer')} />
        <Switch value={x.freeDelivery} onChange={(freeDelivery) => set({ freeDelivery })} label={t('Free delivery')} />
      </FormSection>
    </>
  );
}

function Serials({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const list = parseSerials(x.serials);
  return (
    <FormSection title={t('Serial number')} description={t('Har unit ka number — warranty aur chori me kaam aata hai')}>
      <Switch value={x.serialTracked} onChange={(serialTracked) => ctx.setExtra({ serialTracked })} label={t('Har unit ka serial rakhein')} description={t('Accessories (stand, pipe, remote) par band rakhein')} />
      {x.serialTracked && (ctx.isEdit
        ? <Text size="sm" tone="muted">{t('Naya maal aaye to pehle Purchase banayein, phir Serial register me serial jorein.')}</Text>
        : (
          <>
            <TextArea label={t('Opening stock ke serial')} value={x.serials} onChangeText={(serials) => ctx.setExtra({ serials })} placeholder={'SN12345\nSN12346'} error={ctx.errors.serials}
              hint={list.length ? t('{{count}} serial — stock bhi {{count}} hoga', { count: list.length }) : t('Scanner se ek ke baad ek, ya paste karein')} />
          </>
        ))}
    </FormSection>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: msg('Adad (pcs)') }, { value: 'set', label: msg('Set') }, { value: 'unit', label: msg('Unit') }, { value: 'meter', label: msg('Meter (pipe, wire)') }],
  skuPrefix: 'APL', variants: { presets: [{ group: msg('Rang'), values: ['White', 'Silver', 'Black', 'Grey', 'Gold'] }] }, batches: false, markups: [5, 8, 10, 12, 15, 20],
};

const specsStep: StepDef<ApplianceExtra> = { id: 'specs', title: msg('Model / size'), icon: Ruler, render: (ctx) => <Specs ctx={ctx} />, when: (d) => !!d.extra.categoryType };
const warrantyStep: StepDef<ApplianceExtra> = {
  id: 'warranty', title: msg('Warranty / fitting'), icon: ShieldCheck, render: (ctx) => <Warranty ctx={ctx} />,
  validate: (d) => ({
    ...(d.extra.warrantyMonths < 0 || (d.extra.compressorMonths ?? 0) < 0 ? { warranty: t('Mahine ulte nahi ho sakte') } : {}),
    ...((d.extra.shopMonths ?? 0) > 120 ? { shopWarranty: t('Dukaan ki warranty 120 mahine se zyada nahi') } : {}),
    ...(d.extra.install && !d.extra.installFree && (d.extra.installCharge ?? 0) < 0 ? { install: t('Charge manfi nahi') } : {}),
  }),
};
const stock = stockStep<ApplianceExtra>(core, { extra: (ctx) => <Serials ctx={ctx} />, quick: [1, 2, 5, 10, 20] });
const stockWithSerials: StepDef<ApplianceExtra> = {
  ...stock,
  validate: (d, isEdit) => {
    const e = stock.validate?.(d, isEdit) ?? {};
    const list = parseSerials(d.extra.serials);
    if (!isEdit && d.extra.serialTracked && list.length && d.core.stock && d.core.stock !== list.length) e.serials = t('Stock {{stock}} hai aur serial {{length}} — dono barabar karein ya stock khali chhorein', { stock: d.core.stock, length: list.length });
    return e;
  },
};

const editor: EditorConfig<ApplianceExtra> = {
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await applianceProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      const shopOnly = (p.warrantyType ?? '').toUpperCase() === 'SHOP' && p.shopWarrantyMonths == null;
      return {
        categoryType: p.categoryType ?? '', model: p.modelNumber ?? '', modelYear: p.modelYear ?? null, colorName: p.colorName ?? '', acTonnage: p.acTonnage ?? '', fridgeLiters: p.fridgeCapacityLiters ?? null,
        washerKg: p.washingCapacityKg ?? null, screenInch: p.screenSizeInch ?? null, capacity: p.capacity ?? '', energy: p.energyRating ?? '', inverter: p.isInverter, power: p.powerConsumption ?? '',
        warrantyMonths: shopOnly ? 0 : p.warrantyMonths ?? 0, compressorMonths: p.compressorWarrantyMonths ?? null, motorMonths: p.motorWarrantyMonths ?? null, shopMonths: shopOnly ? p.warrantyMonths ?? null : p.shopWarrantyMonths ?? null,
        install: p.requiresInstallation, installCharge: Number(p.installationCharge) || null, installFree: p.installationCovered, bigVehicle: p.requiresLargeVehicle, freeDelivery: p.freeDelivery,
        serialTracked: p.requiresSerial, mrp: p.mrp ?? null, bestSeller: p.isBestSeller, newArrival: p.isNewArrival,
      };
    },
    product: (d, payload) => {
      const n = d.extra.serialTracked ? parseSerials(d.extra.serials).length : 0;
      return !payload.stock && n && !d.core.variants.length ? { ...payload, stock: n } : payload;
    },
    save: async (productId, d, { isEdit }) => {
      const x = d.extra;
      const c = d.core;
      const profile: Record<string, unknown> = {
        productId, brandId: c.brandId ?? undefined, categoryType: x.categoryType || undefined, modelNumber: opt(x.model), modelYear: num(x.modelYear), colorName: opt(x.colorName), acTonnage: opt(x.acTonnage),
        fridgeCapacityLiters: num(x.fridgeLiters), washingCapacityKg: num(x.washerKg), screenSizeInch: num(x.screenInch), capacity: opt(x.capacity), energyRating: x.energy || undefined, isInverter: x.inverter, powerConsumption: opt(x.power),
        warrantyMonths: x.warrantyMonths, compressorWarrantyMonths: num(x.compressorMonths), motorWarrantyMonths: num(x.motorMonths), shopWarrantyMonths: x.shopMonths ?? 0, warrantyType: warrantyType(x.warrantyMonths, x.shopMonths ?? 0),
        requiresInstallation: x.install, installationCharge: x.install && !x.installFree ? num(x.installCharge) ?? 0 : 0, installationCovered: x.install && x.installFree, requiresLargeVehicle: x.bigVehicle, freeDelivery: x.freeDelivery,
        requiresSerial: x.serialTracked, mrp: num(x.mrp), costPrice: c.costPrice, wholesalePrice: c.wholesalePrice ?? undefined, retailPrice: c.price, isFeatured: c.isFeatured, isBestSeller: x.bestSeller, isNewArrival: x.newArrival,
      };
      await applianceProductsApi.upsert(Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as { productId: string });
      const list = parseSerials(x.serials);
      if (!isEdit && x.serialTracked && list.length) await applianceSerialApi.bulkCreate({ productId, serialNumbers: list, modelNumber: opt(x.model), purchasePrice: c.costPrice || undefined });
      void queryClient.invalidateQueries({ queryKey: [KEYS.profile] });
      void queryClient.invalidateQueries({ queryKey: [KEYS.serial] });
    },
  },
  steps: [
    basicStep<ApplianceExtra>(core, { extra: (ctx) => <Kind ctx={ctx} />, namePlaceholder: msg('Jaise: Haier 1.5 ton DC inverter AC') }),
    priceStep<ApplianceExtra>(core, {
      extra: (ctx) => (
        <FormSection title={t('Company ki qeemat')}>
          <NumberInput label={t('Company ki qeemat (MRP)')} value={ctx.draft.extra.mrp} onChangeValue={(mrp) => ctx.setExtra({ mrp })}
            hint={ctx.draft.extra.mrp && ctx.draft.core.price > ctx.draft.extra.mrp ? t('Rate MRP se zyada hai') : t('Dealer scheme ka discount Purchase me likhein')} />
          <Row gap={2} style={{ flexWrap: 'wrap' }}>
            <Chip label={t('Naya aaya')} selected={ctx.draft.extra.newArrival} onPress={() => ctx.setExtra({ newArrival: !ctx.draft.extra.newArrival })} />
            <Chip label={t('Best seller')} selected={ctx.draft.extra.bestSeller} onPress={() => ctx.setExtra({ bestSeller: !ctx.draft.extra.bestSeller })} />
          </Row>
        </FormSection>
      ),
    }),
    specsStep, warrantyStep, stockWithSerials,
  ],
  summary: (d) => [
    ...(d.extra.categoryType ? [[t('Type'), `${catLabel(d.extra.categoryType)}${d.extra.model ? ` · ${d.extra.model}` : ''}`] as [string, string]] : []),
    ...(d.extra.warrantyMonths > 0 ? [[t('Company warranty'), t('{{m}} mahine', { m: d.extra.warrantyMonths })] as [string, string]] : []),
    ...((d.extra.shopMonths ?? 0) > 0 ? [[t('Dukaan ki warranty'), t('{{m}} mahine', { m: d.extra.shopMonths })] as [string, string]] : []),
    ...(d.extra.install ? [[t('Fitting'), d.extra.installFree ? t('Free') : d.extra.installCharge ? formatMoney(d.extra.installCharge) : '—'] as [string, string]] : []),
    ...(parseSerials(d.extra.serials).length ? [[t('Serial'), String(parseSerials(d.extra.serials).length)] as [string, string]] : []),
  ],
};

interface DetailExtra { profile: ApplianceProfile | null; units: ApplianceSerial[]; total: number }

registerInventoryIndustry({
  id: 'appliances',
  label: msg('Appliances'),
  categoryKinds: CATEGORY_TYPES.filter((c) => c !== 'OTHER').map((c) => ({ value: c, label: CATEGORY_LABEL[c] })),
  list: {
    noun: 'product',
    filters: ['tags'],
    useSource: useApplianceProfiles,
    extras: (item, ctx) => {
      const p = (ctx.source as Map<string, ApplianceProfile> | undefined)?.get(item.id);
      if (!p) return {};
      return {
        line: [item.brand?.name, p.modelNumber, sizeLine(p)].filter(Boolean).join(' · ') || undefined,
        badges: [...(p.warrantyMonths > 0 ? [{ label: `${p.warrantyMonths}m`, tone: 'success' as const }] : []), ...(p.requiresInstallation ? [{ label: t('Fitting'), tone: 'info' as const }] : [])],
        chips: [p.categoryType ? catLabel(p.categoryType) : '', p.isInverter ? t('Inverter') : '', p.freeDelivery ? t('Free delivery') : ''].filter(Boolean),
      };
    },
    actions: [{ icon: Barcode, label: msg('Serials'), href: '/appliances/serials' }, { icon: HardHat, label: msg('Installations'), href: '/appliances/installations' }],
    onScanMiss: async (code) => {
      const hit = await applianceSerialApi.lookup(code).catch(() => null);
      if (!hit) return false;
      router.push(`/appliances/serials/${hit.id}` as never);
      return true;
    },
    stockChips: () => [1, 2, 5, 10, 20],
    guide: [
      { icon: Barcode, title: msg('Serial'), text: msg('Har AC, fridge, LED ka serial register me hota hai — naye product par serial yahin likhein, baad wala maal Serial register me.') },
      { icon: ShieldCheck, title: msg('Warranty'), text: msg('Company aur compressor/motor ki warranty product par likhein — bechte hi har unit ki warranty bill ki date se chalti hai.') },
      { icon: HardHat, title: msg('Fitting'), text: msg('Jis product ki fitting hoti hai (AC, geyser) us par "Fitting" lagayein — POS par bechte hi installation book karne ka option aata hai.') },
    ],
  },
  editor,
  detail: {
    extra: {
      key: 'appliance-product-detail',
      load: async (id): Promise<DetailExtra> => {
        const [profile, units] = await Promise.all([applianceProductsApi.byProduct(id).catch(() => null), applianceSerialApi.list({ productId: id, limit: 50 }).catch(() => ({ items: [] as ApplianceSerial[], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } }))]);
        return { profile, units: units.items, total: units.meta.total };
      },
    },
    badges: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      return [
        ...(p.categoryType ? [{ label: catLabel(p.categoryType), tone: 'info' as const }] : []), ...(p.warrantyMonths > 0 ? [{ label: t('{{m}} mahine', { m: p.warrantyMonths }), tone: 'success' as const }] : []),
        ...(p.requiresInstallation ? [{ label: t('Fitting'), tone: 'info' as const }] : []),
      ];
    },
    facts: ({ extra }) => {
      const p = (extra as DetailExtra | undefined)?.profile;
      if (!p) return [];
      const months = (n?: number | null) => (n ? t('{{m}} mahine', { m: n }) : undefined);
      const shopOnly = p.warrantyType === 'SHOP' && p.shopWarrantyMonths == null;
      return ([
        [t('Model'), p.modelNumber], [t('Size'), sizeLine(p)], [t('Rang'), p.colorName], [t('Bijli'), p.powerConsumption],
        [t('Company warranty'), shopOnly ? undefined : months(p.warrantyMonths)], [t('Dukaan ki warranty'), months(p.shopWarrantyMonths ?? (shopOnly ? p.warrantyMonths : undefined))],
        [t('Compressor'), months(p.compressorWarrantyMonths)], [t('Motor'), months(p.motorWarrantyMonths)],
        [t('Installation'), p.requiresInstallation ? (p.installationCovered ? t('Free') : formatMoney(Number(p.installationCharge) || 0)) : undefined],
        ['MRP', p.mrp ? formatMoney(p.mrp) : undefined], [t('Delivery'), p.freeDelivery ? t('Free') : p.requiresLargeVehicle ? t('Bari gaari') : undefined],
      ] as Array<[string, string | undefined]>).filter((r): r is [string, string] => !!r[1]);
    },
    tile: ({ extra }) => {
      const e = extra as DetailExtra | undefined;
      return e?.profile?.requiresSerial ? { label: t('Serial stock me'), value: String(e.units.filter((u) => u.status === 'IN_STOCK').length), hint: t('{{total}} kul register', { total: e.total }) } : null;
    },
    alerts: ({ extra, stock }) => {
      const e = extra as DetailExtra | undefined;
      const shelf = e?.units.filter((u) => u.status === 'IN_STOCK').length ?? 0;
      if (!e?.profile?.requiresSerial || e.total > 50 || Math.round(stock) === shelf) return null;
      return <Card tone="info"><ListRow icon={Barcode} title={t('Stock {{stock}} hai lekin {{shelf}} serial register me — naye maal ke serial jorein', { stock: Math.round(stock), shelf })} chevron onPress={() => router.push('/appliances/serials' as never)} /></Card>;
    },
    tabs: [{
      id: 'serials', label: msg('Serial'), icon: Barcode, when: ({ extra }) => !!(extra as DetailExtra | undefined)?.units.length,
      render: ({ extra }) => {
        const e = extra as DetailExtra;
        return (
          <Card flush title={t('Serial units')}>
            {e.units.map((u, i) => <ListRow key={u.id} dense divider={i < e.units.length - 1} chevron onPress={() => router.push(`/appliances/serials/${u.id}` as never)} title={u.serialNumber}
              subtitle={u.status === 'SOLD' ? `${u.customerName ?? ''} · ${dayOnly(u.soldAt)}` : dayOnly(u.purchaseDate)} trailing={<Text size="xs" tone="muted">{serialStatus(u.status).label}</Text>} />)}
          </Card>
        );
      },
    }],
    stockChips: [1, 2, 5, 10],
  },
});

