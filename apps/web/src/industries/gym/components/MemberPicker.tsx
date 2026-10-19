/**
 * Search-and-pick a member by name, phone, member number or card. Used by
 * the sell, PT, class and guest forms.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { Avatar, Badge, Input } from '@/design-system/components';
import { gymMembersApi, type GymMember } from '../api/members.api';
import { GYM_KEYS, MEMBER_STATE } from '../lib/meta';

export interface PickedMember { id: string; name: string; phone?: string | null; memberNumber: string }

export const toPicked = (m: GymMember): PickedMember => ({ id: m.id, name: m.customer?.name ?? m.memberNumber, phone: m.customer?.phone, memberNumber: m.memberNumber });

export function MemberPicker({ value, onChange, label = 'Member', hint, autoFocus }: {
  value: PickedMember | null;
  onChange: (m: PickedMember | null) => void;
  label?: string;
  hint?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(text.trim()), 250); return () => clearTimeout(t); }, [text]);
  const listQ = useQuery({
    queryKey: [GYM_KEYS.members, 'pick', q],
    queryFn: () => gymMembersApi.list({ search: q }),
    enabled: !value && q.length >= 2,
    staleTime: 30_000,
  });

  if (value) {
    return (
      <div>
        <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">{label}</p>
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
          <Avatar name={value.name} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{value.name}</p>
            <p className="truncate text-[0.75rem] text-slate-500">{value.memberNumber}{value.phone ? ` · ${value.phone}` : ''}</p>
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Member badlein" className="rounded-lg p-1 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
        </div>
      </div>
    );
  }

  const rows = listQ.data ?? [];
  return (
    <div>
      <Input label={label} value={text} onChange={(e) => setText(e.target.value)} autoFocus={autoFocus} leftIcon={<Search className="h-4 w-4" />}
        placeholder="Naam, phone ya MEM number…" hint={hint ?? 'Kam se kam 2 harf likhein'} />
      {q.length >= 2 && (
        <div className="mt-1.5 max-h-60 overflow-y-auto rounded-xl ring-1 ring-slate-200">
          {listQ.isLoading ? <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Dhoond rahe hain…</p>
            : !rows.length ? <p className="px-3 py-3 text-[0.8125rem] text-slate-500">Koi member nahi mila</p>
              : rows.slice(0, 20).map((m) => {
                const st = MEMBER_STATE[m.state ?? 'NONE'];
                return (
                  <button key={m.id} type="button" onClick={() => onChange(toPicked(m))} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50">
                    <Avatar name={m.customer?.name ?? m.memberNumber} url={m.photoUrl} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-slate-900">{m.customer?.name ?? '—'}</span>
                      <span className="block truncate text-[0.75rem] text-slate-500">{m.memberNumber}{m.customer?.phone ? ` · ${m.customer.phone}` : ''}</span>
                    </span>
                    <Badge size="xs" variant={st.variant}>{st.label}</Badge>
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}
