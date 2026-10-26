/**
 * Electronics product editor: the shared steps plus model, condition and
 * colour; specs relevant to the product type; warranty and box contents;
 * and serial/IMEI entry (scan, paste or type) with the opening stock.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, ClipboardPaste, Cpu, Package, Plus, ScanLine, ShieldCheck, Trash2 } from 'lucide-react';
import { cn } from '@core/lib/cn';
import BarcodeScanner from '@core/components/barcode/BarcodeScanner';
import { categoriesApi } from '@modules/inventory/categories/api/categories.api';
import { ProductEditorPage } from '@modules/inventory/products/editor/ProductEditorPage';
import { basicStep, priceStep, stockStep } from '@modules/inventory/products/editor/coreSteps';
import { Chip, NumberField, Section, TextField, Tiles, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import type { CoreOptions, EditorConfig, StepContext, StepDef } from '@modules/inventory/products/editor/types';
import { stockAdjustmentsApi } from '@modules/inventory/stock-adjustments/api/stock-adjustments.api';
import { electronicsProductsApi } from '../api/products.api';
import { serialTrackingApi } from '../api/serial-tracking.api';
import { TBody, THead, Table, Td, Th, Tr } from '@/design-system/components';
import {
  BOX_CONTENT_OPTIONS, CATEGORY_GROUPS, CATEGORY_META, CONDITION_META, CONDITION_TYPES, SERIAL_SUGGESTED,
  categoryTypeFromName, type CategoryType, type ConditionType,
} from '../constants';

interface Serial { serialNumber: string; imei: string; imei2: string; macAddress: string }

export interface ElectronicsExtra {
  model: string; partNumber: string; categoryType: CategoryType; condition: ConditionType; colorName: string; colorHex: string;
  mrp: number | null; isBestSeller: boolean; isNewArrival: boolean; isTrending: boolean;
  batteryCapacity: string; batteryLifeHours: number | null; chargingTimeMinutes: number | null; powerRating: string;
  connectivity: string[]; screenSize: string; resolution: string; refreshRate: string;
  compatibleOS: string[]; compatibleWith: string[]; waterResistance: string; operatingRange: string;
  weightGrams: number | null; lengthMm: number | null; widthMm: number | null; heightMm: number | null;
  warrantyMonths: number; warrantyType: string; warrantyStart: string; international: boolean;
  boxContents: string[]; hasManual: boolean; hasWarrantyCard: boolean;
  tracked: boolean; hasImei: boolean; serials: Serial[]; serialsOnShelf: number;
}

const initial: ElectronicsExtra = {
  model: '', partNumber: '', categoryType: 'OTHER' as CategoryType, condition: 'BRAND_NEW', colorName: '', colorHex: '',
  mrp: null, isBestSeller: false, isNewArrival: true, isTrending: false,
  batteryCapacity: '', batteryLifeHours: null, chargingTimeMinutes: null, powerRating: '', connectivity: [], screenSize: '', resolution: '', refreshRate: '',
  compatibleOS: [], compatibleWith: [], waterResistance: '', operatingRange: '', weightGrams: null, lengthMm: null, widthMm: null, heightMm: null,
  warrantyMonths: 0, warrantyType: 'Shop Warranty', warrantyStart: new Date().toISOString().slice(0, 10), international: false,
  boxContents: [], hasManual: true, hasWarrantyCard: true, tracked: false, hasImei: false, serials: [], serialsOnShelf: 0,
};

type Spec = 'battery' | 'connectivity' | 'display' | 'compat' | 'durability' | 'size';
const ALL: Spec[] = ['battery', 'connectivity', 'display', 'compat', 'durability', 'size'];
const RELEVANT: Partial<Record<CategoryType, Spec[]>> = {
  HEADPHONE: ['battery', 'connectivity', 'durability', 'size'], EARBUD: ['battery', 'connectivity', 'durability', 'size'],
  SPEAKER: ['battery', 'connectivity', 'durability', 'size'], BLUETOOTH_SPEAKER: ['battery', 'connectivity', 'durability', 'size'],
  MICROPHONE: ['connectivity', 'size'], POWER_BANK: ['battery', 'connectivity', 'size'], CHARGER: ['battery', 'connectivity', 'size'],
  ADAPTER: ['connectivity', 'size'], CONVERTER: ['connectivity', 'size'], CABLE: ['connectivity', 'size'],
  SMARTWATCH: ALL, FITNESS_BAND: ALL, VR_HEADSET: ['battery', 'connectivity', 'display', 'compat', 'size'],
  DRONE: ['battery', 'connectivity', 'display', 'durability', 'size'], CAMERA: ['battery', 'connectivity', 'display', 'durability', 'size'],
  DSLR: ['battery', 'connectivity', 'display', 'size'], ACTION_CAMERA: ['battery', 'connectivity', 'display', 'durability', 'size'],
  GIMBAL: ['battery', 'connectivity', 'size'], TRIPOD: ['size'], WEBCAM: ['connectivity', 'display', 'compat', 'size'],
  KEYBOARD: ['battery', 'connectivity', 'compat', 'size'], MOUSE: ['battery', 'connectivity', 'compat', 'size'],
  MONITOR: ['display', 'connectivity', 'size'], PROJECTOR: ['display', 'connectivity', 'battery', 'size'],
  LAPTOP_ACCESSORY: ['connectivity', 'compat', 'size'], ROUTER: ['connectivity', 'size'],
  MEMORY_CARD: ['connectivity', 'compat', 'durability', 'size'], USB_DRIVE: ['connectivity', 'compat', 'durability', 'size'],
  HARD_DRIVE: ['connectivity', 'compat', 'durability', 'size'], SSD: ['connectivity', 'compat', 'size'],
  PHONE_ACCESSORY: ['compat', 'durability', 'size'], MOBILE_CASE: ['compat', 'durability', 'size'],
  SCREEN_PROTECTOR: ['compat', 'durability', 'size'], TABLET_ACCESSORY: ['compat', 'durability', 'size'],
  CAR_ACCESSORY: ['battery', 'connectivity', 'size'], SMART_HOME: ['connectivity', 'compat', 'battery'], LED_LIGHT: ['connectivity', 'battery', 'size'],
  TV: ['display', 'connectivity', 'size'], HOME_THEATER: ['battery', 'connectivity', 'size'],
  LAPTOP: ['battery', 'connectivity', 'display', 'compat', 'size'], TABLET: ALL, DESKTOP: ['connectivity', 'display', 'compat', 'size'],
  PRINTER: ['connectivity', 'compat', 'size'], GAMING_CONSOLE: ['connectivity', 'compat', 'size'], UPS: ['battery', 'size'],
};
const CONNECTIVITY = ['WiFi', 'WiFi 6', 'WiFi 6E', 'Bluetooth 5.0', 'Bluetooth 5.3', '4G LTE', '5G', 'NFC', 'GPS', 'USB-C', 'USB-A', 'USB 3.0', 'Lightning', 'Micro USB', 'HDMI', 'DisplayPort', 'Thunderbolt', 'Ethernet', '3.5mm Jack', 'AUX', 'Wireless', 'Type-C PD', 'SD Card'];
const OS = ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Chrome OS', 'HarmonyOS', 'watchOS', 'wearOS', 'iPadOS'];
const COMPAT = ['iPhone', 'Samsung', 'Android phones', 'iPad', 'MacBook', 'Windows Laptop', 'PS5', 'Xbox', 'Smart TV'];
const BATTERY = ['300 mAh', '500 mAh', '1000 mAh', '5000 mAh', '10000 mAh', '20000 mAh'];
const POWER = ['5W', '10W', '18W', '20W', '33W', '45W', '65W', '100W', '120W'];
const WATER = ['IPX4', 'IPX5', 'IPX7', 'IP54', 'IP65', 'IP67', 'IP68'];
const REFRESH = ['60Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz'];
const RESOLUTIONS = ['HD (1280x720)', 'FHD (1920x1080)', '2K (2560x1440)', '4K (3840x2160)', 'AMOLED FHD+', 'Retina'];
const COLORS = [['Black', '#000000'], ['White', '#ffffff'], ['Silver', '#c0c0c0'], ['Gold', '#d4af37'], ['Rose Gold', '#b76e79'], ['Blue', '#3b82f6'], ['Red', '#ef4444'], ['Green', '#10b981'], ['Purple', '#8b5cf6'], ['Graphite', '#374151']];
const WARRANTY_MONTHS = [0, 1, 3, 6, 12, 24, 36];
const WARRANTY_TYPES = [
  ['Manufacturer', 'Company khud degi'], ['Local Dealer', 'Pakistan ka dealer dega'], ['Shop Warranty', 'Aap ki dukaan ki zimmedari'],
  ['Extended', 'Alag se khareedi hui'], ['International', 'Duniya bhar mein'],
];

const addMonths = (iso: string, months: number) => {
  if (!iso || !months) return '';
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const opt = (v: string) => v.trim() || undefined;

/** Type name plus the local word for it when that word adds something ("Glass", "Sound system"). */
const typeName = (t: CategoryType) => {
  const { label, urdu } = CATEGORY_META[t];
  return urdu && !label.toLowerCase().includes(urdu.toLowerCase()) ? `${label} (${urdu})` : label;
};

/* ── Basic step additions: model, type, condition, colour ── */
function Identity({ ctx }: { ctx: StepContext<ElectronicsExtra> }) {
  const x = ctx.draft.extra;
  const { data: cats = [] } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list, staleTime: 5 * 60_000 });
  const catName = cats.find((c) => c.id === ctx.draft.core.categoryId)?.name;
  // Picking a shop category suggests the product type, unless the owner already chose one.
  useEffect(() => {
    if (!catName || x.categoryType !== 'OTHER') return;
    const t = categoryTypeFromName(catName);
    if (t !== 'OTHER') ctx.setExtra({ categoryType: t });
  }, [catName]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField label="Model number" value={x.model} onChange={(model) => ctx.setExtra({ model })} placeholder="SM-A155F" />
        <TextField label="Part number" value={x.partNumber} onChange={(partNumber) => ctx.setExtra({ partNumber })} />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Product type</span>
        <select value={x.categoryType} onChange={(e) => ctx.setExtra({ categoryType: e.target.value as CategoryType })} className={inputClass}>
          {CATEGORY_GROUPS.map((g) => (
            <optgroup key={g.label} label={`${g.emoji} ${g.label}`}>
              {g.items.map((t) => <option key={t} value={t}>{CATEGORY_META[t].emoji} {typeName(t)}</option>)}
            </optgroup>
          ))}
        </select>
        <span className="mt-1 block text-[0.75rem] text-slate-500">POS ke filter, specs aur reports isi type se bante hain.</span>
        {SERIAL_SUGGESTED.includes(x.categoryType) && !x.tracked && <span className="mt-1 block text-[0.75rem] text-violet-700">Is type ke har piece ka serial/IMEI aam tor par rakha jata hai — Stock step mein chalu karein.</span>}
      </label>
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Halat</span>
        <Tiles value={x.condition} onChange={(condition) => ctx.setExtra({ condition })} columns="grid-cols-2 sm:grid-cols-3"
          options={CONDITION_TYPES.map((c) => ({ value: c, label: CONDITION_META[c].label, hint: CONDITION_META[c].hint, icon: CONDITION_META[c].emoji }))} />
      </div>
      <div>
        <span className="mb-1.5 block text-[0.8125rem] font-medium text-slate-700">Rang</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {COLORS.map(([n, hex]) => (
            <button key={n} type="button" onClick={() => ctx.setExtra(x.colorName === n ? { colorName: '', colorHex: '' } : { colorName: n, colorHex: hex })}
              className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium ring-1', x.colorName === n ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
              <span className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ backgroundColor: hex }} />{n}
            </button>
          ))}
          <input value={x.colorName} onChange={(e) => ctx.setExtra({ colorName: e.target.value })} placeholder="Apna rang" className="h-8 w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none" />
        </div>
      </div>
    </div>
  );
}

/* ── Specs step ── */
function Specs({ ctx }: { ctx: StepContext<ElectronicsExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const [showAll, setShowAll] = useState(false);
  const relevant = RELEVANT[x.categoryType] ?? ALL;
  const shown = showAll ? ALL : relevant;
  const pick = (items: string[], value: string, on: (v: string) => void) => (
    <div className="mt-1.5 flex flex-wrap gap-1">{items.map((v) => <Chip key={v} on={value === v} onClick={() => on(value === v ? '' : v)}>{v}</Chip>)}</div>
  );
  return (
    <div className="space-y-4">
      <p className="text-[0.8125rem] text-slate-500">
        {CATEGORY_META[x.categoryType].emoji} {CATEGORY_META[x.categoryType].label} ke liye zaroori specs dikh rahe hain. Sab khaali chhor sakte hain.
        {relevant.length < ALL.length && <button type="button" onClick={() => setShowAll((v) => !v)} className="ml-2 font-semibold text-brand-700 hover:underline">{showAll ? 'Kam dikhayein' : 'Sab dikhayein'}</button>}
      </p>
      {shown.includes('battery') && (
        <Section title="Battery aur power">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><TextField label="Battery" value={x.batteryCapacity} onChange={(batteryCapacity) => set({ batteryCapacity })} placeholder="5000 mAh" />{pick(BATTERY, x.batteryCapacity, (batteryCapacity) => set({ batteryCapacity }))}</div>
            <div><TextField label="Power / charging" value={x.powerRating} onChange={(powerRating) => set({ powerRating })} placeholder="20W" />{pick(POWER, x.powerRating, (powerRating) => set({ powerRating }))}</div>
            <NumberField label="Battery kitne ghante" suffix="ghante" allowEmpty value={x.batteryLifeHours} onChange={(batteryLifeHours) => set({ batteryLifeHours })} />
            <NumberField label="Charge hone ka waqt" suffix="minute" allowEmpty value={x.chargingTimeMinutes} onChange={(chargingTimeMinutes) => set({ chargingTimeMinutes })} />
          </div>
        </Section>
      )}
      {shown.includes('connectivity') && (
        <Section title="Connectivity">
          <div className="flex flex-wrap gap-1.5">{CONNECTIVITY.map((c) => <Chip key={c} on={x.connectivity.includes(c)} onClick={() => set({ connectivity: toggle(x.connectivity, c) })}>{c}</Chip>)}</div>
        </Section>
      )}
      {shown.includes('display') && (
        <Section title="Screen">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Size" value={x.screenSize} onChange={(screenSize) => set({ screenSize })} placeholder='6.5"' />
            <div><TextField label="Resolution" value={x.resolution} onChange={(resolution) => set({ resolution })} />{pick(RESOLUTIONS, x.resolution, (resolution) => set({ resolution }))}</div>
            <div><TextField label="Refresh rate" value={x.refreshRate} onChange={(refreshRate) => set({ refreshRate })} />{pick(REFRESH, x.refreshRate, (refreshRate) => set({ refreshRate }))}</div>
          </div>
        </Section>
      )}
      {shown.includes('compat') && (
        <Section title="Kis ke saath chalta hai">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">{OS.map((c) => <Chip key={c} on={x.compatibleOS.includes(c)} onClick={() => set({ compatibleOS: toggle(x.compatibleOS, c) })}>{c}</Chip>)}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[...COMPAT, ...x.compatibleWith.filter((c) => !COMPAT.includes(c))].map((c) => <Chip key={c} on={x.compatibleWith.includes(c)} onClick={() => set({ compatibleWith: toggle(x.compatibleWith, c) })}>{c}</Chip>)}
              <input placeholder="+ aur (Enter)" onKeyDown={(e) => { const v = e.currentTarget.value.trim(); if (e.key === 'Enter' && v) { e.preventDefault(); set({ compatibleWith: [...x.compatibleWith, v] }); e.currentTarget.value = ''; } }}
                className="h-8 w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none" />
            </div>
          </div>
        </Section>
      )}
      {shown.includes('durability') && (
        <Section title="Mazbooti">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><TextField label="Paani se hifazat" value={x.waterResistance} onChange={(waterResistance) => set({ waterResistance })} />{pick(WATER, x.waterResistance, (waterResistance) => set({ waterResistance }))}</div>
            <TextField label="Range" value={x.operatingRange} onChange={(operatingRange) => set({ operatingRange })} placeholder="10 meter" />
          </div>
        </Section>
      )}
      {shown.includes('size') && (
        <Section title="Wazan aur naap">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <NumberField label="Wazan" suffix="g" allowEmpty value={x.weightGrams} onChange={(weightGrams) => set({ weightGrams })} />
            <NumberField label="Lambai" suffix="mm" allowEmpty value={x.lengthMm} onChange={(lengthMm) => set({ lengthMm })} />
            <NumberField label="Chaurai" suffix="mm" allowEmpty value={x.widthMm} onChange={(widthMm) => set({ widthMm })} />
            <NumberField label="Unchai" suffix="mm" allowEmpty value={x.heightMm} onChange={(heightMm) => set({ heightMm })} />
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Warranty step ── */
function Warranty({ ctx }: { ctx: StepContext<ElectronicsExtra> }) {
  const x = ctx.draft.extra;
  const set = ctx.setExtra;
  const end = addMonths(x.warrantyStart, x.warrantyMonths);
  return (
    <div className="space-y-4">
      <Section icon={ShieldCheck} title="Warranty" hint="Bill par yahi likha jayega">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {WARRANTY_MONTHS.map((m) => <Chip key={m} on={x.warrantyMonths === m} onClick={() => set({ warrantyMonths: m })}>{m === 0 ? 'Koi nahi' : m < 12 ? `${m} mahine` : `${m / 12} saal`}</Chip>)}
            <input inputMode="numeric" value={WARRANTY_MONTHS.includes(x.warrantyMonths) ? '' : x.warrantyMonths || ''} placeholder="Apne mahine"
              onChange={(e) => set({ warrantyMonths: Number(e.target.value.replace(/\D/g, '')) || 0 })}
              className="h-8 w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none" />
          </div>
          {x.warrantyMonths > 0 && (
            <>
              <Tiles value={x.warrantyType} onChange={(warrantyType) => set({ warrantyType })} columns="grid-cols-2 sm:grid-cols-5"
                options={WARRANTY_TYPES.map(([v, hint]) => ({ value: v, label: v, hint }))} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-[0.8125rem] font-medium text-slate-700">Shuru
                  <input type="date" value={x.warrantyStart} onChange={(e) => set({ warrantyStart: e.target.value })} className={cn(inputClass, 'mt-1.5')} />
                </label>
                <div className="rounded-xl bg-success-50 p-3 text-[0.8125rem] text-success-800">
                  <p className="font-medium">Khatam</p>
                  <p className="text-[1.0625rem] font-bold">{end ? new Date(end).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>
                </div>
              </div>
              <Toggle on={x.international} onChange={(international) => set({ international })} title="International warranty" hint="Bahar ke mulk mein bhi chalegi" />
            </>
          )}
        </div>
      </Section>
      <Section icon={Package} title="Dabbe mein kya hai">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {[...BOX_CONTENT_OPTIONS, ...x.boxContents.filter((b) => !BOX_CONTENT_OPTIONS.includes(b))].map((b) => <Chip key={b} on={x.boxContents.includes(b)} onClick={() => set({ boxContents: toggle(x.boxContents, b) })}>{b}</Chip>)}
            <input placeholder="+ aur (Enter)" onKeyDown={(e) => { const v = e.currentTarget.value.trim(); if (e.key === 'Enter' && v) { e.preventDefault(); set({ boxContents: [...x.boxContents, v] }); e.currentTarget.value = ''; } }}
              className="h-8 w-28 rounded-full border border-dashed border-slate-300 bg-transparent px-3 text-[0.8125rem] outline-none" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle on={x.hasManual} onChange={(hasManual) => set({ hasManual })} title="Manual saath hai" />
            <Toggle on={x.hasWarrantyCard} onChange={(hasWarrantyCard) => set({ hasWarrantyCard })} title="Warranty card saath hai" />
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ── Stock step addition: serial/IMEI ── */
function Serials({ ctx }: { ctx: StepContext<ElectronicsExtra> }) {
  const x = ctx.draft.extra;
  const [scan, setScan] = useState(false);
  const [paste, setPaste] = useState('');
  const known = useMemo(() => new Set(x.serials.flatMap((s) => [s.serialNumber, s.imei].filter(Boolean))), [x.serials]);
  const addOne = (code: string) => {
    const c = code.trim();
    if (!c || known.has(c)) return false;
    const imei = /^\d{15}$/.test(c) ? c : '';
    ctx.setExtra({ serials: [...x.serials, { serialNumber: c, imei, imei2: '', macAddress: '' }], hasImei: x.hasImei || !!imei });
    return true;
  };
  const parsed = paste.split('\n').map((l) => l.split(/[,\t]/).map((p) => p.trim())).filter((p) => p[0]);
  const update = (i: number, patch: Partial<Serial>) => ctx.setExtra({ serials: x.serials.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <Section icon={Barcode} title="Serial / IMEI" hint="Har piece ka apna number — warranty aur chori ke waqt kaam aata hai">
      {scan && <BarcodeScanner onDetected={(c: string) => { addOne(c); }} onClose={() => setScan(false)} />}
      <Toggle on={x.tracked} onChange={(tracked) => ctx.setExtra({ tracked })} icon={Barcode} title="Har piece ka serial rakhein"
        hint={x.tracked ? 'Stock = jitne serial shelf par hain' : 'Band ho to sirf ginti hoti hai'} />
      {x.tracked && (
        <div className="mt-4 space-y-3">
          {ctx.isEdit && <p className="text-[0.8125rem] text-slate-600">Abhi shelf par <strong>{x.serialsOnShelf}</strong> serial hain. Yahan sirf <strong>naye</strong> daalein — purane Serials page par hain.</p>}
          <Toggle on={x.hasImei} onChange={(hasImei) => ctx.setExtra({ hasImei })} title="IMEI wala device (phone, tablet)" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setScan(true)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-[0.8125rem] font-semibold text-white"><ScanLine className="h-4 w-4" />Lagataar scan</button>
            <button type="button" onClick={() => ctx.setExtra({ serials: [...x.serials, { serialNumber: '', imei: '', imei2: '', macAddress: '' }] })} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 text-[0.8125rem] font-semibold text-slate-700"><Plus className="h-4 w-4" />Haath se</button>
          </div>
          <details className="rounded-xl bg-slate-50 p-3">
            <summary className="flex cursor-pointer items-center gap-1.5 text-[0.8125rem] font-semibold text-slate-700"><ClipboardPaste className="h-4 w-4" />Excel se paste (serial, imei, imei2, mac)</summary>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder={'SN001, 356789012345678\nSN002, 356789012345679'} className={cn(inputClass, 'mt-2 h-auto py-2 font-mono text-[0.8125rem]')} />
            {parsed.length > 0 && (
              <button type="button" onClick={() => {
                const add = parsed.filter((p) => !known.has(p[0])).map((p) => ({ serialNumber: p[0], imei: p[1] ?? '', imei2: p[2] ?? '', macAddress: p[3] ?? '' }));
                ctx.setExtra({ serials: [...x.serials, ...add], hasImei: x.hasImei || add.some((a) => a.imei) });
                setPaste('');
              }} className="mt-2 h-9 rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white">{parsed.filter((p) => !known.has(p[0])).length} naye jorein{parsed.some((p) => known.has(p[0])) ? ` · ${parsed.filter((p) => known.has(p[0])).length} pehle se hain` : ''}</button>
            )}
          </details>
          {x.serials.length > 0 && (
            <div className="overflow-hidden rounded-xl ring-1 ring-slate-200">
              <Table minWidth="36rem">
                <THead><Tr><Th className="px-3 py-2">Serial</Th>{x.hasImei && <><Th className="px-2 py-2">IMEI</Th><Th className="px-2 py-2">IMEI 2</Th></>}<Th className="px-2 py-2">MAC</Th><Th /></Tr></THead>
                <TBody>
                  {x.serials.map((s, i) => (
                    <Tr key={i}>
                      <Td className="px-3 py-1.5"><input value={s.serialNumber} onChange={(e) => update(i, { serialNumber: e.target.value })} className={cn(inputClass, 'h-9 font-mono text-[0.8125rem]')} /></Td>
                      {x.hasImei && <>
                        <Td className="px-2 py-1.5"><input value={s.imei} onChange={(e) => update(i, { imei: e.target.value })} className={cn(inputClass, 'h-9 font-mono text-[0.8125rem]')} /></Td>
                        <Td className="px-2 py-1.5"><input value={s.imei2} onChange={(e) => update(i, { imei2: e.target.value })} className={cn(inputClass, 'h-9 font-mono text-[0.8125rem]')} /></Td>
                      </>}
                      <Td className="px-2 py-1.5"><input value={s.macAddress} onChange={(e) => update(i, { macAddress: e.target.value })} className={cn(inputClass, 'h-9 font-mono text-[0.8125rem]')} /></Td>
                      <Td className="px-2 py-1.5"><button type="button" onClick={() => ctx.setExtra({ serials: x.serials.filter((_, j) => j !== i) })} aria-label="Hatayein" className="flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            </div>
          )}
          {ctx.errors.serials && <p className="text-[0.8125rem] font-medium text-rose-600">{ctx.errors.serials}</p>}
        </div>
      )}
    </Section>
  );
}

const core: CoreOptions = {
  units: [{ value: 'pcs', label: 'Adad (pcs)' }, { value: 'set', label: 'Set' }, { value: 'pair', label: 'Joda' }, { value: 'box', label: 'Dabba' }, { value: 'meter', label: 'Meter' }],
  skuPrefix: 'ELEC',
  variants: { presets: [{ group: 'Storage', values: ['64GB', '128GB', '256GB', '512GB'] }, { group: 'RAM', values: ['4GB', '6GB', '8GB', '12GB'] }, { group: 'Rang', values: ['Black', 'White', 'Blue', 'Silver'] }] },
  markups: [10, 15, 20, 25, 30, 40],
};

const specsStep: StepDef<ElectronicsExtra> = { id: 'specs', title: 'Specs', hint: 'Battery, screen, connectivity', icon: Cpu, render: (ctx) => <Specs ctx={ctx} /> };
const warrantyStep: StepDef<ElectronicsExtra> = {
  id: 'warranty', title: 'Warranty', hint: 'Mahine, type, dabba', icon: ShieldCheck, render: (ctx) => <Warranty ctx={ctx} />,
  validate: (d): Record<string, string> => (d.extra.warrantyMonths < 0 ? { warranty: 'Mahine ulte nahi ho sakte' } : {}),
};
const stock = stockStep<ElectronicsExtra>(core, { extra: (ctx) => <Serials ctx={ctx} />, quick: [1, 5, 10, 25, 50, 100] });
const stockWithSerials: StepDef<ElectronicsExtra> = {
  ...stock,
  validate: (d, isEdit) => {
    const e = stock.validate?.(d, isEdit) ?? {};
    const s = d.extra;
    if (s.tracked && !isEdit && !d.core.variants.length && s.serials.length === 0) e.serials = 'Kam az kam ek serial daalein, ya serial band karein';
    const nums = s.serials.map((x) => x.serialNumber.trim());
    if (nums.some((n) => !n)) e.serials = 'Har line mein serial likhein';
    else if (new Set(nums).size !== nums.length) e.serials = 'Ek serial do dafa likha hai';
    const imeis = s.serials.map((x) => x.imei.trim()).filter(Boolean);
    if (new Set(imeis).size !== imeis.length) e.serials = 'Ek IMEI do dafa likha hai';
    return e;
  },
};

const config: EditorConfig<ElectronicsExtra> = {
  label: 'Electronics',
  draftKey: 'nafaa.product-editor.electronics',
  paths: { list: '/products', detail: (id) => `/electronics-products/${id}`, create: '/electronics-products/new' },
  core,
  extra: {
    initial,
    load: async (productId) => {
      const [p, serials] = await Promise.all([
        electronicsProductsApi.byProduct(productId).catch(() => null),
        serialTrackingApi.list({ productId, status: 'IN_STOCK' }).catch(() => []),
      ]);
      if (!p) return {};
      return {
        model: p.modelNumber ?? '', partNumber: p.partNumber ?? '', categoryType: (p.categoryType ?? 'OTHER') as CategoryType, condition: (p.conditionType ?? 'BRAND_NEW') as ConditionType,
        colorName: p.colorName ?? '', colorHex: p.colorHex ?? '', mrp: p.mrp ?? null, isBestSeller: p.isBestSeller, isNewArrival: p.isNewArrival, isTrending: p.isTrending,
        batteryCapacity: p.batteryCapacity ?? '', batteryLifeHours: p.batteryLifeHours ?? null, chargingTimeMinutes: p.chargingTimeMinutes ?? null, powerRating: p.powerRating ?? '',
        connectivity: p.connectivity ?? [], screenSize: p.screenSize ?? '', resolution: p.resolution ?? '', refreshRate: p.refreshRate ?? '',
        compatibleOS: p.compatibleOS ?? [], compatibleWith: p.compatibleWith ?? [], waterResistance: p.waterResistance ?? '', operatingRange: p.operatingRange ?? '',
        weightGrams: p.weightGrams ?? null, lengthMm: p.lengthMm ?? null, widthMm: p.widthMm ?? null, heightMm: p.heightMm ?? null,
        warrantyMonths: p.warrantyMonths ?? 0, warrantyType: p.warrantyType ?? 'Shop Warranty', international: p.hasInternationalWarranty,
        boxContents: p.boxContents ?? [], hasManual: p.hasManual, hasWarrantyCard: p.hasWarrantyCard,
        tracked: p.requiresSerial, hasImei: p.hasImei, serialsOnShelf: (serials as unknown[]).length,
      };
    },
    product: (d, payload) => (
      // With serials on, a new product's stock is the number of serials entered.
      !payload.stock && d.extra.tracked && d.extra.serials.length && !d.core.variants.length ? { ...payload, stock: d.extra.serials.length } : payload
    ),
    save: async (productId, d, { isEdit, shopId }) => {
      const x = d.extra;
      const c = d.core;
      await electronicsProductsApi.upsert({
        productId, brandId: c.brandId ?? undefined, categoryType: x.categoryType, conditionType: x.condition,
        modelNumber: opt(x.model), partNumber: opt(x.partNumber), colorName: opt(x.colorName), colorHex: opt(x.colorHex),
        connectivity: x.connectivity, powerRating: opt(x.powerRating), batteryCapacity: opt(x.batteryCapacity),
        batteryLifeHours: x.batteryLifeHours ?? undefined, chargingTimeMinutes: x.chargingTimeMinutes ?? undefined,
        operatingRange: opt(x.operatingRange), waterResistance: opt(x.waterResistance), screenSize: opt(x.screenSize),
        resolution: opt(x.resolution), refreshRate: opt(x.refreshRate), compatibleWith: x.compatibleWith, compatibleOS: x.compatibleOS,
        weightGrams: x.weightGrams ?? undefined, lengthMm: x.lengthMm ?? undefined, widthMm: x.widthMm ?? undefined, heightMm: x.heightMm ?? undefined,
        warrantyMonths: x.warrantyMonths, warrantyType: x.warrantyMonths ? x.warrantyType : 'No Warranty', hasInternationalWarranty: x.international,
        requiresSerial: x.tracked, hasImei: x.hasImei, boxContents: x.boxContents, hasManual: x.hasManual, hasWarrantyCard: x.hasWarrantyCard,
        mrp: x.mrp ?? undefined, costPrice: c.costPrice, wholesalePrice: c.wholesalePrice ?? undefined, retailPrice: c.price,
        isFeatured: c.isFeatured, isBestSeller: x.isBestSeller, isNewArrival: x.isNewArrival, isTrending: x.isTrending,
      });
      const entries = x.tracked ? x.serials.filter((s) => s.serialNumber.trim()).map((s) => ({
        serialNumber: s.serialNumber.trim(), imei: opt(s.imei), imei2: opt(s.imei2), macAddress: opt(s.macAddress),
      })) : [];
      if (entries.length) {
        const res = await serialTrackingApi.bulkCreate({
          productId, shopId, entries, purchasePrice: c.costPrice,
          warrantyStartDate: x.warrantyMonths ? x.warrantyStart : undefined,
          warrantyEndDate: x.warrantyMonths ? addMonths(x.warrantyStart, x.warrantyMonths) : undefined,
        });
        // New pieces on an existing product: stock rises by the serials actually added.
        if (isEdit && res.created > 0) {
          await stockAdjustmentsApi.create({ productId, shopId, type: 'ADJUSTMENT_IN', quantity: res.created, reason: 'Naye serial/IMEI aaye' });
        }
      }
    },
  },
  steps: [
    basicStep<ElectronicsExtra>(core, { extra: (ctx) => <Identity ctx={ctx} />, namePlaceholder: 'Jaise: Samsung Galaxy A15 128GB' }),
    priceStep<ElectronicsExtra>(core, {
      extra: (ctx) => (
        <div className="space-y-3">
          <NumberField label="MRP (dabbe par likhi qeemat)" prefix="Rs" allowEmpty value={ctx.draft.extra.mrp} onChange={(mrp) => ctx.setExtra({ mrp })}
            hint={ctx.draft.extra.mrp && ctx.draft.core.price > ctx.draft.extra.mrp ? 'Rate MRP se zyada hai' : undefined} />
          <div className="flex flex-wrap gap-1.5">
            <Chip on={ctx.draft.extra.isNewArrival} onClick={() => ctx.setExtra({ isNewArrival: !ctx.draft.extra.isNewArrival })}>Naya aaya</Chip>
            <Chip on={ctx.draft.extra.isBestSeller} onClick={() => ctx.setExtra({ isBestSeller: !ctx.draft.extra.isBestSeller })}>Best seller</Chip>
            <Chip on={ctx.draft.extra.isTrending} onClick={() => ctx.setExtra({ isTrending: !ctx.draft.extra.isTrending })}>Trending</Chip>
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
      <p className="text-slate-600">{CATEGORY_META[d.extra.categoryType].emoji} {CATEGORY_META[d.extra.categoryType].label} · {CONDITION_META[d.extra.condition].label}</p>
      {d.extra.warrantyMonths > 0 && <p className="text-success-700">Warranty {d.extra.warrantyMonths} mahine</p>}
      {d.extra.tracked && <p className="text-violet-700">{d.extra.serials.length} naye serial</p>}
    </div>
  ),
  refresh: ['electronics-products-list', 'electronics-profiles-all', 'electronics-profile', 'electronics-product-detail-extra', 'product-serials'],
};

export default function ElectronicsProductEditor() {
  return <ProductEditorPage config={config} />;
}
