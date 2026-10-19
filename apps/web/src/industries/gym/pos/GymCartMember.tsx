/**
 * Under the customer picker on the gym counter: when the customer is a
 * member, their plan, days left and fee due, with a link to the member.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Dumbbell } from 'lucide-react';
import { Badge } from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { gymMembersApi } from '../api/members.api';
import { GYM_KEYS, MEMBER_STATE, dateOf, daysLeft } from '../lib/meta';

export function GymCartMember({ customerId }: { customerId?: string | null }) {
  const q = useQuery({
    queryKey: [GYM_KEYS.members, 'by-customer', customerId],
    queryFn: () => gymMembersApi.list({ customerId: customerId! }),
    enabled: !!customerId,
    staleTime: 30_000,
  });
  const m = q.data?.[0];
  if (!m) return null;
  const st = MEMBER_STATE[m.state ?? 'NONE'];
  const left = m.current ? daysLeft(m.current.endDate) : null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.8125rem] ring-1 ring-slate-200">
      <Dumbbell className="h-4 w-4 shrink-0 text-brand-600" />
      <div className="min-w-0 flex-1">
        <Link to={`/gym/members/${m.id}`} className="font-medium text-slate-900 hover:underline">{m.memberNumber}</Link>
        <span className="text-slate-500"> · {m.current?.plan?.name ?? 'Plan nahi'}{m.current ? ` · ${dateOf(m.current.endDate)}` : ''}</span>
        {(m.due ?? 0) > 0 && <p className="text-amber-700">Fee baqi {formatPKR(m.due ?? 0)}</p>}
      </div>
      <Badge size="xs" variant={st.variant}>{left != null && left >= 0 && (m.state === 'ACTIVE' || m.state === 'EXPIRING') ? `${left} din` : st.label}</Badge>
    </div>
  );
}
