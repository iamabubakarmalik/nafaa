/**
 * How packs are set up and used: how many products have packs, the most
 * used pack names and types, packs priced above the loose rate or below
 * cost, what was bought in packs in the period, and the best sellers that
 * still have no pack.
 */

import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, Barcode, Boxes, Layers, PackagePlus, PieChart as PieIcon, ShoppingCart, Truck } from 'lucide-react';
import { Card, Skeleton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { axisMoney } from '@modules/dashboard/engine/parts';
import { useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import { unitsPageApi } from '../api/units-page.api';
import { TYPE_LABEL, UNITS_KEY, qtyText } from './meta';

const PALETTE = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#e11d48', '#64748b'];

export function UnitsAnalytics({ range, money, cost, costHidden, onAddPack }: {
  range: { from?: string; to?: string };
  money: (n: number) => string;
  cost: (n: number) => string;
  costHidden: boolean;
  /** Opens the product in the list to add a pack. */
  onAddPack: (productName: string) => void;
}) {
  const theme = useChartTheme();
  const q = useQuery({ queryKey: [UNITS_KEY, 'analytics', range], queryFn: () => unitsPageApi.analytics(range), placeholderData: (p) => p });
  const d = q.data;

  if (q.isLoading || !d) {
    return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>;
  }
  const t = d.totals;
  const types = d.byType.map((x, i) => ({ ...x, label: TYPE_LABEL[x.type] ?? x.type, color: PALETTE[i % PALETTE.length] }));
  const bought = d.bought.slice(0, 8);
  const packShare = t.purchaseLines > 0 ? Math.round((t.packLines / t.purchaseLines) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Layers} label="Pack wale products" value={`${t.withPacks}`} sub={`${Math.round(t.coverage)}% of ${t.products} products`} />
        <Kpi icon={Boxes} label="Kul packs" value={String(t.packs)} sub={t.inactive ? `${t.inactive} band` : 'Sab chalu'} tone="emerald" />
        <Kpi icon={Barcode} label="Barcode nahi" value={String(t.noBarcode)} sub="Pack scan nahi ho sakte" tone={t.noBarcode ? 'amber' : 'emerald'} />
        <Kpi icon={AlertTriangle} label="Qeemat ke masle" value={String(t.priceIssues)} sub="Khule se mehnga ya cost se kam" tone={t.priceIssues ? 'rose' : 'emerald'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2" title={<span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-brand-600" />Purchase kis unit me</span>}
          description={t.purchaseLines ? `Is period ki ${t.purchaseLines} purchase lines me se ${packShare}% pack me aayin` : 'Is period me koi purchase nahi'}>
          {!bought.length ? <Empty text="Is period me koi purchase nahi" /> : (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bought} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={theme.grid} vertical={false} />
                  <XAxis dataKey="name" tick={theme.axis} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={theme.axis} axisLine={false} tickLine={false} tickFormatter={costHidden ? undefined : axisMoney} width={44} allowDecimals={false} />
                  <Tooltip formatter={(v, _n, item) => [costHidden ? `${v} lines` : cost(Number(v)), `${item.payload.lines} lines · ${qtyText(item.payload.qty)} ${item.payload.name}`]} {...theme.tooltip} />
                  {/* Purchase value is cost, so users without cost access see line counts. */}
                  <Bar dataKey={costHidden ? 'lines' : 'value'} fill={theme.primary} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><PieIcon className="h-4 w-4 text-brand-600" />Pack ki type</span>} description="Kitne pack kis type ke">
          {!types.length ? <Empty text="Abhi koi pack nahi" /> : (
            <>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={types} dataKey="count" nameKey="label" innerRadius={44} outerRadius={68} paddingAngle={2} stroke="none">
                      {types.map((x) => <Cell key={x.type} fill={x.color} />)}
                    </Pie>
                    <Tooltip {...theme.tooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-1 text-[0.8125rem]">
                {types.map((x) => (
                  <li key={x.type} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: x.color }} />{x.label}</span>
                    <span className="tabular-nums text-slate-900">{x.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-rose-600" />Qeemat check karein</span>} description="Pack khule se mehnga, ya cost se sasta">
          {!d.issues.length ? <Empty text="Sab packs ki qeemat theek hai" /> : (
            <ul className="divide-y divide-slate-100">
              {d.issues.map((x, i) => (
                <li key={`${x.productId}${x.unit}${i}`} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{x.product} · {x.unit}</span>
                    <span className={cn('block text-[0.6875rem]', x.kind === 'loss' ? 'text-rose-700' : 'text-amber-700')}>
                      {x.kind === 'loss' ? `Cost ${costHidden ? '••••' : formatPKR(x.cost)} se kam` : `Khula ${formatPKR(x.loose)} — pack mehnga`}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">{formatPKR(x.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><ShoppingCart className="h-4 w-4 text-brand-600" />Zyada bikte hain, pack nahi</span>} description="Is period ke top products jin ka koi pack nahi — dozen ya carton jor dein">
          {!d.topWithoutPacks.length ? <Empty text="Top bikne wale sab products ke pack hain" /> : (
            <ul className="divide-y divide-slate-100">
              {d.topWithoutPacks.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2 text-[0.8125rem]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-800">{x.name}</span>
                    <span className="block text-[0.6875rem] text-slate-500">{qtyText(x.qty)} {x.unit} bika · {money(x.revenue)}</span>
                  </span>
                  <button type="button" onClick={() => onAddPack(x.name)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[0.75rem] font-semibold text-brand-700 hover:bg-brand-50">
                    <PackagePlus className="h-3.5 w-3.5" />Pack jorein
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="rounded-2xl" title={<span className="inline-flex items-center gap-2"><Layers className="h-4 w-4 text-brand-600" />Sab se zyada istemal hone wale pack</span>} description="Pack ka naam, kitne products me, aur aam quantity">
        {!d.byName.length ? <Empty text="Abhi koi pack nahi" /> : (
          <div className="flex flex-wrap gap-2">
            {d.byName.map((x) => (
              <span key={x.name} className="inline-flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-1.5 text-[0.8125rem] ring-1 ring-slate-200">
                <span className="font-semibold text-slate-800">{x.name}</span>
                <span className="text-slate-500">{x.count} products · aam {qtyText(x.commonRate)}</span>
              </span>
            ))}
          </div>
        )}
      </Card>
      <p className="text-[0.75rem] text-slate-500">Sale har bill me asal unit me likhi jati hai, is liye "kis pack me bika" ka hisaab nahi banta. Purchase ka hisaab pack ke sath hota hai.</p>
    </div>
  );
}

function Kpi({ icon: I, label, value, sub, tone = 'brand' }: { icon: typeof Layers; label: string; value: string; sub?: string; tone?: 'brand' | 'rose' | 'emerald' | 'amber' }) {
  const toneCls = tone === 'rose' ? 'bg-rose-50 text-rose-700' : tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : tone === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-brand-50 text-brand-700';
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
