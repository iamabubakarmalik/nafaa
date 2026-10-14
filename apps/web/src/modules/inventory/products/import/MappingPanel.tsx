/**
 * Column mapping: each column of the file is matched to an import field
 * (detected from its header, changeable here) with a few sample values.
 */

import { ArrowRight, Columns3 } from 'lucide-react';
import type { ImportField } from './api';
import { fieldsOf, type ImportMode, type Sheet } from './columns';
import { cn } from '@core/lib/cn';

export function MappingPanel({ sheet, mode, mapping, onChange }: {
  sheet: Sheet;
  mode: ImportMode;
  mapping: Array<ImportField | ''>;
  onChange: (next: Array<ImportField | ''>) => void;
}) {
  const fields = fieldsOf(mode);
  const set = (col: number, field: ImportField | '') => {
    // A field belongs to one column: picking it here clears it elsewhere.
    onChange(mapping.map((f, i) => (i === col ? field : f === field && field ? '' : f)));
  };

  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Columns3 className="h-4 w-4 text-brand-600" />Columns milayein</h2>
        <p className="text-[0.75rem] text-slate-500">{mapping.filter(Boolean).length} / {sheet.headers.length} column istemal honge · baqi chhor diye jayenge</p>
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {sheet.headers.map((h, i) => {
          const field = mapping[i];
          const samples = sheet.rows.slice(0, 3).map((r) => r.cells[i]).filter(Boolean);
          const def = field ? fields.find((f) => f.key === field) : undefined;
          return (
            <div key={`${h}-${i}`} className={cn('rounded-2xl p-3 ring-1', field ? 'bg-brand-50/40 ring-brand-100' : 'bg-slate-50 ring-slate-200')}>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-slate-800" title={h}>{h || `Column ${i + 1}`}</p>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <select value={field} onChange={(e) => set(i, e.target.value as ImportField | '')} aria-label={`${h} kis cheez ka column hai`}
                  className="h-9 w-40 shrink-0 rounded-lg border border-slate-300 bg-white px-2 text-[0.8125rem] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
                  <option value="">— Chhor dein —</option>
                  {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
              </div>
              <p className="mt-1.5 truncate text-[0.75rem] text-slate-500">{samples.length ? samples.join(' · ') : 'Pehli lines khaali'}</p>
              {def && <p className="mt-0.5 text-[0.6875rem] text-brand-700">{def.hint}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
