/** Area manager's team: each member's visits, signups and paid this month, and when they were last active. */

import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Phone, Users } from 'lucide-react';
import { Avatar, Badge, EmptyState, PageHero, PageShell, Skeleton } from '@/design-system/components';
import { partnerApi } from '@/api/partner.api';
import { PARTNER_TYPE } from '@/lib/labels';
import { ago, monthLabel, num, pkMonth } from '@/lib/format';
import { telLink, waLink } from '@/lib/phone';
import { Section } from '@/ui/Section';
import { QueryError } from '@/ui/QueryState';

const STATUS = { APPLIED: { label: 'Review me', badge: 'warning' }, ACTIVE: { label: 'Active', badge: 'success' }, SUSPENDED: { label: 'Band', badge: 'danger' }, REJECTED: { label: 'Radd', badge: 'danger' } } as const;

export default function TeamPage() {
  const q = useQuery({ queryKey: ['team'], queryFn: partnerApi.team });
  const members = q.data?.members ?? [];
  const sum = (k: 'visits' | 'signups' | 'paid') => members.reduce((n, m) => n + m[k], 0);

  return (
    <PageShell>
      <PageHero title="Meri team" chip={monthLabel(q.data?.month ?? pkMonth())} loading={q.isPending} busy={q.isFetching}
        stats={[
          { label: 'Members', value: num(members.length) },
          { label: 'Visits', value: num(sum('visits')) },
          { label: 'Signups', value: num(sum('signups')) },
          { label: 'Paid', value: num(sum('paid')) },
        ]} />
      {q.isPending ? <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
        : q.isError ? <QueryError error={q.error} onRetry={() => void q.refetch()} />
          : members.length === 0 ? <Section><EmptyState icon={<Users className="h-6 w-6" />} title="Team me abhi koi nahi" description="Naye agent application me aap ka code likhein to wo yahan dikhenge." /></Section> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {members.map((m) => (
                <li key={m.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.fullName} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-900">{m.fullName}</p>
                      <p className="truncate text-[0.8125rem] text-slate-500">{[PARTNER_TYPE[m.type]?.label, m.city].filter(Boolean).join(' · ')}</p>
                    </div>
                    <Badge size="sm" variant={STATUS[m.status].badge}>{STATUS[m.status].label}</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {([['Visits', m.visits], ['Signups', m.signups], ['Paid', m.paid]] as const).map(([k, v]) => (
                      <div key={k} className="rounded-xl bg-slate-50 py-2 ring-1 ring-slate-200/70">
                        <p className="text-lg font-bold tabular-nums text-slate-900">{num(v)}</p>
                        <p className="text-[0.75rem] text-slate-500">{k}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-[0.8125rem] text-slate-500">Aakhri baar: {ago(m.lastSeenAt)}</p>
                    <div className="flex gap-1.5">
                      <a href={telLink(m.phone)} aria-label="Call" className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Phone className="h-4 w-4" /></a>
                      <a href={waLink(m.phone)} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-700"><MessageCircle className="h-4 w-4" /></a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
    </PageShell>
  );
}
