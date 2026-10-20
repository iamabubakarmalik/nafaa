/** Search box that finds a farmer by name, phone, CNIC or village and hands the picked one back. */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Tractor, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import { farmersApi, type Farmer } from '../api/farmers.api';
import { useDebounced } from '../hooks/usePageKeys';

export function FarmerPick({ value, onChange, error, placeholder = 'Farmer ka naam, phone, CNIC ya gaon…' }: {
  value: Farmer | null;
  onChange: (f: Farmer | null) => void;
  error?: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim());
  const { data = [], isFetching } = useQuery({
    queryKey: ['agri-farmer-pick', term],
    queryFn: () => farmersApi.list({ search: term }),
    enabled: term.length >= 2,
    staleTime: 30_000,
  });

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-lime-50/60 px-3 py-2.5 ring-1 ring-lime-200">
        <Tractor className="h-5 w-5 shrink-0 text-lime-700" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.9375rem] font-semibold text-slate-900">{value.fullName}{value.farmerNumber && <span className="font-normal text-slate-500"> · {value.farmerNumber}</span>}</span>
          <span className="block truncate text-[0.75rem] text-slate-500">{[value.phone, value.village, value.landAreaAcres ? `${value.landAreaAcres} acre` : '', value.currentBalance > 0 ? `Udhaar ${formatPKR(value.currentBalance)}` : ''].filter(Boolean).join(' · ')}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} aria-label="Farmer hatayein" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white"><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === 'Enter' && data[0]) { e.preventDefault(); onChange(data[0]); setQ(''); } }}
        className={`h-11 w-full rounded-xl border-0 bg-slate-100 pl-10 pr-3 text-[0.9375rem] outline-none ring-1 focus:bg-white focus:ring-2 focus:ring-brand-500 ${error ? 'ring-rose-400' : 'ring-transparent'}`} />
      {error && <p className="mt-1 text-[0.75rem] font-medium text-rose-600">{error}</p>}
      {term.length >= 2 && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {data.slice(0, 8).map((f) => (
            <button key={f.id} type="button" onClick={() => { onChange(f); setQ(''); }} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-brand-50">
              <Tractor className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{f.fullName}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{[f.phone, f.village, f.district].filter(Boolean).join(' · ')}</span>
              </span>
              {f.currentBalance > 0 && <span className="text-[0.75rem] font-semibold tabular-nums text-amber-700">{formatPKR(f.currentBalance)}</span>}
            </button>
          ))}
          {!data.length && <p className="px-3 py-3 text-[0.8125rem] text-slate-500">{isFetching ? 'Dhoond rahe hain…' : 'Koi farmer nahi mila'}</p>}
        </div>
      )}
    </div>
  );
}
