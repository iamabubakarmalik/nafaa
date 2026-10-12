/**
 * Where the loss comes from in the chosen period: approved loss and what is
 * still waiting, the daily trend by business day, and the split by reason,
 * product, category and the person who reported.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Clock, FolderTree, MessageSquareText, PackageX, Recycle, ShieldAlert, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { damageApi, type DamageBucket, type DamageQuery, type DamageReasonCode } from '../api/damage.api';
import { DAMAGE_KEY, qtyText, reasonOf } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function DamageAnalytics({ filters, money }: { filters: Omit<DamageQuery, 'page' | 'limit' | 'status'>; money: (n: number) => string }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [DAMAGE_KEY, 'analytics', filters], queryFn: () => damageApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const trend = d.trend.map((x) => ({ ...x, label: dayLabel(x.key) }));
  const reasons = d.byReason.map((b) => {
    const code = (b.key.startsWith('OTHER:') ? 'OTHER' : b.key) as DamageReasonCode;
    const meta = reasonOf(code, code === 'OTHER' ? b.label : undefined);
    return { ...b, label: meta.label, color: meta.color };
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={PackageX} label="Asal nuqsan" value={money(t.lost)} sub={`${t.approved} manzoor report`} tone="rose" />
        <Kpi icon={Clock} label="Manzoori baqi" value={money(t.pendingValue)} sub={`${t.pending} report intezar me`} tone="amber" />
        <Kpi icon={Recycle} label="Wapas mila" value={money(t.salvage)} sub="Sasta bech kar ya kabari se" tone="emerald" />
        <Kpi icon={ShieldAlert} label="Rad hui" value={String(t.rejected)} sub="In se stock nahi badla" />
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand-600" />Roz ka nuqsan</span>} description="Har karobari din kitna maal kharab hua — manzoor aur baqi alag">
        {!trend.length ? <Empty text="Is muddat me koi report nahi — bohat khoob" /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...theme.tooltip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="approved" name="Manzoor nuqsan" stackId="a" fill="#e11d48" />
                <Bar dataKey="pending" name="Manzoori baqi" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranked icon={MessageSquareText} title="Wajah" description="Kis wajah se kitna nuqsan hua" rows={reasons} money={money}
          dot={(r) => (r as typeof reasons[number]).color} sub={(r) => `${r.count} report`} />
        <Ranked icon={PackageX} title="Sab se zyada kharab maal" description="In products par nazar rakhein" rows={d.byProduct} money={money}
          sub={(r) => `${qtyText(r.qty)} ${(r as typeof d.byProduct[number]).unit} · ${r.count} report`} />
        <Ranked icon={FolderTree} title="Category" description="Kis qism ke maal me zyada nuqsan" rows={d.byCategory} money={money} sub={(r) => `${r.count} report`} />
        <Ranked icon={Users} title="Kis ne report kiya" description="Har bande ki reports aur un ka nuqsan" rows={d.byPerson} money={money} sub={(r) => `${r.count} report`} />
      </div>
    </div>
  );
}

function Ranked({ icon: I, title, description, rows, money, sub, dot }: {
  icon: LucideIcon; title: string; description: string; rows: DamageBucket[]; money: (n: number) => string;
  sub: (r: DamageBucket) => string; dot?: (r: DamageBucket) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value + r.pending));
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{title}</span>} description={description}>
      {!rows.length ? <Empty text="Koi report nahi" /> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="flex min-w-0 items-center gap-2">
                  {dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: dot(r) }} />}
                  <span className="truncate font-medium text-slate-800">{r.label}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-900">{money(r.value)}{r.pending > 0 && <span className="ml-1 text-[0.75rem] text-amber-700">+{money(r.pending)} baqi</span>}</span>
              </div>
              <div className="mt-1 flex h-2 gap-0.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-rose-500" style={{ width: `${(r.value / max) * 100}%` }} />
                {r.pending > 0 && <div className="h-full rounded-full bg-amber-400" style={{ width: `${(r.pending / max) * 100}%` }} />}
              </div>
              <p className="mt-0.5 text-[0.6875rem] text-slate-500">{sub(r)}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' | 'amber' }) {
  const toneCls = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', brand: 'bg-brand-50 text-brand-700' }[tone];
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
