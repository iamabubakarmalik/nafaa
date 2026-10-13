/**
 * Cash register analytics for the chosen period: cash sales and the
 * short/over of every business day, who runs short most often, each
 * branch side by side, and the average float and shift length.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Banknote, Clock, Store, TrendingUp, Users, Wallet, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { cashRegisterApi, type CashBucket, type ShiftQuery } from '../api/cash-register.api';
import { CASH_KEY, signed } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function CashAnalytics({ filters, money }: { filters: Omit<ShiftQuery, 'page' | 'limit' | 'status'>; money: (n: number) => string }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [CASH_KEY, 'analytics', filters], queryFn: () => cashRegisterApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const days = d.byDay.map((x) => ({ ...x, label: dayLabel(x.key), shortNeg: -x.short }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Shifts" value={String(t.shifts)} sub={t.open ? `${t.open} abhi khuli` : 'Sab band ho chuki'} />
        <Kpi icon={AlertTriangle} label="Paise kam nikle" value={money(t.short)} sub={`${t.shortCount} shift me`} tone="rose" />
        <Kpi icon={TrendingUp} label="Paise zyada nikle" value={money(t.over)} sub={`${t.overCount} shift me`} tone="sky" />
        <Kpi icon={Clock} label="Ausat float · waqt" value={money(t.avgFloat)} sub={t.avgHours ? `Ek shift ausatan ${t.avgHours} ghante` : 'Abhi koi shift band nahi hui'} tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<Title icon={Banknote} text="Roz ki cash sale" />} description="Har karobari din galle me kitni cash sale aayi (shift khulne ke din par)">
          {!days.length ? <Empty text="Is period me koi shift nahi" /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Cash sale']} {...theme.tooltip} />
                  <Bar dataKey="cashSales" name="Cash bikri" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="rounded-2xl" title={<Title icon={AlertTriangle} text="Roz ka farak" />} description="Neeche laal: paise kam nikle · upar neela: zyada nikle">
          {!days.some((x) => x.short || x.over) ? <Empty text="Is period me galla har dafa barabar nikla" /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} stackOffset="sign" margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <ReferenceLine y={0} stroke={theme.grid} />
                  <Tooltip formatter={(v, n) => [formatPKR(Math.abs(Number(v))), n]} {...theme.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="shortNeg" name="Kam" stackId="d" fill="#e11d48" />
                  <Bar dataKey="over" name="Zyada" stackId="d" fill="#0284c7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranked icon={Users} title="Staff ke hisaab se" description="Jis ne shift kholi us ke naam par — sab se zyada kam pehle" rows={d.byStaff} money={money} />
        {d.byShop.length > 1
          ? <Ranked icon={Store} title="Branch ke hisaab se" description="Har branch ki shifts, cash sale aur farak" rows={d.byShop} money={money} />
          : <Ranked icon={Clock} title="Ausat opening float" description="Har din shift kitne khule paise se shuru hui" rows={[...d.byDay].reverse().slice(0, 10).map((x) => ({ ...x, label: dayLabel(x.key) }))} money={money} float />}
      </div>
      {d.capped && <p className="text-center text-[0.75rem] text-slate-500">Bohat zyada shifts hain — pehli 5000 gini gayi hain. Period chhoti karein.</p>}
    </div>
  );
}

function Ranked({ icon, title, description, rows, money, float }: {
  icon: LucideIcon; title: string; description: string; rows: CashBucket[]; money: (n: number) => string; float?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => (float ? r.avgFloat : Math.max(r.short, r.over))));
  return (
    <Card className="rounded-2xl" title={<Title icon={icon} text={title} />} description={description}>
      {!rows.length ? <Empty text="Koi shift nahi" /> : (
        <ul className="space-y-2.5">
          {rows.slice(0, 12).map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="truncate font-medium text-slate-800">{r.label}</span>
                <span className={cn('shrink-0 tabular-nums', float ? 'text-slate-900' : r.net < 0 ? 'text-rose-700' : r.net > 0 ? 'text-sky-700' : 'text-emerald-700')}>
                  {float ? money(r.avgFloat) : r.net ? signed(r.net) : 'Barabar'}
                </span>
              </div>
              {float ? (
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(r.avgFloat / max) * 100}%` }} /></div>
              ) : (
                <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                  {r.short > 0 && <div className="h-full rounded-full bg-rose-500" style={{ width: `${(r.short / max) * 50}%` }} />}
                  {r.over > 0 && <div className="h-full rounded-full bg-sky-500" style={{ width: `${(r.over / max) * 50}%` }} />}
                </div>
              )}
              <p className="mt-0.5 text-[0.6875rem] text-slate-500">
                {r.shifts} shift · cash sale {money(r.cashSales)}
                {!float && r.shortCount > 0 && ` · ${r.shortCount} dafa kam (${money(r.short)})`}
                {!float && r.overCount > 0 && ` · ${r.overCount} dafa zyada (${money(r.over)})`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Title({ icon: I, text }: { icon: LucideIcon; text: string }) {
  return <span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{text}</span>;
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' | 'sky' }) {
  const toneCls = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', sky: 'bg-sky-50 text-sky-700', brand: 'bg-brand-50 text-brand-700' }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', toneCls)}><I className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">{text}</p>;
}
