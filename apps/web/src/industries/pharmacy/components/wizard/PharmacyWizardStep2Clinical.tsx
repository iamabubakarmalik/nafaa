import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Beaker, Plus, Search, X, AlertCircle, Sparkles, Star,
  ShieldAlert, Snowflake, Thermometer, Info, Trash2,
  Pill, Ban,
} from 'lucide-react';
import { saltsApi } from '../../api/salts.api';
import type {
  PharmacyWizardClinical, PharmacyWizardSaltEntry,
} from '../../hooks/usePharmacyWizard';
import type { DrugScheduleClass } from '../../api/salts.api';
import type { StorageCondition } from '../../api/medicines.api';

interface Props {
  clinical: PharmacyWizardClinical;
  onChange: (patch: Partial<PharmacyWizardClinical>) => void;
  onAddSalt: (salt: Omit<PharmacyWizardSaltEntry, 'tempId'>) => void;
  onUpdateSalt: (tempId: string, patch: Partial<PharmacyWizardSaltEntry>) => void;
  onRemoveSalt: (tempId: string) => void;
  errors: string[];
}

const SCHEDULE_CLASSES: { value: DrugScheduleClass; label: string; desc: string; color: string; bg: string }[] = [
  { value: 'OTC', label: 'OTC', desc: 'Over the counter', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-300' },
  { value: 'SCHEDULE_G', label: 'Schedule G', desc: 'Non-Rx supplements', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-300' },
  { value: 'SCHEDULE_H', label: 'Schedule H', desc: 'Rx required', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300' },
  { value: 'SCHEDULE_X', label: 'Schedule X', desc: 'Strict Rx + Log', color: 'text-rose-700', bg: 'bg-rose-100 border-rose-300' },
  { value: 'CONTROLLED', label: 'Controlled', desc: 'Restricted use', color: 'text-red-700', bg: 'bg-red-100 border-red-300' },
  { value: 'NARCOTIC', label: 'Narcotic', desc: 'Narcotic drugs', color: 'text-red-800', bg: 'bg-red-200 border-red-400' },
  { value: 'PSYCHOTROPIC', label: 'Psychotropic', desc: 'Mental health', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-300' },
];

const STORAGE_OPTIONS: { value: StorageCondition; label: string; emoji: string; range: string }[] = [
  { value: 'ROOM_TEMPERATURE', label: 'Room Temp', emoji: '🌡️', range: '15-30°C' },
  { value: 'COOL', label: 'Cool', emoji: '❄️', range: '8-15°C' },
  { value: 'REFRIGERATED', label: 'Refrigerated', emoji: '🧊', range: '2-8°C' },
  { value: 'FROZEN', label: 'Frozen', emoji: '❄️', range: 'Below 0°C' },
  { value: 'CONTROLLED_ROOM', label: 'Controlled Room', emoji: '🌡️', range: '20-25°C' },
  { value: 'PROTECT_FROM_LIGHT', label: 'Dark Place', emoji: '🌑', range: 'Amber bottle' },
  { value: 'PROTECT_FROM_MOISTURE', label: 'Dry Place', emoji: '💨', range: 'Desiccant' },
];

export function PharmacyWizardStep2Clinical({
  clinical, onChange, onAddSalt, onUpdateSalt, onRemoveSalt, errors,
}: Props) {
  const [saltSearch, setSaltSearch] = useState('');
  const [showSaltPicker, setShowSaltPicker] = useState(false);

  const { data: allSalts = [] } = useQuery({
    queryKey: ['salts-for-wizard', saltSearch],
    queryFn: () => saltsApi.list({ search: saltSearch || undefined }),
    enabled: showSaltPicker,
  });

  const addFromSalt = (salt: any) => {
    onAddSalt({
      saltId: salt.id,
      saltName: salt.name,
      strength: '',
      isMainSalt: clinical.salts.length === 0,
    });
    setSaltSearch('');
    setShowSaltPicker(false);
  };

  const requiresRxAuto = ['SCHEDULE_H', 'SCHEDULE_X', 'CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC'].includes(clinical.scheduleClass);

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

      <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-white border-2 border-cyan-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Beaker className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-cyan-900 text-sm">Composition & Clinical Details</h3>
          <p className="text-xs text-cyan-800 font-semibold mt-0.5 leading-relaxed">
            Active salts, schedule class, storage requirements. Rx auto-applied for scheduled drugs.
          </p>
        </div>
      </div>

      {/* Salts / Composition */}
      <section className="rounded-2xl border-2 border-cyan-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <Beaker className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Active Salts</h3>
              <p className="text-xs text-slate-500 font-semibold">
                {clinical.salts.length} salt{clinical.salts.length !== 1 ? 's' : ''} added
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSaltPicker(true)}
            className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" /> Add Salt
          </button>
        </div>

        {showSaltPicker && (
          <div className="rounded-xl border-2 border-cyan-300 bg-cyan-50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  autoFocus
                  value={saltSearch}
                  onChange={(e) => setSaltSearch(e.target.value)}
                  placeholder="Search salt (Paracetamol, Amoxicillin...)"
                  className="h-10 w-full rounded-lg border-2 border-slate-200 bg-white pl-10 pr-3 text-sm font-semibold focus:outline-none focus:border-cyan-500"
                />
              </div>
              <button
                onClick={() => { setShowSaltPicker(false); setSaltSearch(''); }}
                className="h-10 w-10 rounded-lg bg-white hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-lg bg-white border border-cyan-200">
              {allSalts.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 font-semibold italic text-center">
                  No salts found. Salts page pe pehle create karo.
                </div>
              ) : (
                allSalts.map((salt) => {
                  const already = clinical.salts.some((s) => s.saltId === salt.id);
                  return (
                    <button
                      key={salt.id}
                      onClick={() => !already && addFromSalt(salt)}
                      disabled={already}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-cyan-50 transition text-left border-b border-slate-100 last:border-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Beaker className="h-4 w-4 text-cyan-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm truncate text-slate-900">{salt.name}</div>
                        {salt.genericName && (
                          <div className="text-xs text-slate-500 font-semibold truncate">{salt.genericName}</div>
                        )}
                      </div>
                      {salt.requiresPrescription && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[9px] font-extrabold uppercase">Rx</span>
                      )}
                      {already ? (
                        <span className="text-[10px] font-extrabold text-emerald-700">✓ Added</span>
                      ) : (
                        <Plus className="h-4 w-4 text-cyan-600" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {clinical.salts.length > 0 ? (
          <div className="space-y-2">
            {clinical.salts.map((s) => (
              <div key={s.tempId} className={[
                'rounded-xl border-2 p-3 space-y-2',
                s.isMainSalt ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-white',
              ].join(' ')}>
                <div className="flex items-center gap-3">
                  <div className={[
                    'h-10 w-10 rounded-xl flex items-center justify-center shrink-0',
                    s.isMainSalt ? 'bg-emerald-500 text-white' : 'bg-cyan-100 text-cyan-700',
                  ].join(' ')}>
                    {s.isMainSalt ? <Star className="h-5 w-5 fill-white" /> : <Beaker className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-extrabold text-sm text-slate-900">{s.saltName}</div>
                      {s.isMainSalt && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-extrabold uppercase">Main</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        // Toggle main — only one at a time
                        onUpdateSalt(s.tempId, { isMainSalt: !s.isMainSalt });
                      }}
                      className={[
                        'h-8 px-2 rounded-lg text-[10px] font-extrabold transition',
                        s.isMainSalt
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700',
                      ].join(' ')}
                    >
                      {s.isMainSalt ? 'Main' : 'Set Main'}
                    </button>
                    <button
                      onClick={() => onRemoveSalt(s.tempId)}
                      className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Strength *</label>
                    <input
                      value={s.strength}
                      onChange={(e) => onUpdateSalt(s.tempId, { strength: e.target.value })}
                      placeholder="e.g. 500mg, 250mg/5ml"
                      className="h-9 w-full rounded-lg border-2 border-cyan-300 bg-cyan-50 px-2 text-sm font-extrabold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase mb-1">Unit</label>
                    <input
                      value={s.strengthUnit ?? ''}
                      onChange={(e) => onUpdateSalt(s.tempId, { strengthUnit: e.target.value })}
                      placeholder="mg / ml / IU"
                      className="h-9 w-full rounded-lg border-2 border-slate-200 px-2 text-xs font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed border-cyan-300 bg-cyan-50/50 p-8 text-center">
            <Beaker className="h-10 w-10 text-cyan-400 mx-auto mb-2" />
            <div className="font-extrabold text-slate-700 text-sm">No salts added yet</div>
            <div className="text-xs text-slate-500 font-semibold mt-1">
              "Add Salt" click karo — Paracetamol, Amoxicillin etc.
            </div>
          </div>
        )}
      </section>

      {/* Schedule Class */}
      <section className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-amber-900 text-base">Schedule Class *</h3>
            <p className="text-xs text-amber-700 font-semibold">DRAP regulatory classification</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SCHEDULE_CLASSES.map((sc) => {
            const active = clinical.scheduleClass === sc.value;
            return (
              <button
                key={sc.value}
                type="button"
                onClick={() => {
                  const autoRx = ['SCHEDULE_H', 'SCHEDULE_X', 'CONTROLLED', 'NARCOTIC', 'PSYCHOTROPIC'].includes(sc.value);
                  const autoNarcotic = sc.value === 'NARCOTIC';
                  onChange({
                    scheduleClass: sc.value,
                    requiresPrescription: autoRx || clinical.requiresPrescription,
                    isNarcotic: autoNarcotic || clinical.isNarcotic,
                  });
                }}
                className={[
                  'p-3 rounded-xl border-2 text-left transition',
                  active ? `${sc.bg} shadow-md ring-2 ring-current` : 'border-slate-200 bg-white hover:border-amber-400',
                ].join(' ')}
              >
                <div className={['text-sm font-extrabold', active ? sc.color : 'text-slate-900'].join(' ')}>
                  {sc.label}
                </div>
                <div className={['text-[10px] font-bold mt-0.5', active ? sc.color : 'text-slate-500'].join(' ')}>
                  {sc.desc}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <label className={[
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition',
            clinical.requiresPrescription
              ? 'border-amber-500 bg-amber-100 shadow'
              : 'border-slate-200 bg-white hover:border-amber-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={clinical.requiresPrescription}
              onChange={(e) => onChange({ requiresPrescription: e.target.checked })}
              className="h-4 w-4 rounded"
              disabled={requiresRxAuto}
            />
            <div className="flex-1">
              <div className="text-xs font-extrabold text-amber-900">Requires Rx</div>
              {requiresRxAuto && <div className="text-[9px] text-amber-700 font-semibold">Auto by schedule</div>}
            </div>
          </label>

          <label className={[
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition',
            clinical.isNarcotic
              ? 'border-red-500 bg-red-100 shadow'
              : 'border-slate-200 bg-white hover:border-red-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={clinical.isNarcotic}
              onChange={(e) => onChange({ isNarcotic: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <ShieldAlert className="h-4 w-4 text-red-600" />
            <div className="text-xs font-extrabold text-red-900">Narcotic</div>
          </label>

          <label className={[
            'flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition',
            clinical.isRefrigerated
              ? 'border-blue-500 bg-blue-100 shadow'
              : 'border-slate-200 bg-white hover:border-blue-300',
          ].join(' ')}>
            <input
              type="checkbox"
              checked={clinical.isRefrigerated}
              onChange={(e) => onChange({ isRefrigerated: e.target.checked })}
              className="h-4 w-4 rounded"
            />
            <Snowflake className="h-4 w-4 text-blue-600" />
            <div className="text-xs font-extrabold text-blue-900">Refrigerated</div>
          </label>
        </div>
      </section>

      {/* Storage */}
      <section className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-md">
            <Thermometer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-blue-900 text-base">Storage Conditions</h3>
            <p className="text-xs text-blue-700 font-semibold">Kaise store karna hai</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Storage Condition</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STORAGE_OPTIONS.map((opt) => {
              const active = clinical.storageCondition === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ storageCondition: opt.value })}
                  className={[
                    'p-3 rounded-xl border-2 text-center transition',
                    active
                      ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400',
                  ].join(' ')}
                >
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <div className="text-[10px] font-extrabold">{opt.label}</div>
                  <div className={['text-[9px] font-bold mt-0.5', active ? 'text-white/80' : 'text-slate-500'].join(' ')}>
                    {opt.range}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Storage Instructions</label>
          <textarea
            rows={2}
            value={clinical.storageInstructions}
            onChange={(e) => onChange({ storageInstructions: e.target.value })}
            placeholder="Store below 25°C, protect from light and moisture..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-blue-500"
          />
        </div>

        <label className={[
          'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition',
          clinical.requiresColdChain
            ? 'border-blue-500 bg-blue-100 shadow'
            : 'border-slate-200 bg-white hover:border-blue-300',
        ].join(' ')}>
          <input
            type="checkbox"
            checked={clinical.requiresColdChain}
            onChange={(e) => onChange({ requiresColdChain: e.target.checked })}
            className="h-5 w-5 rounded"
          />
          <Snowflake className="h-5 w-5 text-blue-600" />
          <div className="flex-1">
            <div className="font-extrabold text-blue-900 text-sm">Requires Cold Chain</div>
            <div className="text-xs text-blue-700 font-semibold">Vaccines, insulin, biologics</div>
          </div>
        </label>

        {clinical.requiresColdChain && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Min Temperature (°C) *</label>
              <input
                type="number" step="0.1"
                value={clinical.minTemperature}
                onChange={(e) => onChange({ minTemperature: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="2"
                className="h-11 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Max Temperature (°C) *</label>
              <input
                type="number" step="0.1"
                value={clinical.maxTemperature}
                onChange={(e) => onChange({ maxTemperature: e.target.value === '' ? '' : Number(e.target.value) })}
                placeholder="8"
                className="h-11 w-full rounded-xl border-2 border-blue-200 bg-blue-50 px-3 text-sm font-extrabold tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </section>

      {/* Pharmacology (optional) */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-700 text-white flex items-center justify-center shadow-md">
            <Info className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Pharmacology (Optional)</h3>
            <p className="text-xs text-slate-500 font-semibold">Clinical reference notes</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Mechanism of Action</label>
          <textarea
            rows={2}
            value={clinical.mechanismOfAction}
            onChange={(e) => onChange({ mechanismOfAction: e.target.value })}
            placeholder="How the drug works..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Pharmacokinetics</label>
          <textarea
            rows={2}
            value={clinical.pharmacokinetics}
            onChange={(e) => onChange({ pharmacokinetics: e.target.value })}
            placeholder="Absorption, distribution, metabolism, excretion..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold focus:outline-none focus:border-slate-500"
          />
        </div>
      </section>
    </div>
  );
}
