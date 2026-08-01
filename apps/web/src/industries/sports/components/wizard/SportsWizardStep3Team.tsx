import { useState } from 'react';
import {
  Users, ToggleLeft, ToggleRight, Percent, Shield, Plus, X,
  AlertCircle, TrendingDown, Award, Info,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { formatPKRFull } from '@core/lib/format';
import type { SportsWizardBasic, SportsWizardTeam } from '../../hooks/useSportsWizard';

interface Props {
  basic: SportsWizardBasic;
  onBasicChange: (patch: Partial<SportsWizardBasic>) => void;
  team: SportsWizardTeam;
  onChange: (patch: Partial<SportsWizardTeam>) => void;
  errors: string[];
}

const CUSTOMIZATION_PRESETS = [
  'Player Name', 'Jersey Number', 'Team Logo', 'Sponsor Logo',
  'Custom Color Combination', 'Player Photo', 'Motivational Text',
  'Team Motto', 'City Name', 'Country Flag',
];

const WARRANTY_PRESETS = [
  { label: 'None', months: 0 },
  { label: '1 Month', months: 1 },
  { label: '3 Months', months: 3 },
  { label: '6 Months', months: 6 },
  { label: '1 Year', months: 12 },
  { label: '2 Years', months: 24 },
];

const WARRANTY_TYPES = ['Manufacturer', 'Shop Warranty', 'Brand Warranty', 'Extended', 'No Warranty'];

const MIN_TEAM_PRESETS = [5, 11, 15, 20, 25];
const BULK_DISCOUNT_PRESETS = [5, 10, 15, 20, 25];

export function SportsWizardStep3Team({ basic, onBasicChange, team, onChange, errors }: Props) {
  const [newOpt, setNewOpt] = useState('');

  const retail = Number(basic.retailPrice || 0);
  const teamPrice = Number(team.teamPrice || 0);
  const bulkPct = Number(team.bulkDiscountPct || 0);
  const suggestedTeamPrice = retail > 0 && bulkPct > 0 ? Math.round(retail * (1 - bulkPct / 100)) : 0;

  const togCustom = (v: string) => {
    const cur = team.customizationOptions ?? [];
    onChange({ customizationOptions: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const addCustom = () => {
    const t = newOpt.trim();
    if (!t) return;
    if (team.customizationOptions?.includes(t)) return;
    onChange({ customizationOptions: [...(team.customizationOptions ?? []), t] });
    setNewOpt('');
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

      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200 p-4 flex items-start gap-3">
        <div className="h-11 w-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-emerald-900">Team Orders & Warranty — both optional</h3>
          <p className="text-xs text-emerald-800 font-semibold mt-0.5 leading-relaxed">
            Enable team ordering if this product suits bulk buys (jerseys, kits, balls).
            Set warranty months to cover manufacturing defects.
          </p>
        </div>
      </div>

      {/* TEAM ORDER TOGGLE */}
      <button type="button" onClick={() => onChange({ isTeamOrderable: !team.isTeamOrderable })}
        className={['w-full rounded-2xl border-2 p-4 text-left transition',
          team.isTeamOrderable ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-200 bg-white hover:border-emerald-300'].join(' ')}>
        <div className="flex items-center gap-3">
          <div className={['h-12 w-12 rounded-xl flex items-center justify-center shrink-0',
            team.isTeamOrderable ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'].join(' ')}>
            <Users className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-slate-900">Available for Team / Bulk Orders</div>
            <div className="text-xs text-slate-600 font-semibold">School teams, clubs, corporate orders with bulk pricing</div>
          </div>
          {team.isTeamOrderable ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-slate-400" />}
        </div>
      </button>

      {team.isTeamOrderable && (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-white p-5 space-y-5">
          <SectionHead icon={Users} title="Team Order Settings" tone="emerald" />

          <div>
            <Lbl>Minimum Team Order Quantity *</Lbl>
            <input type="number" min="2" value={team.minTeamOrder}
              onChange={(e) => onChange({ minTeamOrder: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="e.g. 11 (cricket team)"
              className="h-14 w-full rounded-2xl border-2 border-slate-200 bg-white px-4 text-2xl font-extrabold tabular-nums focus:outline-none focus:border-emerald-500" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MIN_TEAM_PRESETS.map((m) => (
                <button key={m} type="button" onClick={() => onChange({ minTeamOrder: m })}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-emerald-200 hover:border-emerald-400 text-emerald-800 text-xs font-extrabold">
                  {m} pieces
                </button>
              ))}
            </div>
          </div>

          <div>
            <Lbl>Bulk Discount %</Lbl>
            <input type="number" min="0" max="60" value={team.bulkDiscountPct}
              onChange={(e) => onChange({ bulkDiscountPct: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 px-4 text-2xl font-extrabold tabular-nums text-amber-900 focus:outline-none focus:border-amber-500" />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BULK_DISCOUNT_PRESETS.map((d) => (
                <button key={d} type="button" onClick={() => onChange({ bulkDiscountPct: d })}
                  className="px-3 py-1.5 rounded-xl bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-800 text-xs font-extrabold">
                  -{d}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Lbl>Team Price / Unit</Lbl>
              {suggestedTeamPrice > 0 && (
                <button type="button" onClick={() => onChange({ teamPrice: suggestedTeamPrice })}
                  className="text-[10px] font-extrabold text-emerald-700 hover:underline">
                  Use suggested {formatPKRFull(suggestedTeamPrice)}
                </button>
              )}
            </div>
            <input type="number" value={team.teamPrice}
              onChange={(e) => onChange({ teamPrice: e.target.value === '' ? '' : Number(e.target.value) })}
              placeholder="0"
              className="h-14 w-full rounded-2xl border-2 border-emerald-400 bg-emerald-50 px-4 text-2xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600" />
            {retail > 0 && teamPrice > 0 && teamPrice < retail && (
              <div className="mt-2 rounded-xl bg-emerald-100 border-2 border-emerald-200 p-2 text-xs font-extrabold text-emerald-800 inline-flex items-center gap-2">
                <TrendingDown className="h-3.5 w-3.5" />
                Team saves {formatPKRFull(retail - teamPrice)} per unit ({((1 - teamPrice / retail) * 100).toFixed(0)}% off)
              </div>
            )}
          </div>

          {/* Customization options */}
          <div className="rounded-2xl bg-white border-2 border-violet-200 p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-extrabold text-violet-900">Available Customizations</span>
            </div>
            <div>
              <Lbl>Common options — click to add</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {CUSTOMIZATION_PRESETS.map((opt) => {
                  const a = team.customizationOptions?.includes(opt);
                  return (
                    <button key={opt} type="button" onClick={() => togCustom(opt)}
                      className={['px-3 py-1.5 rounded-full border-2 text-xs font-extrabold transition',
                        a ? 'border-violet-500 bg-violet-500 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300'].join(' ')}>
                      {a ? '✓ ' : ''}{opt}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Lbl>Custom option</Lbl>
              <div className="flex gap-2">
                <input value={newOpt} onChange={(e) => setNewOpt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="e.g. Team Song lyrics"
                  className="h-11 flex-1 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold focus:outline-none focus:border-violet-500" />
                <button type="button" onClick={addCustom} disabled={!newOpt.trim()}
                  className="h-11 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-sm inline-flex items-center gap-1 disabled:opacity-50">
                  <Plus className="h-4 w-4" /> Add
                </button>
              </div>
            </div>
            {(team.customizationOptions ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
                {team.customizationOptions.map((o) => (
                  <div key={o} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-100 border-2 border-violet-300 text-xs font-extrabold text-violet-800">
                    {o}
                    <button type="button" onClick={() => togCustom(o)} className="hover:text-rose-700">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* WARRANTY */}
      <section className="rounded-2xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <SectionHead icon={Shield} title="Warranty" tone="blue" />

        <div>
          <Lbl>Warranty Period</Lbl>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {WARRANTY_PRESETS.map((p) => {
              const a = Number(basic.warrantyMonths) === p.months;
              return (
                <button key={p.months} type="button" onClick={() => onBasicChange({ warrantyMonths: p.months })}
                  className={['px-3 py-2 rounded-xl border-2 text-xs font-extrabold transition',
                    a ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'].join(' ')}>
                  {p.label}
                </button>
              );
            })}
          </div>
          <input type="number" min="0" value={basic.warrantyMonths}
            onChange={(e) => onBasicChange({ warrantyMonths: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="Custom months"
            className="h-11 w-full rounded-xl border-2 border-slate-200 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500" />
        </div>

        {Number(basic.warrantyMonths || 0) > 0 && (
          <div>
            <Lbl>Warranty Type</Lbl>
            <select value={basic.warrantyType} onChange={(e) => onBasicChange({ warrantyType: e.target.value })}
              className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-blue-500">
              <option value="">Select type</option>
              {WARRANTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </section>

      {!team.isTeamOrderable && !Number(basic.warrantyMonths || 0) && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <Info className="h-10 w-10 text-slate-400 mx-auto mb-2" />
          <div className="font-extrabold text-slate-700">Nothing configured here</div>
          <div className="text-xs text-slate-500 font-semibold mt-1">
            This product has no team ordering or warranty. Continue to stock entry.
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkles({ className }: any) { return <Award className={className} />; }

function SectionHead({ icon: Icon, title, tone }: any) {
  const tones: Record<string, string> = {
    emerald: 'from-emerald-500 to-teal-700',
    blue: 'from-blue-500 to-cyan-700',
  };
  return (
    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${tones[tone]} text-white flex items-center justify-center shadow-md`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-extrabold text-slate-900">{title}</h3>
    </div>
  );
}
function Lbl({ children }: any) {
  return <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">{children}</label>;
}
