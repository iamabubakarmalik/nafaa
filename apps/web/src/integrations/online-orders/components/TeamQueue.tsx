/**
 * Team work queue on the online store dashboard: for each staff member the
 * open orders in their name, follow-ups due and orders they moved today,
 * plus orders nobody has. Each count opens the board filtered to it.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlarmClock, CheckCircle2, Inbox, Users } from 'lucide-react';
import { Avatar, Skeleton } from '@/design-system/components';
import { t } from '@core/i18n';
import { growthApi } from '../api/growth.api';

export function TeamQueue() {
  const q = useQuery({ queryKey: ['online-orders', 'team-queue'], queryFn: growthApi.team, refetchInterval: 60_000 });
  const d = q.data;
  if (q.isError) return null;
  if (d && !d.staff.length && !d.unassigned) return null;
  const cell = 'flex items-center justify-end gap-1 tabular-nums';
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80" aria-labelledby="team-title">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="team-title" className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Users className="h-4 w-4 text-slate-400" /> {t('Team ka kaam')}</h2>
        {d && d.unassigned > 0 && (
          <Link to="/online-orders?assignedTo=none&board=ALL" className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[0.75rem] font-semibold text-amber-800 hover:bg-amber-100">
            <Inbox className="h-3.5 w-3.5" />{t('{{count}} kisi ke paas nahi', { count: d.unassigned })}
          </Link>
        )}
      </div>
      {!d ? <Skeleton className="h-20 rounded-xl" /> : !d.staff.length ? (
        <p className="text-[0.8125rem] text-slate-500">{t('Abhi koi order kisi ke zimme nahi. Board par order chun kar "Assign" karein.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[0.8125rem]">
            <thead>
              <tr className="text-[0.6875rem] uppercase tracking-wide text-slate-400">
                <th className="py-1.5 text-start font-semibold">{t('Staff')}</th>
                <th className="py-1.5 text-end font-semibold">{t('Khule order')}</th>
                <th className="py-1.5 text-end font-semibold">{t('Follow-up')}</th>
                <th className="py-1.5 text-end font-semibold">{t('Aaj kiye')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.staff.map((s) => (
                <tr key={s.userId}>
                  <td className="py-2">
                    <span className="flex items-center gap-2"><Avatar name={s.name} size={24} />
                      <span className="truncate font-medium text-slate-900">{s.name}{s.userId === d.me && <span className="ms-1 text-[0.6875rem] font-normal text-slate-400">{t('(aap)')}</span>}</span>
                    </span>
                  </td>
                  <td className="py-2"><Link to={`/online-orders?assignedTo=${s.userId}&board=ALL`} className={`${cell} font-semibold text-slate-900 hover:underline`}>{s.open}</Link></td>
                  <td className="py-2">
                    <Link to={`/online-orders?assignedTo=${s.userId}&board=FOLLOW_UP`} className={`${cell} ${s.followUpsDue ? 'font-semibold text-sky-700' : 'text-slate-400'} hover:underline`}>
                      {s.followUpsDue > 0 && <AlarmClock className="h-3.5 w-3.5" />}{s.followUpsDue}
                    </Link>
                  </td>
                  <td className="py-2"><span className={`${cell} ${s.doneToday ? 'text-success-700' : 'text-slate-400'}`}>{s.doneToday > 0 && <CheckCircle2 className="h-3.5 w-3.5" />}{s.doneToday}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
