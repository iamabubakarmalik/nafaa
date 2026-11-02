/**
 * One person on the staff list: photo, role, job, branch, whether they are
 * on duty right now, last login and today's sales (when the viewer may see
 * them). The whole card opens the profile.
 */

import { Link } from 'react-router-dom';
import { Clock, LogIn, MessageCircle, Phone, ShoppingBag, Store } from 'lucide-react';
import { Avatar } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import type { DirectoryPerson } from '../api/people.api';
import { STATUS, ago, roleOf, time, waLink } from './meta';
import { t } from '@core/i18n';

export function PersonCard({ p }: { p: DirectoryPerson }) {
  const role = roleOf(p.role);
  const st = STATUS[p.status];
  const gone = p.status === 'LEFT' || p.status === 'INACTIVE';
  return (
    <li className={cn('group relative flex flex-col rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md', gone && 'opacity-75')}>
      <Link to={`/staff/${p.id}`} className="absolute inset-0 rounded-2xl" aria-label={t('{{fullName}} ki profile', { fullName: p.fullName })} />
      <div className="flex items-start gap-3">
        <span className="relative shrink-0">
          <Avatar name={p.fullName} url={p.avatarUrl} size={44} />
          <span className={cn('absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-white', p.onDuty ? 'bg-emerald-500' : st.dot)} title={p.onDuty ? t('Duty par') : st.label} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{p.fullName}</p>
          <p className="truncate text-[0.75rem] text-slate-500">{[p.designation, p.staffNumber].filter(Boolean).join(' · ') || '—'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold" style={{ backgroundColor: `${role.color}14`, color: role.color }}>
              <role.icon className="h-3 w-3" />{role.label}
            </span>
            {p.status !== 'ACTIVE' && <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>}
            {p.login?.neverLoggedIn && p.login.isActive && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[0.6875rem] font-medium text-sky-700 ring-1 ring-sky-200">{t('Login abhi nahi kiya')}</span>}
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[0.75rem]">
        <Fact icon={Store} v={p.shop?.name ?? t('Sab branches')} />
        <Fact icon={Clock} v={p.onDuty ? t('Duty par · {{since}} se', { since: time(p.onDuty.since) }) : p.todayAttendance === 'ABSENT' ? t('Aaj ghair haazir') : p.todayAttendance ? t('Aaj aaya tha') : t('Abhi duty par nahi')}
          tone={p.onDuty ? 'text-emerald-700 font-semibold' : undefined} />
        {p.login ? <Fact icon={LogIn} v={p.login.isActive ? ago(p.login.lastLoginAt) : t('Login band')} /> : <Fact icon={LogIn} v={p.hasLogin ? t('Login hai') : t('Login nahi')} />}
        {p.today && <Fact icon={ShoppingBag} v={p.today.bills ? t('{{sales}} · {{bills}} bill', { sales: formatPKR(p.today.sales), bills: p.today.bills }) : t('Aaj koi sale nahi')} tone={p.today.bills ? 'text-slate-900 font-semibold' : undefined} />}
      </dl>

      {p.phone && p.phone !== '—' && (
        <div className="relative mt-2.5 flex gap-1.5">
          <a href={`tel:${p.phone}`} className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-slate-50 text-[0.75rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"><Phone className="h-3.5 w-3.5" />{t('Call')}</a>
          <a href={waLink(p.phone)} target="_blank" rel="noreferrer" className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-50 text-[0.75rem] font-medium text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"><MessageCircle className="h-3.5 w-3.5" />{t('WhatsApp')}</a>
        </div>
      )}
    </li>
  );
}

function Fact({ icon: Icon, v, tone }: { icon: typeof Store; v: string; tone?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-slate-600">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className={cn('truncate', tone)}>{v}</span>
    </div>
  );
}
