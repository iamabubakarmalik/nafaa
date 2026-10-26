/**
 * Where the money went in the chosen period: totals against the period
 * before, a category donut, the daily trend by business day, twelve months,
 * branches, payment methods, people, the biggest payees and a category by
 * month table.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CalendarDays, CalendarRange, Clock, CreditCard, PieChart as PieIcon, Receipt, Store, TrendingDown, TrendingUp, Trophy, Users, Wallet, type LucideIcon,
} from 'lucide-react';
import { Card, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { expensesApi, type ExpenseBucket, type ExpenseFilter } from '../api/expenses.api';
import { EXPENSES_KEY, day, methodOf, monthLabel } from './meta';

const dayLabel = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' });

export function ExpenseAnalytics({ filters, onCategory }: { filters: ExpenseFilter; onCategory: (id: string) => void }) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [EXPENSES_KEY, 'analytics', filters], queryFn: () => expensesApi.analytics(filters), placeholderData: (p) => p });
  const d = q.data;

  if (q.isError && !d) return <p className="rounded-3xl bg-white px-6 py-14 text-center text-sm text-slate-500 ring-1 ring-slate-200/80">Analytics load nahi hui — internet check karein aur dobara kholein.</p>;
  if (!d) return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;

  const t = d.totals;
  const up = (t.change ?? 0) > 0;
  const cats = d.byCategory;
  const days = d.byDay.map((x) => ({ ...x, label: dayLabel(x.key) }));
  const months = d.byMonth.map((x) => ({ ...x, label: monthLabel(x.key) }));
  const methods = d.byMethod.map((b) => ({ ...b, label: methodOf(b.key).label, color: methodOf(b.key).color }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Kul expense" value={formatPKR(t.amount)} sub={`${t.count} expenses · ${t.days} din`} tone="rose" />
        <Kpi icon={up ? TrendingUp : TrendingDown} label="Pichli itni period se" value={t.change == null ? '—' : `${up ? '+' : ''}${t.change}%`}
          sub={`Pehle ${formatPKR(t.previous)}`} tone={t.change == null ? 'brand' : up ? 'rose' : 'emerald'} />
        <Kpi icon={CalendarDays} label="Roz ka ausat" value={formatPKR(t.perDay)} sub="Har din ka andaza" />
        <Kpi icon={Clock} label="Baqi bill" value={formatPKR(t.pending)} sub={t.pendingCount ? `${t.pendingCount} bill abhi dene hain` : 'Sab ada ho chuke'} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="rounded-2xl" title={<Title icon={PieIcon}>Category</Title>} description="Paisa kahan gaya — kisi hisse par click karein to sirf woh dikhega">
          {!cats.length ? <Empty /> : (
            <div className="grid items-center gap-3 sm:grid-cols-[11rem_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[11rem_minmax(0,1fr)]">
              <div className="relative mx-auto h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={cats} dataKey="amount" nameKey="label" innerRadius="62%" outerRadius="100%" paddingAngle={1} stroke="none"
                      onClick={(_, i) => { const c = cats[i]; if (c) onCategory(c.key); }} className="cursor-pointer">
                      {cats.map((c) => <Cell key={c.key} fill={c.color ?? '#64748b'} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n]} {...theme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-[0.6875rem] text-slate-500">Kul</span>
                  <span className="text-sm font-bold tabular-nums text-slate-900">{formatPKR(t.amount)}</span>
                </span>
              </div>
              <ul className="space-y-1.5">
                {cats.slice(0, 8).map((c) => (
                  <li key={c.key}>
                    <button type="button" onClick={() => onCategory(c.key)} className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[0.8125rem] hover:bg-slate-50">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="min-w-0 flex-1 truncate text-slate-700">{c.icon ? `${c.icon} ` : ''}{c.label}</span>
                      <span className="shrink-0 tabular-nums text-slate-900">{formatPKR(c.amount)}</span>
                      <span className="w-9 shrink-0 text-right text-[0.6875rem] tabular-nums text-slate-500">{t.amount ? Math.round((c.amount / t.amount) * 100) : 0}%</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<Title icon={CalendarRange}>Roz ka expense</Title>} description="Har karobari din kitna gaya">
          {!t.count ? <Empty /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Expense']} {...theme.tooltip} />
                  <Bar dataKey="amount" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<Title icon={CalendarDays}>Mahine</Title>} description="Pichle 12 mahine — kis mahine zyada gaya">
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={theme.grid} vertical={false} />
              <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} />
              <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
              <Tooltip formatter={(v) => [formatPKR(Number(v)), 'Expense']} {...theme.tooltip} />
              <Bar dataKey="amount" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Ranked icon={Trophy} title="Sab se zyada kis par" description="Expenses ke naam se — kiraya, bijli, salary…" rows={d.topPayees} />
        <Ranked icon={CreditCard} title="Kahan se diye" description="Cash galle se, baqi wallet aur bank se" rows={methods} />
        {d.byBranch.length > 1 && <Ranked icon={Store} title="Branch" description="Har branch ka expense" rows={d.byBranch} />}
        <Ranked icon={Users} title="Kis ne likha" description="Har bande ke likhe expenses" rows={d.byPerson} />
      </div>

      <Card className="rounded-2xl" title={<Title icon={Receipt}>Category har mahine</Title>} description="Ek hi bill mahine ba mahine — maslan bijli July vs August" flush>
        {!d.matrix.rows.length ? <Empty /> : (
          <div className="mt-3 overflow-x-auto">
            <Table minWidth="48rem" className="[&>table]:text-[0.75rem]">
              <THead>
                <Tr className="border-b border-slate-100 text-slate-500">
                  <Th className="sticky left-0 bg-white px-4 py-2 text-left font-medium">Category</Th>
                  {d.matrix.months.map((m) => <Th key={m} className="px-2 py-2 text-right font-medium">{monthLabel(m)}</Th>)}
                  <Th className="px-4 py-2 text-right font-semibold text-slate-700">Kul</Th>
                </Tr>
              </THead>
              <TBody>
                {d.matrix.rows.map((r) => {
                  const max = Math.max(1, ...r.values);
                  return (
                    <Tr key={r.key} className="border-b border-slate-50">
                      <Td className="sticky left-0 max-w-[12rem] truncate bg-white px-4 py-1.5 font-medium text-slate-800">
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: r.color }} />{r.label}
                      </Td>
                      {r.values.map((v, i) => (
                        <Td key={i} className="px-2 py-1.5 text-right tabular-nums text-slate-700" style={v ? { backgroundColor: `${r.color}${Math.round(10 + (v / max) * 40).toString(16).padStart(2, '0')}` } : undefined}>
                          {v ? axisMoney(v) : <span className="text-slate-300">·</span>}
                        </Td>
                      ))}
                      <Td className="px-4 py-1.5 text-right font-semibold tabular-nums text-slate-900">{formatPKR(r.total)}</Td>
                    </Tr>
                  );
                })}
                <Tr className="bg-slate-50 font-semibold text-slate-900">
                  <Td className="text-inherit sticky left-0 bg-slate-50 px-4 py-2">Kul</Td>
                  {d.matrix.totals.map((v, i) => <Td key={i} className="text-inherit px-2 py-2 text-right tabular-nums">{v ? axisMoney(v) : '—'}</Td>)}
                  <Td className="text-inherit px-4 py-2 text-right tabular-nums">{formatPKR(d.matrix.totals.reduce((s, v) => s + v, 0))}</Td>
                </Tr>
              </TBody>
            </Table>
          </div>
        )}
        {t.biggest && <p className="px-4 py-3 text-[0.75rem] text-slate-500 sm:px-5">Is period ka sab se bara expense: <b className="text-slate-700">{t.biggest.title}</b> · {formatPKR(t.biggest.amount)} · {day(t.biggest.date)}</p>}
      </Card>
    </div>
  );
}

function Title({ icon: I, children }: { icon: LucideIcon; children: string }) {
  return <span className="inline-flex items-center gap-2"><I className="h-4 w-4 text-brand-600" />{children}</span>;
}

function Ranked({ icon, title, description, rows }: { icon: LucideIcon; title: string; description: string; rows: Array<ExpenseBucket & { color?: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <Card className="rounded-2xl" title={<Title icon={icon}>{title}</Title>} description={description}>
      {!rows.length ? <Empty /> : (
        <ul className="space-y-2.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="min-w-0 truncate font-medium text-slate-800">{r.label}</span>
                <span className="shrink-0 tabular-nums text-slate-900">{formatPKR(r.amount)}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${(r.amount / max) * 100}%`, background: r.color ?? '#e11d48' }} />
              </div>
              <p className="mt-0.5 text-[0.6875rem] text-slate-500">{r.count} expenses</p>
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
      {sub && <p className="mt-0.5 truncate text-[0.75rem] text-slate-500">{sub}</p>}
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-[0.875rem] text-slate-500">Is period me koi expense nahi</p>;
}
