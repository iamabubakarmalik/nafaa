import { useState } from 'react';
import {
  Wrench, Hash, ShieldCheck, AlertCircle, Award, Zap, AlertTriangle,
  Plus, X, Package, Globe, Clock, Wrench as ToolIcon, Sparkles,
} from 'lucide-react';
import { Input } from '@/components/ui/Input';
import type { AutoPartsWizardDetails } from '../../hooks/useAutoPartsWizard';
import type { PartCondition } from '../../api/part-profiles.api';

interface Props {
  details: AutoPartsWizardDetails;
  onChange: (patch: Partial<AutoPartsWizardDetails>) => void;
  onAddAlternate: (num: string) => void;
  onRemoveAlternate: (num: string) => void;
  errors: string[];
}

const CONDITIONS: { value: PartCondition; label: string; emoji: string; color: string; desc: string }[] = [
  { value: 'NEW', label: 'New', emoji: '✨', color: 'emerald', desc: 'Brand new part' },
  { value: 'GENUINE', label: 'Genuine', emoji: '🏅', color: 'blue', desc: 'Manufacturer genuine' },
  { value: 'OEM', label: 'OEM', emoji: '🏭', color: 'cyan', desc: 'Original equipment mfg' },
  { value: 'AFTERMARKET', label: 'Aftermarket', emoji: '🔧', color: 'orange', desc: 'Third-party replacement' },
  { value: 'REFURBISHED', label: 'Refurbished', emoji: '♻️', color: 'violet', desc: 'Restored to working' },
  { value: 'USED', label: 'Used', emoji: '🔄', color: 'amber', desc: 'Second-hand' },
  { value: 'LOCAL', label: 'Local', emoji: '🇵🇰', color: 'slate', desc: 'Locally made' },
];

const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy', color: 'emerald' },
  { value: 'MEDIUM', label: 'Medium', color: 'amber' },
  { value: 'HARD', label: 'Hard', color: 'orange' },
  { value: 'EXPERT', label: 'Expert Only', color: 'rose' },
];

const COUNTRIES = ['Japan', 'Germany', 'USA', 'China', 'South Korea', 'Thailand', 'Pakistan', 'India', 'Taiwan', 'UK', 'France', 'Italy', 'UAE'];

export function AutoPartsWizardStep2Details({
  details, onChange, onAddAlternate, onRemoveAlternate, errors,
}: Props) {
  const [altInput, setAltInput] = useState('');

  const handleAddAlt = () => {
    if (altInput.trim()) {
      onAddAlternate(altInput.trim());
      setAltInput('');
    }
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before Next:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-md shrink-0">
          <Wrench className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-slate-900 text-sm">Part Details & Specifications</h3>
          <p className="text-xs text-slate-700 font-semibold mt-0.5 leading-relaxed">
            Part numbers, condition, warranty, physical specs — better search & inventory tracking.
          </p>
        </div>
      </div>

      {/* Part Numbers */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-700 text-white flex items-center justify-center shadow-md">
            <Hash className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-blue-900 text-base">Part Numbers</h3>
            <p className="text-xs text-blue-700 font-semibold">Manufacturer & OEM references</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Part Number"
            value={details.partNumber}
            onChange={(e) => onChange({ partNumber: e.target.value })}
            placeholder="e.g. 04465-30340"
            hint="Manufacturer's part #"
          />
          <Input
            label="OEM Number"
            value={details.oemNumber}
            onChange={(e) => onChange({ oemNumber: e.target.value })}
            placeholder="e.g. TOY-BRK-001"
            hint="Original equipment #"
          />
        </div>

        {/* Alternate Numbers */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Alternate/Cross-Reference Numbers
            <span className="ml-2 text-[10px] text-slate-500 font-semibold">({details.alternateNumbers.length})</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={altInput}
              onChange={(e) => setAltInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAlt())}
              placeholder="Add alternate part number..."
              className="h-10 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-mono font-bold focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddAlt}
              disabled={!altInput.trim()}
              className="h-10 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          {details.alternateNumbers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {details.alternateNumbers.map((num) => (
                <span key={num} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-100 text-blue-800 text-xs font-mono font-bold">
                  {num}
                  <button
                    onClick={() => onRemoveAlternate(num)}
                    className="hover:bg-blue-200 rounded"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Condition */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base">Condition *</h3>
            <p className="text-xs text-emerald-700 font-semibold">Part quality/state</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CONDITIONS.map((c) => {
            const active = details.condition === c.value;
            const colors: Record<string, string> = {
              emerald: 'border-emerald-500 bg-emerald-100 text-emerald-900',
              blue: 'border-blue-500 bg-blue-100 text-blue-900',
              cyan: 'border-cyan-500 bg-cyan-100 text-cyan-900',
              orange: 'border-orange-500 bg-orange-100 text-orange-900',
              violet: 'border-violet-500 bg-violet-100 text-violet-900',
              amber: 'border-amber-500 bg-amber-100 text-amber-900',
              slate: 'border-slate-600 bg-slate-100 text-slate-900',
            };
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange({ condition: c.value })}
                className={[
                  'p-3 rounded-xl border-2 text-center transition',
                  active
                    ? colors[c.color] + ' shadow-md scale-105'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400',
                ].join(' ')}
              >
                <div className="text-2xl mb-1">{c.emoji}</div>
                <div className="text-xs font-extrabold">{c.label}</div>
                <div className="text-[9px] font-semibold opacity-70 mt-0.5">{c.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Manufacturer & Origin */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Manufacturer & Origin</h3>
            <p className="text-xs text-slate-500 font-semibold">Brand info, country</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Brand"
            value={details.brand}
            onChange={(e) => onChange({ brand: e.target.value })}
            placeholder="e.g. Bosch, Denso, NGK"
          />
          <Input
            label="Manufacturer"
            value={details.manufacturer}
            onChange={(e) => onChange({ manufacturer: e.target.value })}
            placeholder="Full manufacturer name"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Country of Origin</label>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange({ countryOfOrigin: details.countryOfOrigin === c ? '' : c })}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition',
                  details.countryOfOrigin === c
                    ? 'border-slate-700 bg-slate-700 text-white shadow'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400',
                ].join(' ')}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Physical Specs */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Physical Specifications</h3>
            <p className="text-xs text-slate-500 font-semibold">Weight, size, color, material</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Weight (grams)"
            type="number"
            value={details.weightGrams}
            onChange={(e) => onChange({ weightGrams: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
          />
          <Input
            label="Dimensions"
            value={details.dimensions}
            onChange={(e) => onChange({ dimensions: e.target.value })}
            placeholder="e.g. 200x150x50 mm"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Color"
            value={details.color}
            onChange={(e) => onChange({ color: e.target.value })}
            placeholder="e.g. Black, Silver"
          />
          <Input
            label="Material"
            value={details.material}
            onChange={(e) => onChange({ material: e.target.value })}
            placeholder="e.g. Steel, Aluminum, Plastic"
          />
        </div>
      </section>

      {/* Warranty */}
      <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-emerald-900 text-base">Warranty</h3>
            <p className="text-xs text-emerald-700 font-semibold">Coverage period & terms</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Warranty (months)"
            type="number"
            value={details.warrantyMonths}
            onChange={(e) => onChange({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="6"
            hint="0 = no warranty"
          />
          <Input
            label="Warranty (km)"
            type="number"
            value={details.warrantyKm}
            onChange={(e) => onChange({ warrantyKm: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            hint="Mileage limit"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Warranty Notes</label>
          <textarea
            rows={2}
            value={details.warrantyNotes}
            onChange={(e) => onChange({ warrantyNotes: e.target.value })}
            placeholder="Terms, exclusions, requirements..."
            className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </section>

      {/* Installation */}
      <section className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <ToolIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-orange-900 text-base">Installation Info</h3>
            <p className="text-xs text-orange-700 font-semibold">Time, difficulty, tools needed</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Input
            label="Installation Time (min)"
            type="number"
            value={details.installationMinutes}
            onChange={(e) => onChange({ installationMinutes: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Optional"
            leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
          />
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Difficulty</label>
            <div className="grid grid-cols-4 gap-1">
              {DIFFICULTIES.map((d) => {
                const active = details.installationDifficulty === d.value;
                const colors: Record<string, string> = {
                  emerald: 'border-emerald-500 bg-emerald-500 text-white',
                  amber: 'border-amber-500 bg-amber-500 text-white',
                  orange: 'border-orange-500 bg-orange-500 text-white',
                  rose: 'border-rose-500 bg-rose-500 text-white',
                };
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => onChange({ installationDifficulty: d.value })}
                    className={[
                      'py-2 rounded-lg text-xs font-extrabold border-2 transition',
                      active ? colors[d.color] + ' shadow'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300',
                    ].join(' ')}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-orange-100 transition border-2 border-transparent hover:border-orange-300">
          <input type="checkbox" checked={details.requiresSpecialTool}
            onChange={(e) => onChange({ requiresSpecialTool: e.target.checked })} className="h-5 w-5 rounded" />
          <ToolIcon className="h-5 w-5 text-orange-600" />
          <div className="flex-1">
            <div className="font-extrabold text-slate-900 text-sm">Requires Special Tool</div>
            <div className="text-xs text-slate-500 font-semibold">Not standard toolkit</div>
          </div>
        </label>
      </section>

      {/* Tags: Fast Moving / Critical */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-700 text-white flex items-center justify-center shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Inventory Tags</h3>
            <p className="text-xs text-slate-500 font-semibold">Special classifications</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-2">
          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            details.isFastMoving ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-red-200 hover:bg-red-50/50',
          ].join(' ')}>
            <input type="checkbox" checked={details.isFastMoving}
              onChange={(e) => onChange({ isFastMoving: e.target.checked })} className="h-5 w-5 rounded" />
            <Zap className={['h-5 w-5', details.isFastMoving ? 'text-red-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Fast Moving</div>
              <div className="text-xs text-slate-500 font-semibold">High turnover part</div>
            </div>
          </label>

          <label className={[
            'flex items-center gap-3 cursor-pointer p-3 rounded-xl transition border-2',
            details.isCritical ? 'border-rose-500 bg-rose-50' : 'border-transparent hover:border-rose-200 hover:bg-rose-50/50',
          ].join(' ')}>
            <input type="checkbox" checked={details.isCritical}
              onChange={(e) => onChange({ isCritical: e.target.checked })} className="h-5 w-5 rounded" />
            <AlertCircle className={['h-5 w-5', details.isCritical ? 'text-rose-600' : 'text-slate-400'].join(' ')} />
            <div className="flex-1">
              <div className="font-extrabold text-slate-900 text-sm">Critical Part</div>
              <div className="text-xs text-slate-500 font-semibold">Always keep in stock</div>
            </div>
          </label>
        </div>

        <Input
          label="Minimum Stock Alert"
          type="number"
          value={details.minStockAlert}
          onChange={(e) => onChange({ minStockAlert: e.target.value === '' ? '' : Number(e.target.value) })}
          placeholder="5"
          hint="Alert when stock drops below this level"
        />
      </section>
    </div>
  );
}
