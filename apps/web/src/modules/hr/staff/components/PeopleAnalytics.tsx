/**
 * Staff analytics for the chosen period: who sold how much, attendance per
 * person, headcount by role and branch, joining and leaving by month, logins
 * per day and people who never logged in. Blocks the viewer may not see are
 * replaced by a short note naming the permission.
 */

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, Clock, LogIn, ShieldAlert, ShoppingBag, Trophy, UserPlus, Users, type LucideIcon } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { peopleApi } from '../api/people.api';
import { PEOPLE_KEY, ROLES, STATUS, type RoleKey } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });
const monthLabel = (k: string) => new Date(`${k}-15T12:00:00`).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });

export function PeopleAnalytics({ period }: { period: { from: string; to: string } | null }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [PEOPLE_KEY, 'analytics', period], queryFn: () => peopleApi.analytics(period ?? {}), placeholderData: (p) => p });
  const d = q.data;

  if (q.isError && !d) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Analytics load nahi hui — internet check karein aur dobara kholein.</p>;
  if (!d) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;

  const top = d.sellers?.[0];
  const att = d.attendance.reduce((a, r) => ({ present: a.present + r.present, absent: a.absent + r.absent }), { present: 0, absent: 0 });
  const rate = att.present + att.absent ? Math.round((att.present / (att.present + att.absent)) * 100) : null;
  const roles = d.headcount.byRole.map((r) => ({ ...r, label: ROLES[r.key as RoleKey]?.label ?? r.key, color: ROLES[r.key as RoleKey]?.color ?? '#64748b' }));
  const months = d.months.map((m) => ({ ...m, label: monthLabel(m.key) }));
  const sellers = (d.sellers ?? []).slice(0, 12);
  const attRows = d.attendance.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Log (kaam par ya chhutti)" value={String(d.headcount.total)} sub={d.headcount.byStatus.map((s) => `${STATUS[s.key as keyof typeof STATUS]?.label ?? s.key} ${s.count}`).join(' · ')} />
        <Kpi icon={Trophy} label="Sab se zyada bikri" value={top ? top.name : '—'} sub={d.sellers ? (top ? `${formatPKR(top.sales)} · ${top.bills} bill` : 'Is muddat me koi bikri nahi') : 'Bikri dekhne ki ijazat nahi'} tone="emerald" />
        <Kpi icon={CalendarCheck} label="Haazri" value={rate == null ? '—' : `${rate}%`} sub={rate == null ? 'Is muddat me haazri nahi lagi' : `${att.present} din haazir · ${att.absent} ghair haazir`} tone={rate != null && rate < 85 ? 'amber' : 'brand'} />
        <Kpi icon={ShieldAlert} label="Ghalat login" value={d.logins ? String(d.logins.failed) : '—'} sub={d.logins ? (d.logins.failed ? 'Ghalat password ki koshishein' : 'Koi ghalat koshish nahi') : 'Team dekhne ki ijazat nahi'} tone={d.logins?.failed ? 'rose' : 'brand'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<Title icon={ShoppingBag}>Kis ne kitna becha</Title>} description="Counter par jis ka naam chuna gaya, warna jis ne bill banaya — wapsi ghata kar">
          {!d.sellers ? <Note text='Yeh dekhne ke liye "Bikri dekhna" ki ijazat chahiye.' /> : !sellers.length ? <Empty /> : (
            <div style={{ height: Math.max(180, sellers.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sellers} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid horizontal={false} stroke={theme.grid} />
                  <XAxis type="number" tickFormatter={axisMoney} tick={theme.axis} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={96} tick={theme.axis} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, _n, item) => [`${formatPKR(Number(v))} · ${(item?.payload as { bills: number }).bills} bill`, 'Bikri']} {...theme.tooltip} />
                  <Bar dataKey="sales" fill={theme.primary} radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<Title icon={CalendarCheck}>Haazri</Title>} description="Har bande ke din: haazir, ghair haazir aur chhutti">
          {!attRows.length ? <Note text="Is muddat me haazri nahi lagi. Haazri ka safha: Staff → Haazri." /> : (
            <div style={{ height: Math.max(180, attRows.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attRows} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <CartesianGrid horizontal={false} stroke={theme.grid} />
                  <XAxis type="number" allowDecimals={false} tick={theme.axis} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={96} tick={theme.axis} axisLine={false} tickLine={false} />
                  <Tooltip {...theme.tooltip} />
                  <Bar dataKey="present" name="Haazir" stackId="a" fill="#16a34a" maxBarSize={22} />
                  <Bar dataKey="absent" name="Ghair haazir" stackId="a" fill="#e11d48" maxBarSize={22} />
                  <Bar dataKey="leave" name="Chhutti" stackId="a" fill="#94a3b8" radius={[0, 6, 6, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl" title={<Title icon={Users}>Role</Title>} description="Kaam par aur chhutti wale log">
          {!roles.length ? <Empty /> : (
            <div className="grid items-center gap-3 sm:grid-cols-[9rem_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[9rem_minmax(0,1fr)]">
              <div className="mx-auto h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roles} dataKey="count" nameKey="label" innerRadius="60%" outerRadius="100%" paddingAngle={1} stroke="none">
                      {roles.map((r) => <Cell key={r.key} fill={r.color} />)}
                    </Pie>
                    <Tooltip {...theme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-1">
                {roles.map((r) => (
                  <li key={r.key} className="flex items-center gap-2 text-[0.8125rem]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                    <span className="flex-1 text-slate-700">{r.label}</span><span className="font-semibold tabular-nums text-slate-900">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<Title icon={UserPlus}>Aaye aur gaye</Title>} description="Pichle 12 mahine — kitne jure, kitne chhor gaye">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months}>
                <CartesianGrid vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} width={24} tick={theme.axis} axisLine={false} tickLine={false} />
                <Tooltip {...theme.tooltip} />
                <Bar dataKey="joined" name="Jure" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={16} />
                <Bar dataKey="left" name="Chhor gaye" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="rounded-2xl" title={<Title icon={Clock}>Kitne arse se</Title>} description="Kaam par logon ka arsa">
          <ul className="space-y-2">
            {([['3 mahine se kam', d.headcount.tenure.under3m], ['3 se 12 mahine', d.headcount.tenure.under1y], ['1 se 3 saal', d.headcount.tenure.under3y], ['3 saal se zyada', d.headcount.tenure.over3y]] as const).map(([k, n]) => {
              const pct = d.headcount.total ? (n / d.headcount.total) * 100 : 0;
              return (
                <li key={k} className="text-[0.8125rem]">
                  <div className="flex justify-between"><span className="text-slate-600">{k}</span><span className="font-semibold tabular-nums text-slate-900">{n}</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></div>
                </li>
              );
            })}
          </ul>
          {d.headcount.byBranch.length > 1 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="mb-1.5 text-[0.75rem] font-semibold text-slate-500">Branch</p>
              <ul className="space-y-1 text-[0.8125rem]">
                {d.headcount.byBranch.map((b) => <li key={b.key} className="flex justify-between"><span className="truncate text-slate-700">{b.key}</span><span className="font-semibold tabular-nums">{b.count}</span></li>)}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<Title icon={LogIn}>Login</Title>} description="Roz kitni dafa login hua, aur ghalat password ki koshishein">
        {!d.logins ? <Note text='Yeh dekhne ke liye "Team dekhna" ki ijazat chahiye.' /> : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            {!d.logins.daily.length ? <Empty /> : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.logins.daily.map((x) => ({ ...x, label: dayLabel(x.day) }))}>
                    <CartesianGrid vertical={false} stroke={theme.grid} />
                    <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} width={24} tick={theme.axis} axisLine={false} tickLine={false} />
                    <Tooltip {...theme.tooltip} />
                    <Bar dataKey="ok" name="Login" stackId="a" fill={theme.primary} maxBarSize={18} />
                    <Bar dataKey="failed" name="Ghalat password" stackId="a" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[0.75rem] font-semibold text-slate-500">Abhi tak login nahi kiya</p>
              {!d.logins.neverLoggedIn.length ? <p className="text-[0.8125rem] text-emerald-700">Sab ne login kar liya</p> : (
                <ul className="space-y-1 text-[0.8125rem]">
                  {d.logins.neverLoggedIn.map((p) => <li key={p.id}><Link to={`/staff/${p.id}`} className="text-brand-700 hover:underline">{p.name}</Link></li>)}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone = 'brand' }: { icon: LucideIcon; label: string; value: string; sub: string; tone?: 'brand' | 'emerald' | 'amber' | 'rose' }) {
  const tones = { brand: 'bg-brand-50 text-brand-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' };
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center justify-between gap-2"><span className="text-[0.8125rem] font-medium text-slate-500">{label}</span><span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}><Icon className="h-4 w-4" /></span></div>
      <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="truncate text-[0.75rem] text-slate-500">{sub}</p>
    </div>
  );
}
const Title = ({ icon: Icon, children }: { icon: LucideIcon; children: string }) => <span className="inline-flex items-center gap-2"><Icon className="h-4 w-4 text-brand-600" />{children}</span>;
const Empty = () => <p className="py-10 text-center text-sm text-slate-500">Is muddat me kuch nahi</p>;
const Note = ({ text }: { text: string }) => <p className="py-10 text-center text-sm text-slate-500">{text}</p>;
