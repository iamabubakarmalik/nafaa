import { useState } from 'react';
import {
  Heart, Sparkles, Clock, MessageCircle, Plus, X,
  Gift, Cake, Baby, GraduationCap, Church, HeartCrack,
  Info, Wand2, AlertCircle,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { FloristWizardOccasions } from '../../hooks/useFloristWizard';

interface Props {
  occasions: FloristWizardOccasions;
  onChange: (patch: Partial<FloristWizardOccasions>) => void;
  errors: string[];
}

const OCCASIONS = [
  { l: 'Birthday', e: '🎂', icon: Cake },
  { l: 'Anniversary', e: '💕', icon: Heart },
  { l: 'Wedding', e: '💒', icon: Church },
  { l: 'Engagement', e: '💍', icon: Sparkles },
  { l: 'Valentine\'s Day', e: '❤️', icon: Heart },
  { l: 'Mother\'s Day', e: '🌷', icon: Heart },
  { l: 'Father\'s Day', e: '👔', icon: Heart },
  { l: 'Get Well Soon', e: '🌼', icon: Heart },
  { l: 'Sympathy', e: '🕊️', icon: HeartCrack },
  { l: 'Funeral', e: '🪷', icon: HeartCrack },
  { l: 'New Baby', e: '👶', icon: Baby },
  { l: 'Graduation', e: '🎓', icon: GraduationCap },
  { l: 'Congratulations', e: '🎉', icon: Sparkles },
  { l: 'Thank You', e: '🙏', icon: Heart },
  { l: 'Sorry', e: '💐', icon: Heart },
  { l: 'Eid', e: '🌙', icon: Sparkles },
  { l: 'Christmas', e: '🎄', icon: Sparkles },
  { l: 'New Year', e: '🎊', icon: Sparkles },
  { l: 'Corporate Gift', e: '🎁', icon: Gift },
  { l: 'Just Because', e: '💫', icon: Sparkles },
  { l: 'Housewarming', e: '🏡', icon: Gift },
  { l: 'Farewell', e: '👋', icon: Heart },
];

const FLOWER_MEANINGS: Record<string, string> = {
  'Rose': 'Love, passion, beauty. Red = deep love, White = purity, Yellow = friendship, Pink = admiration',
  'Tulip': 'Perfect love, elegance. Red = declaration of love, Yellow = cheerful thoughts',
  'Lily': 'Purity, refined beauty. White = purity, Orange = passion, Pink = prosperity',
  'Orchid': 'Luxury, strength, beauty. Symbol of exotic love',
  'Sunflower': 'Adoration, loyalty, longevity',
  'Carnation': 'Fascination, distinction. Pink = mother\'s love, Red = admiration',
  'Daisy': 'Innocence, purity, new beginnings',
  'Peony': 'Prosperity, honor, romance',
  'Jasmine': 'Grace, elegance, sensuality',
};

const CARE_TEMPLATES = [
  {
    l: 'Standard Fresh Bouquet',
    text: 'Keep in fresh water, change water every 2 days. Cut stems at an angle. Keep away from direct sunlight and heat.',
  },
  {
    l: 'Roses',
    text: 'Trim 1-2 cm off stems at an angle under running water. Change water daily. Remove wilting petals. Keep in cool location away from fruit.',
  },
  {
    l: 'Potted Plant',
    text: 'Water when top inch of soil is dry. Provide bright indirect light. Do not overwater. Rotate weekly for even growth.',
  },
  {
    l: 'Succulent',
    text: 'Water sparingly — only when soil is completely dry. Bright light preferred. Well-draining pot essential.',
  },
];

const CUSTOMIZATION_PRESETS = [
  'Choose your flowers',
  'Custom color scheme',
  'Add greeting card',
  'Add chocolate box',
  'Add balloons',
  'Vase upgrade',
  'Deluxe wrapping',
  'Personalized ribbon',
  'Photo attachment',
  'Custom message',
];

export function FloristWizardStep3Occasions({ occasions, onChange, errors }: Props) {
  const [newOccasion, setNewOccasion] = useState('');
  const [newCustom, setNewCustom] = useState('');

  const togOccasion = (o: string) => {
    const cur = occasions.occasions ?? [];
    onChange({ occasions: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] });
  };

  const addCustomOccasion = () => {
    const t = newOccasion.trim();
    if (!t || occasions.occasions.includes(t)) return;
    onChange({ occasions: [...occasions.occasions, t] });
    setNewOccasion('');
  };

  const togCustomization = (c: string) => {
    const cur = occasions.customizationOptions ?? [];
    onChange({ customizationOptions: cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c] });
  };

  const addCustomOption = () => {
    const t = newCustom.trim();
    if (!t || occasions.customizationOptions.includes(t)) return;
    onChange({ customizationOptions: [...occasions.customizationOptions, t] });
    setNewCustom('');
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 flex items-start gap-2.5">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-900">
            <div className="font-extrabold mb-1">Fix before continuing:</div>
            <ul className="list-disc pl-4 space-y-0.5 font-semibold">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-pink-50 border-2 border-pink-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-pink-700 shrink-0 mt-0.5" />
        <div className="text-sm text-pink-900">
          <div className="font-extrabold mb-1">Everything on this step is optional</div>
          <div className="font-semibold">
            Occasion tags help customers find products for specific events. Care instructions and customization options improve customer experience.
          </div>
        </div>
      </div>

      {/* OCCASIONS */}
      <section className="rounded-2xl border-2 border-pink-300 bg-gradient-to-br from-pink-50 to-white p-5 space-y-4">
        <SectionHead icon={Heart} title="Occasions" desc="Which events is this for?" tone="pink" />

        <div>
          <Lbl>Quick select ({occasions.occasions.length} selected)</Lbl>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {OCCASIONS.map((o) => {
              const a = occasions.occasions?.includes(o.l);
              return (
                <button key={o.l} type="button" onClick={() => togOccasion(o.l)}
                  className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-1',
                    a ? 'border-pink-600 bg-pink-600 text-white shadow-md scale-[1.02]'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-pink-400'].join(' ')}>
                  <span className="text-2xl">{o.e}</span>
                  <span className="text-[10px] font-extrabold text-center leading-tight">{o.l}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Lbl>Or add custom occasion</Lbl>
          <div className="flex gap-2">
            <input value={newOccasion} onChange={(e) => setNewOccasion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomOccasion()}
              placeholder="e.g. Independence Day, Basant..."
              className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-pink-500" />
            <button type="button" onClick={addCustomOccasion} disabled={!newOccasion.trim()}
              className="h-11 px-4 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>

        {occasions.occasions.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">
              {occasions.occasions.length} occasions tagged
            </div>
            <div className="flex flex-wrap gap-1.5">
              {occasions.occasions.map((o) => (
                <div key={o} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-100 border-2 border-pink-300 text-xs font-extrabold text-pink-800">
                  {o}
                  <button type="button" onClick={() => togOccasion(o)} className="hover:text-rose-700">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* MEANING */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={MessageCircle} title="Symbolism & Meaning" tone="fuchsia" desc="Marketing story" />

        <div>
          <Lbl>Flower Meaning / Story <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
          <textarea rows={3} value={occasions.meaning}
            onChange={(e) => onChange({ meaning: e.target.value })}
            placeholder="Red roses symbolize deep love and passion. Perfect for expressing sincere feelings..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-fuchsia-500" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500">Quick fills:</span>
            {Object.entries(FLOWER_MEANINGS).slice(0, 5).map(([flower, meaning]) => (
              <button key={flower} type="button"
                onClick={() => onChange({ meaning })}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-fuchsia-100 text-slate-700 hover:text-fuchsia-700 text-[10px] font-extrabold transition">
                {flower}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CARE INSTRUCTIONS */}
      <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <SectionHead icon={Sparkles} title="Care Instructions" tone="emerald" desc="How to keep flowers fresh" />

        <div>
          <Lbl>Quick templates</Lbl>
          <div className="grid sm:grid-cols-2 gap-2">
            {CARE_TEMPLATES.map((t) => (
              <button key={t.l} type="button"
                onClick={() => onChange({ careInstructions: t.text })}
                className="rounded-xl border-2 border-slate-200 hover:border-emerald-400 bg-white p-3 text-left transition group">
                <div className="font-extrabold text-sm text-slate-900 group-hover:text-emerald-700">{t.l}</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-1 line-clamp-2">{t.text}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Lbl>Care Instructions</Lbl>
          <textarea rows={4} value={occasions.careInstructions}
            onChange={(e) => onChange({ careInstructions: e.target.value })}
            placeholder="Keep in fresh water, change water every 2 days..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500" />
        </div>
      </section>

      {/* CUSTOMIZATION */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Wand2} title="Customization" tone="violet" desc="Can customer customize?" />

        <button type="button" onClick={() => onChange({ isCustomizable: !occasions.isCustomizable })}
          className={['w-full rounded-2xl border-2 p-4 text-left transition',
            occasions.isCustomizable ? 'border-violet-500 bg-violet-50 shadow-md' : 'border-slate-200 bg-white hover:border-violet-300'].join(' ')}>
          <div className="flex items-center gap-3">
            <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
              occasions.isCustomizable ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-700'].join(' ')}>
              <Wand2 className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="font-extrabold text-slate-900">Allow Customization</div>
              <div className="text-xs text-slate-600 font-semibold">Customer can request changes</div>
            </div>
            <div className={['h-6 w-6 rounded-full flex items-center justify-center',
              occasions.isCustomizable ? 'bg-violet-600 text-white' : 'bg-slate-200'].join(' ')}>
              {occasions.isCustomizable ? '✓' : ''}
            </div>
          </div>
        </button>

        {occasions.isCustomizable && (
          <>
            <div>
              <Lbl>Customization Options</Lbl>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CUSTOMIZATION_PRESETS.map((c) => {
                  const a = occasions.customizationOptions?.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => togCustomization(c)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                      {a ? '✓ ' : '+ '}{c}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <input value={newCustom} onChange={(e) => setNewCustom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomOption()}
                  placeholder="Custom option..."
                  className="h-10 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <button type="button" onClick={addCustomOption} disabled={!newCustom.trim()}
                  className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs inline-flex items-center gap-1 disabled:opacity-50">
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            <div>
              <Lbl><Clock className="h-3 w-3 inline mr-1" /> Minimum Lead Time (hours)</Lbl>
              <input type="number" value={occasions.minLeadTimeHours}
                onChange={(e) => onChange({ minLeadTimeHours: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="2"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
              <p className="mt-1 text-[10px] text-slate-500 font-bold">
                How long in advance customer needs to order (e.g. 2 hours for standard, 24 hours for custom)
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    pink: 'from-pink-500 to-rose-600',
    fuchsia: 'from-fuchsia-500 to-purple-700',
    emerald: 'from-emerald-500 to-teal-700',
    violet: 'from-violet-500 to-purple-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900">{title}</h3>
        {desc && <p className="text-xs text-slate-500 font-semibold">{desc}</p>}
      </div>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
