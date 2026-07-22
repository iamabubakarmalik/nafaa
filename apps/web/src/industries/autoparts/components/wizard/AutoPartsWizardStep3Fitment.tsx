import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Car, Plus, Trash2, AlertCircle, Info, ToggleLeft, ToggleRight,
  Globe, Truck, Cog, Calendar, X, Copy,
} from 'lucide-react';
import { Input } from '@core/ui/Input';
import { vehicleMakesApi } from '../../api/vehicle-makes.api';
import { vehicleModelsApi } from '../../api/vehicle-models.api';
import type {
  AutoPartsWizardCompatibility, AutoPartsWizardFitment,
} from '../../hooks/useAutoPartsWizard';

interface Props {
  compatibility: AutoPartsWizardCompatibility;
  onToggleHasFitment: (v: boolean) => void;
  onSetUniversal: (v: boolean) => void;
  onAddFitment: (fit: Omit<AutoPartsWizardFitment, 'tempId'>) => void;
  onUpdateFitment: (tempId: string, patch: Partial<AutoPartsWizardFitment>) => void;
  onRemoveFitment: (tempId: string) => void;
  errors: string[];
}

export function AutoPartsWizardStep3Fitment({
  compatibility, onToggleHasFitment, onSetUniversal,
  onAddFitment, onUpdateFitment, onRemoveFitment, errors,
}: Props) {
  const [newMakeId, setNewMakeId] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newYearFrom, setNewYearFrom] = useState<number | ''>('');
  const [newYearTo, setNewYearTo] = useState<number | ''>('');
  const [newEngineInput, setNewEngineInput] = useState('');

  const { data: makes = [] } = useQuery({
    queryKey: ['vehicle-makes-fitment'],
    queryFn: () => vehicleMakesApi.list({ active: true }),
  });

  const { data: modelsForPicker = [] } = useQuery({
    queryKey: ['vehicle-models-fitment', newMakeId],
    queryFn: () => vehicleModelsApi.list({ makeId: newMakeId, active: true }),
    enabled: !!newMakeId,
  });

  const handleAdd = () => {
    if (!newMakeId || !newModelId) return;
    const make = makes.find((m) => m.id === newMakeId);
    const model = modelsForPicker.find((m) => m.id === newModelId);
    if (!make || !model) return;

    const engines = newEngineInput
      ? newEngineInput.split(',').map((e) => e.trim()).filter(Boolean)
      : [];

    onAddFitment({
      makeId: newMakeId,
      makeName: make.name,
      modelId: newModelId,
      modelName: model.name,
      yearFrom: newYearFrom,
      yearTo: newYearTo,
      engineOptions: engines,
      notes: '',
    });

    // Reset picker
    setNewModelId('');
    setNewYearFrom('');
    setNewYearTo('');
    setNewEngineInput('');
  };

  const copyLastFitment = () => {
    if (compatibility.fitments.length === 0) return;
    const last = compatibility.fitments[compatibility.fitments.length - 1];
    onAddFitment({
      makeId: last.makeId,
      makeName: last.makeName,
      modelId: last.modelId,
      modelName: last.modelName,
      yearFrom: last.yearFrom,
      yearTo: last.yearTo,
      engineOptions: [...last.engineOptions],
      notes: last.notes,
    });
  };

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-2xl bg-rose-50 border-2 border-rose-200 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-900">
            <div className="font-extrabold mb-0.5">Fix before saving:</div>
            <ul className="list-disc pl-4 space-y-0.5">
              {errors.slice(0, 6).map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-50 to-white border-2 border-fuchsia-200 p-4 flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-md shrink-0">
          <Car className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-fuchsia-900 text-sm">Vehicle Compatibility (Fitment)</h3>
          <p className="text-xs text-fuchsia-800 font-semibold mt-0.5 leading-relaxed">
            Kaunse vehicles pe ye part fit hoga — Universal (all cars) ya specific makes/models.
            <strong> Optional</strong> — but helps customers find the right part.
          </p>
        </div>
      </div>

      {/* Toggle */}
      <section className="rounded-2xl border-2 border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Car className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 text-lg leading-tight">Track Fitment?</h3>
            <p className="text-sm text-slate-600 font-semibold mt-0.5">
              Skip if this is a generic consumable (oil, grease, etc.)
            </p>
          </div>
          <button type="button" onClick={() => onToggleHasFitment(!compatibility.hasFitment)}
            className={['inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
              compatibility.hasFitment ? 'bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'].join(' ')}>
            {compatibility.hasFitment ? (<><ToggleRight className="h-5 w-5" /> Yes, track</>)
              : (<><ToggleLeft className="h-5 w-5" /> No, skip</>)}
          </button>
        </div>

        {!compatibility.hasFitment && (
          <div className="mt-4 rounded-xl bg-blue-50 border-2 border-blue-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <div className="font-extrabold mb-0.5">Skip mode</div>
              <div className="font-semibold">
                Part will be listed without vehicle-specific compatibility. Good for oils, filters (generic sizes), tools, etc.
              </div>
            </div>
          </div>
        )}
      </section>

      {compatibility.hasFitment && (
        <>
          {/* Universal Toggle */}
          <section className="rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 text-white flex items-center justify-center shadow-md shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-emerald-900 text-lg leading-tight">Universal Fit?</h3>
                <p className="text-sm text-emerald-700 font-semibold mt-0.5">
                  Ye part sab vehicles pe fit hoti hai (generic size/type)
                </p>
              </div>
              <button type="button" onClick={() => onSetUniversal(!compatibility.isUniversal)}
                className={['inline-flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold text-sm transition shrink-0',
                  compatibility.isUniversal ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white border-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50'].join(' ')}>
                {compatibility.isUniversal ? (<><ToggleRight className="h-5 w-5" /> Universal</>)
                  : (<><ToggleLeft className="h-5 w-5" /> Specific Vehicles</>)}
              </button>
            </div>

            {compatibility.isUniversal && (
              <div className="mt-4 rounded-xl bg-emerald-100 border-2 border-emerald-300 p-3 flex items-start gap-2">
                <Globe className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-900">
                  <div className="font-extrabold mb-0.5">Universal fit enabled</div>
                  <div className="font-semibold">
                    Part will show as compatible with all vehicles. No specific fitments needed.
                  </div>
                </div>
              </div>
            )}
          </section>

          {!compatibility.isUniversal && (
            <>
              {/* Add Fitment */}
              <section className="rounded-2xl border-2 border-fuchsia-200 bg-gradient-to-br from-fuchsia-50 to-white p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-fuchsia-600 text-white flex items-center justify-center shadow-md">
                    <Plus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-fuchsia-900 text-base">Add Vehicle Fitment</h3>
                    <p className="text-xs text-fuchsia-700 font-semibold">Select make/model & year range</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      <Truck className="h-3.5 w-3.5 inline mr-1" />
                      Vehicle Make *
                    </label>
                    <select
                      value={newMakeId}
                      onChange={(e) => { setNewMakeId(e.target.value); setNewModelId(''); }}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500"
                    >
                      <option value="">Select make</option>
                      {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">
                      <Cog className="h-3.5 w-3.5 inline mr-1" />
                      Model *
                    </label>
                    <select
                      value={newModelId}
                      onChange={(e) => setNewModelId(e.target.value)}
                      disabled={!newMakeId}
                      className="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold focus:outline-none focus:border-fuchsia-500 disabled:opacity-50"
                    >
                      <option value="">Select model</option>
                      {modelsForPicker.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Input
                    label="Year From"
                    type="number"
                    value={newYearFrom}
                    onChange={(e) => setNewYearFrom(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2010"
                    leftIcon={<Calendar className="h-4 w-4 text-slate-400" />}
                  />
                  <Input
                    label="Year To"
                    type="number"
                    value={newYearTo}
                    onChange={(e) => setNewYearTo(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 2020 (or empty)"
                    leftIcon={<Calendar className="h-4 w-4 text-slate-400" />}
                  />
                </div>

                <Input
                  label="Engine Options (optional)"
                  value={newEngineInput}
                  onChange={(e) => setNewEngineInput(e.target.value)}
                  placeholder="e.g. 1300cc, 1500cc, 1800cc (comma separated)"
                  hint="Leave empty if fits all engines"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={!newMakeId || !newModelId}
                    className="flex-1 h-11 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-extrabold text-sm inline-flex items-center justify-center gap-1 disabled:opacity-50 shadow-md"
                  >
                    <Plus className="h-4 w-4" />
                    Add Fitment
                  </button>
                  {compatibility.fitments.length > 0 && (
                    <button
                      type="button"
                      onClick={copyLastFitment}
                      className="h-11 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-extrabold inline-flex items-center gap-1"
                      title="Copy last fitment"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Duplicate
                    </button>
                  )}
                </div>
              </section>

              {/* Fitments List */}
              {compatibility.fitments.length > 0 ? (
                <section className="rounded-2xl border-2 border-fuchsia-200 bg-white p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">Configured Fitments</h3>
                      <p className="text-xs text-slate-500 font-semibold">
                        {compatibility.fitments.length} vehicle{compatibility.fitments.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {compatibility.fitments.map((f, idx) => (
                      <div key={f.tempId} className="rounded-xl border-2 border-slate-200 bg-white p-3 space-y-2">
                        <div className="flex items-start gap-3">
                          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white flex items-center justify-center shrink-0 font-extrabold text-lg">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900">
                                {f.makeName} {f.modelName}
                              </span>
                              {(f.yearFrom || f.yearTo) && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-extrabold inline-flex items-center gap-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {f.yearFrom || '?'} – {f.yearTo || 'Present'}
                                </span>
                              )}
                            </div>
                            {f.engineOptions.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {f.engineOptions.map((e, i) => (
                                  <span key={i} className="px-1.5 py-0.5 rounded bg-fuchsia-100 text-fuchsia-800 text-[10px] font-extrabold">
                                    {e}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveFitment(f.tempId)}
                            className="h-8 w-8 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <input
                          value={f.notes}
                          onChange={(e) => onUpdateFitment(f.tempId, { notes: e.target.value })}
                          placeholder="Fitment notes (optional)..."
                          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold focus:outline-none focus:border-fuchsia-500"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <section className="rounded-2xl border-2 border-dashed border-fuchsia-300 bg-fuchsia-50 p-8 text-center">
                  <Car className="h-10 w-10 text-fuchsia-400 mx-auto mb-2" />
                  <div className="font-extrabold text-slate-700 text-sm">No fitments added yet</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">
                    Select make/model above and click "Add Fitment", or toggle "Universal" if fits all
                  </div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
