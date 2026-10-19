/**
 * Which vehicles a part fits: company, model and years, any number of rows,
 * or "fits every vehicle" for universal items (bulbs, oils, fuses). The list
 * is what the counter searches, so "corolla 2016 brake" finds the part.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Car, Plus, Trash2 } from 'lucide-react';
import { Select } from '@/design-system/components';
import { Section, Toggle, inputClass } from '@modules/inventory/products/editor/fields';
import { cn } from '@core/lib/cn';
import { vehicleMakesApi } from '../api/vehicle-makes.api';
import { vehicleModelsApi } from '../api/vehicle-models.api';
import type { PartFitment } from '../api/part-profiles.api';
import { MAKES_KEY, MODELS_KEY, digits } from './meta';

const yearText = (f: PartFitment) => (f.yearFrom && f.yearTo ? `${f.yearFrom}–${f.yearTo}` : f.yearFrom ? `${f.yearFrom} se` : f.yearTo ? `${f.yearTo} tak` : 'Har saal');

export function FitmentEditor({ universal, fitments, onChange, error }: {
  universal: boolean;
  fitments: PartFitment[];
  onChange: (v: { universal?: boolean; fitments?: PartFitment[] }) => void;
  error?: string;
}) {
  const [makeId, setMakeId] = useState('');
  const [modelId, setModelId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const makes = useQuery({ queryKey: [MAKES_KEY, 'active'], queryFn: () => vehicleMakesApi.list({ active: true }), staleTime: 5 * 60_000 });
  const models = useQuery({ queryKey: [MODELS_KEY, makeId], queryFn: () => vehicleModelsApi.list({ makeId, active: true }), enabled: !!makeId, staleTime: 5 * 60_000 });
  const make = makes.data?.find((m) => m.id === makeId);
  const model = models.data?.find((m) => m.id === modelId);
  const badYears = !!from && !!to && Number(from) > Number(to);

  const add = () => {
    if (!make || badYears) return;
    const row: PartFitment = {
      makeId: make.id, makeName: make.name, modelId: model?.id, modelName: model?.name,
      yearFrom: from ? Number(from) : null, yearTo: to ? Number(to) : null,
    };
    if (fitments.some((f) => f.makeId === row.makeId && f.modelId === row.modelId && f.yearFrom === row.yearFrom && f.yearTo === row.yearTo)) return;
    onChange({ fitments: [...fitments, row] });
    setModelId(''); setFrom(''); setTo('');
  };

  return (
    <Section icon={Car} title="Kis gaari me lagta hai" hint="Counter par gaari ke naam se part milta hai — jaise “corolla brake”">
      <Toggle on={universal} onChange={(v) => onChange({ universal: v, ...(v && { fitments: [] }) })} title="Har gaari me lagta hai" hint="Bulb, fuse, oil, tape jaisa saman" />
      {!universal && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_6rem_6rem_auto]">
            <Select aria-label="Company" value={makeId} onChange={(e) => { setMakeId(e.target.value); setModelId(''); }}
              placeholder={makes.isLoading ? 'Load ho raha…' : 'Company'} options={(makes.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
            <Select aria-label="Model" value={modelId} onChange={(e) => setModelId(e.target.value)} disabled={!makeId}
              placeholder="Sab model" options={(models.data ?? []).map((m) => ({ value: m.id, label: m.name }))} />
            <input value={from} onChange={(e) => setFrom(digits(e.target.value).slice(0, 4))} placeholder="Saal se" inputMode="numeric" aria-label="Saal se" className={inputClass} />
            <input value={to} onChange={(e) => setTo(digits(e.target.value).slice(0, 4))} placeholder="Saal tak" inputMode="numeric" aria-label="Saal tak" className={cn(inputClass, badYears && 'ring-2 ring-rose-400')} />
            <button type="button" onClick={add} disabled={!make || badYears}
              className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 text-[0.875rem] font-semibold text-white disabled:opacity-40">
              <Plus className="h-4 w-4" />Jorein
            </button>
          </div>
          {badYears && <p className="text-[0.8125rem] font-medium text-rose-600">“Saal se” “saal tak” se bara hai</p>}
          {!makes.isLoading && !makes.data?.length && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">Abhi koi company nahi. “Gaariyan → Company / Model” me Pakistani companies aur model ek click me daal lein.</p>
          )}
          {fitments.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-[0.8125rem] text-slate-500">Koi gaari nahi likhi — bagair is ke bhi save ho jata hai</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {fitments.map((f, i) => (
                <li key={`${f.makeId}-${f.modelId}-${i}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-3 pr-1 text-[0.8125rem] font-medium text-brand-900 ring-1 ring-brand-100">
                  {[f.makeName, f.modelName ?? 'sab model'].join(' ')} · {yearText(f)}
                  <button type="button" aria-label="Hatayein" onClick={() => onChange({ fitments: fitments.filter((_, j) => j !== i) })}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-[0.8125rem] font-medium text-rose-600">{error}</p>}
    </Section>
  );
}
