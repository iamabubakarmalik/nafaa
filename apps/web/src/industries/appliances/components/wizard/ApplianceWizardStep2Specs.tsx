import { useState } from 'react';
import {
  Sparkles, Zap, Battery, Ruler, Snowflake, Wind, Refrigerator,
  Wrench, Monitor, Plus, X,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ApplianceWizardSpecs } from '../../hooks/useApplianceWizard';

interface Props {
  specs: ApplianceWizardSpecs;
  onChange: (patch: Partial<ApplianceWizardSpecs>) => void;
  categoryType?: string;
  errors: string[];
}

const ENERGY_RATINGS = [
  { v: 'FIVE_STAR', l: '⭐⭐⭐⭐⭐ 5 Star', color: 'emerald' },
  { v: 'FOUR_STAR', l: '⭐⭐⭐⭐ 4 Star', color: 'green' },
  { v: 'THREE_STAR', l: '⭐⭐⭐ 3 Star', color: 'lime' },
  { v: 'TWO_STAR', l: '⭐⭐ 2 Star', color: 'amber' },
  { v: 'ONE_STAR', l: '⭐ 1 Star', color: 'orange' },
  { v: 'INVERTER', l: '⚡ Inverter', color: 'blue' },
  { v: 'NOT_RATED', l: 'Not Rated', color: 'slate' },
];

const AC_TONNAGES = ['0.75 Ton', '1.0 Ton', '1.5 Ton', '2.0 Ton', '2.5 Ton', '3.0 Ton'];
const AC_TYPES = ['Split', 'Window', 'Cassette', 'Portable', 'Central', 'VRF'];
const REFRIGERANTS = ['R32', 'R410A', 'R22', 'R134a', 'R600a', 'R290'];
const REFRIGERATOR_TYPES = ['Single Door', 'Double Door', 'Side-by-Side', 'French Door', 'Bottom Freezer', 'Mini'];
const WASHING_TYPES = ['Fully Automatic', 'Semi Automatic', 'Twin Tub', 'Front Load', 'Top Load'];
const COMPRESSORS = ['Digital Inverter', 'Rotary', 'Linear', 'Reciprocating', 'Scroll'];
const DISPLAY_TYPES = ['LED', 'LCD', 'QLED', 'OLED', 'MicroLED', 'Nano Cell'];
const SMART_OS = ['Android TV', 'WebOS (LG)', 'Tizen (Samsung)', 'Google TV', 'Fire TV', 'Roku'];

const COMMON_FEATURES = [
  'Auto Restart', 'Sleep Mode', 'Quick Cool', 'Turbo Mode', 'Timer',
  'Dehumidifier', 'Air Purifier', 'Anti-Bacterial', 'Self Clean',
  'Voice Control', 'Wi-Fi', 'Remote Control', 'Digital Display',
  'Child Lock', 'Auto Defrost', 'Fast Freeze', 'Ice Maker', 'Water Dispenser',
];

const COMMON_SMART = [
  'Wi-Fi', 'Bluetooth', 'App Control', 'Voice Assistant', 'Alexa', 'Google Home',
  'Smart Diagnosis', 'Energy Monitoring', 'Remote Diagnostics', 'OTA Updates',
];

const COMMON_SAFETY = [
  'Auto Shut-off', 'Overload Protection', 'Voltage Protection', 'Child Lock',
  'Anti-Tip', 'Cool Touch', 'Overheat Protection', 'Circuit Breaker',
];

export function ApplianceWizardStep2Specs({ specs, onChange, categoryType }: Props) {
  const [newFeature, setNewFeature] = useState('');

  const isAC = categoryType?.includes('AIR_CONDITIONER');
  const isFridge = categoryType?.includes('REFRIGERATOR') || categoryType?.includes('FREEZER');
  const isWashing = categoryType?.includes('WASHING_MACHINE') || categoryType === 'DRYER';
  const isTV = categoryType?.includes('TV');

  const togFeature = (list: string[], key: keyof ApplianceWizardSpecs, item: string) => {
    const cur = list ?? [];
    const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
    onChange({ [key]: next } as any);
  };

  const addCustomFeature = () => {
    const t = newFeature.trim();
    if (!t) return;
    onChange({ features: [...(specs.features ?? []), t] });
    setNewFeature('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-cyan-50 border-2 border-cyan-200 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
        <div className="text-sm text-cyan-900">
          <div className="font-extrabold mb-1">Specifications</div>
          <div className="font-semibold">Category ke hisaab se relevant fields dikhaye jaayenge. Skip karna bhi theek hai — sab optional hai.</div>
        </div>
      </div>

      {/* GENERAL SPECS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Ruler} title="General Specifications" tone="slate" />

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Capacity</label>
          <input value={specs.capacity} onChange={(e) => onChange({ capacity: e.target.value })}
            placeholder="e.g. 400L, 1.5 Ton, 8kg"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-cyan-500" />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Power Consumption" placeholder="500W" value={specs.powerConsumption}
            onChange={(e) => onChange({ powerConsumption: e.target.value })} />
          <Input label="Voltage" placeholder="220V" value={specs.voltage}
            onChange={(e) => onChange({ voltage: e.target.value })} />
          <Input label="Frequency" placeholder="50Hz" value={specs.frequency}
            onChange={(e) => onChange({ frequency: e.target.value })} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Weight (kg)" type="number" step="0.1" placeholder="45" value={specs.weightKg}
            onChange={(e) => onChange({ weightKg: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Dimensions (W×D×H)" placeholder="60 × 65 × 175 cm" value={specs.dimensions}
            onChange={(e) => onChange({ dimensions: e.target.value })} />
        </div>
      </section>

      {/* ENERGY */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHead icon={Zap} title="Energy Efficiency" tone="emerald" />

        <div>
          <label className="block text-xs font-extrabold uppercase text-emerald-700 mb-1.5">Energy Rating</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ENERGY_RATINGS.map((r) => {
              const a = specs.energyRating === r.v;
              return (
                <button key={r.v} type="button" onClick={() => onChange({ energyRating: r.v })}
                  className={['p-2.5 rounded-xl border-2 text-xs font-extrabold text-center transition',
                    a ? 'border-emerald-600 bg-emerald-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                  {r.l}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-white cursor-pointer">
            <input type="checkbox" checked={specs.isEnergyStar}
              onChange={(e) => onChange({ isEnergyStar: e.target.checked })}
              className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-emerald-800">⭐ Energy Star</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-blue-200 bg-white cursor-pointer">
            <input type="checkbox" checked={specs.isInverter}
              onChange={(e) => onChange({ isInverter: e.target.checked })}
              className="h-4 w-4 rounded" />
            <span className="text-xs font-extrabold text-blue-800">⚡ Inverter Technology</span>
          </label>
        </div>
      </section>

      {/* AC SPECIFIC */}
      {isAC && (
        <section className="rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-white p-5 space-y-4">
          <SectionHead icon={Snowflake} title="Air Conditioner Details" tone="sky" />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-extrabold uppercase text-sky-700 mb-1.5">Tonnage</label>
              <select value={specs.acTonnage} onChange={(e) => onChange({ acTonnage: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
                <option value="">Select tonnage</option>
                {AC_TONNAGES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase text-sky-700 mb-1.5">AC Type</label>
              <select value={specs.acType} onChange={(e) => onChange({ acType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
                <option value="">Select type</option>
                {AC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Cooling Capacity" placeholder="18000 BTU" value={specs.coolingCapacity}
              onChange={(e) => onChange({ coolingCapacity: e.target.value })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-sky-700 mb-1.5">Refrigerant</label>
              <select value={specs.refrigerantType} onChange={(e) => onChange({ refrigerantType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
                <option value="">Select refrigerant</option>
                {REFRIGERANTS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* REFRIGERATOR SPECIFIC */}
      {isFridge && (
        <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
          <SectionHead icon={Refrigerator} title="Refrigerator Details" tone="blue" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Capacity (Liters)" type="number" placeholder="400" value={specs.fridgeCapacityLiters}
              onChange={(e) => onChange({ fridgeCapacityLiters: e.target.value === '' ? '' : Number(e.target.value) })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-blue-700 mb-1.5">Refrigerator Type</label>
              <select value={specs.refrigeratorType} onChange={(e) => onChange({ refrigeratorType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                <option value="">Select type</option>
                {REFRIGERATOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Door Count" type="number" placeholder="2" value={specs.doorCount}
              onChange={(e) => onChange({ doorCount: e.target.value === '' ? '' : Number(e.target.value) })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-blue-700 mb-1.5">Compressor Type</label>
              <select value={specs.compressorType} onChange={(e) => onChange({ compressorType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
                <option value="">Select compressor</option>
                {COMPRESSORS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* WASHING MACHINE SPECIFIC */}
      {isWashing && (
        <section className="rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-5 space-y-4">
          <SectionHead icon={Wind} title="Washing Machine Details" tone="violet" />
          <div className="grid sm:grid-cols-3 gap-3">
            <Input label="Capacity (kg)" type="number" step="0.5" placeholder="8" value={specs.washingCapacityKg}
              onChange={(e) => onChange({ washingCapacityKg: e.target.value === '' ? '' : Number(e.target.value) })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-violet-700 mb-1.5">Type</label>
              <select value={specs.washingType} onChange={(e) => onChange({ washingType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
                <option value="">Select type</option>
                {WASHING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="RPM" type="number" placeholder="1400" value={specs.rpm}
              onChange={(e) => onChange({ rpm: e.target.value === '' ? '' : Number(e.target.value) })} />
          </div>
        </section>
      )}

      {/* TV SPECIFIC */}
      {isTV && (
        <section className="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white p-5 space-y-4">
          <SectionHead icon={Monitor} title="TV Details" tone="purple" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Screen Size (inch)" type="number" placeholder="55" value={specs.screenSizeInch}
              onChange={(e) => onChange({ screenSizeInch: e.target.value === '' ? '' : Number(e.target.value) })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-purple-700 mb-1.5">Display Type</label>
              <select value={specs.displayType} onChange={(e) => onChange({ displayType: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-purple-500">
                <option value="">Select type</option>
                {DISPLAY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Input label="Resolution" placeholder="4K UHD (3840×2160)" value={specs.resolution}
              onChange={(e) => onChange({ resolution: e.target.value })} />
            <div>
              <label className="block text-xs font-extrabold uppercase text-purple-700 mb-1.5">Smart OS</label>
              <select value={specs.smartOS} onChange={(e) => onChange({ smartOS: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-purple-500">
                <option value="">Not smart / Select OS</option>
                {SMART_OS.map((os) => <option key={os} value={os}>{os}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* FEATURES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Sparkles} title="Features" tone="amber" />
        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-2">Common features — click to add</label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_FEATURES.map((f) => {
              const a = specs.features?.includes(f);
              return (
                <button key={f} type="button" onClick={() => togFeature(specs.features, 'features', f)}
                  className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition',
                    a ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                  {a ? '✓ ' : '+ '}{f}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Custom feature</label>
          <div className="flex gap-2">
            <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomFeature()}
              placeholder="e.g. Twin Cooling System"
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <button type="button" onClick={addCustomFeature} disabled={!newFeature.trim()}
              className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
      </section>

      {/* SMART FEATURES */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Zap} title="Smart Features" tone="blue" />
        <div className="flex flex-wrap gap-1.5">
          {COMMON_SMART.map((f) => {
            const a = specs.smartFeatures?.includes(f);
            return (
              <button key={f} type="button" onClick={() => togFeature(specs.smartFeatures, 'smartFeatures', f)}
                className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition',
                  a ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                {a ? '✓ ' : '+ '}{f}
              </button>
            );
          })}
        </div>
      </section>

      {/* SAFETY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Wrench} title="Safety Features" tone="rose" />
        <div className="flex flex-wrap gap-1.5">
          {COMMON_SAFETY.map((f) => {
            const a = specs.safetyFeatures?.includes(f);
            return (
              <button key={f} type="button" onClick={() => togFeature(specs.safetyFeatures, 'safetyFeatures', f)}
                className={['px-2.5 py-1 rounded-lg border-2 text-[11px] font-extrabold transition',
                  a ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300'].join(' ')}>
                {a ? '✓ ' : '+ '}{f}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-teal-700',
    sky: 'from-sky-500 to-blue-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    purple: 'from-purple-500 to-fuchsia-700',
    amber: 'from-amber-500 to-orange-700',
    rose: 'from-rose-500 to-red-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900">{title}</h3>
    </div>
  );
}
