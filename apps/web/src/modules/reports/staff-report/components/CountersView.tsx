/**
 * Counters tab: every cash drawer shift in the period with who opened and
 * closed it, how long it ran, cash expected against cash counted, bills rung
 * and cash put in or taken out; shorts and overs by day, person and branch.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  ArrowRightLeft, Building2, CheckCircle2, ChevronDown, Clock, ListFilter, LogIn, LogOut, TrendingDown, UserRound, Vault,
} from 'lucide-react';
import { Button, FilterMenu, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { STAFF_REPORT_KEY, staffReportApi, type Period, type ShiftRow, type ShiftStatusFilter, type StaffRow } from '../api';
import { hoursText, keyLabel, pct, when } from './meta';
import { Empty, Figure, Panel } from './parts';

const STATUSES: Array<{ value: ShiftStatusFilter; label: string; hint?: string }> = [
  { value: '', label: 'Sab shift' },
  { value: 'open', label: 'Abhi khuli', hint: 'Galla abhi band nahi hua' },
  { value: 'short', label: 'Kam nikla', hint: 'Gine hue paise hisab se kam' },
  { value: 'over', label: 'Zyada nikla', hint: 'Gine hue paise hisab se zyada' },
  { value: 'matched', label: 'Barabar', hint: 'Farq 50 paise se kam' },
  { value: 'closed', label: 'Band shift' },
];

export function CountersView({ period, staff, money, multiBranch, staffId, setStaffId, status, setStatus }: {
  period: Period;
  staff: StaffRow[];
  money: (n: number) => string;
  multiBranch: boolean;
  staffId: string;
  setStaffId: (v: string) => void;
  status: ShiftStatusFilter;
  setStatus: (v: ShiftStatusFilter) => void;
}) {
  const theme = useChartTheme();
  const canRegister = usePermission(PERMISSIONS.CASH_REGISTER_VIEW);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  useEffect(() => { setPage(1); }, [period.from, period.to]);
  const q = { ...period, staffId: staffId || undefined, status: status || undefined, page, limit: 30 };
  const shiftsQ = useQuery({
    queryKey: [STAFF_REPORT_KEY, 'shifts', q],
    queryFn: () => staffReportApi.shifts(q),
    placeholderData: keepPreviousData,
  });
  const d = shiftsQ.data;
  const people = staff.filter((r) => r.id && r.shifts > 0);

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu icon={ListFilter} label="Halat" value={status} active={!!status} options={STATUSES} onChange={(v) => { setStatus(v); setPage(1); }} />
      {people.length > 1 && (
        <FilterMenu icon={UserRound} label="Banda" value={staffId} active={!!staffId} align="right"
          options={[{ value: '', label: 'Sab staff' }, ...people.map((r) => ({ value: r.id!, label: r.name, hint: `${r.shifts} shift` }))]}
          onChange={(v) => { setStaffId(v); setPage(1); }} />
      )}
      {canRegister && <Link to="/cash-register" className="ml-auto text-[0.8125rem] font-semibold text-brand-700 hover:underline">Galla kholein / band karein →</Link>}
    </div>
  );

  if (shiftsQ.isLoading || !d) {
    return <div className="space-y-4">{filters}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div><Skeleton className="h-72 rounded-2xl" /></div>;
  }
  const t = d.totals;
  const days = d.byDay.map((b) => ({ label: keyLabel(b.key), short: -b.short, over: b.over }));

  return (
    <div className="space-y-4">
      {filters}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Figure label="Shifts" value={t.shifts} hint={t.open ? `${t.open} abhi khuli · ausat ${hoursText(t.avgHours)}` : `Ausat ${hoursText(t.avgHours)} ki shift`} />
        <Figure label="Galla kam nikla" value={t.shortCount ? `−${money(t.short)}` : '—'} tone={t.shortCount ? 'bad' : undefined} hint={`${t.shortCount} shift me`} />
        <Figure label="Galla zyada nikla" value={t.overCount ? `+${money(t.over)}` : '—'} tone={t.overCount ? 'warn' : undefined} hint={`${t.overCount} shift me`} />
        <Figure label="Barabar band hui" value={t.closed ? pct(t.matchedPct) : '—'} tone={t.matchedPct >= 90 ? 'good' : undefined}
          hint={t.closedByOther ? `${t.closedByOther} shift kisi aur ne band ki` : 'Band shifts me se'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={TrendingDown} title="Din war farq" className="lg:col-span-2" hint="Neeche laal = galla kam, upar peela = zyada. Khali din = sab barabar">
          {!days.some((x) => x.short || x.over) ? <Empty text="Kisi din galla kam ya zyada nahi nikla" /> : (
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={days} stackOffset="sign" margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="label" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                  <ReferenceLine y={0} stroke={theme.axis.fill} />
                  <Tooltip {...theme.tooltip} formatter={(v, n) => [formatPKR(Math.abs(Number(v))), n === 'short' ? 'Kam' : 'Zyada']} />
                  <Bar dataKey="short" stackId="d" fill="#e11d48" radius={[0, 0, 4, 4]} barSize={14} />
                  <Bar dataKey="over" stackId="d" fill="#d97706" radius={[4, 4, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel icon={UserRound} title="Banda war galla" hint="Jis ne shift kholi us ke naam">
          {!d.byStaff.length ? <Empty text="Koi shift nahi" /> : (
            <ul className="divide-y divide-slate-100">
              {d.byStaff.map((b) => (
                <li key={b.key}>
                  <button type="button" onClick={() => { setStaffId(staffId === b.key ? '' : b.key); setPage(1); }}
                    className={cn('flex w-full items-center justify-between gap-2 py-2 text-left text-[0.8125rem] hover:text-brand-700', staffId === b.key && 'text-brand-700')}>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{b.label}</span>
                      <span className="text-[0.75rem] text-slate-500">{b.shifts} shift · ausat {hoursText(b.avgHours)} · {pct(b.matchedPct)} barabar</span>
                    </span>
                    <span className={cn('shrink-0 font-semibold tabular-nums', b.net < -0.5 ? 'text-rose-700' : b.net > 0.5 ? 'text-amber-700' : 'text-emerald-700')}>
                      {Math.abs(b.net) < 0.5 ? 'Theek' : `${b.net > 0 ? '+' : '−'}${money(Math.abs(b.net))}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {multiBranch && d.byShop.length > 1 && (
        <Panel icon={Building2} title="Branch war galla" hint="Har branch ki shifts aur farq">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {d.byShop.map((b) => (
              <div key={b.key} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="font-semibold text-slate-900">{b.label}</p>
                <p className="mt-0.5 text-[0.75rem] text-slate-500">{b.shifts} shift · cash sale {money(b.cashSales)}</p>
                <p className="mt-1 text-[0.8125rem]">
                  <span className="text-rose-700">−{money(b.short)}</span> · <span className="text-amber-700">+{money(b.over)}</span>
                  <span className="text-slate-500"> · {pct(b.matchedPct)} barabar</span>
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <h2 className="flex items-center gap-2 text-[0.875rem] font-semibold text-slate-900"><Vault className="h-4 w-4 text-brand-600" />Shifts <span className="font-normal text-slate-500">· {d.count}</span></h2>
          {d.capped && <span className="text-[0.75rem] text-amber-700">Upar ke number pehli 5000 shifts ke hain</span>}
        </header>
        {!d.items.length ? <Empty text={status || staffId ? 'Is filter me koi shift nahi' : 'Is period me galla nahi khula'} /> : (
          <ul className="divide-y divide-slate-100">
            {d.items.map((s) => <ShiftItem key={s.id} s={s} money={money} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} />)}
          </ul>
        )}
      </section>

      {d.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {d.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= d.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}
    </div>
  );
}

function ShiftItem({ s, money, open, onToggle }: { s: ShiftRow; money: (n: number) => string; open: boolean; onToggle: () => void }) {
  const diff = s.difference ?? 0;
  const badge = s.live
    ? { text: 'Abhi khuli', cls: 'bg-sky-50 text-sky-700 ring-sky-200' }
    : diff < -0.5 ? { text: `Kam ${money(-diff)}`, cls: 'bg-rose-50 text-rose-700 ring-rose-200' }
      : diff > 0.5 ? { text: `Zyada ${money(diff)}`, cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
        : { text: 'Barabar', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/70 sm:flex-nowrap">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1', s.live ? 'bg-sky-50 text-sky-600 ring-sky-100' : 'bg-slate-50 text-slate-500 ring-slate-100')}>
          {s.live ? <Clock className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{s.openedBy.fullName}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1', badge.cls)}>{badge.text}</span>
            {s.closedByOther && <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[0.6875rem] font-medium text-violet-700 ring-1 ring-violet-200"><ArrowRightLeft className="h-3 w-3" />{s.closedBy?.fullName} ne band ki</span>}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">
            <span className="font-mono">{s.number}</span> · {when(s.openedAt)}{s.closedAt ? ` — ${when(s.closedAt)}` : ''}{s.hours != null ? ` · ${hoursText(s.hours)}` : ''}{s.shop ? ` · ${s.shop.name}` : ''}
          </span>
        </span>
        <span className="ml-auto text-right">
          <span className="block text-[0.6875rem] text-slate-500">{s.live ? 'Abhi hona chahiye' : 'Hisab / gina'}</span>
          <span className="block font-semibold tabular-nums text-slate-900">{money(s.expected)}{s.counted != null && <span className="text-slate-400"> / {money(s.counted)}</span>}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-2 bg-slate-50/60 px-4 pb-4 pt-1 sm:grid-cols-4">
          <Figure label="Shuru ka cash" value={money(s.opening)} />
          <Figure label="Cash sale" value={money(s.cashSales)} hint={`${s.bills} bill · kul ${money(s.billTotal)}`} />
          <Figure label="Cash daala" value={money(s.cashIn)} hint={`${s.cashInCount} dafa`} />
          <Figure label="Cash nikala" value={money(s.cashOut)} hint={`${s.cashOutCount} dafa`} />
          <Figure label="Expenses (galle se)" value={money(s.expenses)} />
          <Figure label="Return (galle se)" value={money(s.refunds)} />
          <Figure label={<span className="inline-flex items-center gap-1"><LogIn className="h-3 w-3" />Kholi</span>} value={s.openedBy.fullName} hint={when(s.openedAt)} />
          <Figure label={<span className="inline-flex items-center gap-1"><LogOut className="h-3 w-3" />Band ki</span>} value={s.closedBy?.fullName ?? '—'} hint={s.closedAt ? when(s.closedAt) : 'Abhi khuli hai'} />
          {s.notes && <p className="col-span-2 rounded-xl bg-white px-3 py-2 text-[0.8125rem] text-slate-600 ring-1 ring-slate-100 sm:col-span-4">Note: {s.notes}</p>}
        </div>
      )}
    </li>
  );
}
