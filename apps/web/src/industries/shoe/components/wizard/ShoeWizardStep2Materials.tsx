import { Palette, Layers, Circle, Zap, Info } from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { ShoeWizardMaterials } from '../../hooks/useShoeWizard';

interface Props {
  materials: ShoeWizardMaterials;
  onChange: (patch: Partial<ShoeWizardMaterials>) => void;
  errors: string[];
}

const UPPER_MATERIALS = [
  'Genuine Leather', 'Synthetic Leather', 'Nubuck', 'Suede', 'Patent Leather',
  'Canvas', 'Mesh', 'Knit / Flyknit', 'Textile', 'Cotton', 'Nylon',
  'Rubber', 'PVC', 'PU', 'Velvet', 'Satin',
];

const SOLE_MATERIALS = [
  'Rubber', 'PU (Polyurethane)', 'EVA', 'TPR', 'PVC', 'Leather',
  'Crepe', 'Foam', 'Cork', 'Wood', 'Phylon', 'Vibram', 'Gum Rubber',
];

const INNER_MATERIALS = ['Textile', 'Leather', 'Foam Padding', 'Memory Foam', 'Cotton', 'Synthetic', 'Fur', 'Wool'];

const PATTERNS = ['Solid', 'Two-Tone', 'Multi-Color', 'Stripe', 'Plaid', 'Camo', 'Animal Print', 'Metallic', 'Glitter', 'Embroidered'];

const CLOSURE_TYPES = ['Lace-Up', 'Slip-On', 'Velcro', 'Buckle', 'Zipper', 'Elastic', 'Button', 'Toggle', 'Hook & Loop'];

const TOE_SHAPES = ['Round', 'Pointed', 'Square', 'Almond', 'Open Toe', 'Peep Toe', 'Cap Toe', 'Wingtip'];

const HEEL_HEIGHTS = [
  'Flat (0")', 'Low (1-2")', 'Medium (2-3")', 'High (3-4")', 'Very High (4"+)', 'Wedge', 'Platform',
];

const HEEL_TYPES = ['Block', 'Stiletto', 'Kitten', 'Wedge', 'Platform', 'Cone', 'Chunky', 'Cuban', 'Cowboy'];

const SOLE_TYPES = [
  'Cushioned', 'Anti-Slip', 'Non-Marking', 'Grip Sole', 'Sport Sole',
  'Air Cushion', 'Gel Cushion', 'Vibram', 'Studded', 'Cleated',
];

export function ShoeWizardStep2Materials({ materials, onChange }: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-orange-50 border-2 border-orange-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-orange-700 shrink-0 mt-0.5" />
        <div className="text-sm text-orange-900">
          <div className="font-extrabold mb-1">Materials & Style</div>
          <div className="font-semibold">
            All optional but strongly recommended — customers ask "leather or synthetic?", "rubber sole?", etc.
            Fill the ones that apply.
          </div>
        </div>
      </div>

      {/* MATERIALS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Layers} title="Materials" tone="orange" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Upper Material</Lbl>
            <input list="upperMaterials" value={materials.upperMaterial}
              onChange={(e) => onChange({ upperMaterial: e.target.value })} placeholder="Genuine Leather"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            <datalist id="upperMaterials">{UPPER_MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div>
            <Lbl>Sole Material</Lbl>
            <input list="soleMaterials" value={materials.soleMaterial}
              onChange={(e) => onChange({ soleMaterial: e.target.value })} placeholder="Rubber"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            <datalist id="soleMaterials">{SOLE_MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <div>
            <Lbl>Inner Material</Lbl>
            <input list="innerMaterials" value={materials.innerMaterial}
              onChange={(e) => onChange({ innerMaterial: e.target.value })} placeholder="Memory Foam"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-orange-500" />
            <datalist id="innerMaterials">{INNER_MATERIALS.map((m) => <option key={m} value={m} />)}</datalist>
          </div>
          <Input label="Lining Material" placeholder="Textile fabric" value={materials.liningMaterial}
            onChange={(e) => onChange({ liningMaterial: e.target.value })} />
        </div>
      </section>

      {/* PATTERN / STYLE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Palette} title="Pattern & Style" tone="violet" />
        <div>
          <Lbl>Pattern Type</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {PATTERNS.map((p) => {
              const a = materials.patternType === p;
              return (
                <button key={p} type="button"
                  onClick={() => onChange({ patternType: a ? '' : p })}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* CLOSURE & TOE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Circle} title="Closure & Toe" tone="blue" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Closure Type</Lbl>
            <select value={materials.closureType} onChange={(e) => onChange({ closureType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Not specified</option>
              {CLOSURE_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Lbl>Toe Shape</Lbl>
            <select value={materials.toeShape} onChange={(e) => onChange({ toeShape: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Not specified</option>
              {TOE_SHAPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* HEEL (mostly for women) */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Zap} title="Heel Details" tone="rose" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Heel Height</Lbl>
            <select value={materials.heelHeight} onChange={(e) => onChange({ heelHeight: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
              <option value="">Not specified</option>
              {HEEL_HEIGHTS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div>
            <Lbl>Heel Type</Lbl>
            <select value={materials.heelType} onChange={(e) => onChange({ heelType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
              <option value="">Not specified</option>
              {HEEL_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* SOLE TYPE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Layers} title="Sole Features" tone="emerald" />
        <div>
          <Lbl>Sole Type</Lbl>
          <div className="flex flex-wrap gap-1.5">
            {SOLE_TYPES.map((s) => {
              const a = materials.soleType === s;
              return (
                <button key={s} type="button"
                  onClick={() => onChange({ soleType: a ? '' : s })}
                  className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                    a ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300'].join(' ')}>
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    orange: 'from-orange-500 to-amber-700',
    violet: 'from-violet-500 to-purple-700',
    blue: 'from-blue-500 to-cyan-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
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
