/**
 * Cash flow for the same period, read from the shop accounts ledger: money
 * in and out by day or month, by source and by account, and why the cash
 * left over differs from the net profit.
 */

import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, ExternalLink, Landmark, Scale, Waves } from 'lucide-react';
import { Card } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { MoneyAnalytics } from '@modules/finance/money/api/money.api';
import { SOURCES } from '@modules/finance/money/components/meta';
import type { PnlReport } from '../api';
import { monthLabel } from '../meta';
import { Empty, type Fmt } from './parts';

export function CashFlowView({ cash, report, fmt }: { cash: MoneyAnalytics; report: PnlReport; fmt: Fmt }) {
  const theme = useChartTheme();
  const src = (id: string) => cash.bySource.find((s) => s.source === id)?.amount ?? 0;
  const s = report.current;
  const label = (k: string) => (cash.grouping === 'month' ? monthLabel(k) : new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }));
  const ins = cash.bySource.filter((x) => x.direction === 'in' && x.amount > 0);
  const outs = cash.bySource.filter((x) => x.direction === 'out' && x.amount > 0);
  const maxSrc = Math.max(1, ...cash.bySource.map((x) => x.amount));

  // Net profit to cash left over: each step is a reason the two differ.
  const steps = s.netProfit == null || fmt.costHidden ? [] : [
    { label: 'Udhaar par biki', hint: 'Bikri me gini, paisa abhi aana hai', value: -s.revenue.credit },
    { label: 'Khata wasooli', hint: 'Purana udhaar is muddat me aaya', value: src('KHATA') },
    { label: 'Maal ki lagat', hint: 'Munafe se kati, magar paisa kharidari par pehle gaya', value: s.cogs?.total ?? 0 },
    { label: 'Kharidari aur supplier ko diya', hint: 'Naya maal liya ya purana dena chukaya', value: -(src('PURCHASE') + src('SUPPLIER')) },
    { label: 'Stock nuqsan', hint: 'Munafe se kata, cash nahi gaya', value: s.writeOffs?.net ?? 0 },
    { label: 'Cash daala / nikala', hint: 'Malik ne golak me daala ya nikala', value: src('CASH_IN') - src('CASH_OUT') },
  ];
  const explained = (s.netProfit ?? 0) + steps.reduce((a, x) => a + x.value, 0);
  const rest = cash.totals.net - explained;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile icon={ArrowDownLeft} color="#16a34a" label="Paisa aaya" value={fmt.sales(cash.totals.in)} hint="Bikri, khata wasooli, cash daala" />
        <Tile icon={ArrowUpRight} color="#e11d48" label="Paisa gaya" value={fmt.sales(cash.totals.out)} hint="Wapsi, kharidari, supplier, kharchay" />
        <Tile icon={Scale} color={cash.totals.net >= 0 ? '#2563eb' : '#e11d48'} label="Bacha (cash)" value={fmt.sales(cash.totals.net)} hint={`Net munafa ${s.netProfit == null ? '—' : fmt.cost(s.netProfit)}`} />
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Waves className="h-4 w-4 text-brand-600" />Paisa aaya aur gaya</span>} description={cash.grouping === 'month' ? 'Mahine war' : 'Din war'}
        actions={<Link to="/money" className="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-brand-700 hover:underline">Shop accounts <ExternalLink className="h-3.5 w-3.5" /></Link>}>
        {!cash.trend.length ? <Empty text="Is muddat me koi len den nahi" /> : (
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cash.trend.map((t) => ({ ...t, name: label(t.key) }))} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnl-in" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a34a" stopOpacity={0.25} /><stop offset="100%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                  <linearGradient id="pnl-out" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e11d48" stopOpacity={0.2} /><stop offset="100%" stopColor="#e11d48" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={12} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
                <Tooltip formatter={(v, n) => [formatPKR(Number(v)), n === 'in' ? 'Aaya' : 'Gaya']} {...theme.tooltip} />
                <Legend formatter={(v) => (v === 'in' ? 'Aaya' : 'Gaya')} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="in" stroke="#16a34a" strokeWidth={2} fill="url(#pnl-in)" />
                <Area type="monotone" dataKey="out" stroke="#e11d48" strokeWidth={2} fill="url(#pnl-out)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title="Kahan se aaya, kahan gaya" description="Har len den apne asal record se — bill, wapsi, kharidari, kharcha">
          <div className="grid gap-6 sm:grid-cols-2">
            {[{ title: 'Aaya', rows: ins }, { title: 'Gaya', rows: outs }].map((g) => (
              <div key={g.title}>
                <p className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-slate-500">{g.title}</p>
                {!g.rows.length ? <p className="text-[0.8125rem] text-slate-400">Kuch nahi</p> : (
                  <ul className="space-y-2.5">
                    {g.rows.map((x) => {
                      const m = SOURCES[x.source];
                      return (
                        <li key={x.source}>
                          <div className="flex justify-between gap-2 text-[0.8125rem]">
                            <span className="flex items-center gap-1.5 font-medium text-slate-800"><m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />{m.label}</span>
                            <span className="tabular-nums text-slate-900">{fmt.sales(x.amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(x.amount / maxSrc) * 100}%`, background: m.color }} /></div>
                          <p className="mt-0.5 text-[0.6875rem] text-slate-500">{x.count} entries · {m.hint}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Landmark className="h-4 w-4 text-brand-600" />Accounts</span>} description="Har tareeqe se kitna aaya aur gaya">
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            {cash.byAccount.filter((a) => a.in || a.out).map((a) => (
              <li key={a.method} className="flex items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: PAYMENT_COLORS[a.method] ?? '#64748b' }} />{PAYMENT_LABELS[a.method] ?? a.method}</span>
                <span className="text-right tabular-nums">
                  <span className={cn('block font-semibold', a.net < 0 ? 'text-rose-600' : 'text-slate-900')}>{fmt.sales(a.net)}</span>
                  <span className="text-[0.6875rem] text-slate-500">+{fmt.sales(a.in)} / −{fmt.sales(a.out)}</span>
                </span>
              </li>
            ))}
            {!cash.byAccount.some((a) => a.in || a.out) && <li className="py-6 text-center text-slate-400">Kuch nahi</li>}
          </ul>
        </Card>
      </div>

      {steps.length > 0 && (
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Scale className="h-4 w-4 text-brand-600" />Munafa aur cash me farq kyun?</span>}
          description="Munafa kamai ka hisaab hai, cash jeb ka. Ye cheezein dono ko alag karti hain">
          <ul className="divide-y divide-slate-100 text-[0.8125rem]">
            <Step money={fmt.sales} label="Net munafa (bayan se)" value={s.netProfit ?? 0} strong />
            {steps.filter((x) => Math.abs(x.value) >= 0.5).map((x) => <Step money={fmt.sales} key={x.label} label={x.label} hint={x.hint} value={x.value} />)}
            {Math.abs(rest) >= 0.5 && <Step money={fmt.sales} label="Baqi farq" hint="Tankhwah/commission jo kharch me gini, booking advance, durusti waghera" value={rest} />}
            <Step money={fmt.sales} label="Bacha (cash)" value={cash.totals.net} strong />
          </ul>
        </Card>
      )}
    </div>
  );
}

function Tile({ icon: Icon, color, label, value, hint }: { icon: typeof Scale; color: string; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}17`, color }}><Icon className="h-4 w-4" /></span><span className="text-[0.8125rem] text-slate-500">{label}</span></div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</p>
    </div>
  );
}

function Step({ money, label, hint, value, strong }: { money: Fmt['sales']; label: string; hint?: string; value: number; strong?: boolean }) {
  return (
    <li className={cn('flex items-center justify-between gap-3 py-2', strong && 'font-semibold')}>
      <span className="min-w-0">{label}{hint && <span className="block text-[0.6875rem] font-normal text-slate-500">{hint}</span>}</span>
      <span className={cn('shrink-0 tabular-nums', !strong && (value >= 0 ? 'text-emerald-700' : 'text-rose-600'))}>{!strong && value >= 0 ? '+' : ''}{money(value)}</span>
    </li>
  );
}
