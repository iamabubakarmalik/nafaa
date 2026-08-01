import { useState } from 'react';
import {
  Sparkles, Palette, Ruler, Globe, Calendar, Leaf, Package,
  Gift, Info, Ribbon,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { FloristWizardDetails } from '../../hooks/useFloristWizard';
import { isFreshFlowerCategory, isBouquetCategory, isPlantCategory } from '../../hooks/useFloristWizard';

interface Props {
  details: FloristWizardDetails;
  onChange: (patch: Partial<FloristWizardDetails>) => void;
  categoryType: string;
  errors: string[];
}

const FLOWER_TYPES = [
  'Rose', 'Tulip', 'Lily', 'Orchid', 'Sunflower', 'Carnation', 'Daisy',
  'Chrysanthemum', 'Gerbera', 'Peony', 'Hydrangea', 'Iris', 'Freesia',
  'Gladiolus', 'Marigold', 'Jasmine', 'Lotus', 'Anthurium', 'Baby\'s Breath',
  'Alstroemeria', 'Ranunculus', 'Dahlia', 'Anemone', 'Protea', 'Bird of Paradise',
];

const COLORS = [
  { l: 'Red', hex: '#dc2626' },
  { l: 'Pink', hex: '#ec4899' },
  { l: 'White', hex: '#ffffff' },
  { l: 'Yellow', hex: '#eab308' },
  { l: 'Orange', hex: '#f97316' },
  { l: 'Purple', hex: '#a855f7' },
  { l: 'Lavender', hex: '#c084fc' },
  { l: 'Blue', hex: '#3b82f6' },
  { l: 'Peach', hex: '#fb923c' },
  { l: 'Coral', hex: '#f87171' },
  { l: 'Cream', hex: '#fef3c7' },
  { l: 'Burgundy', hex: '#7f1d1d' },
  { l: 'Fuchsia', hex: '#d946ef' },
  { l: 'Green', hex: '#22c55e' },
  { l: 'Mixed', hex: '#8b5cf6' },
  { l: 'Rainbow', hex: '#f43f5e' },
];

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter', 'All Year', 'Wedding Season', 'Valentine\'s'];

const BOUQUET_SIZES = [
  { v: 'Mini', desc: '3-5 stems' },
  { v: 'Small', desc: '6-10 stems' },
  { v: 'Medium', desc: '11-20 stems' },
  { v: 'Large', desc: '21-35 stems' },
  { v: 'Grand', desc: '36+ stems' },
  { v: 'Deluxe', desc: 'Premium arrangement' },
];

const WRAP_TYPES = [
  'Kraft Paper', 'Cellophane', 'Tissue Paper', 'Burlap', 'Silk Ribbon',
  'Lace Wrap', 'Basket', 'Box', 'Vase', 'Hand-tied', 'No Wrap',
];

const ORIGINS = ['Local (Pakistan)', 'Netherlands', 'Kenya', 'Ecuador', 'Colombia', 'India', 'Thailand', 'Malaysia'];

export function FloristWizardStep2Details({ details, onChange, categoryType }: Props) {
  const [customFlower, setCustomFlower] = useState('');

  const showFresh = isFreshFlowerCategory(categoryType);
  const showBouquet = isBouquetCategory(categoryType);
  const showPlant = isPlantCategory(categoryType);

  const togSeason = (s: string) => {
    const cur = details.season ?? [];
    onChange({ season: cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s] });
  };

  const autoCalcFreshUntil = (days: number) => {
    if (!details.arrivalDate) return;
    const arrival = new Date(details.arrivalDate);
    arrival.setDate(arrival.getDate() + days);
    onChange({ freshUntil: arrival.toISOString().slice(0, 10) });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-pink-700 shrink-0 mt-0.5" />
        <div className="text-sm text-pink-900">
          <div className="font-extrabold mb-1">Smart fields</div>
          <div className="font-semibold">
            Fields adapt to the category you picked
            {showFresh && ' — showing fresh flower fields.'}
            {showBouquet && ' — showing bouquet composition fields.'}
            {showPlant && ' — showing plant care fields.'}
          </div>
        </div>
      </div>

      {/* FLOWER TYPE (Fresh) */}
      {(showFresh || showBouquet) && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Sparkles} title="Flower Type" tone="pink" />
          <div>
            <Lbl>Primary Flower</Lbl>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {FLOWER_TYPES.map((f) => {
                const a = details.flowerType === f;
                return (
                  <button key={f} type="button" onClick={() => onChange({ flowerType: f })}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-pink-500 bg-pink-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300'].join(' ')}>
                    {f}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input value={customFlower} onChange={(e) => setCustomFlower(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customFlower.trim()) {
                    onChange({ flowerType: customFlower.trim() });
                    setCustomFlower('');
                  }
                }}
                placeholder="Or type custom flower..."
                className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
              <button type="button" onClick={() => {
                if (customFlower.trim()) { onChange({ flowerType: customFlower.trim() }); setCustomFlower(''); }
              }} className="h-10 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs">
                Set
              </button>
            </div>
          </div>
        </section>
      )}

      {/* COLOR PICKER */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Palette} title="Color" tone="fuchsia" />
        <div>
          <Lbl>Primary Color</Lbl>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {COLORS.map((c) => {
              const a = details.color === c.l;
              return (
                <button key={c.l} type="button"
                  onClick={() => onChange({ color: c.l, colorHex: c.hex })}
                  className={['relative p-2 rounded-xl border-2 transition flex flex-col items-center gap-1',
                    a ? 'border-slate-900 scale-105 shadow-md' : 'border-slate-200 hover:border-slate-400'].join(' ')}>
                  <div className="h-10 w-10 rounded-lg border border-slate-300 shadow-inner"
                    style={{ backgroundColor: c.hex }} />
                  <span className="text-[10px] font-extrabold text-slate-700">{c.l}</span>
                  {a && <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">✓</div>}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Custom Color Name" value={details.color}
            onChange={(e) => onChange({ color: e.target.value })} placeholder="e.g. Blush Pink" />
          <div>
            <Lbl>Custom Hex</Lbl>
            <div className="flex gap-2">
              <input type="color" value={details.colorHex || '#ec4899'}
                onChange={(e) => onChange({ colorHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={details.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })}
                placeholder="#ec4899"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono font-bold focus:outline-none focus:border-fuchsia-500" />
            </div>
          </div>
        </div>
      </section>

      {/* STEM / SIZE (Fresh flowers) */}
      {showFresh && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Ruler} title="Stem & Size" tone="emerald" />
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Stem Length (cm)" type="number" value={details.stemLengthCm}
              onChange={(e) => onChange({ stemLengthCm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="60" />
            {showBouquet && (
              <Input label="Stem Count in Bouquet" type="number" value={details.stemCount}
                onChange={(e) => onChange({ stemCount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="12" />
            )}
          </div>

          {showBouquet && (
            <div>
              <Lbl>Bouquet Size</Lbl>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {BOUQUET_SIZES.map((s) => {
                  const a = details.bouquetSize === s.v;
                  return (
                    <button key={s.v} type="button" onClick={() => onChange({ bouquetSize: s.v })}
                      className={['p-2.5 rounded-xl border-2 transition text-left',
                        a ? 'border-emerald-500 bg-emerald-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'].join(' ')}>
                      <div className="font-extrabold text-sm">{s.v}</div>
                      <div className={['text-[10px] font-semibold', a ? 'text-white/85' : 'text-slate-500'].join(' ')}>
                        {s.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ORIGIN & SEASON */}
      {(showFresh || showPlant) && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Globe} title="Origin & Season" tone="blue" />

          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-blue-300 cursor-pointer">
            <input type="checkbox" checked={details.isImported}
              onChange={(e) => onChange({ isImported: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Globe className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-extrabold text-sm text-slate-900">Imported</div>
              <div className="text-xs text-slate-500 font-semibold">From outside Pakistan</div>
            </div>
          </label>

          {details.isImported && (
            <div>
              <Lbl>Origin Country</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {ORIGINS.map((o) => {
                  const a = details.origin === o;
                  return (
                    <button key={o} type="button" onClick={() => onChange({ origin: o })}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <Lbl>Available Seasons</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {SEASONS.map((s) => {
                const a = details.season?.includes(s);
                return (
                  <button key={s} type="button" onClick={() => togSeason(s)}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* FRESHNESS TRACKING */}
      {showFresh && (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
          <SectionHead icon={Leaf} title="Freshness Tracking" tone="emerald" />

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Lbl><Calendar className="h-3 w-3 inline mr-1" /> Arrival Date</Lbl>
              <input type="date" value={details.arrivalDate}
                onChange={(e) => {
                  onChange({ arrivalDate: e.target.value });
                  if (details.daysToWither && typeof details.daysToWither === 'number') {
                    const arrival = new Date(e.target.value);
                    arrival.setDate(arrival.getDate() + Number(details.daysToWither));
                    onChange({ freshUntil: arrival.toISOString().slice(0, 10) });
                  }
                }}
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <Lbl>Days to Wither</Lbl>
              <input type="number" value={details.daysToWither}
                onChange={(e) => {
                  const v = e.target.value === '' ? '' : Number(e.target.value);
                  onChange({ daysToWither: v });
                  if (v && typeof v === 'number' && details.arrivalDate) {
                    autoCalcFreshUntil(v);
                  }
                }}
                placeholder="5"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <Lbl>Fresh Until (Auto)</Lbl>
              <input type="date" value={details.freshUntil}
                onChange={(e) => onChange({ freshUntil: e.target.value })}
                className="h-11 w-full rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 text-sm font-extrabold focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          {details.freshUntil && (
            <div className="rounded-xl bg-white border-2 border-emerald-200 p-3">
              <div className="text-xs font-extrabold text-emerald-800">
                {(() => {
                  const days = Math.ceil((new Date(details.freshUntil).getTime() - Date.now()) / 86400000);
                  if (days < 0) return `🥀 Withered ${Math.abs(days)} days ago`;
                  if (days === 0) return '⚠️ Withers today';
                  if (days <= 2) return `⚠️ Only ${days} days left — sell fast`;
                  return `✅ Fresh for ${days} more days`;
                })()}
              </div>
            </div>
          )}
        </section>
      )}

      {/* WRAPPING (Bouquets) */}
      {showBouquet && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Ribbon} title="Wrapping & Presentation" tone="rose" />

          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-rose-300 cursor-pointer">
            <input type="checkbox" checked={details.isPreArranged}
              onChange={(e) => onChange({ isPreArranged: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Package className="h-5 w-5 text-rose-600" />
            <div className="flex-1">
              <div className="font-extrabold text-sm text-slate-900">Pre-arranged</div>
              <div className="text-xs text-slate-500 font-semibold">Ready-made, not custom</div>
            </div>
          </label>

          <div>
            <Lbl>Wrap Type</Lbl>
            <div className="flex flex-wrap gap-1.5">
              {WRAP_TYPES.map((w) => {
                const a = details.wrapType === w;
                return (
                  <button key={w} type="button" onClick={() => onChange({ wrapType: w })}
                    className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                      a ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-rose-300'].join(' ')}>
                    {w}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Ribbon Color" value={details.ribbonColor}
              onChange={(e) => onChange({ ribbonColor: e.target.value })} placeholder="e.g. Gold satin" />
            <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-rose-300 cursor-pointer">
              <input type="checkbox" checked={details.hasVase}
                onChange={(e) => onChange({ hasVase: e.target.checked })}
                className="h-5 w-5 rounded" />
              <Gift className="h-5 w-5 text-rose-600" />
              <div className="flex-1">
                <div className="font-extrabold text-sm text-slate-900">Includes Vase</div>
                <div className="text-xs text-slate-500 font-semibold">Comes with container</div>
              </div>
            </label>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    fuchsia: 'from-fuchsia-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
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
