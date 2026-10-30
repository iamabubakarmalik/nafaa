/**
 * Dashboard widget: this month's commission (earned, paid, due) and the top
 * earners, with a link to the full page. Shows a short set-up note when no
 * rule exists or nobody is enrolled yet.
 */

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, HandCoins, Target, Trophy, Users } from 'lucide-react';
import { Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { commissionApi } from '../api/commission.api';
import { useThisPeriod } from '../hooks/useCommission';
import { COMMISSION_KEY, periodLabel, signed } from './meta';
import { t } from '@core/i18n';

const TO = '/staff/commission';

export function CommissionCard({ hideAmounts = false, max = 4 }: { hideAmounts?: boolean; max?: number }) {
  const period = useThisPeriod();
  const q = useQuery({ queryKey: [COMMISSION_KEY, 'summary', period], queryFn: () => commissionApi.summary(period), retry: false });
  const canManage = usePermission(PERMISSIONS.COMMISSION_MANAGE);
  const s = q.data;
  const money = (v: number) => (hideAmounts ? '••••' : signed(v));
  const live = (s?.rows ?? []).filter((r) => r.enrolled);

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><HandCoins className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">{t('Staff commission')}</h3>
          <p className="truncate text-[0.75rem] text-slate-500">{periodLabel(period)}{s?.ruleCount ? t(' · {{ruleCount}} rule chaalu', { ruleCount: s.ruleCount }) : ''}</p>
        </div>
        <Link to={TO} className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">{t('Poora')}{' '} <ArrowRight className="h-3.5 w-3.5 rtl-flip" /></Link>
      </header>

      {q.isError ? (
        <p className="px-4 py-6 text-center text-[0.8125rem] text-slate-500">{t('Commission load nahi hui')}</p>
      ) : !s ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
      ) : !s.ruleCount && s.scope === 'all' ? (
        <Setup icon={Target} title={t('Commission set nahi hai')} text={t('Bandon ko sale par hissa dete hain? Ek rule bana dein — phir har mahine ka hisab khud banega.')} cta={canManage ? t('Rule banayein') : undefined} />
      ) : !s.enabledCount ? (
        <Setup icon={Users} title={t('Kisi bande par chaalu nahi')} text={t('Har bande ko alag se chaalu karna parta hai — tabhi us ki commission banti hai.')} cta={canManage ? t('Bande chunein') : undefined} />
      ) : (<>
        <div className="grid grid-cols-3 gap-2 border-b border-slate-100 px-4 py-3">
          <Mini label={t('Banti hai')} value={money(s.total)} tone="text-brand-700" />
          <Mini label={t('Ada hui')} value={hideAmounts ? '••••' : formatPKR(s.paidTotal)} />
          <Mini label={t('Dena baqi')} value={hideAmounts ? '••••' : formatPKR(s.pendingTotal)} tone={s.pendingTotal > 0 ? 'text-amber-700' : undefined} />
        </div>
        <ul className="divide-y divide-slate-100">
          {live.slice(0, max).map((r, i) => (
            <li key={r.userId} className="flex items-center gap-2.5 px-4 py-2.5">
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold', i === 0 && r.earned > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500')}>
                {i === 0 && r.earned > 0 ? <Trophy className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{r.name}</p>
                <p className="truncate text-[0.6875rem] text-slate-500">{t('{{bills}} bill · {{value}}', { bills: r.bills, value: hideAmounts ? '••••' : formatPKR(r.sale) })}</p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-sm font-semibold tabular-nums text-slate-900">{money(r.earned)}</p>
                {r.paid && <p className="text-[0.625rem] font-medium text-emerald-600">{t('Ada ho gayi')}</p>}
              </div>
            </li>
          ))}
        </ul>
        {s.orphanBills > 0 && (
          <p className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-[0.6875rem] text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{t('{{orphanBills}} bill par kisi bande ka naam nahi — in ki commission kisi ko nahi milti', { orphanBills: s.orphanBills })}
          </p>
        )}
      </>)}
    </section>
  );
}

function Setup({ icon: I, title, text, cta }: { icon: typeof Target; title: string; text: string; cta?: string }) {
  return (
    <div className="px-4 py-6 text-center">
      <I className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-2 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[0.75rem] text-slate-500">{text}</p>
      {cta && <Link to={TO} className="mt-3 inline-flex h-9 items-center rounded-xl bg-brand-600 px-3 text-[0.8125rem] font-semibold text-white hover:bg-brand-700">{cta}</Link>}
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[0.6875rem] text-slate-500">{label}</p>
      <p className={cn('truncate text-sm font-bold tabular-nums text-slate-900', tone)}>{value}</p>
    </div>
  );
}
