/** Row-by-row result of a check or an import, with status tabs and search. */

import { useMemo, useState, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, MinusCircle, XCircle, type LucideIcon } from 'lucide-react';
import { SearchField, ViewTabs } from '@/design-system/components';
import { cn } from '@core/lib/cn';

export interface TableRow {
  row: number;
  name: string;
  status: string;
  errors: string[];
  warnings: string[];
  /** Extra line under the name (price change, matched item). */
  detail?: ReactNode;
}

export interface StatusMeta {
  label: string;
  tone: 'green' | 'blue' | 'slate' | 'red';
}

const TONES: Record<StatusMeta['tone'], { chip: string; icon: LucideIcon }> = {
  green: { chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
  blue: { chip: 'bg-sky-50 text-sky-700 ring-sky-200', icon: CheckCircle2 },
  slate: { chip: 'bg-slate-100 text-slate-600 ring-slate-200', icon: MinusCircle },
  red: { chip: 'bg-rose-50 text-rose-700 ring-rose-200', icon: XCircle },
};

const LIMIT = 300;

export function RowsTable({ rows, statuses }: { rows: TableRow[]; statuses: Record<string, StatusMeta> }) {
  const [tab, setTab] = useState<string>('all');
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);
  const warned = useMemo(() => rows.filter((r) => r.warnings.length && r.status !== 'error').length, [rows]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) =>
      (tab === 'all' || (tab === 'warn' ? r.warnings.length > 0 && r.status !== 'error' : r.status === tab))
      && (!q || r.name.toLowerCase().includes(q) || String(r.row) === q || r.errors.some((e) => e.toLowerCase().includes(q))));
  }, [rows, tab, search]);

  const tabs = [
    { id: 'all', label: 'Sab', count: rows.length },
    ...Object.entries(statuses).filter(([s]) => counts[s]).map(([id, m]) => ({ id, label: m.label, count: counts[id] })),
    ...(warned ? [{ id: 'warn', label: 'Dhyan dein', count: warned }] : []),
  ];

  return (
    <div className="space-y-3">
      <ViewTabs tabs={tabs} value={tab} onChange={setTab}
        right={<div className="w-full sm:w-72"><SearchField value={search} onChange={setSearch} placeholder="Naam ya line no." /></div>} />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <div className="hidden grid-cols-[4.5rem_minmax(0,1.2fr)_8.5rem_minmax(0,2fr)] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[0.75rem] font-semibold text-slate-500 md:grid">
          <span>Line</span><span>Product</span><span>Haal</span><span>Tafseel</span>
        </div>
        {shown.length === 0 && <p className="px-4 py-10 text-center text-[0.875rem] text-slate-500">Is filter me koi line nahi</p>}
        <ul className="divide-y divide-slate-100">
          {shown.slice(0, LIMIT).map((r) => {
            const meta = statuses[r.status] ?? { label: r.status, tone: 'slate' as const };
            const tone = TONES[meta.tone];
            return (
              <li key={`${r.row}-${r.name}`} className="grid gap-1.5 px-4 py-2.5 text-[0.8125rem] md:grid-cols-[4.5rem_minmax(0,1.2fr)_8.5rem_minmax(0,2fr)] md:items-start md:gap-3">
                <span className="font-mono text-[0.75rem] tabular-nums text-slate-500">#{r.row}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{r.name || <span className="italic text-slate-400">naam nahi</span>}</p>
                  {r.detail && <div className="mt-0.5 text-[0.75rem] text-slate-600">{r.detail}</div>}
                </div>
                <span className={cn('inline-flex h-6 w-fit items-center gap-1 rounded-full px-2 text-[0.6875rem] font-semibold ring-1', tone.chip)}>
                  <tone.icon className="h-3.5 w-3.5" />{meta.label}
                </span>
                <div className="min-w-0 space-y-0.5">
                  {r.errors.map((e) => <p key={e} className="text-rose-700">{e}</p>)}
                  {r.warnings.map((w) => (
                    <p key={w} className="flex items-start gap-1 text-amber-700"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</p>
                  ))}
                  {!r.errors.length && !r.warnings.length && <p className="text-slate-400">Sab theek</p>}
                </div>
              </li>
            );
          })}
        </ul>
        {shown.length > LIMIT && (
          <p className="border-t border-slate-100 px-4 py-2.5 text-center text-[0.75rem] text-slate-500">
            Pehli {LIMIT} lines dikh rahi hain — baqi {shown.length - LIMIT} ke liye search karein ya ghalti wali lines download karein
          </p>
        )}
      </div>
    </div>
  );
}
