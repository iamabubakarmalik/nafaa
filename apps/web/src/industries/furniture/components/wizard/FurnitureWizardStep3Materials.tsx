import { useState } from 'react';
import {
  Palette, TreePine, Sparkles, Droplets, Shield, Hammer,
  Truck, Clock, AlertCircle, Wrench, Bug, Leaf, Info, X, Plus,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { FurnitureWizardMaterials, FurnitureWizardDelivery } from '../../hooks/useFurnitureWizard';

interface Props {
  materials: FurnitureWizardMaterials;
  delivery: FurnitureWizardDelivery;
  onChangeMaterials: (patch: Partial<FurnitureWizardMaterials>) => void;
  onChangeDelivery: (patch: Partial<FurnitureWizardDelivery>) => void;
  errors: string[];
}

const MATERIAL_GROUPS = [
  {
    group: 'Solid Wood',
    items: [
      { v: 'SOLID_WOOD_TEAK', l: 'Teak (Sagwan)', e: '🌳' },
      { v: 'SOLID_WOOD_SHEESHAM', l: 'Sheesham', e: '🌳' },
      { v: 'SOLID_WOOD_ROSEWOOD', l: 'Rosewood', e: '🌳' },
      { v: 'SOLID_WOOD_MANGO', l: 'Mango Wood', e: '🥭' },
    ],
  },
  {
    group: 'Engineered',
    items: [
      { v: 'ENGINEERED_WOOD', l: 'Engineered', e: '🪵' },
      { v: 'MDF', l: 'MDF', e: '📋' },
      { v: 'PARTICLE_BOARD', l: 'Particle', e: '📋' },
      { v: 'PLYWOOD', l: 'Plywood', e: '📋' },
    ],
  },
  {
    group: 'Metal & Glass',
    items: [
      { v: 'METAL_IRON', l: 'Iron', e: '⚙️' },
      { v: 'METAL_STEEL', l: 'Steel', e: '⚙️' },
      { v: 'METAL_ALUMINIUM', l: 'Aluminium', e: '⚙️' },
      { v: 'GLASS', l: 'Glass', e: '🪟' },
    ],
  },
  {
    group: 'Stone & Natural',
    items: [
      { v: 'MARBLE', l: 'Marble', e: '⬜' },
      { v: 'GRANITE', l: 'Granite', e: '⬛' },
      { v: 'RATTAN', l: 'Rattan', e: '🪢' },
      { v: 'BAMBOO', l: 'Bamboo', e: '🎋' },
    ],
  },
  {
    group: 'Fabric & Leather',
    items: [
      { v: 'FABRIC_COTTON', l: 'Cotton', e: '🧵' },
      { v: 'FABRIC_LINEN', l: 'Linen', e: '🧵' },
      { v: 'FABRIC_VELVET', l: 'Velvet', e: '🧵' },
      { v: 'LEATHER_GENUINE', l: 'Real Leather', e: '👞' },
      { v: 'LEATHER_FAUX', l: 'Faux Leather', e: '👞' },
    ],
  },
];

const WOOD_TYPES = ['Sheesham', 'Teak', 'Rosewood', 'Mango', 'Deodar', 'Oak', 'Pine', 'Walnut'];
const WOOD_FINISHES = ['Natural', 'Walnut', 'Honey', 'Mahogany', 'Ebony', 'Antique', 'Whitewash', 'Distressed'];
const POLISH_TYPES = ['Matte', 'Semi-Gloss', 'Glossy', 'Lacquer', 'Wax', 'Oil', 'Melamine', 'PU'];
const FABRICS = ['Velvet', 'Linen', 'Cotton', 'Polyester', 'Chenille', 'Suede', 'Leatherette', 'Boucle'];
const CUSHION_FILLINGS = ['High-Density Foam', 'Memory Foam', 'Fiber', 'Polyester', 'Feather', 'Cotton'];
const CUSHION_DENSITY = ['Soft (25kg/m³)', 'Medium (32kg/m³)', 'Firm (40kg/m³)', 'Extra Firm (50kg/m³)'];

const COLOR_PRESETS = [
  { name: 'Natural Wood', hex: '#8B6F47' },
  { name: 'Walnut', hex: '#5C4033' },
  { name: 'Honey', hex: '#D4A574' },
  { name: 'Ebony', hex: '#2C1810' },
  { name: 'Whitewash', hex: '#F5F5DC' },
  { name: 'Beige', hex: '#D2B48C' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Blue', hex: '#1e40af' },
  { name: 'Green', hex: '#065f46' },
  { name: 'Maroon', hex: '#7f1d1d' },
];

const WARRANTY_PRESETS = [
  { l: '3 Months', m: 3 },
  { l: '6 Months', m: 6 },
  { l: '1 Year', m: 12 },
  { l: '2 Years', m: 24 },
  { l: '5 Years', m: 60 },
  { l: '10 Years', m: 120 },
];

export function FurnitureWizardStep3Materials({
  materials, delivery, onChangeMaterials, onChangeDelivery, errors,
}: Props) {
  const togMaterial = (v: string) => {
    const cur = materials.secondaryMaterials ?? [];
    onChangeMaterials({ secondaryMaterials: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-300 p-4 text-sm text-rose-900 font-semibold">
          {errors.join(', ')}
        </div>
      )}

      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          <div className="font-extrabold mb-1">Material & delivery details</div>
          <div className="font-semibold">Buyers care about wood type, finish, cushion feel, and delivery/assembly logistics.</div>
        </div>
      </div>

      {/* PRIMARY MATERIAL */}
      <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <SectionHead icon={TreePine} title="Primary Material" desc="Main construction material" tone="amber" />
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {MATERIAL_GROUPS.map((grp) => (
            <div key={grp.group}>
              <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5">{grp.group}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {grp.items.map((m) => {
                  const a = materials.primaryMaterial === m.v;
                  return (
                    <button key={m.v} type="button" onClick={() => onChangeMaterials({ primaryMaterial: m.v })}
                      className={['p-2.5 rounded-xl border-2 transition flex flex-col items-center gap-0.5 min-h-[66px]',
                        a ? 'border-amber-600 bg-amber-600 text-white shadow-md scale-[1.03]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400'].join(' ')}>
                      <span className="text-xl leading-none">{m.e}</span>
                      <span className="text-[10px] font-extrabold text-center leading-tight">{m.l}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECONDARY MATERIALS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <SectionHead icon={Sparkles} title="Secondary Materials" desc="Optional — other materials used" tone="blue" />
        <div className="flex flex-wrap gap-1.5">
          {MATERIAL_GROUPS.flatMap((g) => g.items).map((m) => {
            const a = materials.secondaryMaterials?.includes(m.v);
            return (
              <button key={m.v} type="button" onClick={() => togMaterial(m.v)}
                className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition inline-flex items-center gap-1',
                  a ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                <span>{m.e}</span>{m.l}
              </button>
            );
          })}
        </div>
      </section>

      {/* WOOD DETAILS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={TreePine} title="Wood Details" tone="amber" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Wood Type</Lbl>
            <input list="woodTypesList" value={materials.woodType}
              onChange={(e) => onChangeMaterials({ woodType: e.target.value })} placeholder="Sheesham"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <datalist id="woodTypesList">{WOOD_TYPES.map((w) => <option key={w} value={w} />)}</datalist>
          </div>
          <div>
            <Lbl>Wood Finish</Lbl>
            <input list="woodFinishList" value={materials.woodFinish}
              onChange={(e) => onChangeMaterials({ woodFinish: e.target.value })} placeholder="Walnut"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-amber-500" />
            <datalist id="woodFinishList">{WOOD_FINISHES.map((w) => <option key={w} value={w} />)}</datalist>
          </div>
          <div>
            <Lbl>Polish Type</Lbl>
            <select value={materials.polishType} onChange={(e) => onChangeMaterials({ polishType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-amber-500">
              <option value="">Not specified</option>
              {POLISH_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* COLOR */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Palette} title="Color" desc="Product finish color" tone="violet" />
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Lbl>Color Name</Lbl>
            <input value={materials.colorName} onChange={(e) => onChangeMaterials({ colorName: e.target.value })}
              placeholder="Walnut Brown"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <Lbl>Color Preview</Lbl>
            <div className="flex gap-2 items-center">
              <input type="color" value={materials.colorHex || '#8B6F47'}
                onChange={(e) => onChangeMaterials({ colorHex: e.target.value })}
                className="h-11 w-16 rounded-xl border-2 border-slate-200 cursor-pointer" />
              <input value={materials.colorHex} onChange={(e) => onChangeMaterials({ colorHex: e.target.value })}
                placeholder="#8B6F47"
                className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-mono focus:outline-none focus:border-violet-500" />
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-600 mb-2">Quick presets</div>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((c) => (
              <button key={c.hex} type="button"
                onClick={() => onChangeMaterials({ colorName: c.name, colorHex: c.hex })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 border-slate-200 hover:border-violet-400 text-xs font-extrabold">
                <span className="h-4 w-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: c.hex }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* UPHOLSTERY */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Sparkles} title="Upholstery & Cushion" desc="For sofas, chairs, beds" tone="rose" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Fabric Type</Lbl>
            <input list="fabricList" value={materials.upholsteryFabric}
              onChange={(e) => onChangeMaterials({ upholsteryFabric: e.target.value })} placeholder="Velvet"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            <datalist id="fabricList">{FABRICS.map((f) => <option key={f} value={f} />)}</datalist>
          </div>
          <div>
            <Lbl>Cushion Filling</Lbl>
            <input list="fillingList" value={materials.cushionFilling}
              onChange={(e) => onChangeMaterials({ cushionFilling: e.target.value })} placeholder="HD Foam"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-rose-500" />
            <datalist id="fillingList">{CUSHION_FILLINGS.map((c) => <option key={c} value={c} />)}</datalist>
          </div>
          <div>
            <Lbl>Cushion Density / Firmness</Lbl>
            <select value={materials.cushionDensity}
              onChange={(e) => onChangeMaterials({ cushionDensity: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-rose-500">
              <option value="">Not specified</option>
              {CUSHION_DENSITY.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* ASSEMBLY & CUSTOM ORDER */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Hammer} title="Assembly & Customization" tone="emerald" />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-emerald-300 cursor-pointer">
            <input type="checkbox" checked={delivery.requiresAssembly}
              onChange={(e) => onChangeDelivery({ requiresAssembly: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Wrench className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="font-extrabold text-sm text-slate-900">Requires Assembly</div>
              <div className="text-xs text-slate-500 font-semibold">Needs putting together at delivery</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-violet-300 cursor-pointer">
            <input type="checkbox" checked={delivery.isCustomizable}
              onChange={(e) => onChangeDelivery({ isCustomizable: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Palette className="h-5 w-5 text-violet-600" />
            <div className="flex-1">
              <div className="font-extrabold text-sm text-slate-900">Customizable</div>
              <div className="text-xs text-slate-500 font-semibold">Size/color/material changes possible</div>
            </div>
          </label>
        </div>

        {delivery.requiresAssembly && (
          <div className="rounded-xl bg-emerald-50 border-2 border-emerald-200 p-4 space-y-3">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">Assembly details</div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Input label="Time (minutes)" type="number" value={delivery.assemblyTimeMinutes}
                onChange={(e) => onChangeDelivery({ assemblyTimeMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="60" />
              <Input label="Parts Count" type="number" value={delivery.assemblyPartsCount}
                onChange={(e) => onChangeDelivery({ assemblyPartsCount: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="e.g. 20" />
              <Input label="Extra Charge" type="number" value={delivery.assemblyChargeExtra}
                onChange={(e) => onChangeDelivery({ assemblyChargeExtra: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="If chargeable" />
            </div>
            <label className="flex items-center gap-2 text-xs font-extrabold text-emerald-800">
              <input type="checkbox" checked={delivery.assemblyToolsIncluded}
                onChange={(e) => onChangeDelivery({ assemblyToolsIncluded: e.target.checked })}
                className="h-4 w-4 rounded" />
              Tools & hardware included in box
            </label>
          </div>
        )}

        {delivery.isCustomizable && (
          <div className="rounded-xl bg-violet-50 border-2 border-violet-200 p-4">
            <Input label="Custom Order Lead Time (days)" type="number" value={delivery.customLeadTimeDays}
              onChange={(e) => onChangeDelivery({ customLeadTimeDays: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 15" />
          </div>
        )}
      </section>

      {/* WARRANTY & CARE */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Shield} title="Warranty & Care" tone="blue" />

        <div>
          <Lbl>Warranty Period</Lbl>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {WARRANTY_PRESETS.map((p) => {
              const a = delivery.warrantyMonths === p.m;
              return (
                <button key={p.m} type="button" onClick={() => onChangeDelivery({ warrantyMonths: p.m })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    a ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {p.l}
                </button>
              );
            })}
          </div>
          <input type="number" value={delivery.warrantyMonths}
            onChange={(e) => onChangeDelivery({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Custom months"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        <div>
          <Lbl>Warranty Type</Lbl>
          <select value={delivery.warrantyType} onChange={(e) => onChangeDelivery({ warrantyType: e.target.value })}
            className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
            <option value="">None</option>
            <option value="Manufacturer">Manufacturer</option>
            <option value="Shop Warranty">Shop Warranty</option>
            <option value="Structural Only">Structural Only</option>
            <option value="Frame Only">Frame Only</option>
            <option value="Extended">Extended</option>
          </select>
        </div>

        <div>
          <Lbl>Care Instructions <span className="text-slate-400 normal-case font-bold">(optional)</span></Lbl>
          <textarea rows={2} value={delivery.careInstructions}
            onChange={(e) => onChangeDelivery({ careInstructions: e.target.value })}
            placeholder="Wipe with dry cloth, avoid direct sunlight, use coasters..."
            className="w-full rounded-xl border-2 border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-sky-200 bg-sky-50 cursor-pointer">
            <input type="checkbox" checked={delivery.isWaterResistant}
              onChange={(e) => onChangeDelivery({ isWaterResistant: e.target.checked })}
              className="h-4 w-4 rounded" />
            <Droplets className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-extrabold text-sky-900">Water Resistant</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 cursor-pointer">
            <input type="checkbox" checked={delivery.isTermiteProof}
              onChange={(e) => onChangeDelivery({ isTermiteProof: e.target.checked })}
              className="h-4 w-4 rounded" />
            <Bug className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-extrabold text-emerald-900">Termite Proof</span>
          </label>
        </div>
      </section>

      {/* DELIVERY LOGISTICS */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <SectionHead icon={Truck} title="Delivery Logistics" desc="Vehicle & helpers needed" tone="orange" />

        <div className="grid sm:grid-cols-2 gap-2">
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-orange-300 cursor-pointer">
            <input type="checkbox" checked={delivery.requiresLargeVehicle}
              onChange={(e) => onChangeDelivery({ requiresLargeVehicle: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Truck className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <div className="font-extrabold text-sm text-slate-900">Requires Large Vehicle</div>
              <div className="text-[10px] text-slate-500 font-semibold">Suzuki/Shehzore/Truck</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-slate-200 hover:border-orange-300 cursor-pointer">
            <input type="checkbox" checked={delivery.requiresMultipleHelpers}
              onChange={(e) => onChangeDelivery({ requiresMultipleHelpers: e.target.checked })}
              className="h-5 w-5 rounded" />
            <Users className="h-5 w-5 text-orange-600" />
            <div className="flex-1">
              <div className="font-extrabold text-sm text-slate-900">Multiple Helpers Needed</div>
              <div className="text-[10px] text-slate-500 font-semibold">For loading/carrying</div>
            </div>
          </label>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Lbl>Helpers Needed</Lbl>
            <input type="number" min="1" value={delivery.helpersNeeded}
              onChange={(e) => onChangeDelivery({ helpersNeeded: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="2"
              className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-orange-500" />
          </div>
          <Input label="Base Delivery Charge" type="number" value={delivery.deliveryChargeBase}
            onChange={(e) => onChangeDelivery({ deliveryChargeBase: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Standard rate" />
          <Input label="Free Delivery Radius (km)" type="number" value={delivery.freeDeliveryRadius}
            onChange={(e) => onChangeDelivery({ freeDeliveryRadius: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="e.g. 15" />
        </div>

        {delivery.deliveryChargeBase && Number(delivery.deliveryChargeBase) > 0 && (
          <div className="rounded-xl bg-orange-50 border-2 border-orange-200 p-3 text-sm font-extrabold text-orange-800">
            🚚 Base delivery: {formatPKRFull(Number(delivery.deliveryChargeBase))}
            {delivery.freeDeliveryRadius && Number(delivery.freeDeliveryRadius) > 0 && (
              <span className="ml-2 text-orange-600">
                • FREE within {delivery.freeDeliveryRadius}km
              </span>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function SectionHead({ icon: Icon, title, desc, tone }: any) {
  const tones: Record<string, string> = {
    amber: 'from-amber-600 to-orange-800',
    blue: 'from-blue-500 to-cyan-700',
    violet: 'from-violet-500 to-purple-700',
    rose: 'from-rose-500 to-red-700',
    emerald: 'from-emerald-500 to-teal-700',
    orange: 'from-orange-500 to-red-700',
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
