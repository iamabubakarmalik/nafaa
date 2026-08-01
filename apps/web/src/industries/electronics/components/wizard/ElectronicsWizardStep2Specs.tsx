import { Sparkles, Zap, Wifi, Battery, Monitor, Ruler, Droplets, Cable } from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ElectronicsWizardSpecs } from '../../hooks/useElectronicsWizard';

interface Props {
  specs: ElectronicsWizardSpecs;
  onChange: (patch: Partial<ElectronicsWizardSpecs>) => void;
  categoryType?: string;
  errors: string[];
}

const CONNECTIVITY_OPTIONS = [
  'WiFi', 'WiFi 6', 'WiFi 6E', 'WiFi 7',
  'Bluetooth 5.0', 'Bluetooth 5.1', 'Bluetooth 5.2', 'Bluetooth 5.3',
  '4G LTE', '5G',
  'NFC', 'GPS',
  'USB-C', 'USB-A', 'USB 3.0', 'Lightning', 'Micro USB',
  'HDMI', 'DisplayPort', 'Thunderbolt', 'Ethernet',
  '3.5mm Jack', 'Optical', 'AUX',
];

const OS_OPTIONS = ['iOS', 'Android', 'Windows', 'macOS', 'Linux', 'Chrome OS', 'HarmonyOS', 'watchOS', 'wearOS', 'iPadOS'];

const WATER_RATINGS = ['IP54', 'IP55', 'IP65', 'IP66', 'IP67', 'IP68', 'IPX4', 'IPX5', 'IPX7', 'IPX8'];

const REFRESH_RATES = ['60Hz', '90Hz', '120Hz', '144Hz', '165Hz', '240Hz', '360Hz'];

const RESOLUTIONS = [
  'HD (1280x720)', 'FHD (1920x1080)', '2K (2560x1440)', '4K (3840x2160)', '8K (7680x4320)',
  'Retina', 'Super Retina XDR', 'AMOLED FHD+', 'Dynamic AMOLED',
];

export function ElectronicsWizardStep2Specs({ specs, onChange }: Props) {
  const togConnectivity = (opt: string) => {
    const c = specs.connectivity ?? [];
    onChange({ connectivity: c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt] });
  };
  const togOS = (opt: string) => {
    const c = specs.compatibleOS ?? [];
    onChange({ compatibleOS: c.includes(opt) ? c.filter((x) => x !== opt) : [...c, opt] });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-4 flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-blue-700 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <div className="font-extrabold mb-1">Tech Specs (Optional)</div>
          <div className="font-semibold">Ye sab optional hai — bas woh fields bharein jo aap ke product par apply hote hain. Skip karna bhi theek hai.</div>
        </div>
      </div>

      {/* Battery & Power */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Battery} title="Battery & Power" tone="emerald" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Battery Capacity" placeholder="5000 mAh" value={specs.batteryCapacity}
            onChange={(e) => onChange({ batteryCapacity: e.target.value })} />
          <Input label="Battery Life (hours)" type="number" placeholder="24" value={specs.batteryLifeHours}
            onChange={(e) => onChange({ batteryLifeHours: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Charging Time (minutes)" type="number" placeholder="90" value={specs.chargingTimeMinutes}
            onChange={(e) => onChange({ chargingTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Power Rating" placeholder="65W USB-C PD" value={specs.powerRating}
            onChange={(e) => onChange({ powerRating: e.target.value })} />
        </div>
      </section>

      {/* Connectivity */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Wifi} title="Connectivity" tone="blue" />
        <div className="flex flex-wrap gap-2">
          {CONNECTIVITY_OPTIONS.map((opt) => {
            const a = specs.connectivity?.includes(opt);
            return (
              <button key={opt} type="button" onClick={() => togConnectivity(opt)}
                className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                  a ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                {opt}
              </button>
            );
          })}
        </div>
      </section>

      {/* Display */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Monitor} title="Display (agar screen hai)" tone="violet" />
        <div className="grid sm:grid-cols-3 gap-3">
          <Input label="Screen Size" placeholder='6.7"' value={specs.screenSize}
            onChange={(e) => onChange({ screenSize: e.target.value })} />
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Resolution</label>
            <input list="resolutions" value={specs.resolution} onChange={(e) => onChange({ resolution: e.target.value })}
              placeholder="e.g. 2K"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
            <datalist id="resolutions">
              {RESOLUTIONS.map((r) => <option key={r} value={r} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Refresh Rate</label>
            <select value={specs.refreshRate} onChange={(e) => onChange({ refreshRate: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-violet-500">
              <option value="">Not specified</option>
              {REFRESH_RATES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Compatibility */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Cable} title="Compatibility" tone="amber" />
        <div>
          <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Compatible OS</label>
          <div className="flex flex-wrap gap-2">
            {OS_OPTIONS.map((opt) => {
              const a = specs.compatibleOS?.includes(opt);
              return (
                <button key={opt} type="button" onClick={() => togOS(opt)}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-300'].join(' ')}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Durability */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Droplets} title="Durability" tone="sky" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-extrabold uppercase text-slate-600 mb-1.5">Water Resistance</label>
            <select value={specs.waterResistance} onChange={(e) => onChange({ waterResistance: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
              <option value="">Not water resistant</option>
              {WATER_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Input label="Operating Range" placeholder="10m Bluetooth range" value={specs.operatingRange}
            onChange={(e) => onChange({ operatingRange: e.target.value })} />
        </div>
      </section>

      {/* Dimensions */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Ruler} title="Dimensions & Weight" tone="slate" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input label="Weight (g)" type="number" placeholder="240" value={specs.weightGrams}
            onChange={(e) => onChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Length (mm)" type="number" placeholder="160" value={specs.lengthMm}
            onChange={(e) => onChange({ lengthMm: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Width (mm)" type="number" placeholder="76" value={specs.widthMm}
            onChange={(e) => onChange({ widthMm: e.target.value === '' ? '' : Number(e.target.value) })} />
          <Input label="Height (mm)" type="number" placeholder="8.3" value={specs.heightMm}
            onChange={(e) => onChange({ heightMm: e.target.value === '' ? '' : Number(e.target.value) })} />
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    amber: 'from-amber-500 to-orange-700',
    sky: 'from-sky-500 to-blue-700',
    slate: 'from-slate-500 to-slate-700',
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
