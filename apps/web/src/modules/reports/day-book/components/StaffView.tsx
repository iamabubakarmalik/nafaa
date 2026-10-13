/**
 * Staff tab: sales per person (bills, average, discount given, udhaar,
 * profit, voids, returns) and each cashier's counter result. A row opens
 * that person's bills for the day.
 */

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LockKeyhole, UserRound } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { DayBook } from '../api';
import { clock, diffLabel, type Money } from '../print';
import { Empty, Panel, Tag, TableWrap, td, tdR, th, thR } from './parts';

const ROLE: Record<string, string> = { OWNER: 'Maalik', MANAGER: 'Manager', CASHIER: 'Cashier', STAFF: 'Staff', SUPER_ADMIN: 'Admin' };

export function StaffView({ d, m, q, onStaff }: { d: DayBook; m: Money; q: string; onStaff: (id: string, name: string) => void }) {
  const theme = useChartTheme();
  const staff = d.staff.filter((s) => !q || s.name.toLowerCase().includes(q));
  const total = d.staff.reduce((a, s) => a + s.total, 0);
  const counters = new Map<string, { name: string; shifts: number; expected: number; difference: number; closed: number; open: number }>();
  const registers = d.drawer?.registers ?? [];
  for (const r of registers) {
    const name = r.closedBy ?? r.openedBy;
    const c = counters.get(name) ?? { name, shifts: 0, expected: 0, difference: 0, closed: 0, open: 0 };
    c.shifts += 1; c.expected += r.expected;
    if (r.difference != null) { c.difference += r.difference; c.closed += 1; } else c.open += 1;
    counters.set(name, c);
  }

  return (
    <div className="space-y-4">
      {d.staff.length > 1 && (
        <Panel icon={UserRound} title="Sale ka hissa" hint="Har bande ki sale (void ke bagair)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.staff.map((s) => ({ name: s.name, total: s.total }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} tickFormatter={(v: string) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip {...theme.tooltip} formatter={(v) => [m.sales(Number(v)), 'Sale']} />
                <Bar dataKey="total" fill={theme.primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      <Panel icon={UserRound} title="Staff war sale" hint="Bill us ke naam jis ne becha; khali ho to jis ne counter par banaya. Row par dabayein: us ke bill." flush>
        <div className="px-4 pb-4 sm:px-5">
          {!staff.length ? <Empty icon={UserRound} text={q ? 'Koi naam nahi mila' : 'Is din koi bill nahi bana'} /> : (
            <TableWrap minWidth="46rem">
              <thead><tr>
                <th className={th}>Naam</th><th className={thR}>Bill</th><th className={thR}>Sale</th><th className={thR}>Hissa</th><th className={thR}>Ausat bill</th>
                <th className={thR}>Discount</th><th className={thR}>Udhaar</th>{!m.costHidden && <th className={thR}>Profit</th>}<th className={thR}>Void</th><th className={thR}>Return</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((s) => (
                  <tr key={s.userId} onClick={() => onStaff(s.userId, s.name)} className="cursor-pointer hover:bg-slate-50/70">
                    <td className={td}><span className="font-medium text-slate-900">{s.name}</span>{s.role && <span className="block text-[0.6875rem] text-slate-500">{ROLE[s.role] ?? s.role}</span>}</td>
                    <td className={tdR}>{s.bills}</td>
                    <td className={`${tdR} font-semibold text-slate-900`}>{m.sales(s.total)}</td>
                    <td className={tdR}>{total ? `${((s.total / total) * 100).toFixed(0)}%` : '—'}</td>
                    <td className={tdR}>{m.sales(s.avgBill)}</td>
                    <td className={tdR}>{s.discount ? m.sales(s.discount) : '—'}</td>
                    <td className={tdR}>{s.credit ? m.sales(s.credit) : '—'}</td>
                    {!m.costHidden && <td className={tdR}>{m.cost(s.profit)}</td>}
                    <td className={tdR}>{s.voids ? <Tag tone="rose">{s.voids}</Tag> : '—'}</td>
                    <td className={tdR}>{s.returns ? <span title={m.sales(s.returnAmount)}>{s.returns}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      </Panel>

      <Panel icon={LockKeyhole} title="Counter (cashier) war" hint="Kis ne register chalaya aur ginti me kitna farq aaya. Farq = gina hua − hona chahiye.">
        {!counters.size ? <Empty icon={LockKeyhole} text="Is din koi register nahi chala" /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...counters.values()].map((c) => (
              <div key={c.name} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[0.875rem] font-semibold text-slate-900">{c.name}</span>
                  {c.open ? <Tag tone="amber">{c.open} khula</Tag> : <Tag tone="green">Band</Tag>}
                </div>
                <p className="mt-1 text-[0.75rem] text-slate-500">{c.shifts} shift · hona chahiye {m.sales(c.expected)}</p>
                {c.closed > 0 && (
                  <p className={cn('mt-1 text-[0.8125rem] font-semibold tabular-nums', c.difference === 0 ? 'text-success-700' : c.difference < 0 ? 'text-rose-700' : 'text-amber-700')}>
                    Farq: {m.sales(c.difference)} · {diffLabel(c.difference)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        {registers.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 text-[0.75rem] text-slate-500">
            {registers.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                <span>{r.number} · khola {r.openedBy} {clock(r.openedAt)}{r.closedBy ? ` · band ${r.closedBy} ${clock(r.closedAt)}` : ''}</span>
                <span className="tabular-nums">{r.difference == null ? 'khula' : m.sales(r.difference)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
