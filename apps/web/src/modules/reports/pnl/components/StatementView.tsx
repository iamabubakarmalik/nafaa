/**
 * The statement for the period: every line with its share of net sales, the
 * comparison period and the change, a bridge from sales to net profit, notes
 * on estimated cost, and the channel and category breakdown.
 */

import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ChevronRight, ExternalLink, Layers, Route, Waypoints } from 'lucide-react';
import { Card, Table, TBody, Td, Th, THead, Tr } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { PnlReport, PnlStatement } from '../api';
import { CHANNELS, PART_COLORS, change, pctText, type PnlLine } from '../meta';
import { lineText, statementNotes } from '../print';
import { Empty, type Fmt } from './parts';

export function StatementView({ report, lines, fmt, prevLabel, onDrill }: {
  report: PnlReport;
  lines: PnlLine[];
  fmt: Fmt;
  prevLabel: string;
  onDrill: (l: PnlLine) => void;
}) {
  const notes = statementNotes(report);
  return (
    <div className="space-y-4">
      {!report.costVisible && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.8125rem] font-medium text-amber-900 ring-1 ring-amber-100">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Aap ko cost dekhne ki permission nahi, is liye profit aur stock nuqsan khali hain. Malik se "Cost dekhna" ki permission lein.
        </p>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <StatementTable report={report} lines={lines} fmt={fmt} prevLabel={prevLabel} onDrill={onDrill} />
        <div className="space-y-4">
          <Bridge s={report.current} fmt={fmt} />
          {notes.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-[0.8125rem] text-amber-900 ring-1 ring-amber-100">
              <p className="mb-1.5 flex items-center gap-1.5 font-semibold"><AlertTriangle className="h-4 w-4" /> Dhyan dein</p>
              <ul className="space-y-1.5 leading-relaxed">{notes.map((x) => <li key={x}>• {x}</li>)}</ul>
              {report.current.cogs && report.current.cogs.unknownLines > 0 && (
                <Link to="/products" className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-900 underline">Products par cost likhein <ChevronRight className="h-3.5 w-3.5" /></Link>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Channels report={report} fmt={fmt} />
        <Categories report={report} fmt={fmt} />
      </div>
    </div>
  );
}

function StatementTable({ report, lines, fmt, prevLabel, onDrill }: { report: PnlReport; lines: PnlLine[]; fmt: Fmt; prevLabel: string; onDrill: (l: PnlLine) => void }) {
  const net = report.current.revenue.net;
  const show = (l: PnlLine, s: PnlStatement) => {
    const v = l.value(s);
    if (l.cost && fmt.costHidden) return fmt.cost(0);
    return lineText(l, v);
  };
  return (
    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <Table className="[&_table]:text-[0.875rem]">
        <THead>
          <Tr>
            <Th className="px-4 py-2.5 text-left sm:px-5">Details</Th>
            <Th className="px-3 py-2.5 text-right">Is period</Th>
            <Th className="hidden px-3 py-2.5 text-right md:table-cell" title="Net sale ka kitna hissa">% sale</Th>
            <Th className="hidden px-3 py-2.5 text-right sm:table-cell">{prevLabel}</Th>
            <Th className="px-3 py-2.5 text-right sm:pr-5">Farq</Th>
          </Tr>
        </THead>
        <TBody className="divide-y-0">
          {lines.map((l) => {
            if (l.kind === 'head') {
              return <Tr key={l.id}><Td colSpan={5} className="px-4 pb-1.5 pt-4 text-[0.75rem] font-bold uppercase tracking-wide text-slate-500 sm:px-5">{l.label}</Td></Tr>;
            }
            const v = l.value(report.current);
            const before = l.value(report.previous);
            const ch = l.cost && fmt.costHidden ? null : change(v, before);
            const good = ch == null || l.upIsGood == null ? null : (ch >= 0) === l.upIsGood;
            const share = l.kind === 'ratio' || v == null || Math.abs(net) < 0.005 || (l.cost && fmt.costHidden) ? '' : `${((v / net) * 100).toFixed(1)}%`;
            const negative = (l.kind === 'grand' || l.id === 'operating') && v != null && v < 0;
            const clickable = !!l.drill && !(l.drill.kind === 'writeoff' && !report.costVisible);
            return (
              <Tr key={l.id} className={cn(
                'group',
                l.kind === 'total' && 'border-t border-slate-200 font-semibold',
                l.kind === 'grand' && (negative ? 'bg-rose-50/70 font-bold' : 'bg-brand-50/60 font-bold'),
                l.kind === 'sub' && 'text-[0.8125rem] text-slate-500',
                clickable && 'cursor-pointer hover:bg-slate-50',
              )} onClick={clickable ? () => onDrill(l) : undefined}>
                <Td className={cn('px-4 py-2 text-inherit sm:px-5', l.kind === 'sub' && 'pl-8 sm:pl-10')}>
                  <span className="inline-flex items-center gap-1.5">
                    {l.minus && <span className="text-slate-400">−</span>}
                    <span className={cn(l.kind === 'ratio' && 'italic text-slate-600')}>{l.label}</span>
                    {clickable && <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-600" />}
                    {l.to && <Link to={l.to} onClick={(e) => e.stopPropagation()} title="Page kholein" className="text-slate-300 hover:text-brand-600"><ExternalLink className="h-3.5 w-3.5" /></Link>}
                  </span>
                  {l.hint && l.kind !== 'sub' && <span className="block text-[0.6875rem] font-normal text-slate-400">{l.hint}</span>}
                </Td>
                <Td className={cn('whitespace-nowrap px-3 py-2 text-right tabular-nums', negative ? 'text-rose-700' : 'text-slate-900')}>{show(l, report.current)}</Td>
                <Td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500 md:table-cell">{share}</Td>
                <Td className="hidden whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-500 sm:table-cell">{show(l, report.previous)}</Td>
                <Td className="whitespace-nowrap px-3 py-2 text-right sm:pr-5">
                  {ch != null && Math.abs(ch) >= 0.05 && (
                    <span className={cn('inline-flex items-center gap-0.5 text-[0.75rem] font-semibold tabular-nums',
                      good == null ? 'text-slate-500' : good ? 'text-success-600' : 'text-rose-600')}>
                      {ch >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(ch) > 999 ? '999+' : Math.abs(ch).toFixed(0)}%
                    </span>
                  )}
                </Td>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </section>
  );
}

/** Sales down to net profit as a waterfall; plain bars when a step goes below zero. */
function Bridge({ s, fmt }: { s: PnlStatement; fmt: Fmt }) {
  const theme = useChartTheme();
  if (fmt.costHidden || s.netProfit == null) return null;
  const steps = [
    { name: 'Net sale', delta: s.revenue.net, color: PART_COLORS.revenue, total: true },
    { name: 'Cost', delta: -(s.cogs?.total ?? 0), color: PART_COLORS.cogs },
    { name: 'Kharchay', delta: -s.expenses.total, color: PART_COLORS.expenses },
    { name: 'Stock', delta: -(s.writeOffs?.net ?? 0), color: PART_COLORS.writeOffs },
    { name: 'Aamdani', delta: s.otherIncome.total, color: PART_COLORS.other },
  ].filter((x) => x.total || Math.abs(x.delta) >= 0.005);
  let run = 0;
  let below = false;
  const data = steps.map((x) => {
    const start = x.total ? 0 : run;
    run = x.total ? x.delta : run + x.delta;
    if (run < 0) below = true;
    return { name: x.name, base: Math.min(start, run), value: Math.abs(x.delta), color: x.color, raw: x.delta };
  });
  const net = s.netProfit;
  data.push({ name: 'Net profit', base: 0, value: Math.abs(net), color: net >= 0 ? PART_COLORS.profit : PART_COLORS.loss, raw: net });
  const chart = below ? data.map((d) => ({ ...d, base: 0, value: d.raw })) : data;

  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Waypoints className="h-4 w-4 text-brand-600" />Sale se profit tak</span>} description="Har 100 rupay ki sale me se kahan kitna gaya">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
            <CartesianGrid stroke={theme.grid} vertical={false} />
            <XAxis dataKey="name" tick={{ ...theme.axis, fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={44} />
            <Tooltip formatter={(_v, _n, p) => [formatPKR((p as { payload?: { raw?: number } }).payload?.raw ?? 0), 'Amount']} {...theme.tooltip} />
            {!below && <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />}
            <Bar dataKey="value" stackId={below ? undefined : 'w'} radius={[4, 4, 0, 0]} barSize={30}>
              {chart.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {s.revenue.net > 0 && (
        <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[0.75rem] text-slate-600">
          {steps.slice(1).map((x) => (
            <li key={x.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: x.color }} />{x.name}</span>
              <span className="tabular-nums text-slate-900">{pctText((Math.abs(x.delta) / s.revenue.net) * 100)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 font-semibold">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: net >= 0 ? PART_COLORS.profit : PART_COLORS.loss }} />Bacha</span>
            <span className="tabular-nums text-slate-900">{pctText(s.netMargin)}</span>
          </li>
        </ul>
      )}
    </Card>
  );
}

function Channels({ report, fmt }: { report: PnlReport; fmt: Fmt }) {
  const total = report.channels.reduce((a, c) => a + c.net, 0);
  return (
    <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-brand-600" />Sale ke raaste</span>} description="Counter, website, Daraz, Foodpanda… har raaste ki kamai aur profit">
      {!report.channels.length ? <Empty text="Is period me koi sale nahi" /> : (
        <ul className="space-y-3">
          {report.channels.map((c) => {
            const meta = CHANNELS[c.source] ?? { label: c.source, color: '#64748b' };
            const share = total > 0 ? (c.net / total) * 100 : 0;
            return (
              <li key={c.source}>
                <div className="flex justify-between gap-2 text-[0.8125rem]">
                  <span className="font-medium text-slate-800">{meta.label} <span className="font-normal text-slate-400">· {c.bills} bill</span></span>
                  <span className="tabular-nums text-slate-900">{fmt.sales(c.net)} <span className="text-slate-400">· {share.toFixed(0)}%</span></span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${Math.max(share, 1)}%`, background: meta.color }} /></div>
                <p className="mt-0.5 text-[0.6875rem] text-slate-500">
                  {c.returns > 0 && `Return ${fmt.sales(c.returns)} · `}Profit {c.profit == null ? '—' : fmt.cost(c.profit)}{c.margin != null && !fmt.costHidden && ` (${pctText(c.margin)})`}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Categories({ report, fmt }: { report: PnlReport; fmt: Fmt }) {
  const top = report.categories.slice(0, 10);
  return (
    <Card className="rounded-2xl" flush title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" />Category war profit</span>}
      description="Item ki sale (bill discount ke baad) minus return">
      {!top.length ? <div className="px-5 pb-5"><Empty text="Is period me koi sale nahi" /></div> : (
        <div className="px-4 pb-4 sm:px-5">
          <Table minWidth="26rem" className="[&_table]:text-[0.8125rem]">
            <THead>
              <Tr><Th className="py-2">Category</Th><Th className="py-2 text-right">Net sale</Th><Th className="py-2 text-right">Profit</Th><Th className="py-2 text-right">Margin</Th></Tr>
            </THead>
            <TBody>
              {top.map((c) => (
                <Tr key={c.id}>
                  <Td className="py-2"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} /><span className="truncate font-medium text-slate-800">{c.name}</span></span></Td>
                  <Td className="py-2 text-right tabular-nums">{fmt.sales(c.net)}</Td>
                  <Td className={cn('py-2 text-right tabular-nums', (c.profit ?? 0) < 0 && 'text-rose-600')}>{c.profit == null ? '—' : fmt.cost(c.profit)}</Td>
                  <Td className="py-2 text-right">
                    {c.margin == null || fmt.costHidden ? '—' : (
                      <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
                        c.margin < 10 ? 'bg-rose-50 text-rose-700' : c.margin < 25 ? 'bg-amber-50 text-amber-800' : 'bg-success-50 text-success-700')}>{pctText(c.margin)}</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          {report.categories.length > 10 && <p className="mt-2 text-[0.75rem] text-slate-500">+{report.categories.length - 10} aur categories — poori list print ya CSV me</p>}
        </div>
      )}
    </Card>
  );
}
