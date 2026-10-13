/**
 * Plan usage: a meter per limit (products, team, branches, bills this month)
 * and, in the full view, which features the plan has switched on.
 */

import { AlertTriangle, Check, Gauge, Lock } from 'lucide-react';
import { Button, Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import type { PlanUsage } from '@modules/billing/plan-usage/api/plan-usage.api';
import { PLAN_FEATURES, PLAN_LIMITS, limitText } from './helpers';

/** Share of a limit used, 0–100; null when the limit is unlimited. */
export function usedPercent(current: number, limit: number, unlimitedAt: number) {
  if (limit >= unlimitedAt || limit <= 0) return null;
  return Math.min(100, Math.round((current / limit) * 100));
}

export function UsageMeters({ usage, loading, error, full, onUpgrade }: {
  usage: PlanUsage | null; loading: boolean; error?: boolean; full?: boolean; onUpgrade?: () => void;
}) {
  if (loading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{PLAN_LIMITS.map((l) => <Skeleton key={l.key} className="h-28 rounded-2xl" />)}</div>;
  if (!usage) {
    return (
      <Card className="rounded-3xl">
        <p className="py-6 text-center text-[0.875rem] text-slate-500">{error ? 'Istemaal ka hisaab load nahi hua — internet check karke dobara kholein.' : 'Abhi koi plan chalu nahi.'}</p>
      </Card>
    );
  }

  const near = PLAN_LIMITS.filter((l) => (usedPercent(usage.usage[l.key].current, usage.usage[l.key].limit, l.unlimitedAt) ?? 0) >= 80);
  const on = PLAN_FEATURES.filter((f) => usage.features[f.key as keyof PlanUsage['features']]);
  const off = PLAN_FEATURES.filter((f) => !usage.features[f.key as keyof PlanUsage['features']]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_LIMITS.map((l) => {
          const { current, limit } = usage.usage[l.key];
          const pct = usedPercent(current, limit, l.unlimitedAt);
          const tone = pct == null ? 'ok' : pct >= 90 ? 'danger' : pct >= 75 ? 'warn' : 'ok';
          return (
            <div key={l.key} className={cn('rounded-2xl bg-white p-4 shadow-sm ring-1', tone === 'danger' ? 'ring-rose-200' : tone === 'warn' ? 'ring-amber-200' : 'ring-slate-200/80')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.8125rem] font-medium text-slate-500">{l.label}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${l.color}17`, color: l.color }}><l.icon className="h-3.5 w-3.5" /></span>
              </div>
              <p className="mt-1 text-[1.25rem] font-bold tabular-nums text-slate-900">
                {current.toLocaleString('en-PK')}<span className="text-[0.8125rem] font-medium text-slate-500"> / {limitText(limit, l.unlimitedAt)}</span>
              </p>
              {pct == null ? (
                <p className="mt-2 text-[0.75rem] text-emerald-700">Koi had nahi</p>
              ) : (
                <>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={l.label}>
                    <div className={cn('h-full rounded-full', tone === 'danger' ? 'bg-rose-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-brand-600')} style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                  <p className={cn('mt-1 text-[0.75rem]', tone === 'danger' ? 'font-semibold text-rose-700' : tone === 'warn' ? 'font-semibold text-amber-700' : 'text-slate-500')}>
                    {pct}% istemaal · {Math.max(0, limit - current).toLocaleString('en-PK')} baqi
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {near.length > 0 && onUpgrade && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-amber-900"><AlertTriangle className="h-4 w-4" /> {near.map((l) => l.label).join(', ')} had ke qareeb — bara plan dekh lein.</p>
          <Button size="sm" onClick={onUpgrade}>Plans dekhein</Button>
        </div>
      )}

      {full && (
        <Card className="rounded-3xl" title={<span className="flex items-center gap-2"><Gauge className="h-4 w-4 text-brand-600" /> {usage.plan.name} me kya shaamil hai</span>}
          description={`${on.length} cheezein chalu · ${off.length} bare plan me`}>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...on, ...off].map((f) => {
              const has = on.includes(f);
              return (
                <li key={f.key} className={cn('flex items-center gap-2.5 rounded-xl px-3 py-2 ring-1', has ? 'bg-white ring-slate-200' : 'bg-slate-50 ring-slate-100')}>
                  <f.icon className={cn('h-4 w-4 shrink-0', has ? 'text-brand-600' : 'text-slate-400')} />
                  <span className={cn('flex-1 text-[0.8125rem]', has ? 'font-medium text-slate-800' : 'text-slate-500')}>{f.label}</span>
                  {has ? <Check className="h-4 w-4 text-emerald-600" /> : <Lock className="h-3.5 w-3.5 text-slate-400" />}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
