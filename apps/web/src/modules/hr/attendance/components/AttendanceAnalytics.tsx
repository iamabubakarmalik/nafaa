/**
 * Attendance analytics for the chosen month: who came each business day,
 * late minutes by day and by weekday, and who is late, absent or working
 * overtime most.
 */

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlarmClock, CalendarCheck, Clock, Timer, UserX, Users, type LucideIcon } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { Sheet } from '../api/attendance.api';
import { CODE, absentDays, dayLabel, hours, mins } from './meta';

const WEEK = ['Itwar', 'Peer', 'Mangal', 'Budh', 'Jumeraat', 'Juma', 'Hafta'];

export function AttendanceAnalytics({ sheet, rows }: { sheet: Sheet; rows: Sheet['rows'] }) {
  const theme = useChartTheme();
  const past = sheet.byDay.filter((d) => d.key <= sheet.today);
  const days = past.map((d) => ({ ...d, label: dayLabel(d.key), onTime: d.present - d.late }));

  const t = rows.reduce((a, r) => {
    a.worked += r.totals.daysWorked - r.totals.halfDay / 2;
    a.expected += r.totals.workingDays - r.totals.leave - r.totals.unpaidLeave - r.totals.holiday;
    a.present += r.totals.present;
    a.late += r.totals.late;
    a.lateMinutes += r.totals.lateMinutes;
    a.ot += r.totals.overtimeHours;
    a.absent += absentDays(r.totals);
    return a;
  }, { worked: 0, expected: 0, present: 0, late: 0, lateMinutes: 0, ot: 0, absent: 0 });
  const rate = t.expected > 0 ? Math.round((t.worked / t.expected) * 100) : 0;
  const onTime = t.present > 0 ? Math.round(((t.present - t.late) / t.present) * 100) : 0;

  const byWeekday = WEEK.map((name, i) => {
    const ds = past.filter((d) => new Date(`${d.key}T12:00:00Z`).getUTCDay() === i);
    return { name, lateMinutes: ds.reduce((s, d) => s + d.lateMinutes, 0) };
  });

  const ranked = (pick: (r: Sheet['rows'][number]) => number, fmt: (r: Sheet['rows'][number]) => string) =>
    rows.map((r) => ({ key: r.staff.id, label: r.staff.fullName, value: pick(r), text: fmt(r) })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={CalendarCheck} label="Hazri ki sharah" value={`${rate}%`} sub={`${t.worked} din kaam / ${t.expected} hone chahiye the`} tone="emerald" />
        <Kpi icon={AlarmClock} label="Waqt par aaye" value={`${onTime}%`} sub={`${t.late} dafa late · ${mins(t.lateMinutes)} kul`} tone="amber" />
        <Kpi icon={UserX} label="Ghair hazir din" value={String(t.absent)} sub="Absent + jin dinon hazri nahi lagi" tone="rose" />
        <Kpi icon={Timer} label="Overtime" value={hours(Math.round(t.ot * 10) / 10)} sub="Roz ke ghante se zyada kaam" tone="sky" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<Title icon={Users} text="Roz kitne aaye" />} description="Har karobari din: waqt par, late, ghair hazir aur chhutti">
          {!days.length ? <Empty text="Is mahine abhi koi din nahi guzra" /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
                  <Tooltip {...theme.tooltip} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="onTime" name="Waqt par" stackId="a" fill={CODE.P.color} />
                  <Bar dataKey="late" name="Late" stackId="a" fill={CODE.L.color} />
                  <Bar dataKey="absent" name="Ghair hazir" stackId="a" fill={CODE.A.color} />
                  <Bar dataKey="leave" name="Chhutti" stackId="a" fill={CODE.LV.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card className="rounded-2xl" title={<Title icon={Clock} text="Hafte ke kis din late" />} description="Har din ke kul late minute — kis din zyada der hoti hai">
          {!t.lateMinutes ? <Empty text="Is mahine sab waqt par aaye" /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byWeekday} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} width={44} />
                  <Tooltip formatter={(v) => [mins(Number(v)), 'Late']} {...theme.tooltip} />
                  <Bar dataKey="lateMinutes" name="Late minute" fill={CODE.L.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Ranked icon={AlarmClock} title="Sab se zyada late" color="bg-amber-500"
          rows={ranked((r) => r.totals.lateMinutes, (r) => `${r.totals.late} dafa · ${mins(r.totals.lateMinutes)}`)} />
        <Ranked icon={UserX} title="Sab se zyada ghair hazir" color="bg-rose-500"
          rows={ranked((r) => absentDays(r.totals), (r) => `${absentDays(r.totals)} din`)} />
        <Ranked icon={Timer} title="Sab se zyada overtime" color="bg-sky-500"
          rows={ranked((r) => r.totals.overtimeHours, (r) => hours(r.totals.overtimeHours))} />
      </div>
    </div>
  );
}

function Ranked({ icon, title, rows, color }: { icon: LucideIcon; title: string; color: string; rows: Array<{ key: string; label: string; value: number; text: string }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="rounded-2xl" title={<Title icon={icon} text={title} />}>
      {!rows.length ? <Empty text="Koi nahi — shabash" /> : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex justify-between gap-2 text-[0.8125rem]">
                <span className="truncate font-medium text-slate-800">{r.label}</span>
                <span className="shrink-0 tabular-nums text-slate-700">{r.text}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className={cn('h-full rounded-full', color)} style={{ width: `${(r.value / max) * 100}%` }} /></div>
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

function Kpi({ icon: I, label, value, sub, tone }: { icon: LucideIcon; label: string; value: string; sub?: string; tone: 'rose' | 'emerald' | 'sky' | 'amber' }) {
  const toneCls = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', sky: 'bg-sky-50 text-sky-700', amber: 'bg-amber-50 text-amber-700' }[tone];
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
