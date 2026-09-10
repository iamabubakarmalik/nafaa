import { useState, useMemo } from 'react';
import {
  Sparkles, Wifi, Battery, Monitor, Ruler, Droplets, Cable, Plus, X,
  Check, ChevronDown, ChevronUp, Zap, Smartphone, Lightbulb, Eye, EyeOff,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ElectronicsWizardSpecs } from '../../hooks/useElectronicsWizard';
import { CATEGORY_META, type CategoryType } from '../../constants';

/* ═════════════════════════════════════════════════════════════
   STEP 2 — TECH SPECS (category ke hisab se)
   ─────────────────────────────────────────────────────────────
   Pehle har product par saari 6 sections khulti thin — headphone
   ke liye bhi "Refresh Rate" poochha jata tha. Ab jo category
   chuni hai sirf uske kaam ki sections upar aati hain, baqi
   "Aur cheezein" me chhup jati hain.
   ═════════════════════════════════════════════════════════════ */

interface Props {
  specs: ElectronicsWizardSpecs;
  onChange: (patch: Partial<ElectronicsWizardSpecs>) => void;
  categoryType?: string;
  errors: string[];
}

type SectionKey = 'battery' | 'connectivity' | 'display' | 'compat' | 'durability' | 'size';

/* Kis category me kaun si sections kaam ki hain */
const RELEVANT: Partial<Record<CategoryType, SectionKey[]>> = {
  HEADPHONE:        ['battery', 'connectivity', 'durability', 'size'],
  EARBUD:           ['battery', 'connectivity', 'durability', 'size'],
  SPEAKER:          ['battery', 'connectivity', 'durability', 'size'],
  BLUETOOTH_SPEAKER:['battery', 'connectivity', 'durability', 'size'],
  MICROPHONE:       ['connectivity', 'size'],
  POWER_BANK:       ['battery', 'connectivity', 'size'],
  CHARGER:          ['battery', 'connectivity', 'size'],
  ADAPTER:          ['connectivity', 'size'],
  CONVERTER:        ['connectivity', 'size'],
  CABLE:            ['connectivity', 'size'],
  SMARTWATCH:       ['battery', 'connectivity', 'display', 'compat', 'durability', 'size'],
  FITNESS_BAND:     ['battery', 'connectivity', 'display', 'compat', 'durability', 'size'],
  VR_HEADSET:       ['battery', 'connectivity', 'display', 'compat', 'size'],
  DRONE:            ['battery', 'connectivity', 'display', 'durability', 'size'],
  CAMERA:           ['battery', 'connectivity', 'display', 'durability', 'size'],
  DSLR:             ['battery', 'connectivity', 'display', 'size'],
  ACTION_CAMERA:    ['battery', 'connectivity', 'display', 'durability', 'size'],
  GIMBAL:           ['battery', 'connectivity', 'size'],
  TRIPOD:           ['size'],
  WEBCAM:           ['connectivity', 'display', 'compat', 'size'],
  KEYBOARD:         ['battery', 'connectivity', 'compat', 'size'],
  MOUSE:            ['battery', 'connectivity', 'compat', 'size'],
  MONITOR:          ['display', 'connectivity', 'size'],
  PROJECTOR:        ['display', 'connectivity', 'battery', 'size'],
  LAPTOP_ACCESSORY: ['connectivity', 'compat', 'size'],
  ROUTER:           ['connectivity', 'size'],
  MEMORY_CARD:      ['connectivity', 'compat', 'durability', 'size'],
  USB_DRIVE:        ['connectivity', 'compat', 'durability', 'size'],
  HARD_DRIVE:       ['connectivity', 'compat', 'durability', 'size'],
  SSD:              ['connectivity', 'compat', 'size'],
  PHONE_ACCESSORY:  ['compat', 'durability', 'size'],
  MOBILE_CASE:      ['compat', 'durability', 'size'],
  SCREEN_PROTECTOR: ['compat', 'durability', 'size'],
  TABLET_ACCESSORY: ['compat', 'durability', 'size'],
  CAR_ACCESSORY:    ['battery', 'connectivity', 'size'],
  SMART_HOME:       ['connectivity', 'compat', 'battery'],
  LED_LIGHT:        ['connectivity', 'battery', 'size'],
};

const ALL_SECTIONS: SectionKey[] = ['battery', 'connectivity', 'display', 'compat', 'durability', 'size'];

const CONNECTIVITY_OPTIONS = [
  'WiFi', 'WiFi 6', 'WiFi 6E', 'WiFi 7',
  'Bluetooth 5.0', 'Bluetooth 5.1', 'Bluetooth 5.2', 'Bluetooth 5.3',
  '4G LTE', '5G', 'NFC', 'GPS',
  'USB-C', 'USB-A', 'USB 3.0', 'Lightning', 'Micro USB',
  'HDMI', 'DisplayPort', 'Thunderbolt', 'Ethernet',
  '3.5mm Jack', 'Optical', 'AUX', 'Wireless', 'Type-C PD', 'SD Card',
];

const OS_OPTIONS = ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Chrome OS', 'HarmonyOS', 'watchOS', 'wearOS', 'iPadOS'];
const WATER_RATINGS = ['IP54', 'IP55', 'IP65', 'IP66', 'IP67', 'IP68', 'IPX4', 'IPX5', 'IPX7', 'IPX8'];
const REFRESH_RATES = ['60Hz', '75Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz', '360Hz'];
const RESOLUTIONS = [
  'HD (1280x720)', 'FHD (1920x1080)', '2K (2560x1440)', '4K (3840x2160)', '8K (7680x4320)',
  'Retina', 'Super Retina XDR', 'AMOLED FHD+', 'Dynamic AMOLED',
];
const COMPAT_PRESETS = ['iPhone', 'Samsung', 'Android phones', 'iPad', 'MacBook', 'Windows Laptop', 'PS5', 'Xbox', 'Smart TV'];

/* Aam battery presets — bar bar type karne se bachne ke liye */
const BATTERY_PRESETS = ['300 mAh', '500 mAh', '1000 mAh', '5000 mAh', '10000 mAh', '20000 mAh'];
const POWER_PRESETS = ['5W', '10W', '18W', '20W', '33W', '45W', '65W USB-C PD', '100W', '120W'];

export function ElectronicsWizardStep2Specs({ specs, onChange, categoryType }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [compatInput, setCompatInput] = useState('');

  const cat = (categoryType as CategoryType) || 'OTHER';
  const meta = CATEGORY_META[cat];

  const relevant = useMemo<SectionKey[]>(() => {
    const r = RELEVANT[cat];
    return r && r.length ? r : ALL_SECTIONS;
  }, [cat]);

  const hidden = useMemo(() => ALL_SECTIONS.filter((s) => !relevant.includes(s)), [relevant]);

  /* Kitne khaane bhare hain — user ko progress ka pata chale */
  const filled = useMemo(() => {
    let n = 0;
    if (specs.batteryCapacity) n++;
    if (specs.batteryLifeHours !== '' && specs.batteryLifeHours != null) n++;
    if (specs.chargingTimeMinutes !== '' && specs.chargingTimeMinutes != null) n++;
    if (specs.powerRating) n++;
    if ((specs.connectivity ?? []).length) n++;
    if (specs.screenSize) n++;
    if (specs.resolution) n++;
    if (specs.refreshRate) n++;
    if ((specs.compatibleOS ?? []).length) n++;
    if ((specs.compatibleWith ?? []).length) n++;
    if (specs.waterResistance) n++;
    if (specs.operatingRange) n++;
    if (specs.weightGrams !== '' && specs.weightGrams != null) n++;
    if ([specs.lengthMm, specs.widthMm, specs.heightMm].some((v) => v !== '' && v != null)) n++;
    return n;
  }, [specs]);

  const tog = (key: 'connectivity' | 'compatibleOS' | 'compatibleWith', opt: string) => {
    const c = (specs[key] as string[]) ?? [];
    onChange({ [key]: c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt] } as any);
  };

  const addCompat = () => {
    const v = compatInput.trim();
    if (!v) return;
    const c = specs.compatibleWith ?? [];
    if (!c.includes(v)) onChange({ compatibleWith: [...c, v] });
    setCompatInput('');
  };

  /* ── Sections ─────────────────────────────────────────── */
  const SECTIONS: Record<SectionKey, { n: number; title: string; hint: string; icon: any; tone: string; body: React.ReactNode }> = {
    battery: {
      n: 1, title: 'Battery & Power', tone: 'emerald', icon: Battery,
      hint: 'Customer sab se pehle yehi poochta hai — kitni chalti hai',
      body: (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Input label="Battery Capacity" placeholder="5000 mAh" value={specs.batteryCapacity}
                onChange={(e) => onChange({ batteryCapacity: e.target.value })} />
              <Chips items={BATTERY_PRESETS} onPick={(v) => onChange({ batteryCapacity: v })} active={specs.batteryCapacity} />
            </div>
            <Input label="Battery Life (ghante)" type="number" placeholder="24" value={specs.batteryLifeHours}
              onChange={(e) => onChange({ batteryLifeHours: e.target.value === '' ? '' : Number(e.target.value) })} />
            <Input label="Charging Time (minute)" type="number" placeholder="90" value={specs.chargingTimeMinutes}
              onChange={(e) => onChange({ chargingTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })} />
            <div>
              <Input label="Power Rating" placeholder="65W USB-C PD" value={specs.powerRating}
                onChange={(e) => onChange({ powerRating: e.target.value })} />
              <Chips items={POWER_PRESETS} onPick={(v) => onChange({ powerRating: v })} active={specs.powerRating} />
            </div>
          </div>
        </div>
      ),
    },
    connectivity: {
      n: 2, title: 'Connectivity', tone: 'blue', icon: Wifi,
      hint: 'Kaunsi taar/wireless chalti hai — customer ka pehla sawal',
      body: (
        <div className="flex flex-wrap gap-2">
          {CONNECTIVITY_OPTIONS.map((opt) => {
            const a = specs.connectivity?.includes(opt);
            return (
              <button key={opt} type="button" onClick={() => tog('connectivity', opt)}
                className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition inline-flex items-center gap-1',
                  a ? 'border-blue-500 bg-blue-500 text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                {a && <Check className="h-3 w-3" />} {opt}
              </button>
            );
          })}
        </div>
      ),
    },
    display: {
      n: 3, title: 'Display / Screen', tone: 'violet', icon: Monitor,
      hint: 'Sirf un cheezon ke liye jin me screen hoti hai',
      body: (
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Screen Size" placeholder='6.7"' value={specs.screenSize}
            onChange={(e) => onChange({ screenSize: e.target.value })} />
          <div>
            <Lbl>Resolution</Lbl>
            <input list="elec-resolutions" value={specs.resolution} onChange={(e) => onChange({ resolution: e.target.value })}
              placeholder="e.g. 2K"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition" />
            <datalist id="elec-resolutions">
              {RESOLUTIONS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>
          <div>
            <Lbl>Refresh Rate</Lbl>
            <select value={specs.refreshRate} onChange={(e) => onChange({ refreshRate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500 transition">
              <option value="">Nahi bataya</option>
              {REFRESH_RATES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      ),
    },
    compat: {
      n: 4, title: 'Kis Ke Saath Chalta Hai', tone: 'amber', icon: Cable,
      hint: 'Accessories bechte waqt sab se ahem — "mera phone chalega?"',
      body: (
        <div className="space-y-4">
          <div>
            <Lbl>Operating System</Lbl>
            <div className="flex flex-wrap gap-2">
              {OS_OPTIONS.map((opt) => {
                const a = specs.compatibleOS?.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => tog('compatibleOS', opt)}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition inline-flex items-center gap-1',
                      a ? 'border-amber-500 bg-amber-500 text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                    {a && <Check className="h-3 w-3" />} {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Lbl>Kaun Se Device <Opt /></Lbl>
            <div className="flex flex-wrap gap-2 mb-2">
              {COMPAT_PRESETS.map((opt) => {
                const a = specs.compatibleWith?.includes(opt);
                return (
                  <button key={opt} type="button" onClick={() => tog('compatibleWith', opt)}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition inline-flex items-center gap-1',
                      a ? 'border-amber-500 bg-amber-500 text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                    {a && <Check className="h-3 w-3" />} {opt}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input value={compatInput} onChange={(e) => setCompatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCompat(); } }}
                placeholder="Apna model likhein — jaise iPhone 15 Pro"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500 transition" />
              <button type="button" onClick={addCompat}
                className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-extrabold inline-flex items-center gap-1.5 transition">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {(specs.compatibleWith ?? []).filter((c) => !COMPAT_PRESETS.includes(c)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(specs.compatibleWith ?? []).filter((c) => !COMPAT_PRESETS.includes(c)).map((c) => (
                  <span key={c} className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold inline-flex items-center gap-1">
                    {c}
                    <button type="button" onClick={() => tog('compatibleWith', c)} className="hover:text-amber-950">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      ),
    },
    durability: {
      n: 5, title: 'Mazbooti', tone: 'sky', icon: Droplets,
      hint: 'Pani se bachao aur range — sports/outdoor wale poochte hain',
      body: (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Water Resistance</Lbl>
            <select value={specs.waterResistance} onChange={(e) => onChange({ waterResistance: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500 transition">
              <option value="">Pani se bachao nahi</option>
              {WATER_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
              IPX4 = chheenta chalega · IP67/68 = pani me doob kar bhi theek
            </p>
          </div>
          <Input label="Operating Range" placeholder="10m Bluetooth range" value={specs.operatingRange}
            onChange={(e) => onChange({ operatingRange: e.target.value })} />
        </div>
      ),
    },
    size: {
      n: 6, title: 'Nap Tol', tone: 'slate', icon: Ruler,
      hint: 'Courier/delivery ke liye wazan zaroori hota hai',
      body: (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input label="Wazan (g)" type="number" placeholder="240" value={specs.weightGrams}
            onChange={(e) => onChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Lambai (mm)" type="number" placeholder="160" value={specs.lengthMm}
            onChange={(e) => onChange({ lengthMm: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Chorai (mm)" type="number" placeholder="76" value={specs.widthMm}
            onChange={(e) => onChange({ widthMm: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Motai (mm)" type="number" placeholder="8.3" value={specs.heightMm}
            onChange={(e) => onChange({ heightMm: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      ),
    },
  };

  const renderSection = (k: SectionKey, i: number) => {
    const s = SECTIONS[k];
    return (
      <section key={k} className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <Head icon={s.icon} n={i + 1} t={s.title} d={s.hint} tone={s.tone} />
        {s.body}
      </section>
    );
  };

  return (
    <div className="space-y-5">
      {/* ── Intro ── */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-blue-950 flex items-center gap-2 flex-wrap">
              Tech Specs
              <span className="px-2 py-0.5 rounded-full bg-white/70 text-[10px] font-extrabold text-blue-700 uppercase tracking-wider">
                Sab optional
              </span>
              {filled > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold">
                  {filled} bhare
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-blue-900/80 mt-1 leading-relaxed">
              Ye sab chhoda bhi ja sakta hai — product phir bhi save ho jayega. Lekin jitna
              bharenge, POS aur product page par customer ko utna hi behtar bata payenge.
              {meta && <> Neeche sirf <b>{meta.emoji} {meta.label}</b> ke kaam ki cheezein dikha rahe hain.</>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Relevant sections ── */}
      {relevant.map((k, i) => renderSection(k, i))}

      {/* ── Baqi sections ── */}
      {hidden.length > 0 && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 overflow-hidden">
          <button type="button" onClick={() => setShowAll((v) => !v)}
            className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-100 transition">
            <div className="h-9 w-9 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
              {showAll ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-slate-800 text-sm">
                {showAll ? 'Baqi cheezein chhupa dein' : `Aur ${hidden.length} sections — agar zaroorat ho`}
              </div>
              <div className="text-[11px] font-semibold text-slate-500">
                {meta ? `${meta.label} me aam tor par inki zaroorat nahi hoti` : 'Zaroorat ho to yahan se bhar lein'}
              </div>
            </div>
            {showAll ? <ChevronUp className="h-4 w-4 text-slate-500 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-500 shrink-0" />}
          </button>

          {showAll && (
            <div className="p-4 pt-0 space-y-4">
              {hidden.map((k, i) => renderSection(k, relevant.length + i))}
            </div>
          )}
        </div>
      )}

      {/* ── Tip ── */}
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm font-semibold text-amber-900">
          <b>Mashwara:</b> Jaldi me ho to sirf <b>Connectivity</b> aur <b>Battery</b> bhar dein —
          customer sab se zyada yehi do cheezein poochta hai. Baqi baad me product page se
          kabhi bhi edit ho sakta hai.
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════
   HELPERS — Step 1 jaisa hi look
   ═════════════════════════════════════════════════════════════ */

function Head({ icon: Icon, n, t, d, tone = 'slate' }: any) {
  const g: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    sky: 'from-sky-500 to-blue-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br shrink-0', g[tone]].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">
          <span className="text-slate-400">{n}.</span> {t}
        </h3>
        <p className="text-xs text-slate-500 font-semibold">{d}</p>
      </div>
    </div>
  );
}

function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider mb-1.5 text-slate-600">{children}</label>;
}
function Opt() { return <span className="text-slate-400 normal-case font-bold">(optional)</span>; }

/** Chhote preset buttons — bar bar type karne se bachao */
function Chips({ items, onPick, active }: { items: string[]; onPick: (v: string) => void; active?: string }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {items.map((v) => (
        <button key={v} type="button" onClick={() => onPick(v)}
          className={['px-2 py-0.5 rounded-lg border text-[10px] font-extrabold transition',
            active === v ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-emerald-400 hover:text-emerald-700'].join(' ')}>
          {v}
        </button>
      ))}
    </div>
  );
}
