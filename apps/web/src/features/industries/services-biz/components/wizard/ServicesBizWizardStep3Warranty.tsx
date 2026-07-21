import { useState } from 'react';
import {
  Shield, Clock, Award, Wrench, Package, ArrowLeft, Save,
  AlertTriangle, Plus, X, FileText, GraduationCap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ServicesBizWarranty } from '../../hooks/useServicesBizWizard';

const SKILL_LEVELS = [
  { value: 'APPRENTICE', label: 'Apprentice', emoji: '🎓', desc: 'Learning' },
  { value: 'JUNIOR', label: 'Junior', emoji: '👤', desc: '0-2 years' },
  { value: 'SENIOR', label: 'Senior', emoji: '⭐', desc: '3-5 years' },
  { value: 'EXPERT', label: 'Expert', emoji: '🏆', desc: '5-10 years' },
  { value: 'MASTER', label: 'Master', emoji: '💎', desc: '10+ years' },
  { value: 'SUPERVISOR', label: 'Supervisor', emoji: '👑', desc: 'Team lead' },
];

const WARRANTY_TYPES = [
  { value: 'NONE', label: 'No Warranty', emoji: '❌' },
  { value: 'SERVICE_PROVIDER', label: 'Provider Warranty', emoji: '🏢' },
  { value: 'MANUFACTURER', label: 'Manufacturer', emoji: '🏭' },
  { value: 'EXTENDED', label: 'Extended', emoji: '📅' },
  { value: 'PARTS_ONLY', label: 'Parts Only', emoji: '🔩' },
  { value: 'LABOR_ONLY', label: 'Labor Only', emoji: '💪' },
  { value: 'FULL', label: 'Full Coverage', emoji: '🛡️' },
];

const COMMON_TOOLS = [
  '🔧 Wrench Set', '🔨 Hammer', '🪛 Screwdriver Set', '⚡ Multimeter',
  '🪜 Ladder', '📐 Level', '✂️ Wire Cutter', '🔦 Torch',
  '🔩 Drill Machine', '🧰 Toolbox', '⛑️ Safety Gear', '🧲 Magnet',
  '📏 Measuring Tape', '🪚 Saw', '🧽 Cleaning Supplies', '⚙️ Pliers',
];

const COMMON_PARTS = [
  '🔌 Wires', '💡 Bulbs', '🔌 Switches', '🔩 Screws',
  '🪛 Nuts & Bolts', '🚰 Pipes', '💧 Faucets', '🌡️ Thermostat',
  '🔋 Batteries', '📱 Circuit Board', '🌀 Fan Motor', '❄️ AC Gas',
];

interface Props {
  warranty: ServicesBizWarranty;
  onChange: (patch: Partial<ServicesBizWarranty>) => void;
  onToggleTool: (tool: string) => void;
  onTogglePart: (part: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  validation: { valid: boolean; errors: string[] };
  allValid: boolean;
}

export function ServicesBizWizardStep3Warranty({
  warranty, onChange, onToggleTool, onTogglePart,
  onBack, onSubmit, submitting, validation, allValid,
}: Props) {
  const [customTool, setCustomTool] = useState('');
  const [customPart, setCustomPart] = useState('');

  const addCustomTool = () => {
    if (!customTool.trim()) return;
    onToggleTool(customTool.trim());
    setCustomTool('');
  };

  const addCustomPart = () => {
    if (!customPart.trim()) return;
    onTogglePart(customPart.trim());
    setCustomPart('');
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Duration & Skill Level</h3>
            <p className="text-[11px] text-slate-500 font-semibold">How long and what expertise?</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-extrabold text-blue-700 mb-1.5 uppercase tracking-wider">
              ⏱️ Estimated Duration (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={warranty.estimatedDurationMin}
              onChange={(e) => onChange({ estimatedDurationMin: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="60"
              className="h-12 w-full rounded-xl border-2 border-blue-300 bg-blue-50 dark:bg-blue-950/30 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-2">Required Skill Level</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SKILL_LEVELS.map((s) => {
              const active = warranty.requiredSkillLevel === s.value;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange({ requiredSkillLevel: s.value })}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/40 shadow-md ring-2 ring-violet-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-violet-300',
                  ].join(' ')}
                >
                  <div className="text-2xl mb-1">{s.emoji}</div>
                  <div className={'text-[10px] font-extrabold ' + (active ? 'text-violet-800' : 'text-slate-900 dark:text-white')}>{s.label}</div>
                  <div className="text-[9px] font-semibold text-slate-500 mt-0.5">{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center shadow-md">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Required Tools</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Tools needed for this service</p>
          </div>
          {warranty.requiredTools.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded bg-orange-100 text-orange-700 text-[10px] font-extrabold">
              {warranty.requiredTools.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COMMON_TOOLS.map((t) => {
            const active = warranty.requiredTools.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => onToggleTool(t)}
                className={[
                  'inline-flex items-center px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition',
                  active
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-800 shadow-sm ring-2 ring-orange-200'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-orange-300',
                ].join(' ')}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <input
            value={customTool}
            onChange={(e) => setCustomTool(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTool(); } }}
            placeholder="Add custom tool..."
            className="flex-1 h-10 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-semibold focus:outline-none focus:border-orange-500"
          />
          <button
            onClick={addCustomTool}
            disabled={!customTool.trim()}
            className="h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {warranty.requiredTools.length > 0 && (
          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 p-2">
            <div className="text-[9px] uppercase font-extrabold text-orange-700 mb-1">Selected Tools</div>
            <div className="flex flex-wrap gap-1">
              {warranty.requiredTools.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-neutral-800 border border-orange-300 text-xs font-extrabold text-orange-900">
                  {t}
                  <button onClick={() => onToggleTool(t)} className="h-4 w-4 rounded hover:bg-orange-200 flex items-center justify-center">
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Common Parts / Materials</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Typical parts used in this service</p>
          </div>
          {warranty.requiredParts.length > 0 && (
            <span className="ml-auto px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-extrabold">
              {warranty.requiredParts.length} selected
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {COMMON_PARTS.map((p) => {
            const active = warranty.requiredParts.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => onTogglePart(p)}
                className={[
                  'inline-flex items-center px-3 py-1.5 rounded-lg border-2 text-xs font-extrabold transition',
                  active
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 shadow-sm ring-2 ring-emerald-200'
                    : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-700 hover:border-emerald-300',
                ].join(' ')}
              >
                {p}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-neutral-800">
          <input
            value={customPart}
            onChange={(e) => setCustomPart(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomPart(); } }}
            placeholder="Add custom part..."
            className="flex-1 h-10 rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 text-sm font-semibold focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={addCustomPart}
            disabled={!customPart.trim()}
            className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </section>

      <section className="rounded-3xl bg-white dark:bg-neutral-900 border-2 border-slate-200 dark:border-neutral-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-100 dark:border-neutral-800">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-600 text-white flex items-center justify-center shadow-md">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">License / Certification</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Does this service require special certification?</p>
          </div>
        </div>

        <label className={[
          'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
          warranty.requiresLicense
            ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30'
            : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-amber-300',
        ].join(' ')}>
          <input
            type="checkbox"
            checked={warranty.requiresLicense}
            onChange={(e) => onChange({ requiresLicense: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <GraduationCap className="h-5 w-5 text-amber-600" />
          <div>
            <div className="font-extrabold text-sm">Requires License / Certification</div>
            <div className="text-[10px] text-slate-500 font-semibold">e.g. Electrician license, HVAC cert.</div>
          </div>
        </label>

        {warranty.requiresLicense && (
          <input
            value={warranty.licenseType}
            onChange={(e) => onChange({ licenseType: e.target.value })}
            placeholder="License type (e.g. WAPDA Electrical License, HVAC Cert.)"
            className="h-11 w-full rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 text-sm font-bold focus:outline-none focus:border-amber-500"
          />
        )}
      </section>

      <section className="rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-green-50 dark:from-emerald-950/30 dark:via-neutral-900 dark:to-green-950/30 border-2 border-emerald-200 dark:border-emerald-800 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b-2 border-emerald-200/60 dark:border-emerald-800/60">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-white text-lg leading-tight">Service Warranty</h3>
            <p className="text-[11px] text-slate-500 font-semibold">Guarantee for the service work</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-extrabold text-emerald-700 mb-1.5 uppercase tracking-wider">
              🛡️ Warranty Days
            </label>
            <input
              type="number"
              min="0"
              value={warranty.warrantyDays}
              onChange={(e) => onChange({ warrantyDays: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="30"
              className="h-12 w-full rounded-xl border-2 border-emerald-300 bg-white dark:bg-emerald-950/30 px-3 text-lg font-extrabold tabular-nums focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-2">Warranty Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WARRANTY_TYPES.map((w) => {
              const active = warranty.warrantyType === w.value;
              return (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => onChange({ warrantyType: w.value })}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 shadow-md ring-2 ring-emerald-200'
                      : 'border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-emerald-300',
                  ].join(' ')}
                >
                  <div className="text-xl mb-1">{w.emoji}</div>
                  <div className={'text-[10px] font-extrabold ' + (active ? 'text-emerald-800' : 'text-slate-900 dark:text-white')}>{w.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Warranty Terms (customer-facing)
          </label>
          <textarea
            rows={3}
            value={warranty.warrantyTerms}
            onChange={(e) => onChange({ warrantyTerms: e.target.value })}
            placeholder="e.g. Free re-service if same issue occurs within 30 days. Parts covered separately..."
            className="w-full rounded-xl border-2 border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
      </section>

      {!validation.valid && validation.errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-700 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-rose-900 dark:text-rose-200">
            <div className="font-extrabold mb-1">Fix these:</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {validation.errors.map((e, i) => (<li key={i}>{e}</li>))}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-700 text-white shadow-xl p-5 flex items-center justify-between flex-wrap gap-3">
        <Button variant="secondary" onClick={onBack} className="bg-white/15 text-white hover:bg-white/25 border-white/20">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="text-xs font-bold text-cyan-100">Ready to publish your service?</div>
          <Button
            onClick={onSubmit}
            disabled={!allValid || submitting}
            loading={submitting}
            className="bg-white text-blue-800 hover:bg-cyan-50 shadow-lg"
          >
            <Save className="h-4 w-4" /> Save Service
          </Button>
        </div>
      </div>
    </div>
  );
}
