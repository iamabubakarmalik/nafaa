/**
 * Permission checkboxes in plain groups. Every box does exactly what it
 * says; nothing is granted behind the scenes. A role preset fills the boxes
 * once, and the strip on top shows how the choice differs from that role.
 * A warning appears when the POS is on but the reads it needs are off.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Minus, Plus, Search } from 'lucide-react';
import { cn } from '@core/lib/cn';
import {
  DEFAULT_ROLE_PERMISSIONS, POS_REQUIRED_PERMISSIONS, permissionGroupsFor, type PermissionGroup,
} from '@core/lib/permissions';
import { useAuthStore } from '@core/stores/auth.store';
import { useCurrentIndustry } from '@industries/_shared/registry/useCurrentIndustry';
import { teamApi } from '@modules/organization/team/api/team.api';
import { ASSIGNABLE, ROLES, permText, type AssignableRole } from './meta';

/** Role presets: the server's list for the owner, else the synced copy in core. */
export function useRoleDefaults(): Record<string, string[]> {
  const isOwner = useAuthStore((s) => s.user?.role === 'OWNER' || s.user?.role === 'SUPER_ADMIN');
  const q = useQuery({ queryKey: ['team-permissions-catalog'], queryFn: teamApi.catalog, enabled: isOwner, staleTime: 10 * 60_000, retry: false });
  return (q.data?.defaultsByRole as Record<string, string[]> | undefined) ?? (DEFAULT_ROLE_PERMISSIONS as Record<string, string[]>);
}

/** Groups for this shop's industry. */
export function usePermissionGroups(): PermissionGroup[] {
  const industry = useCurrentIndustry();
  return useMemo(() => permissionGroupsFor(industry?.id), [industry?.id]);
}

export function PermissionPicker({ value, onChange, role, readOnly }: {
  value: string[];
  onChange?: (next: string[]) => void;
  /** The person's role; its preset is the yardstick for the "differs" strip. */
  role: AssignableRole;
  readOnly?: boolean;
}) {
  const defaults = useRoleDefaults();
  const groups = usePermissionGroups();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const set = new Set(value);
  const preset = new Set(defaults[role] ?? []);
  const visible = new Set(groups.flatMap((g) => g.permissions as string[]));
  const extra = value.filter((p) => !preset.has(p) && visible.has(p));
  const missing = [...preset].filter((p) => !set.has(p) && visible.has(p));
  const posGap = set.has('pos.use') ? POS_REQUIRED_PERMISSIONS.filter((p) => !set.has(p)) : [];
  const needle = q.trim().toLowerCase();

  const toggle = (p: string) => onChange?.(set.has(p) ? value.filter((x) => x !== p) : [...value, p]);
  const toggleGroup = (g: PermissionGroup) => {
    const all = g.permissions.every((p) => set.has(p));
    onChange?.(all ? value.filter((p) => !(g.permissions as string[]).includes(p)) : [...new Set([...value, ...g.permissions])]);
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[0.75rem] font-medium text-slate-500">Ek click me:</span>
          {ASSIGNABLE.map((r) => (
            <button key={r} type="button" onClick={() => onChange?.([...(defaults[r] ?? [])])}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-[0.75rem] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
              <span className="h-2 w-2 rounded-full" style={{ background: ROLES[r].color }} />{ROLES[r].label} wali ({(defaults[r] ?? []).length})
            </button>
          ))}
          <button type="button" onClick={() => onChange?.([])} className="h-8 rounded-lg px-2.5 text-[0.75rem] font-semibold text-rose-700 hover:bg-rose-50">Sab hatayein</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[0.75rem] ring-1 ring-slate-200">
        <span className="font-semibold text-slate-900">{value.length} permissions</span>
        {extra.length === 0 && missing.length === 0
          ? <span className="text-emerald-700">Bilkul {ROLES[role].label} jaisi</span>
          : <>
            {extra.length > 0 && <span className="inline-flex items-center gap-1 text-violet-700"><Plus className="h-3 w-3" />{ROLES[role].label} se zyada: {extra.length}</span>}
            {missing.length > 0 && <span className="inline-flex items-center gap-1 text-amber-800"><Minus className="h-3 w-3" />{ROLES[role].label} se kam: {missing.length}</span>}
          </>}
        <span className="text-slate-500">Jo nishan laga hai sirf wohi milta hai — koi chhupi permission nahi.</span>
      </div>

      {posGap.length > 0 && (
        <div className="flex flex-wrap items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">POS counter theek se nahi chalega</p>
            <p className="text-[0.75rem]">Counter ki permission hai magar yeh nahi: {posGap.map((p) => permText(p)[0]).join(', ')}. In ke baghair counter par maal nazar nahi aayega aur offline sync ruk jayegi.</p>
          </div>
          {!readOnly && (
            <button type="button" onClick={() => onChange?.([...new Set([...value, ...posGap])])}
              className="h-8 rounded-lg bg-amber-600 px-3 text-[0.75rem] font-semibold text-white hover:bg-amber-700">Yeh bhi de dein</button>
          )}
        </div>
      )}

      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Permission search — maslan: khata, void, expense"
          className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
      </label>

      <div className="space-y-2">
        {groups.map((g) => {
          const perms = (g.permissions as string[]).filter((p) => !needle || `${p} ${permText(p).join(' ')}`.toLowerCase().includes(needle));
          if (!perms.length) return null;
          const on = g.permissions.filter((p) => set.has(p)).length;
          const isOpen = needle ? true : open[g.title] ?? on > 0;
          const all = on === g.permissions.length;
          return (
            <section key={g.title} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
              <div className="flex items-center gap-2 px-3 py-2">
                <button type="button" onClick={() => setOpen((o) => ({ ...o, [g.title]: !isOpen }))} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span aria-hidden>{g.emoji}</span>
                  <span className="truncate text-[0.8125rem] font-semibold text-slate-900">{g.title}</span>
                  <span className={cn('rounded-full px-1.5 text-[0.6875rem] font-semibold tabular-nums', on ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')}>{on}/{g.permissions.length}</span>
                  <ChevronDown className={cn('ml-auto h-4 w-4 text-slate-400 transition', isOpen && 'rotate-180')} />
                </button>
                {!readOnly && (
                  <button type="button" onClick={() => toggleGroup(g)} className="shrink-0 rounded-lg px-2 py-1 text-[0.6875rem] font-semibold text-brand-700 hover:bg-brand-50">
                    {all ? 'Sab hatayein' : 'Sab dein'}
                  </button>
                )}
              </div>
              {isOpen && (
                <ul className="grid gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2">
                  {perms.map((p) => {
                    const [label, hint] = permText(p);
                    const checked = set.has(p);
                    return (
                      <li key={p} className="bg-white">
                        <label className={cn('flex items-start gap-2.5 px-3 py-2', readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50')}>
                          <input type="checkbox" checked={checked} disabled={readOnly} onChange={() => toggle(p)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] font-medium text-slate-800">
                              {label}
                              {preset.has(p) && <span className="rounded bg-slate-100 px-1 text-[0.625rem] font-semibold text-slate-500">{ROLES[role].label}</span>}
                              {checked && !preset.has(p) && <span className="rounded bg-violet-50 px-1 text-[0.625rem] font-semibold text-violet-700">Zyada</span>}
                              {!checked && preset.has(p) && <span className="rounded bg-amber-50 px-1 text-[0.625rem] font-semibold text-amber-800">Hataya</span>}
                            </span>
                            {hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
