/**
 * Find a patient by name, phone, MR number or CNIC; register a new one in
 * place when nobody matches. Used at reception and on the lab / vaccine
 * forms.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Phone, Search, UserPlus, X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { patientsApi, type Patient } from '../api/patients.api';
import { useDebounced } from '../hooks/usePageKeys';
import { patientLine, shortDate } from '../lib/meta';
import { PatientFormModal } from './PatientFormModal';

export function PatientPicker({ value, onChange, autoFocus, error }: {
  value: Patient | null;
  onChange: (p: Patient | null) => void;
  autoFocus?: boolean;
  error?: string;
}) {
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const term = useDebounced(q.trim(), 250);
  const { data = [], isFetching } = useQuery({
    queryKey: ['clinic-patients', 'pick', term],
    queryFn: () => patientsApi.list({ search: term }),
    enabled: term.length >= 2,
    staleTime: 15_000,
  });

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50/60 p-3 ring-1 ring-brand-100">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-[0.9375rem] font-bold text-white">{value.fullName.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.9375rem] font-semibold text-slate-900">{patientLine(value)}</p>
          <p className="truncate text-[0.75rem] text-slate-600">{value.mrn}{value.phonePrimary && ` · ${value.phonePrimary}`}{value.lastVisitAt && ` · aakhri visit ${shortDate(value.lastVisitAt)}`}</p>
          {value.allergies?.length > 0 && <p className="mt-1 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-rose-700"><AlertTriangle className="h-3.5 w-3.5" />Allergy: {value.allergies.join(', ')}</p>}
        </div>
        <button type="button" onClick={() => onChange(null)} aria-label="Mareez badlein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="relative">
      {adding && <PatientFormModal patient={null} initialName={q} onClose={() => setAdding(false)} onSaved={(p) => { setAdding(false); setQ(''); onChange(p); }} />}
      <label className="group relative block">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus={autoFocus} aria-label="Mareez dhoondein"
          placeholder="Naam, phone, MR number ya CNIC…"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (data[0]) onChange(data[0]); else if (term.length >= 2) setAdding(true); } }}
          className={cn('h-11 w-full rounded-2xl border-0 bg-slate-100/80 pl-10 pr-28 text-[0.9375rem] outline-none ring-1 transition focus:bg-white focus:ring-2 focus:ring-brand-500', error ? 'ring-rose-300' : 'ring-transparent')} />
        <button type="button" onClick={() => setAdding(true)} className="absolute right-1.5 top-1/2 inline-flex h-8 -translate-y-1/2 items-center gap-1 rounded-xl bg-white px-2.5 text-[0.75rem] font-semibold text-brand-700 shadow-sm ring-1 ring-slate-200 hover:bg-brand-50">
          <UserPlus className="h-3.5 w-3.5" />Naya
        </button>
      </label>
      {error && <p className="mt-1.5 text-xs font-medium text-rose-600">{error}</p>}
      {term.length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl bg-white shadow-lg ring-1 ring-slate-200">
          {data.length === 0 ? (
            <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[0.875rem] font-semibold text-brand-700 hover:bg-brand-50">
              <UserPlus className="h-4 w-4" />{isFetching ? 'Dhoond rahe hain…' : `"${q.trim()}" naya mareez register karein`}
            </button>
          ) : data.slice(0, 12).map((p) => (
            <button key={p.id} type="button" onClick={() => { onChange(p); setQ(''); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-brand-50">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-semibold text-slate-900">{patientLine(p)}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{p.mrn}{p.fatherOrHusbandName && ` · ${p.fatherOrHusbandName}`}</span>
              </span>
              {p.phonePrimary && <span className="inline-flex items-center gap-1 text-[0.75rem] text-slate-600"><Phone className="h-3 w-3" />{p.phonePrimary}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
