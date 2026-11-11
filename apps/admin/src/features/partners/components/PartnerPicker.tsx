/**
 * Search box that picks one partner (active ones by default). Used to choose
 * an area manager and to change the partner of a shop.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Badge, IconButton, Input, Skeleton } from '@/design-system/components';
import { adminPartnersApi } from '@/api/admin-partners.api';
import { cn } from '@/lib/cn';
import { TYPE_LABEL } from '../lib/partner-text';

export interface PickedPartner { id: string; fullName: string; code: string }

export function PartnerPicker({ value, onChange, label, managersOnly, excludeId, hint }: {
  value: PickedPartner | null;
  onChange: (p: PickedPartner | null) => void;
  label: string;
  managersOnly?: boolean;
  excludeId?: string;
  hint?: string;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  const results = useQuery({
    queryKey: ['admin', 'partners', 'picker', debounced, managersOnly],
    queryFn: () => adminPartnersApi.list({ search: debounced || undefined, status: 'ACTIVE', manager: managersOnly ? '1' : undefined, sort: 'name', limit: 8 }),
    enabled: !value,
    staleTime: 30_000,
  });
  const rows = (results.data?.items ?? []).filter((p) => p.id !== excludeId);

  if (value) {
    return (
      <div>
        <div className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</div>
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium text-slate-900">{value.fullName} <span className="font-mono text-[0.75rem] text-slate-500">{value.code}</span></span>
          <IconButton label="Clear" size="sm" onClick={() => onChange(null)}><X className="h-4 w-4" /></IconButton>
        </div>
        {hint && <p className="mt-1 text-[0.75rem] text-slate-500">{hint}</p>}
      </div>
    );
  }

  return (
    <div>
      <Input label={label} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone or code" leftIcon={<Search className="h-4 w-4" />} hint={hint} />
      <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
        {results.isLoading && Array.from({ length: 3 }, (_, i) => <li key={i}><Skeleton className="h-11 rounded-xl" /></li>)}
        {rows.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => onChange({ id: p.id, fullName: p.fullName, code: p.code })}
              className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-start ring-1 ring-slate-200 transition hover:bg-brand-50 hover:ring-brand-200')}>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.875rem] font-medium text-slate-900">{p.fullName}</span>
                <span className="block truncate text-[0.75rem] text-slate-500">{p.code} · {p.phone}{p.city ? ` · ${p.city}` : ''}</span>
              </span>
              <Badge variant={p.isManager ? 'brand' : 'default'}>{p.isManager ? 'Manager' : TYPE_LABEL[p.type]}</Badge>
            </button>
          </li>
        ))}
        {!results.isLoading && !rows.length && <li className="px-1 py-2 text-[0.8125rem] text-slate-500">{managersOnly ? 'No active area manager matches.' : 'No active partner matches.'}</li>}
      </ul>
    </div>
  );
}
