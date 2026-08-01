import {
  Ruler, Weight, Users, Package, Archive, Grid3x3, Info,
  ArrowUpDown, ArrowLeftRight, MoveDiagonal,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import type { FurnitureWizardDimensions } from '../../hooks/useFurnitureWizard';

interface Props {
  dimensions: FurnitureWizardDimensions;
  onChange: (patch: Partial<FurnitureWizardDimensions>) => void;
  categoryType: string;
  errors: string[];
}

const isSofa = (c: string) => c.startsWith('SOFA_') || c === 'BEAN_BAG' || c === 'OTTOMAN';
const isBed = (c: string) => c.startsWith('BED_') || c === 'MATTRESS' || c === 'BABY_COT';
const isStorage = (c: string) => ['WARDROBE', 'CABINET', 'CUPBOARD', 'SHOE_RACK', 'BOOKSHELF', 'DRESSING_TABLE', 'TV_CONSOLE', 'ENTERTAINMENT_UNIT'].includes(c);
const isTable = (c: string) => c.includes('TABLE') || c === 'OFFICE_DESK' || c === 'STUDY_TABLE';
const isChair = (c: string) => c.includes('CHAIR');

export function FurnitureWizardStep2Dimensions({ dimensions, onChange, categoryType }: Props) {
  const showSeating = isSofa(categoryType) || isChair(categoryType);
  const showSeatHeight = isSofa(categoryType) || isChair(categoryType) || isBed(categoryType);
  const showStorage = isStorage(categoryType);

  const volume = dimensions.lengthCm && dimensions.widthCm && dimensions.heightCm
    ? (Number(dimensions.lengthCm) * Number(dimensions.widthCm) * Number(dimensions.heightCm)) / 1000000
    : 0;

  const inchesL = dimensions.lengthCm ? (Number(dimensions.lengthCm) / 2.54).toFixed(1) : '';
  const inchesW = dimensions.widthCm ? (Number(dimensions.widthCm) / 2.54).toFixed(1) : '';
  const inchesH = dimensions.heightCm ? (Number(dimensions.heightCm) / 2.54).toFixed(1) : '';

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <div className="font-extrabold mb-1">Accurate dimensions matter</div>
          <div className="font-semibold">Customers use these to check if furniture fits their space. All fields in centimetres (cm).</div>
        </div>
      </div>

      {/* PRIMARY DIMENSIONS */}
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHead icon={Ruler} title="Overall Dimensions" desc="Length × Width × Height in cm" tone="amber" />

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl><ArrowLeftRight className="h-3 w-3 inline mr-1" /> Length (cm) *</Lbl>
            <input type="number" step="0.1" value={dimensions.lengthCm}
              onChange={(e) => onChange({ lengthCm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="200"
              className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-200" />
            {inchesL && <div className="text-[10px] text-slate-500 font-bold mt-1">≈ {inchesL} inches</div>}
          </div>
          <div>
            <Lbl><MoveDiagonal className="h-3 w-3 inline mr-1" /> Width (cm) *</Lbl>
            <input type="number" step="0.1" value={dimensions.widthCm}
              onChange={(e) => onChange({ widthCm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="90"
              className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-200" />
            {inchesW && <div className="text-[10px] text-slate-500 font-bold mt-1">≈ {inchesW} inches</div>}
          </div>
          <div>
            <Lbl><ArrowUpDown className="h-3 w-3 inline mr-1" /> Height (cm) *</Lbl>
            <input type="number" step="0.1" value={dimensions.heightCm}
              onChange={(e) => onChange({ heightCm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="85"
              className="h-14 w-full rounded-xl border-2 border-amber-300 bg-white px-3 text-xl font-extrabold tabular-nums focus:outline-none focus:border-amber-600 focus:ring-4 focus:ring-amber-200" />
            {inchesH && <div className="text-[10px] text-slate-500 font-bold mt-1">≈ {inchesH} inches</div>}
          </div>
        </div>

        {volume > 0 && (
          <div className="rounded-xl bg-white border-2 border-amber-200 p-3 flex items-center justify-between">
            <div className="text-xs font-extrabold text-slate-700">Total Volume</div>
            <div className="text-lg font-extrabold text-amber-800 tabular-nums">
              {volume.toFixed(2)} m³ <span className="text-xs font-bold text-slate-500">(cubic meters)</span>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Depth / Diagonal (cm) <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
            <input type="number" step="0.1" value={dimensions.depthCm}
              onChange={(e) => onChange({ depthCm: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. for corner sofa"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
          <div>
            <Lbl><Weight className="h-3 w-3 inline mr-1" /> Weight (kg)</Lbl>
            <input type="number" step="0.1" value={dimensions.weightKg}
              onChange={(e) => onChange({ weightKg: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 45"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
          </div>
        </div>
      </section>

      {/* SEATING / SLEEPING */}
      {(showSeating || showSeatHeight) && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Users} title="Seating & Comfort" tone="blue" />
          <div className="grid sm:grid-cols-2 gap-3">
            {showSeating && (
              <div>
                <Lbl>Seating Capacity</Lbl>
                <input type="number" min="1" value={dimensions.seatingCapacity}
                  onChange={(e) => onChange({ seatingCapacity: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="e.g. 5, 7"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
                <div className="text-[10px] text-slate-500 font-bold mt-1">How many people can sit</div>
              </div>
            )}
            {showSeatHeight && (
              <div>
                <Lbl>Seat / Bed Height (cm)</Lbl>
                <input type="number" step="0.1" value={dimensions.seatHeightCm}
                  onChange={(e) => onChange({ seatHeightCm: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="45"
                  className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
                <div className="text-[10px] text-slate-500 font-bold mt-1">Floor to seat surface</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* STORAGE */}
      {showStorage && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHead icon={Archive} title="Storage Details" tone="violet" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <Lbl><Package className="h-3 w-3 inline mr-1" /> Compartments</Lbl>
              <input type="number" min="0" value={dimensions.storageCompartments}
                onChange={(e) => onChange({ storageCompartments: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 4"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl>Drawers</Lbl>
              <input type="number" min="0" value={dimensions.drawersCount}
                onChange={(e) => onChange({ drawersCount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 3"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            </div>
            <div>
              <Lbl><Grid3x3 className="h-3 w-3 inline mr-1" /> Shelves</Lbl>
              <input type="number" min="0" value={dimensions.shelvesCount}
                onChange={(e) => onChange({ shelvesCount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 5"
                className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-violet-500" />
            </div>
          </div>
        </section>
      )}

      {/* Preview Card */}
      {(dimensions.lengthCm || dimensions.widthCm || dimensions.heightCm) && (
        <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-amber-900 to-orange-800 text-white p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="h-4 w-4 text-amber-300" />
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300">Dimension Preview</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Length</div>
              <div className="text-2xl font-extrabold tabular-nums text-white leading-none mt-1">
                {dimensions.lengthCm || '—'} <span className="text-xs text-white/60">cm</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Width</div>
              <div className="text-2xl font-extrabold tabular-nums text-white leading-none mt-1">
                {dimensions.widthCm || '—'} <span className="text-xs text-white/60">cm</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase font-extrabold text-white/60">Height</div>
              <div className="text-2xl font-extrabold tabular-nums text-white leading-none mt-1">
                {dimensions.heightCm || '—'} <span className="text-xs text-white/60">cm</span>
              </div>
            </div>
          </div>
          {volume > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between">
              <span className="text-xs font-extrabold text-white/80">Total volume</span>
              <span className="text-lg font-extrabold text-amber-300 tabular-nums">{volume.toFixed(2)} m³</span>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-600 to-orange-800',
    blue: 'from-blue-500 to-cyan-700',
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
