/**
 * Permission switches grouped by workspace and area, used by the role editor
 * and for a person's extra permissions. A key does exactly what its label
 * says; "Change" does not include "See", so both are shown side by side.
 */

import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AreaDef } from '@/api/admin-staff.api';

export function PermissionPicker({ areas, value, onChange, locked = [], disabled }: {
  areas: AreaDef[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Keys already granted elsewhere (e.g. by the role), shown as on and not editable. */
  locked?: string[];
  disabled?: boolean;
}) {
  const byWorkspace = useMemo(() => {
    const map = new Map<string, AreaDef[]>();
    for (const a of areas) map.set(a.workspace, [...(map.get(a.workspace) ?? []), a]);
    return [...map.entries()];
  }, [areas]);
  const set = new Set(value);
  const lockedSet = new Set(locked);
  const toggle = (key: string, on: boolean) => onChange(on ? [...new Set([...value, key])] : value.filter((k) => k !== key));
  const setArea = (a: AreaDef, on: boolean) => {
    const keys = a.permissions.filter((p) => !p.sensitive).map((p) => p.key);
    onChange(on ? [...new Set([...value, ...keys])] : value.filter((k) => !a.permissions.some((p) => p.key === k)));
  };

  return (
    <div className="space-y-4">
      {byWorkspace.map(([workspace, list]) => (
        <section key={workspace}>
          <h3 className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">{workspace}</h3>
          <div className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
            {list.map((a) => {
              const allOn = a.permissions.filter((p) => !p.sensitive).every((p) => set.has(p.key) || lockedSet.has(p.key));
              return (
                <div key={a.area} className="p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[0.8125rem] font-semibold text-slate-900">{a.label}</span>
                    {!disabled && (
                      <button type="button" onClick={() => setArea(a, !allOn)} className="text-[0.75rem] font-medium text-brand-700 hover:underline">
                        {allOn ? 'Turn off' : 'Turn on see + change'}
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {a.permissions.map((p) => {
                      const isLocked = lockedSet.has(p.key);
                      const on = set.has(p.key) || isLocked;
                      return (
                        <label
                          key={p.key}
                          title={p.hint ?? p.key}
                          className={cn(
                            'inline-flex cursor-pointer select-none items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.75rem] font-medium ring-1 transition',
                            on ? (p.sensitive ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-brand-50 text-brand-800 ring-brand-200') : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50',
                            (disabled || isLocked) && 'cursor-default opacity-80',
                          )}
                        >
                          <input type="checkbox" className="sr-only" checked={on} disabled={disabled || isLocked} onChange={(e) => toggle(p.key, e.target.checked)} />
                          <span className={cn('h-3 w-3 rounded-[4px] ring-1 ring-inset', on ? (p.sensitive ? 'bg-rose-500 ring-rose-500' : 'bg-brand-500 ring-brand-500') : 'ring-slate-300')} aria-hidden />
                          {p.sensitive && <AlertTriangle className="h-3 w-3" />}
                          {p.label}
                          {isLocked && <span className="text-[0.6875rem] opacity-70">· from role</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
