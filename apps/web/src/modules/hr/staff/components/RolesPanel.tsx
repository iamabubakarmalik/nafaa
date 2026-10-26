/**
 * Roles and permissions at a glance: how many people hold each role, a table
 * of exactly which permission each role preset gives, and the people whose
 * own permissions differ from their role (more or fewer). Presets only fill
 * the boxes when a login is made; after that every person keeps their own list.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Minus, Plus, Search, ShieldCheck } from 'lucide-react';
import { Avatar, Card, Input, Skeleton, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { teamApi } from '@modules/organization/team/api/team.api';
import type { DirectoryPerson } from '../api/people.api';
import { usePermissionGroups, useRoleDefaults } from './PermissionPicker';
import { ASSIGNABLE, ROLES, permText, type RoleKey } from './meta';

export function RolesPanel({ people, canSeeLogins, onRole }: { people: DirectoryPerson[]; canSeeLogins: boolean; onRole: (role: RoleKey) => void }) {
  const defaults = useRoleDefaults();
  const groups = usePermissionGroups();
  const [q, setQ] = useState('');
  const teamQ = useQuery({ queryKey: ['team'], queryFn: teamApi.list, enabled: canSeeLogins, staleTime: 60_000 });
  const needle = q.trim().toLowerCase();
  const current = people.filter((p) => p.status !== 'LEFT');
  const counts = (Object.keys(ROLES) as RoleKey[]).map((r) => ({ r, n: current.filter((p) => (p.role ?? 'NO_LOGIN') === r).length }));
  const visible = useMemo(() => new Set(groups.flatMap((g) => g.permissions as string[])), [groups]);

  /* People whose own list is not their role's preset. */
  const differs = useMemo(() => (teamQ.data ?? [])
    .filter((m) => m.role !== 'OWNER' && m.role !== 'SUPER_ADMIN' && m.isActive)
    .map((m) => {
      const preset = new Set(defaults[m.role] ?? []);
      const mine = new Set(m.permissions ?? []);
      return {
        m,
        extra: [...mine].filter((p) => !preset.has(p) && visible.has(p)),
        missing: [...preset].filter((p) => !mine.has(p) && visible.has(p)),
        person: people.find((p) => p.userId === m.id),
      };
    })
    .filter((d) => d.extra.length || d.missing.length), [teamQ.data, defaults, people, visible]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {counts.map(({ r, n }) => {
          const meta = ROLES[r];
          return (
            <button key={r} type="button" onClick={() => onRole(r)} className="flex flex-col rounded-2xl bg-white p-3.5 text-left shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md">
              <span className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${meta.color}17`, color: meta.color }}><meta.icon className="h-4 w-4" /></span>
                <span className="text-xl font-bold tabular-nums text-slate-900">{n}</span>
              </span>
              <span className="mt-2 font-semibold text-slate-900">{meta.label}</span>
              <span className="text-[0.75rem] text-slate-500">{meta.hint}</span>
              {r !== 'OWNER' && r !== 'NO_LOGIN' && <span className="mt-1 text-[0.6875rem] font-medium text-brand-700">{(defaults[r] ?? []).length} permissions shuru me</span>}
            </button>
          );
        })}
      </div>

      <Card className="rounded-2xl" flush
        title={<span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" />Har role ko shuru me kya milta hai</span>}
        description="Naya login banate waqt role yeh nishan laga deta hai. Baad me har bande ki apni list hoti hai — role badalne se permission khud nahi badalti."
        actions={
          <Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" aria-label="Permission search karein"
            leftIcon={<Search className="h-4 w-4" />} wrapperClassName="w-44" />
        }>
        <Table minWidth="34rem" className="[&_table]:text-[0.8125rem]">
          <THead>
            <Tr>
              <Th className="px-4 py-2">Permission</Th>
              {ASSIGNABLE.map((r) => <Th key={r} className="w-24 px-2 py-2 text-center font-semibold" style={{ color: ROLES[r].color }}>{ROLES[r].label}</Th>)}
              <Th className="w-20 px-2 py-2 text-center font-semibold" style={{ color: ROLES.OWNER.color }}>Malik</Th>
            </Tr>
          </THead>
          {groups.map((g) => {
            const rows = (g.permissions as string[]).filter((p) => !needle || `${p} ${permText(p).join(' ')}`.toLowerCase().includes(needle));
            if (!rows.length) return null;
            return (
              <TBody key={g.title}>
                <Tr className="bg-slate-50"><Td colSpan={5} className="px-4 py-1.5 text-[0.75rem] font-semibold text-slate-700">{g.emoji} {g.title}</Td></Tr>
                {rows.map((p) => {
                  const [label, hint] = permText(p);
                  return (
                    <Tr key={p}>
                      <Td className="px-4 py-1.5"><span className="font-medium text-slate-800">{label}</span>{hint && <span className="block text-[0.6875rem] text-slate-500">{hint}</span>}</Td>
                      {ASSIGNABLE.map((r) => (
                        <Td key={r} className="px-2 py-1.5 text-center">
                          {(defaults[r] ?? []).includes(p)
                            ? <Check className="mx-auto h-4 w-4" style={{ color: ROLES[r].color }} aria-label="Haan" />
                            : <Minus className="mx-auto h-4 w-4 text-slate-300" aria-label="Nahi" />}
                        </Td>
                      ))}
                      <Td className="px-2 py-1.5 text-center"><Check className="mx-auto h-4 w-4 text-amber-500" aria-label="Haan" /></Td>
                    </Tr>
                  );
                })}
              </TBody>
            );
          })}
        </Table>
      </Card>

      <Card className="rounded-2xl" title="Role se alag permission wale log" description="In logon ki apni list un ke role se mukhtalif hai. Theek hai to rehne dein; ghalti se hai to profile kholein.">
        {!canSeeLogins ? (
          <p className="text-sm text-slate-500">Yeh dekhne ke liye "Team dekhna" ki permission chahiye.</p>
        ) : teamQ.isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
        ) : !differs.length ? (
          <p className="text-sm text-success-700">Sab ki permission bilkul un ke role jaisi hai.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {differs.map(({ m, extra, missing, person }) => (
              <li key={m.id} className="flex flex-wrap items-start gap-3 py-2.5">
                <Avatar name={m.fullName} size={36} />
                <div className="min-w-0 flex-1">
                  <Link to={`/staff/${person?.id ?? m.id}`} className="font-semibold text-slate-900 hover:underline">{m.fullName}</Link>
                  <span className="ml-2 text-[0.75rem]" style={{ color: ROLES[m.role as RoleKey]?.color }}>{ROLES[m.role as RoleKey]?.label ?? m.role}</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {extra.map((p) => <span key={p} className="inline-flex items-center gap-0.5 rounded-md bg-violet-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-violet-700"><Plus className="h-3 w-3" />{permText(p)[0]}</span>)}
                    {missing.map((p) => <span key={p} className={cn('inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[0.6875rem] font-medium text-amber-800')}><Minus className="h-3 w-3" />{permText(p)[0]}</span>)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
