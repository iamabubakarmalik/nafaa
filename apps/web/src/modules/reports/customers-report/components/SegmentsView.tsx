/**
 * Segments tab (RFM): every customer who has bought sits in one group by how
 * recently and how often they came. Cards and the recency × frequency grid
 * show the spread; picking a group lists its people with CSV, print and a
 * WhatsApp list.
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Download, Grid3x3, Lightbulb, ListChecks, MessageCircle, PieChart as PieIcon } from 'lucide-react';
import { Button, SearchField, Segmented, Skeleton } from '@/design-system/components';
import { PrintButton } from '@core/print';
import { cn } from '@core/lib/cn';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { CUSTOMERS_REPORT_KEY, customersReportApi, type SegmentCustomer, type SegmentKey, type Segments } from '../api';
import { downloadCsv, segmentListDoc } from '../print';
import { SEGMENT_META, SEGMENT_ORDER } from './meta';
import { CustomerCell, DataTable, Empty, Panel, daysAgo, type Formatter } from './parts';
import { WhatsAppList } from './WhatsAppList';

type Sort = 'spend' | 'recent' | 'visits' | 'owing';
const R_LABELS = ['120+ din', '61–120', '31–60', '15–30', '0–14 din'];
const F_LABELS = ['1 din', '2', '3–5', '6–11', '12+ din'];

export function SegmentsView({ data: d, f, shop, shopKey, branch, selected, onSelect }: {
  data: Segments; f: Formatter; shop: string; shopKey: string | null; branch?: string; selected: SegmentKey; onSelect: (k: SegmentKey) => void;
}) {
  const theme = useChartTheme();
  const meta = SEGMENT_META[selected];
  const list = useQuery({
    queryKey: [CUSTOMERS_REPORT_KEY, 'segment', shopKey, branch ?? null, selected],
    queryFn: () => customersReportApi.segments(selected, branch),
    staleTime: 60_000,
  });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<Sort>('spend');
  const [wa, setWa] = useState(false);

  const count = (k: SegmentKey) => (k === 'never' ? d.never : d.segments.find((s) => s.key === k)?.customers ?? 0);
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const digits = term.replace(/\D/g, '');
    const all = (list.data?.rows ?? []).filter((c) => !term
      || c.name.toLowerCase().includes(term) || (c.city ?? '').toLowerCase().includes(term)
      || (digits.length >= 3 && (c.phone ?? '').replace(/\D/g, '').includes(digits)));
    const by: Record<Sort, (a: SegmentCustomer, b: SegmentCustomer) => number> = {
      spend: (a, b) => b.net - a.net,
      recent: (a, b) => (a.days ?? 1e9) - (b.days ?? 1e9),
      visits: (a, b) => b.visits - a.visits,
      owing: (a, b) => b.balance - a.balance,
    };
    return [...all].sort(by[sort]);
  }, [list.data, search, sort]);

  const chart = d.segments.map((s) => ({ name: SEGMENT_META[s.key].label, key: s.key, customers: s.customers, share: s.share }));
  const max = Math.max(1, ...d.grid.flat());
  const ctx = { f, period: '', shop, noun: 'Customers' };
  const exportCsv = () => {
    if (!rows.length) { toast.error('List khali hai'); return; }
    downloadCsv(segmentListDoc(selected, rows, ctx), `customers-${selected}.csv`);
    toast.success(`${rows.length} customers CSV me`);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {SEGMENT_ORDER.map((k) => {
          const m = SEGMENT_META[k];
          const s = d.segments.find((x) => x.key === k);
          return (
            <button key={k} type="button" onClick={() => onSelect(k)}
              className={cn('flex min-w-0 flex-col rounded-2xl bg-white p-3 text-left shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md',
                selected === k ? 'ring-2' : 'ring-slate-200/80')}
              style={selected === k ? { boxShadow: `0 0 0 2px ${m.color}` } : undefined}>
              <span className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}17`, color: m.color }}><m.icon className="h-3.5 w-3.5" /></span>
                <span className="truncate text-[0.8125rem] font-semibold text-slate-700">{m.label}</span>
              </span>
              <span className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">{count(k)}</span>
              <span className="text-[0.6875rem] leading-snug text-slate-500">
                {s ? <>{f.pct(s.share)} sale · ausat {s.avgDays} din pehle</> : 'naam likha, bill nahi'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel icon={Grid3x3} className="lg:col-span-3" title="Kab aaye × kitni dafa"
          hint="Upar wale haal hi me aaye, daayein wale saal me zyada din aaye. Khana dabayein to woh group khulega.">
          <div className="overflow-x-auto">
            <div className="inline-grid min-w-full gap-1" style={{ gridTemplateColumns: '5rem repeat(5, minmax(3rem, 1fr))' }}>
              <span />
              {F_LABELS.map((l) => <span key={l} className="text-center text-[0.625rem] font-medium text-slate-400">{l}</span>)}
              {[4, 3, 2, 1, 0].map((ri) => (
                <div key={ri} className="contents">
                  <span className="flex items-center text-[0.6875rem] font-medium text-slate-600">{R_LABELS[ri]}</span>
                  {[0, 1, 2, 3, 4].map((fi) => {
                    const v = d.grid[ri]?.[fi] ?? 0;
                    const seg = segmentOf(ri + 1, fi + 1);
                    const color = SEGMENT_META[seg].color;
                    return (
                      <button key={fi} type="button" onClick={() => onSelect(seg)} title={`${SEGMENT_META[seg].label} — ${v} customers`}
                        className={cn('flex h-11 items-center justify-center rounded-lg text-[0.75rem] font-bold tabular-nums transition hover:ring-2 hover:ring-slate-300',
                          selected === seg && 'ring-2 ring-slate-900/20')}
                        style={{ backgroundColor: `${color}${alpha(v, max)}`, color: v / max > 0.5 ? '#fff' : color }}>
                        {v || ''}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-2 text-[0.6875rem] text-slate-500">Hisaab aaj tak ka hai: aakhri dafa kab aaye, aur pichle 12 mahine me kitne alag din khareeda.</p>
        </Panel>

        <Panel icon={PieIcon} className="lg:col-span-2" title="Group war customers" hint="Kis group me kitne log — bar par hover karein to sale ka hissa">
          {d.customers === 0 ? <Empty text="Abhi kisi naam wale customer ne khareeda nahi" /> : (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} horizontal={false} />
                  <XAxis type="number" tick={theme.axis} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} width={96} />
                  <Tooltip {...theme.tooltip} formatter={(v, _n, item) => [`${v} customers · ${(item?.payload as { share: number }).share.toFixed(1)}% sale`, '']} />
                  <Bar dataKey="customers" radius={[0, 6, 6, 0]} maxBarSize={22} onClick={(x) => { const k = (x as { payload?: { key?: SegmentKey } }).payload?.key; if (k) onSelect(k); }} cursor="pointer">
                    {chart.map((c) => <Cell key={c.key} fill={SEGMENT_META[c.key].color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <Panel icon={ListChecks} flush
        title={<span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />{meta.label} · {count(selected)}</span>}
        hint={meta.rule}
        actions={<>
          <Button size="sm" variant="secondary" onClick={exportCsv} disabled={!rows.length}><Download className="h-4 w-4" />CSV</Button>
          <PrintButton size="sm" doc={() => segmentListDoc(selected, rows, ctx)} disabled={!rows.length} />
          <Button size="sm" onClick={() => setWa(true)} disabled={!rows.length}><MessageCircle className="h-4 w-4" />WhatsApp</Button>
        </>}>
        <div className="space-y-3 px-4 pb-3 sm:px-5">
          <p className="flex items-start gap-2 rounded-xl px-3 py-2 text-[0.8125rem]" style={{ backgroundColor: `${meta.color}12`, color: meta.color }}>
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /><span className="text-slate-800">{meta.action}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField value={search} onChange={setSearch} placeholder="Naam, phone ya shehar…" label="Group me search" />
            {selected !== 'never' && (
              <Segmented label="Sort" value={sort} onChange={setSort} items={[
                { value: 'spend', label: 'Kharch' }, { value: 'recent', label: 'Haal hi' }, { value: 'visits', label: 'Dafa' }, { value: 'owing', label: 'Udhaar' },
              ]} />
            )}
          </div>
          {list.isLoading ? <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div> : (
            <DataTable rows={rows.slice(0, 300)} rowKey={(r) => r.id} empty={search ? 'Is naam ka koi nahi' : 'Is group me koi nahi'}
              columns={[
                { label: 'Customer', render: (r) => <CustomerCell id={r.id} name={r.name} phone={r.phone} isVip={r.isVip} sub={r.city} /> },
                { label: selected === 'never' ? 'Register hue' : 'Aakhri dafa', render: (r) => (r.lastAt ? daysAgo(r.days) : f.date(r.joinedAt)) },
                { label: 'Din (12 m)', align: 'right', hide: selected === 'never', render: (r) => r.visits },
                { label: 'Sale (12 m)', align: 'right', hide: selected === 'never', render: (r) => <span className="font-semibold text-slate-900">{f.money(r.net)}</span> },
                { label: 'Kul kharch', align: 'right', hide: selected === 'never', render: (r) => f.money(r.lifetime) },
                { label: 'Udhaar', align: 'right', render: (r) => (r.balance > 0 ? <span className="text-amber-700">{f.money(r.balance)}</span> : '—') },
                { label: 'Points', align: 'right', render: (r) => (r.points ? f.count(r.points) : '—') },
              ]} />
          )}
          {rows.length > 300 && <p className="text-center text-[0.75rem] text-slate-500">Pehle 300 dikh rahe hain — poori list ({rows.length}) CSV ya print me.</p>}
        </div>
      </Panel>

      {wa && (
        <WhatsAppList kind="segment" title={`WhatsApp — ${meta.label}`} message={meta.message} onClose={() => setWa(false)}
          people={rows.map((r) => ({ id: r.id, name: r.name, phone: r.phone, gender: r.gender }))} />
      )}
    </div>
  );
}

/** Same rule as the server, for colouring the grid. */
function segmentOf(r: number, f: number): Exclude<SegmentKey, 'never'> {
  if (r >= 4 && f >= 4) return 'champions';
  if (r >= 3 && f >= 3) return 'loyal';
  if (r >= 4) return 'promising';
  if (r === 3) return 'attention';
  return f >= 3 ? 'atRisk' : 'lost';
}

/** Hex alpha from 0x14 to 0xff by share of the busiest cell. */
const alpha = (v: number, max: number) => (v ? Math.round(0x22 + (0xff - 0x22) * (v / max)).toString(16).padStart(2, '0') : '10');
