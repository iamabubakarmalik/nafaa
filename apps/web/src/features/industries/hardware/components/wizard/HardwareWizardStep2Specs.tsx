import { Settings, AlertCircle, Info, Ruler, Palette, Zap, Droplets, Wrench, Award } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { HardwareWizardSpecs, CategoryType } from '../../hooks/useHardwareWizard';

interface Props {
  categoryType: CategoryType;
  specs: HardwareWizardSpecs;
  onChange: (patch: Partial<HardwareWizardSpecs>) => void;
  errors: string[];
}

const CEMENT_GRADES = ['OPC-43', 'OPC-53', 'PPC', 'Sulphate Resistant', 'White', 'Other'];
const CEMENT_TYPES = ['Ordinary Portland (OPC)', 'Pozzolana Portland (PPC)', 'Sulphate Resistant (SRC)', 'White Cement', 'Other'];
const STEEL_GRADES = ['Grade 40', 'Grade 60', 'Grade 75', 'Grade 80', 'Other'];
const STEEL_DIAMETERS = ['3mm', '4mm', '6mm', '8mm', '10mm', '12mm', '16mm', '20mm', '25mm', '32mm', '40mm', 'Other'];
const TILE_SIZES = ['12x12"', '16x16"', '18x18"', '24x24"', '600x600mm', '800x800mm', '1000x1000mm', 'Other'];
const TILE_FINISHES = ['Glossy', 'Matte', 'Polished', 'Textured', 'Anti-Skid', 'Wood Effect', 'Marble Effect', 'Other'];
const PAINT_FINISHES = ['Matte', 'Semi-Gloss', 'Gloss', 'Satin', 'Enamel', 'Emulsion', 'Distemper', 'Other'];
const WIRE_GAUGES = ['1.5mm²', '2.5mm²', '4mm²', '6mm²', '10mm²', '16mm²', '25mm²', 'Other'];
const WIRE_CORES = ['Single Core', '2 Core', '3 Core', '4 Core', 'Multi-Core'];
const PIPE_SIZES = ['1/2"', '3/4"', '1"', '1.5"', '2"', '3"', '4"', '6"', 'Other'];
const WOOD_TYPES = ['Sheesham', 'Deodar', 'Kail', 'Partal', 'Mango', 'Neem', 'Pine', 'Teak', 'Other'];

// Category → which fields to show
const CATEGORY_FIELDS: Record<string, string[]> = {
  CEMENT: ['grade', 'cementType', 'bagWeight'],
  STEEL_REBAR: ['steelGrade', 'diameter', 'length', 'weightPerPiece'],
  STEEL_SHEET: ['gauge', 'length', 'thickness'],
  STEEL_PIPE: ['pipeSize', 'gauge', 'length'],
  TILES_FLOOR: ['tileSize', 'finish', 'colorName', 'colorHex', 'sqftPerBox', 'piecesPerBox'],
  TILES_WALL: ['tileSize', 'finish', 'colorName', 'colorHex', 'sqftPerBox', 'piecesPerBox'],
  MARBLE: ['tileSize', 'finish', 'colorName', 'thickness'],
  GRANITE: ['tileSize', 'finish', 'colorName', 'thickness'],
  SANITARY_WARE: ['model', 'material', 'colorName'],
  PLUMBING_PIPE: ['pipeSize', 'material', 'length'],
  PLUMBING_FITTING: ['pipeSize', 'material'],
  ELECTRIC_WIRE: ['wireGauge', 'wireCore'],
  ELECTRIC_SWITCH: ['model', 'material'],
  PAINT: ['paintFinish', 'colorName', 'colorHex', 'litersPerCan', 'coverage'],
  PRIMER: ['paintFinish', 'litersPerCan', 'coverage'],
  WOOD_LUMBER: ['woodType', 'thickness', 'length'],
  PLYWOOD: ['thickness', 'tileSize'],
  MDF: ['thickness', 'tileSize'],
  POWER_TOOL: ['toolType', 'powerRating', 'model'],
  HAND_TOOL: ['toolType', 'material'],
  HARDWARE_TOOL: ['toolType', 'material'],
  DOOR: ['woodType', 'tileSize', 'colorName'],
  WINDOW: ['material', 'tileSize'],
  ALUMINUM: ['gauge', 'thickness'],
};

export function HardwareWizardStep2Specs({ categoryType, specs, onChange, errors }: Props) {
  const fieldsToShow = CATEGORY_FIELDS[categoryType] ?? [];
  const hasSpecificFields = fieldsToShow.length > 0;

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-white border-2 border-amber-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Settings className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-amber-900 text-sm">Technical Specifications</h3>
          <p className="text-xs text-amber-800 font-semibold mt-0.5">
            {hasSpecificFields
              ? `${categoryType.replace('_', ' ')} ke specs — filter aur search mein help karega`
              : 'General specs — kisi bhi product ke liye'}
          </p>
        </div>
      </div>

      {/* CEMENT */}
      {fieldsToShow.includes('grade') && categoryType === 'CEMENT' && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Award} title="🧱 Cement Specifications" tone="amber" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Grade *</label>
              <select value={specs.grade} onChange={(e) => onChange({ grade: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select grade</option>
                {CEMENT_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Cement Type</label>
              <select value={specs.cementType} onChange={(e) => onChange({ cementType: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select type</option>
                {CEMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Input label="Bag Weight (kg)" type="number" value={specs.bagWeight}
            onChange={(e) => onChange({ bagWeight: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="50" hint="Standard bag = 50kg" />
        </section>
      )}

      {/* STEEL REBAR */}
      {categoryType === 'STEEL_REBAR' && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Ruler} title="🔩 Steel Rebar Specifications" tone="amber" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Steel Grade *</label>
              <select value={specs.steelGrade} onChange={(e) => onChange({ steelGrade: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select grade</option>
                {STEEL_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Diameter *</label>
              <select value={specs.diameter} onChange={(e) => onChange({ diameter: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select diameter</option>
                {STEEL_DIAMETERS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Length" value={specs.length} onChange={(e) => onChange({ length: e.target.value })}
              placeholder="e.g. 40 feet, 12 meters" />
            <Input label="Weight per Piece (kg)" type="number" step="0.01" value={specs.weightPerPiece}
              onChange={(e) => onChange({ weightPerPiece: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="Standard weight" />
          </div>
        </section>
      )}

      {/* STEEL SHEET/PIPE */}
      {(categoryType === 'STEEL_SHEET' || categoryType === 'STEEL_PIPE') && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Ruler} title="⚙️ Steel Specifications" tone="amber" />
          <div className="grid sm:grid-cols-3 gap-4">
            {categoryType === 'STEEL_PIPE' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Pipe Size</label>
                <select value={specs.pipeSize} onChange={(e) => onChange({ pipeSize: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                  <option value="">Select</option>
                  {PIPE_SIZES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            <Input label="Gauge" value={specs.gauge} onChange={(e) => onChange({ gauge: e.target.value })} placeholder="e.g. 22 gauge" />
            <Input label="Length" value={specs.length} onChange={(e) => onChange({ length: e.target.value })} placeholder="e.g. 20 feet" />
            <Input label="Thickness" value={specs.thickness} onChange={(e) => onChange({ thickness: e.target.value })} placeholder="e.g. 3mm" />
          </div>
        </section>
      )}

      {/* TILES */}
      {(['TILES_FLOOR', 'TILES_WALL', 'MARBLE', 'GRANITE'] as CategoryType[]).includes(categoryType) && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Palette} title="🟦 Tile/Marble Specifications" tone="amber" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Tile Size *</label>
              <select value={specs.tileSize} onChange={(e) => onChange({ tileSize: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select size</option>
                {TILE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Finish</label>
              <select value={specs.finish} onChange={(e) => onChange({ finish: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select finish</option>
                {TILE_FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Color Name" value={specs.colorName} onChange={(e) => onChange({ colorName: e.target.value })} placeholder="e.g. Beige, Ivory" />
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Color Preview</label>
              <div className="flex gap-2 items-center">
                <input type="color" value={specs.colorHex || '#e5e7eb'}
                  onChange={(e) => onChange({ colorHex: e.target.value })}
                  className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
                <input value={specs.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })}
                  placeholder="#RRGGBB"
                  className="h-11 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
              </div>
            </div>
          </div>
          {(categoryType === 'TILES_FLOOR' || categoryType === 'TILES_WALL') && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Sq Ft per Box" type="number" step="0.01" value={specs.sqftPerBox}
                onChange={(e) => onChange({ sqftPerBox: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 16" />
              <Input label="Pieces per Box" type="number" value={specs.piecesPerBox}
                onChange={(e) => onChange({ piecesPerBox: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 4" />
            </div>
          )}
          {(categoryType === 'MARBLE' || categoryType === 'GRANITE') && (
            <Input label="Thickness" value={specs.thickness} onChange={(e) => onChange({ thickness: e.target.value })} placeholder="e.g. 20mm, 3/4 inch" />
          )}
        </section>
      )}

      {/* SANITARY */}
      {categoryType === 'SANITARY_WARE' && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Droplets} title="🚽 Sanitary Ware" tone="amber" />
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Model" value={specs.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="e.g. Master-Slim" />
            <Input label="Material" value={specs.material} onChange={(e) => onChange({ material: e.target.value })} placeholder="e.g. Ceramic, Chrome" />
            <Input label="Color" value={specs.colorName} onChange={(e) => onChange({ colorName: e.target.value })} placeholder="e.g. White, Ivory" />
          </div>
        </section>
      )}

      {/* PLUMBING */}
      {(categoryType === 'PLUMBING_PIPE' || categoryType === 'PLUMBING_FITTING') && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Droplets} title="🔵 Plumbing" tone="amber" />
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Pipe Size *</label>
              <select value={specs.pipeSize} onChange={(e) => onChange({ pipeSize: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select</option>
                {PIPE_SIZES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Input label="Material" value={specs.material} onChange={(e) => onChange({ material: e.target.value })} placeholder="e.g. PPR, PVC, GI, Copper" />
            {categoryType === 'PLUMBING_PIPE' && (
              <Input label="Length" value={specs.length} onChange={(e) => onChange({ length: e.target.value })} placeholder="e.g. 20 feet" />
            )}
          </div>
        </section>
      )}

      {/* ELECTRIC WIRE */}
      {categoryType === 'ELECTRIC_WIRE' && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Zap} title="⚡ Electric Wire" tone="amber" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Wire Gauge *</label>
              <select value={specs.wireGauge} onChange={(e) => onChange({ wireGauge: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select gauge</option>
                {WIRE_GAUGES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Wire Core</label>
              <select value={specs.wireCore} onChange={(e) => onChange({ wireCore: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select core</option>
                {WIRE_CORES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {/* PAINT */}
      {(categoryType === 'PAINT' || categoryType === 'PRIMER') && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Palette} title="🎨 Paint Specifications" tone="amber" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Finish</label>
              <select value={specs.paintFinish} onChange={(e) => onChange({ paintFinish: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                <option value="">Select finish</option>
                {PAINT_FINISHES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <Input label="Liters per Can" type="number" step="0.01" value={specs.litersPerCan}
              onChange={(e) => onChange({ litersPerCan: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 3.6, 18" />
          </div>
          {categoryType === 'PAINT' && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Color Name" value={specs.colorName} onChange={(e) => onChange({ colorName: e.target.value })} placeholder="e.g. Off White" />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Color Preview</label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={specs.colorHex || '#ffffff'}
                    onChange={(e) => onChange({ colorHex: e.target.value })}
                    className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
                  <input value={specs.colorHex} onChange={(e) => onChange({ colorHex: e.target.value })}
                    placeholder="#RRGGBB"
                    className="h-11 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-amber-500" />
                </div>
              </div>
            </div>
          )}
          <Input label="Coverage" value={specs.coverage} onChange={(e) => onChange({ coverage: e.target.value })} placeholder="e.g. 100 sqft per liter" />
        </section>
      )}

      {/* WOOD */}
      {(categoryType === 'WOOD_LUMBER' || categoryType === 'PLYWOOD' || categoryType === 'MDF') && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Ruler} title="🪵 Wood Specifications" tone="amber" />
          <div className="grid sm:grid-cols-2 gap-4">
            {categoryType === 'WOOD_LUMBER' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Wood Type</label>
                <select value={specs.woodType} onChange={(e) => onChange({ woodType: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
                  <option value="">Select wood</option>
                  {WOOD_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            )}
            <Input label="Thickness" value={specs.thickness} onChange={(e) => onChange({ thickness: e.target.value })} placeholder="e.g. 18mm, 3/4 inch" />
            <Input label={categoryType === 'WOOD_LUMBER' ? 'Length' : 'Sheet Size'}
              value={categoryType === 'WOOD_LUMBER' ? specs.length : specs.tileSize}
              onChange={(e) => categoryType === 'WOOD_LUMBER' ? onChange({ length: e.target.value }) : onChange({ tileSize: e.target.value })}
              placeholder={categoryType === 'WOOD_LUMBER' ? 'e.g. 10 feet' : 'e.g. 8x4 feet'} />
          </div>
        </section>
      )}

      {/* TOOLS */}
      {(categoryType === 'POWER_TOOL' || categoryType === 'HAND_TOOL' || categoryType === 'HARDWARE_TOOL') && (
        <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
          <SectionHeader icon={Wrench} title="🔨 Tool Specifications" tone="amber" />
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Tool Type" value={specs.toolType} onChange={(e) => onChange({ toolType: e.target.value })} placeholder="e.g. Drill, Grinder" />
            <Input label="Material" value={specs.material} onChange={(e) => onChange({ material: e.target.value })} placeholder="e.g. Steel, Alloy" />
            {categoryType === 'POWER_TOOL' && (
              <>
                <Input label="Model" value={specs.model} onChange={(e) => onChange({ model: e.target.value })} placeholder="Model number" />
                <Input label="Power Rating" value={specs.powerRating} onChange={(e) => onChange({ powerRating: e.target.value })} placeholder="e.g. 850W, 220V" />
              </>
            )}
          </div>
        </section>
      )}

      {/* Generic — always shown */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHeader icon={Info} title="General Information" desc="Origin, warranty, extra specs" />
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Country of Origin" value={specs.originCountry}
            onChange={(e) => onChange({ originCountry: e.target.value })}
            placeholder="e.g. Pakistan, China, Germany" />
          <Input label="Warranty (months)" type="number" value={specs.warrantyMonths}
            onChange={(e) => onChange({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional" />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Additional Specifications</label>
          <textarea rows={3} value={specs.specifications}
            onChange={(e) => onChange({ specifications: e.target.value })}
            placeholder="Any other technical details, standards, certifications..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-amber-500" />
        </div>
      </section>

      {!hasSpecificFields && (
        <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 font-semibold">
            Is category ke liye specific fields nahi hain — general info wala section fill karo, ya seedha Step 3 par jao.
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, desc, tone = 'slate' }: any) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-700',
    amber: 'from-amber-500 to-orange-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-100">
      <div className={['h-10 w-10 rounded-xl text-white flex items-center justify-center shadow-md bg-gradient-to-br',
        tones[tone] ?? tones.slate].join(' ')}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-extrabold text-slate-900 text-base leading-tight">{title}</h3>
        {desc && <p className="text-xs text-slate-500 font-semibold">{desc}</p>}
      </div>
    </div>
  );
}
