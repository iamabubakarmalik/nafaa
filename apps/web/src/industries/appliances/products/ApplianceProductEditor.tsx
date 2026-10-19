/**
 * Appliance product editor on the shared product editor: type (guessed from
 * the name), model and size (ton, liter, kg, inch), energy rating, company
 * and dukaan warranty with compressor / motor months, fitting and delivery
 * marks, and — for a new product — the serial of every unit in the opening
 * stock (scan or paste).
 */

import { Barcode, ClipboardPaste, HardHat, Ruler, ShieldCheck } from 'lucide-react';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Toggle } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { applianceProductsApi, type ApplianceCategoryType, type ApplianceEnergyRating } from '../api/products.api';
import { applianceSerialApi } from '../api/serial-tracking.api';
import { CATEGORY_GROUPS, CATEGORY_META, CATEGORY_TYPES, ENERGY, PROFILE_KEY, SERIAL_KEY, catLabel, catMeta, categoryFromName, isAc, isFridge, isTv, isWasher } from '../components/meta';

export interface ApplianceExtra {
  categoryType: ApplianceCategoryType | '';
  model: string; modelYear: number | null; colorName: string;
  acTonnage: string; fridgeLiters: number | null; washerKg: number | null; screenInch: number | null; capacity: string;
  energy: ApplianceEnergyRating | ''; inverter: boolean; power: string;
  warrantyMonths: number; compressorMonths: number | null; motorMonths: number | null; warrantyBy: 'COMPANY' | 'SHOP' | 'BOTH';
  install: boolean; installCharge: number | null; installFree: boolean; bigVehicle: boolean; freeDelivery: boolean;
  serialTracked: boolean; serials: string; mrp: number | null; bestSeller: boolean; newArrival: boolean;
}

const initial: ApplianceExtra = {
  categoryType: '', model: '', modelYear: null, colorName: '', acTonnage: '', fridgeLiters: null, washerKg: null, screenInch: null, capacity: '',
  energy: '', inverter: false, power: '', warrantyMonths: 12, compressorMonths: null, motorMonths: null, warrantyBy: 'COMPANY',
  install: false, installCharge: null, installFree: false, bigVehicle: false, freeDelivery: false,
  serialTracked: true, serials: '', mrp: null, bestSeller: false, newArrival: false,
};

const TONS = ['0.75', '1', '1.5', '2', '2.5', '4'];
const WARRANTY = [0, 6, 12, 24, 36];
const BY: Array<{ value: ApplianceExtra['warrantyBy']; label: string }> = [{ value: 'COMPANY', label: 'Company ki' }, { value: 'SHOP', label: 'Dukaan ki' }, { value: 'BOTH', label: 'Dono' }];
const opt = (v: string) => v.trim() || undefined;
const num = (v: number | null) => (v != null && Number.isFinite(v) ? v : undefined);
const serialList = (text: string) => [...new Set(text.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean))];

/* ── Basic step: type ── */
function Kind({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const guess = !x.categoryType ? categoryFromName(ctx.draft.core.name) : null;
  const pick = (t: ApplianceCategoryType) => {
    const m = CATEGORY_META[t];
    ctx.setExtra({ categoryType: x.categoryType === t ? '' : t, ...(x.categoryType !== t && { install: m.needsInstall, bigVehicle: m.heavy, compressorMonths: isAc(t) || isFridge(t) ? x.compressorMonths ?? 60 : x.compressorMonths, motorMonths: isWasher(t) ? x.motorMonths ?? 60 : x.motorMonths }) });
  };
  return (
    <div className="space-y-2">
      <span className="block text-[0.8125rem] font-medium text-slate-700">Kya cheez hai</span>
      {guess && <button type="button" onClick={() => pick(guess)} className="rounded-lg bg-brand-50 px-2.5 py-1 text-[0.8125rem] font-medium text-brand-700 ring-1 ring-brand-200">Lagta hai {catLabel(guess)} hai — chunein</button>}
      {CATEGORY_GROUPS.map((g) => (
        <div key={g} className="flex flex-wrap items-center gap-1.5">
          <span className="w-28 shrink-0 text-[0.75rem] text-slate-500">{g}</span>
          {CATEGORY_TYPES.filter((t) => CATEGORY_META[t].group === g).map((t) => <Chip key={t} on={x.categoryType === t} onClick={() => pick(t)}>{CATEGORY_META[t].label}</Chip>)}
        </div>
      ))}
      <p className="text-[0.75rem] text-slate-500">Isi se fitting, delivery aur warranty ke sawal khud lagte hain, aur POS par filter.</p>
    </div>
  );
}

/* ── Specs step ── */
function Specs({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const t = x.categoryType || null;
  return (
    <div className="space-y-4">
      <Section icon={Ruler} title="Model aur size" hint="Bill, warranty card aur POS par naam ke saath">
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Model number" value={x.model} onChange={(model) => set({ model })} placeholder="HSU-18HFCM" />
          <NumberField label="Saal" allowEmpty value={x.modelYear} onChange={(modelYear) => set({ modelYear: modelYear == null ? null : Math.round(modelYear) })} placeholder="2026" />
          <TextField label="Rang" value={x.colorName} onChange={(colorName) => set({ colorName })} placeholder="White, Silver" />
        </div>
        {isAc(t) && <div className="mt-3"><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Ton</span><div className="flex flex-wrap gap-1.5">{TONS.map((v) => <Chip key={v} on={x.acTonnage === v} onClick={() => set({ acTonnage: x.acTonnage === v ? '' : v })}>{v} ton</Chip>)}</div></div>}
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {isFridge(t) && <NumberField label="Liter" allowEmpty value={x.fridgeLiters} onChange={(fridgeLiters) => set({ fridgeLiters })} suffix="L" placeholder="350" hint="14 cu ft ≈ 400 L" />}
          {isWasher(t) && <NumberField label="Kitne kg" allowEmpty value={x.washerKg} onChange={(washerKg) => set({ washerKg })} suffix="kg" placeholder="8" />}
          {isTv(t) && <NumberField label="Screen" allowEmpty value={x.screenInch} onChange={(screenInch) => set({ screenInch })} suffix="inch" placeholder="55" />}
          {!isAc(t) && !isFridge(t) && !isWasher(t) && !isTv(t) && <TextField label="Capacity" value={x.capacity} onChange={(capacity) => set({ capacity })} placeholder="30 liter, 1200 watt, 10 kVA" />}
          <TextField label="Bijli (watt)" value={x.power} onChange={(power) => set({ power })} placeholder="1500W" />
        </div>
      </Section>
      <Section icon={ShieldCheck} title="Energy" hint="Customer bijli ka bill poochta hai">
        <div className="flex flex-wrap gap-1.5">{ENERGY.map((e) => <Chip key={e.value} on={x.energy === e.value} onClick={() => set({ energy: x.energy === e.value ? '' : e.value, inverter: e.value === 'INVERTER' ? true : x.inverter })}>{e.label}</Chip>)}</div>
        <div className="mt-3"><Toggle on={x.inverter} onChange={(inverter) => set({ inverter })} title="Inverter / DC inverter" hint="Kam bijli — POS aur list par nishan" /></div>
      </Section>
    </div>
  );
}

/* ── Warranty and fitting step ── */
function Warranty({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const t = x.categoryType || null;
  return (
    <div className="space-y-4">
      <Section icon={ShieldCheck} title="Warranty" hint="Bechne ke din se har unit ki warranty chalti hai — warranty card par chhapti hai">
        <div className="flex flex-wrap gap-1.5">{WARRANTY.map((m) => <Chip key={m} on={x.warrantyMonths === m} onClick={() => set({ warrantyMonths: m })}>{m === 0 ? 'Koi nahi' : `${m} mahine`}</Chip>)}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <NumberField label="Poori warranty" value={x.warrantyMonths} onChange={(v) => set({ warrantyMonths: Math.max(Math.round(v ?? 0), 0) })} suffix="mahine" error={ctx.errors.warranty} />
          {(isAc(t) || isFridge(t) || !t) && <NumberField label="Compressor" allowEmpty value={x.compressorMonths} onChange={(compressorMonths) => set({ compressorMonths })} suffix="mahine" hint="Aksar 5–10 saal" />}
          {(isWasher(t) || !t) && <NumberField label="Motor" allowEmpty value={x.motorMonths} onChange={(motorMonths) => set({ motorMonths })} suffix="mahine" />}
        </div>
        <div className="mt-3"><span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Warranty kis ki</span><div className="flex flex-wrap gap-1.5">{BY.map((b) => <Chip key={b.value} on={x.warrantyBy === b.value} onClick={() => set({ warrantyBy: b.value })}>{b.label}</Chip>)}</div></div>
      </Section>
      <Section icon={HardHat} title="Fitting aur delivery" hint="POS par bechte hi installation aur delivery book karne ka option inhi se aata hai">
        <div className="space-y-3">
          <Toggle on={x.install} onChange={(install) => set({ install })} icon={HardHat} title="Fitting / installation hoti hai" hint="AC, geyser, washing machine, LED wall mount" />
          {x.install && (
            <div className="grid gap-3 sm:grid-cols-2">
              <NumberField label="Installation charge" prefix="Rs" allowEmpty value={x.installCharge} onChange={(installCharge) => set({ installCharge })} placeholder="3000" hint="Kaam mukammal hone par bill" error={ctx.errors.install} />
              <Toggle on={x.installFree} onChange={(installFree) => set({ installFree })} title="Free installation" hint="Qeemat me shamil" />
            </div>
          )}
          <Toggle on={x.bigVehicle} onChange={(bigVehicle) => set({ bigVehicle })} title="Bari gaari chahiye" hint="Fridge, AC, deep freezer" />
          <Toggle on={x.freeDelivery} onChange={(freeDelivery) => set({ freeDelivery })} title="Free delivery" />
        </div>
      </Section>
    </div>
  );
}

/* ── Stock step addition: serials ── */
function Serials({ ctx }: { ctx: StepContext<ApplianceExtra> }) {
  const x = ctx.draft.extra;
  const list = serialList(x.serials);
  return (
    <Section icon={Barcode} title="Serial number" hint="Har unit ka number — warranty aur chori me kaam aata hai">
      <Toggle on={x.serialTracked} onChange={(serialTracked) => ctx.setExtra({ serialTracked })} icon={Barcode} title="Har unit ka serial rakhein" hint="Accessories (stand, pipe, remote) par band rakhein" />
      {x.serialTracked && (ctx.isEdit
        ? <p className="mt-3 text-[0.8125rem] text-slate-600">Naya maal aaye to pehle Purchase banayein, phir Serial register me serial jorein.</p>
        : (
          <div className="mt-3 space-y-1.5">
            <label className="block text-[0.8125rem] font-medium text-slate-700">Opening stock ke serial</label>
            <textarea value={x.serials} onChange={(e) => ctx.setExtra({ serials: e.target.value })} rows={5} placeholder={'SN12345\nSN12346'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-[0.8125rem] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200" />
            <p className="flex items-center gap-1.5 text-[0.75rem] text-slate-500"><ClipboardPaste className="h-3.5 w-3.5" />{list.length ? `${list.length} serial — stock bhi ${list.length} hoga` : 'Scanner se ek ke baad ek, ya Excel se paste. Khali chhor kar baad me bhi jor sakte hain.'}</p>
            {ctx.errors.serials && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.serials}</p>}
          </div>
        ))}
    </Section>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Adad (pcs)' }, { value: 'set', label: 'Set' }, { value: 'unit', label: 'Unit' }, { value: 'meter', label: 'Meter (pipe, wire)' }],
  skuPrefix: 'APL',
  variants: { presets: [{ group: 'Rang', values: ['White', 'Silver', 'Black', 'Grey', 'Gold'] }] },
  batches: false,
  markups: [5, 8, 10, 12, 15, 20],
};

const specsStep: StepDef<ApplianceExtra> = { id: 'specs', title: 'Model / size', hint: 'Ton, liter, kg, inch', icon: Ruler, render: (ctx) => <Specs ctx={ctx} />, when: (d) => !!d.extra.categoryType };
const warrantyStep: StepDef<ApplianceExtra> = {
  id: 'warranty', title: 'Warranty / fitting', hint: 'Mahine, installation', icon: ShieldCheck, render: (ctx) => <Warranty ctx={ctx} />,
  validate: (d) => ({
    ...(d.extra.warrantyMonths < 0 || (d.extra.compressorMonths ?? 0) < 0 ? { warranty: 'Mahine ulte nahi ho sakte' } : {}),
    ...(d.extra.install && !d.extra.installFree && (d.extra.installCharge ?? 0) < 0 ? { install: 'Charge manfi nahi' } : {}),
  }),
};
const stock = stockStep<ApplianceExtra>(core, { extra: (ctx) => <Serials ctx={ctx} />, quick: [1, 2, 5, 10, 20] });
const stockWithSerials: StepDef<ApplianceExtra> = {
  ...stock,
  validate: (d, isEdit) => {
    const e = stock.validate?.(d, isEdit) ?? {};
    const list = serialList(d.extra.serials);
    if (!isEdit && d.extra.serialTracked && list.length && d.core.stock && d.core.stock !== list.length) e.serials = `Stock ${d.core.stock} hai aur serial ${list.length} — dono barabar karein ya stock khali chhorein`;
    return e;
  },
};

const config: EditorConfig<ApplianceExtra> = {
  label: 'Appliance',
  draftKey: 'nafaa.product-editor.appliances',
  paths: { list: '/products', detail: (id) => `/appliances-products/${id}`, create: '/appliances-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const p = await applianceProductsApi.byProduct(productId).catch(() => null);
      if (!p) return {};
      const by = (p.warrantyType ?? '').toUpperCase();
      return {
        categoryType: p.categoryType ?? '', model: p.modelNumber ?? '', modelYear: p.modelYear ?? null, colorName: p.colorName ?? '',
        acTonnage: p.acTonnage ?? '', fridgeLiters: p.fridgeCapacityLiters ?? null, washerKg: p.washingCapacityKg ?? null, screenInch: p.screenSizeInch ?? null, capacity: p.capacity ?? '',
        energy: p.energyRating ?? '', inverter: p.isInverter, power: p.powerConsumption ?? '',
        warrantyMonths: p.warrantyMonths ?? 0, compressorMonths: p.compressorWarrantyMonths ?? null, motorMonths: p.motorWarrantyMonths ?? null,
        warrantyBy: by === 'SHOP' || by === 'BOTH' ? by : 'COMPANY',
        install: p.requiresInstallation, installCharge: Number(p.installationCharge) || null, installFree: p.installationCovered, bigVehicle: p.requiresLargeVehicle, freeDelivery: p.freeDelivery,
        serialTracked: p.requiresSerial, mrp: p.mrp ?? null, bestSeller: p.isBestSeller, newArrival: p.isNewArrival,
      };
    },
    product: (d, payload) => {
      // With serials entered, a new product's opening stock is the number of serials.
      const n = d.extra.serialTracked ? serialList(d.extra.serials).length : 0;
      return !payload.stock && n && !d.core.variants.length ? { ...payload, stock: n } : payload;
    },
    save: async (productId, d, { isEdit }) => {
      const x = d.extra;
      const c = d.core;
      const profile = {
        productId, brandId: c.brandId ?? undefined, categoryType: x.categoryType || undefined, modelNumber: opt(x.model), modelYear: num(x.modelYear), colorName: opt(x.colorName),
        acTonnage: opt(x.acTonnage), fridgeCapacityLiters: num(x.fridgeLiters), washingCapacityKg: num(x.washerKg), screenSizeInch: num(x.screenInch), capacity: opt(x.capacity),
        energyRating: x.energy || undefined, isInverter: x.inverter, powerConsumption: opt(x.power),
        warrantyMonths: x.warrantyMonths, compressorWarrantyMonths: num(x.compressorMonths), motorWarrantyMonths: num(x.motorMonths), warrantyType: x.warrantyBy,
        requiresInstallation: x.install, installationCharge: x.install && !x.installFree ? num(x.installCharge) ?? 0 : 0, installationCovered: x.install && x.installFree,
        requiresLargeVehicle: x.bigVehicle, freeDelivery: x.freeDelivery, requiresSerial: x.serialTracked,
        mrp: num(x.mrp), costPrice: c.costPrice, wholesalePrice: c.wholesalePrice ?? undefined, retailPrice: c.price, isFeatured: c.isFeatured, isBestSeller: x.bestSeller, isNewArrival: x.newArrival,
      };
      await applianceProductsApi.upsert(Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)));
      const list = serialList(x.serials);
      if (!isEdit && x.serialTracked && list.length) {
        await applianceSerialApi.bulkCreate({ productId, serialNumbers: list, modelNumber: opt(x.model), purchasePrice: c.costPrice || undefined });
      }
    },
  },
  steps: [
    basicStep<ApplianceExtra>(core, {
      extra: (ctx) => <Kind ctx={ctx} />,
      namePlaceholder: 'Jaise: Haier 1.5 ton DC inverter AC',
      categorySuggestions: ['AC', 'Fridge', 'Washing machine', 'LED TV', 'Microwave', 'Geyser', 'Accessories'],
    }),
    priceStep<ApplianceExtra>(core, {
      extra: (ctx) => (
        <div className="space-y-3">
          <NumberField label="Company ki qeemat (MRP)" prefix="Rs" allowEmpty value={ctx.draft.extra.mrp} onChange={(mrp) => ctx.setExtra({ mrp })}
            hint={ctx.draft.extra.mrp && ctx.draft.core.price > ctx.draft.extra.mrp ? 'Rate MRP se zyada hai' : 'Dealer scheme ka discount Purchase me likhein'} />
          <div className="flex flex-wrap gap-1.5">
            <Chip on={ctx.draft.extra.newArrival} onClick={() => ctx.setExtra({ newArrival: !ctx.draft.extra.newArrival })}>Naya aaya</Chip>
            <Chip on={ctx.draft.extra.bestSeller} onClick={() => ctx.setExtra({ bestSeller: !ctx.draft.extra.bestSeller })}>Best seller</Chip>
          </div>
        </div>
      ),
    }),
    specsStep,
    warrantyStep,
    stockWithSerials,
  ],
  summary: (d) => (
    <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-[0.8125rem]">
      {d.extra.categoryType && <p className="text-slate-700">{catMeta(d.extra.categoryType).label}{d.extra.model ? ` · ${d.extra.model}` : ''}</p>}
      {d.extra.warrantyMonths > 0 && <p className="text-emerald-700">Warranty {d.extra.warrantyMonths} mahine{d.extra.compressorMonths ? ` · compressor ${d.extra.compressorMonths}` : ''}</p>}
      {d.extra.install && <p className="text-blue-700">Fitting {d.extra.installFree ? 'free' : d.extra.installCharge ? `Rs ${d.extra.installCharge}` : ''}</p>}
      {serialList(d.extra.serials).length > 0 && <p className="text-violet-700">{serialList(d.extra.serials).length} serial</p>}
    </div>
  ),
  refresh: [PROFILE_KEY, SERIAL_KEY, 'appliance-product-detail'],
  guide: [
    { icon: Barcode, color: '#7c3aed', title: 'Serial', text: 'Naye product par opening stock ke serial yahin scan karein — stock serial ki ginti ke barabar hota hai.' },
    { icon: ShieldCheck, color: '#16a34a', title: 'Warranty', text: 'Company ki poori warranty aur compressor / motor ki alag mahine. Dukaan apni warranty de to "Dukaan ki" ya "Dono".' },
    { icon: HardHat, color: '#2563eb', title: 'Fitting', text: 'Fitting wale product par charge likhein — POS par bechte hi installation book hoti hai aur kaam ke baad bill banta hai.' },
  ],
};

export default function ApplianceProductEditor() {
  return <ProductEditorPage config={config} />;
}
