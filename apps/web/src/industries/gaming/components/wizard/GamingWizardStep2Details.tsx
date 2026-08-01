import { useState } from 'react';
import {
  Sparkles, Users, Globe, Wifi, HardDrive, Cpu, Monitor,
  Video, Plus, X, Package, Fan, Zap, Calendar, Info,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { UploadDropzone } from '@core/components/uploads';
import type { GamingWizardDetails } from '../../hooks/useGamingWizard';
import { isGameCategory, isConsoleCategory, isPcPartCategory } from '../../hooks/useGamingWizard';

interface Props {
  details: GamingWizardDetails;
  onChange: (patch: Partial<GamingWizardDetails>) => void;
  categoryType: string;
  errors: string[];
}

const GENRES = [
  'Action', 'Adventure', 'RPG', 'Shooter', 'FPS', 'Battle Royale', 'Sports',
  'Racing', 'Fighting', 'Horror', 'Survival', 'Simulation', 'Strategy',
  'Puzzle', 'Platformer', 'Open World', 'Stealth', 'MMO', 'MOBA', 'Sandbox',
  'Card Game', 'Music/Rhythm', 'Party', 'Family', 'Indie',
];

const AGE_RATINGS = ['PEGI 3', 'PEGI 7', 'PEGI 12', 'PEGI 16', 'PEGI 18', 'ESRB E', 'ESRB E10+', 'ESRB T', 'ESRB M', 'ESRB AO'];

const PLAYER_COUNTS = ['1 Player', '1-2 Players', '1-4 Players', '2 Players', '2-4 Players', 'Up to 8', 'Up to 16', 'Online Only', 'Massive Multiplayer'];

const REGIONS = ['Region Free', 'PAL (Europe)', 'NTSC-U (US)', 'NTSC-J (Japan)', 'Asia', 'Middle East', 'UK'];

const LANGUAGES = ['English', 'Arabic', 'Urdu', 'Spanish', 'French', 'German', 'Japanese', 'Chinese', 'Korean', 'Russian', 'Portuguese'];

const CONSOLE_ACCESSORIES = [
  'Console Unit', 'Controller', '2nd Controller', 'HDMI Cable', 'Power Cable',
  'USB-C Charging Cable', 'Headset', 'Dock', 'Stand', 'Vertical Stand',
  'Original Box', 'Manual', 'Warranty Card', 'Charging Station',
];

const STORAGE_PRESETS = ['500GB', '825GB', '1TB', '2TB', '4TB'];
const RAM_PRESETS = ['8GB', '16GB', '32GB', '64GB'];
const FORM_FACTORS = ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX', 'SFX', 'Full Tower', 'Mid Tower', 'Mini Tower'];
const SOCKETS = ['AM4', 'AM5', 'LGA1200', 'LGA1700', 'LGA1851', 'sTRX4'];

export function GamingWizardStep2Details({ details, onChange, categoryType }: Props) {
  const [customAcc, setCustomAcc] = useState('');

  const showGame = isGameCategory(categoryType);
  const showConsole = isConsoleCategory(categoryType);
  const showPcPart = isPcPartCategory(categoryType);
  const showNothingSpecific = !showGame && !showConsole && !showPcPart;

  const tog = (field: 'genre' | 'language' | 'includedAccessories', val: string) => {
    const cur = (details[field] ?? []) as string[];
    onChange({ [field]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as any);
  };

  const addAcc = (v: string) => {
    const t = v.trim();
    if (!t) return;
    const cur = details.includedAccessories ?? [];
    if (cur.includes(t)) return;
    onChange({ includedAccessories: [...cur, t] });
    setCustomAcc('');
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-violet-50 border-2 border-violet-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-violet-700 shrink-0 mt-0.5" />
        <div className="text-sm text-violet-900">
          <div className="font-extrabold mb-1">Smart fields</div>
          <div className="font-semibold">
            Fields adapt to the category you picked
            {showGame && ' — showing game details.'}
            {showConsole && ' — showing console / PC hardware fields.'}
            {showPcPart && ' — showing component spec fields.'}
            {showNothingSpecific && ' — this category needs no extra specs. You can skip ahead.'}
          </div>
        </div>
      </div>

      {/* GAME FIELDS */}
      {showGame && (
        <>
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Sparkles} title="Game Info" tone="violet" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Publisher" placeholder="EA Sports, Rockstar..." value={details.publisher}
                onChange={(e) => onChange({ publisher: e.target.value })} />
              <Input label="Developer" placeholder="Studio name" value={details.developer}
                onChange={(e) => onChange({ developer: e.target.value })} />
              <Input label="Release Date" type="date" value={details.releaseDate}
                onChange={(e) => onChange({ releaseDate: e.target.value })} />
              <Input label="File Size" placeholder="120 GB" value={details.gameFileSize}
                onChange={(e) => onChange({ gameFileSize: e.target.value })} />
            </div>

            <div>
              <Lbl>Genre <span className="text-slate-400 normal-case font-bold">(multi-select)</span></Lbl>
              <div className="flex flex-wrap gap-1.5">
                {GENRES.map((g) => {
                  const a = details.genre?.includes(g);
                  return (
                    <button key={g} type="button" onClick={() => tog('genre', g)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Users} title="Players & Rating" tone="amber" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Player Count</Lbl>
                <select value={details.playerCount} onChange={(e) => onChange({ playerCount: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                  <option value="">Not specified</option>
                  {PLAYER_COUNTS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <Lbl>Age Rating</Lbl>
                <select value={details.ageRating} onChange={(e) => onChange({ ageRating: e.target.value })}
                  className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                  <option value="">Not rated</option>
                  {AGE_RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-2">
              <Check2 checked={details.onlineMultiplayer} onChange={(v: boolean) => onChange({ onlineMultiplayer: v })}
                icon={Wifi} label="Online Multiplayer" desc="Needs PSN / Xbox Live / internet" />
              <Check2 checked={details.requiresInternet} onChange={(v: boolean) => onChange({ requiresInternet: v })}
                icon={Globe} label="Always-Online" desc="Cannot play offline" />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Globe} title="Region & Language" tone="sky" />
            <div>
              <Lbl>Region</Lbl>
              <select value={details.region} onChange={(e) => onChange({ region: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-sky-500">
                <option value="">Not specified</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Lbl>Languages</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => {
                  const a = details.language?.includes(l);
                  return (
                    <button key={l} type="button" onClick={() => tog('language', l)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300'].join(' ')}>
                      {l}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </>
      )}

      {/* CONSOLE / PC BUILD FIELDS */}
      {showConsole && (
        <>
          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={HardDrive} title="Hardware Specs" tone="blue" />
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Lbl>Storage Capacity</Lbl>
                <input list="storagePresets" value={details.storageCapacity}
                  onChange={(e) => onChange({ storageCapacity: e.target.value })} placeholder="1TB SSD"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <datalist id="storagePresets">{STORAGE_PRESETS.map((s) => <option key={s} value={s} />)}</datalist>
              </div>
              <div>
                <Lbl>Memory / RAM</Lbl>
                <input list="ramPresets" value={details.memoryRam}
                  onChange={(e) => onChange({ memoryRam: e.target.value })} placeholder="16GB GDDR6"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-blue-500" />
                <datalist id="ramPresets">{RAM_PRESETS.map((r) => <option key={r} value={r} />)}</datalist>
              </div>
              <Input label="Processor / CPU" placeholder="AMD Zen 2 8-core" value={details.processor}
                onChange={(e) => onChange({ processor: e.target.value })} />
              <Input label="Graphics" placeholder="RDNA 2, 10.28 TFLOPs" value={details.graphicsCard}
                onChange={(e) => onChange({ graphicsCard: e.target.value })} />
              <Input label="Display Output" placeholder="4K 120Hz, HDMI 2.1" value={details.displaySpec}
                onChange={(e) => onChange({ displaySpec: e.target.value })} />
              <Input label="Controllers Included" type="number" min="0" value={details.numberOfControllers}
                onChange={(e) => onChange({ numberOfControllers: e.target.value === '' ? '' : Number(e.target.value) })} />
            </div>
          </section>

          <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
            <SectionHead icon={Package} title="Box Contents" tone="amber" />
            <div>
              <Lbl>Quick add</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {CONSOLE_ACCESSORIES.map((a) => {
                  const added = details.includedAccessories?.includes(a);
                  return (
                    <button key={a} type="button" disabled={added} onClick={() => addAcc(a)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition disabled:cursor-not-allowed',
                        added ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                      {added ? '✓ ' : '+ '}{a}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <input value={customAcc} onChange={(e) => setCustomAcc(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAcc(customAcc)}
                placeholder="Custom item..."
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
              <button type="button" onClick={() => addAcc(customAcc)} disabled={!customAcc.trim()}
                className="h-11 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            {(details.includedAccessories ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {details.includedAccessories.map((a) => (
                  <div key={a} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 border-2 border-amber-300 text-xs font-extrabold text-amber-800">
                    {a}
                    <button type="button" onClick={() => tog('includedAccessories', a)} className="hover:text-rose-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* PC PART FIELDS */}
      {showPcPart && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Cpu} title="Component Specs" tone="emerald" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="GPU Model" placeholder="RTX 4070 Super 12GB" value={details.gpuModel}
              onChange={(e) => onChange({ gpuModel: e.target.value })} />
            <Input label="CPU Model" placeholder="Ryzen 7 7800X3D" value={details.cpuModel}
              onChange={(e) => onChange({ cpuModel: e.target.value })} />
            <Input label="RAM Spec" placeholder="32GB DDR5 6000MHz CL30" value={details.ramSpec}
              onChange={(e) => onChange({ ramSpec: e.target.value })} />
            <div>
              <Lbl>Form Factor</Lbl>
              <select value={details.formFactor} onChange={(e) => onChange({ formFactor: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-emerald-500">
                <option value="">Not specified</option>
                {FORM_FACTORS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <Input label="Power / Wattage" placeholder="850W 80+ Gold" value={details.power}
              onChange={(e) => onChange({ power: e.target.value })} leftIcon={<Zap className="h-4 w-4 text-slate-400" />} />
            <div>
              <Lbl>Socket</Lbl>
              <input list="socketPresets" value={details.socket}
                onChange={(e) => onChange({ socket: e.target.value })} placeholder="AM5"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
              <datalist id="socketPresets">{SOCKETS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
            <Input label="Chipset" placeholder="B650, Z790" value={details.chipset}
              onChange={(e) => onChange({ chipset: e.target.value })} />
            <Input label="Cooling / Notes" placeholder="Triple fan, AIO 360mm" value={details.displaySpec}
              onChange={(e) => onChange({ displaySpec: e.target.value })} leftIcon={<Fan className="h-4 w-4 text-slate-400" />} />
          </div>
        </section>
      )}

      {/* MEDIA — always */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Video} title="Trailer & Screenshots" tone="rose" />
        <Input label="Trailer URL (YouTube)" placeholder="https://youtube.com/watch?v=..." value={details.trailerUrl}
          onChange={(e) => onChange({ trailerUrl: e.target.value })} />
        <div>
          <Lbl>Screenshots <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
          <UploadDropzone purpose="product-image" maxFiles={6}
            onUploaded={(recs: any[]) => onChange({ screenshots: [...(details.screenshots ?? []), ...recs.map((r) => r.url)] })}
            hint="Up to 6 screenshots" />
          {(details.screenshots ?? []).length > 0 && (
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-6 gap-2">
              {details.screenshots.map((url, i) => (
                <div key={url + i} className="relative group aspect-video rounded-lg overflow-hidden border-2 border-slate-200">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => onChange({ screenshots: details.screenshots.filter((_, x) => x !== i) })}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-slate-900/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-extrabold">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    violet: 'from-violet-500 to-fuchsia-700',
    blue: 'from-blue-500 to-cyan-700',
    emerald: 'from-emerald-500 to-teal-700',
    amber: 'from-amber-500 to-orange-700',
    sky: 'from-sky-500 to-blue-700',
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
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
function Check2({ checked, onChange, icon: Icon, label, desc }: any) {
  return (
    <label className={['flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
      checked ? 'border-violet-400 bg-violet-50' : 'border-slate-200 bg-white hover:border-violet-300'].join(' ')}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 rounded" />
      <Icon className={['h-5 w-5', checked ? 'text-violet-600' : 'text-slate-400'].join(' ')} />
      <div className="min-w-0">
        <div className="font-extrabold text-sm text-slate-900">{label}</div>
        <div className="text-[11px] text-slate-500 font-semibold">{desc}</div>
      </div>
    </label>
  );
}
