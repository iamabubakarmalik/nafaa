/** Bikri: trend, payment methods, busy hours and weekdays, staff, channels and branches. */

import { Ban, Building2, CalendarDays, Clock, Flame, Globe, TrendingUp, UserRound, Wallet } from 'lucide-react';
import { PAYMENT_COLORS, PAYMENT_LABELS, useChartTheme } from '@modules/dashboard/engine/useChartTheme';
import type { SalesReport } from '../api';
import { BarList, Bars, DataTable, Donut, Empty, Heatmap, Panel, TrendChart, WEEKDAYS, type Formatter } from './parts';

export const SOURCE_LABEL: Record<string, string> = { POS: 'Counter', WEBSITE: 'Website', DARAZ: 'Daraz', FOODPANDA: 'Foodpanda', SHOPIFY: 'Shopify', MARKETPLACE: 'Marketplace' };

export function SalesSection({ data: d, f }: { data: SalesReport; f: Formatter }) {
  const theme = useChartTheme();
  const t = d.totals;
  const showProfit = !f.costHidden && t.profit != null;
  const busiest = [...d.hours].sort((a, b) => b.bills - a.bills)[0];
  const bestDay = [...d.weekdays].sort((a, b) => b.net - a.net)[0];
  return (
    <div className="space-y-4">
      <Panel icon={TrendingUp} title="Sale ka rujhan" hint={`${d.grouping === 'month' ? 'Mahine war' : 'Din war'} · return ke baad`}>
        {!t.bills ? <Empty text="Is period me koi sale nahi" /> : (
          <TrendChart id="rc-sales" f={f} data={d.trend}
            series={[{ key: 'net', label: 'Sale', color: theme.primary, fmt: 'money' }, ...(showProfit ? [{ key: 'profit', label: 'Profit', color: theme.profit, fmt: 'cost' as const }] : [])]} />
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel icon={Wallet} title="Paisa kaise aaya" hint="Bill ka payment tareeqa">
          {!d.payments.length ? <Empty text="Koi sale nahi" /> : (
            <Donut f={f} fmt="money" data={d.payments.map((p) => ({ name: PAYMENT_LABELS[p.method] ?? p.method, value: p.net, color: PAYMENT_COLORS[p.method] }))} />
          )}
          {t.credit > 0 && <p className="mt-3 flex justify-between border-t border-slate-100 pt-2 text-[0.8125rem] text-amber-700"><span>Is me udhaar</span><span className="tabular-nums">{f.money(t.credit)}</span></p>}
        </Panel>
        <Panel icon={Clock} title="Kis ghante zyada sale" hint={busiest?.bills ? `Sab se zyada ${busiest.hour % 12 || 12}${busiest.hour < 12 ? ' subah' : ' shaam'} ke ghante` : undefined}>
          <Bars f={f} fmt="money" data={d.hours.map((h) => ({ name: `${h.hour}`, value: h.net }))} tick={(v) => `${Number(v) % 12 || 12}${Number(v) < 12 ? 'a' : 'p'}`} />
        </Panel>
        <Panel icon={CalendarDays} title="Hafte ke din" hint={bestDay?.net ? `${WEEKDAYS[bestDay.day]} sab se acha` : undefined}>
          <Bars f={f} fmt="money" color={theme.highlight} data={[1, 2, 3, 4, 5, 6, 0].map((i) => ({ name: WEEKDAYS[i], value: d.weekdays[i]?.net ?? 0 }))} tick={(v) => v.slice(0, 3)} />
        </Panel>
      </div>

      <Panel icon={Flame} title="Rush ka naqsha" hint="Hafte ke kis din, kis ghante sab se zyada bill bante hain">
        <Heatmap grid={d.heatmap} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel icon={UserRound} title="Staff ki sale">
          <DataTable rows={d.staff} rowKey={(s, i) => s.id ?? String(i)} empty="Koi sale nahi" columns={[
            { label: 'Naam', render: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
            { label: 'Bill', align: 'right', render: (s) => s.bills },
            { label: 'Ausat', align: 'right', render: (s) => f.money(s.bills ? s.net / s.bills : 0) },
            { label: 'Sale', align: 'right', render: (s) => <span className="font-semibold">{f.money(s.net)}</span> },
            { label: 'Profit', align: 'right', hide: !showProfit, render: (s) => f.cost(s.profit) },
          ]} />
        </Panel>
        <div className="space-y-4">
          <Panel icon={Globe} title="Sale kahan se aayi" hint="Counter, website, Daraz…">
            <BarList f={f} fmt="money" empty="Koi sale nahi"
              rows={d.channels.map((c) => ({ key: c.source, name: SOURCE_LABEL[c.source] ?? c.source, value: c.net, hint: `${c.bills} bill` }))} />
          </Panel>
          {d.shops.length > 1 && (
            <Panel icon={Building2} title="Branch war">
              <BarList f={f} fmt="money" rows={d.shops.map((s) => ({ key: s.id ?? s.name, name: s.name, value: s.net, hint: `${s.bills} bill${showProfit ? ` · profit ${f.cost(s.profit)}` : ''}` }))} />
            </Panel>
          )}
          <Panel icon={Ban} title="Discount, return aur void">
            <dl className="grid grid-cols-2 gap-3 text-[0.8125rem]">
              {[
                ['Discount diya', f.money(t.discount)],
                ['Maal wapas (in bills ka)', f.money(t.refunds)],
                ['Void bill', `${t.voidedBills} · ${f.money(t.voidedValue)}`],
                ['Service charges', f.money(t.service)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100"><dt className="text-slate-500">{k}</dt><dd className="mt-0.5 font-semibold tabular-nums text-slate-900">{v}</dd></div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
