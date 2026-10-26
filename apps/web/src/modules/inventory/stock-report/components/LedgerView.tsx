/**
 * Stock for a period from the stock ledger: opening stock on the first day,
 * what came in and went out by kind, closing stock on the last day (the
 * stock on any past date), and the stock value at the end of each day.
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, Info, PackageOpen } from 'lucide-react';
import { Button, Card, Segmented, Skeleton, Table, THead, TBody, Tr, Th, Td } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { STOCK_KEY, stockAnalysisApi, type LedgerSort, type StockQuery } from '../api/stock-report.api';
import { KINDS, dateText, qty } from './meta';

export const LEDGER_SORTS: Array<{ value: LedgerSort; label: string }> = [
  { value: 'closing', label: 'Qeemti pehle' },
  { value: 'change', label: 'Zyada farq' },
  { value: 'in', label: 'Zyada aaya' },
  { value: 'out', label: 'Zyada gaya' },
  { value: 'name', label: 'Naam' },
];

export function LedgerView({ q, show, setShow, sort, money, cost, costHidden, onOpen }: {
  q: StockQuery;
  show: 'all' | 'moved';
  setShow: (v: 'all' | 'moved') => void;
  sort: LedgerSort;
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  onOpen: (productId: string) => void;
}) {
  const theme = useChartTheme();
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q, show, sort]);
  const lq = useQuery({
    queryKey: [STOCK_KEY, 'ledger', q, show, sort, page],
    queryFn: () => stockAnalysisApi.ledger({ ...q, show, sort, page, limit: 50 }),
    placeholderData: (prev) => prev,
  });
  const d = lq.data;
  if (lq.isLoading || !d) return <div className="space-y-3"><Skeleton className="h-64 rounded-3xl" /><Skeleton className="h-96 rounded-3xl" /></div>;
  const t = d.totals;
  const val = (v: { cost: number; retail: number }) => (costHidden ? money(v.retail) : cost(v.cost));
  const ins = KINDS.filter((k) => k.dir === 'in').map((k) => ({ k, v: t.kinds.find((x) => x.key === k.key) })).filter((x) => x.v);
  const outs = KINDS.filter((k) => k.dir === 'out').map((k) => ({ k, v: t.kinds.find((x) => x.key === k.key) })).filter((x) => x.v);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Box label={`Shuru me · ${dateText(`${d.period.from}T12:00:00`)}`} value={val(t.opening)} hint={`${qty(t.opening.units)} units`} />
        <Box label="Aaya" value={qty(ins.reduce((a, x) => a + x.v!.qty, 0))} hint={costHidden ? 'units' : cost(ins.reduce((a, x) => a + x.v!.cost, 0))} tone="in" />
        <Box label="Gaya" value={qty(-outs.reduce((a, x) => a + x.v!.qty, 0))} hint={costHidden ? 'units' : cost(-outs.reduce((a, x) => a + x.v!.cost, 0))} tone="out" />
        <Box label={`Aakhir me · ${dateText(`${d.period.to}T12:00:00`)}`} value={val(t.closing)} hint={`${qty(t.closing.units)} units`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title="Har din ke aakhir me stock" description={costHidden ? 'Bechne ki qeemat par' : 'Cost par (aaj ki ausat cost)'}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.trend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="stock-trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.primary} stopOpacity={0.3} /><stop offset="100%" stopColor={theme.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={theme.grid} vertical={false} />
                <XAxis dataKey="key" tick={theme.axis} axisLine={false} tickLine={false} minTickGap={16} tickFormatter={(k: string) => new Date(`${k}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} />
                <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={axisMoney} width={48} domain={['auto', 'auto']} />
                <Tooltip labelFormatter={(k) => dateText(`${k}T12:00:00`)} formatter={(v, _n, p) => [`${formatPKR(Number(v))} · ${qty((p as { payload?: { units?: number } }).payload?.units ?? 0)} units`, 'Stock']} {...theme.tooltip} />
                <Area type="monotone" dataKey={costHidden ? 'retail' : 'cost'} stroke={theme.primary} strokeWidth={2.25} fill="url(#stock-trend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="rounded-2xl" title="Kya aaya, kya gaya" description="Is period me">
          {!ins.length && !outs.length ? <p className="py-10 text-center text-[0.875rem] text-slate-500">Koi harkat nahi</p> : (
            <ul className="space-y-1.5 text-[0.8125rem]">
              {[...ins, ...outs].map(({ k, v }) => (
                <li key={k.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-slate-700">{k.dir === 'in' ? <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" /> : <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />}{k.label}</span>
                  <span className="tabular-nums text-slate-900">{qty(Math.abs(v!.qty))}{!costHidden && <span className="text-slate-400"> · {cost(Math.abs(v!.cost))}</span>}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h3 className="text-[0.875rem] font-semibold text-slate-900">Cheez war hisaab · {d.total}</h3>
          <Segmented label="Kaunsi cheezein" value={show} onChange={setShow} items={[{ value: 'all', label: 'Sab' }, { value: 'moved', label: `Jin me harkat (${t.moved})` }]} />
        </header>
        {!d.items.length ? (
          <div className="flex flex-col items-center px-6 py-14 text-center"><PackageOpen className="h-8 w-8 text-slate-300" /><p className="mt-2 text-[0.875rem] text-slate-500">Is period me kuch nahi</p></div>
        ) : (
          <div className="overflow-x-auto">
            <Table minWidth="44rem" className="[&>table]:text-[0.8125rem]">
              <THead className="bg-slate-50/70 text-left text-[0.6875rem] uppercase tracking-wide text-slate-500">
                <Tr><Th className="px-4 py-2">Cheez</Th><Th className="px-2 py-2 text-right">Shuru</Th><Th className="px-2 py-2 text-right">Aaya</Th><Th className="px-2 py-2 text-right">Bika</Th><Th className="px-2 py-2 text-right">Baqi gaya</Th><Th className="px-2 py-2 text-right">Aakhir</Th><Th className="px-4 py-2 text-right">{costHidden ? 'Bechne par' : 'Cost'}</Th></Tr>
              </THead>
              <TBody className="divide-y divide-slate-100">
                {d.items.map((x) => {
                  const sold = -(x.kinds.sale ?? 0);
                  return (
                    <Tr key={x.productId} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpen(x.productId)}>
                      <Td className="text-inherit px-4 py-2"><span className="font-medium text-slate-900">{x.name}</span>{x.category && <span className="block text-[0.6875rem] text-slate-500">{x.category.name}</span>}</Td>
                      <Td className="px-2 py-2 text-right tabular-nums text-slate-600">{qty(x.opening)}</Td>
                      <Td className="px-2 py-2 text-right tabular-nums text-emerald-700">{x.inQty ? `+${qty(x.inQty)}` : '—'}</Td>
                      <Td className="px-2 py-2 text-right tabular-nums text-slate-800">{sold ? qty(sold) : '—'}</Td>
                      <Td className="px-2 py-2 text-right tabular-nums text-rose-700">{x.outQty - sold > 0 ? `−${qty(x.outQty - sold)}` : '—'}</Td>
                      <Td className={cn('px-2 py-2 text-right font-semibold tabular-nums', x.closing < 0 ? 'text-rose-700' : 'text-slate-900')}>{qty(x.closing)} <span className="font-normal text-slate-500">{x.unit}</span></Td>
                      <Td className="text-inherit px-4 py-2 text-right tabular-nums">{val(x.closingValue)}</Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </section>

      {d.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {d.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= d.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-[0.75rem] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        Aaj ke stock se peeche ginti: aakhri din ke baad ki harkat hata kar "aakhir", phir period ki harkat hata kar "shuru". Qeemat aaj ki ausat cost par. Purani harkat jis par branch nahi likhi woh main branch me gini gayi.
        {d.skipped.carpet > 0 && ` ${d.skipped.carpet} carpet cheezein yahan nahi — un ka hisaab rolls se hota hai.`}
      </p>
    </div>
  );
}

function Box({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'in' | 'out' }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="truncate text-[0.8125rem] text-slate-500">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', tone === 'in' ? 'text-emerald-700' : tone === 'out' ? 'text-rose-700' : 'text-slate-900')}>{value}</p>
      {hint && <p className="mt-0.5 text-[0.75rem] text-slate-500">{hint}</p>}
    </div>
  );
}
