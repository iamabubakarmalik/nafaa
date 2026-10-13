/** The industry tab: headline numbers, charts and tables sent by the server for this business type. */

import { BarChart3, Info, PieChart as PieIcon, Table2 } from 'lucide-react';
import { KpiCard, KpiRow } from '@/design-system/components';
import type { IndustryReport } from '../api';
import type { ReportsConfig } from '../config';
import { Bars, DataTable, Donut, Empty, Panel, PALETTE, type Formatter } from './parts';

export function IndustrySection({ data: d, f, config }: { data: IndustryReport; f: Formatter; config: ReportsConfig }) {
  const Icon = config.industry?.icon ?? BarChart3;
  const hasData = d.kpis.some((k) => k.value) || d.tables.some((t) => t.rows.length);
  return (
    <div className="space-y-4">
      {!!d.kpis.length && (
        <KpiRow cols={d.kpis.length % 4 === 0 ? 4 : 5}>
          {d.kpis.map((k, i) => <KpiCard key={k.label} icon={Icon} color={PALETTE[i % PALETTE.length]} label={k.label} value={f.fmt(k.value, k.fmt)} hint={k.hint} />)}
        </KpiRow>
      )}
      {!hasData && <Panel icon={Icon} title={config.industry?.title ?? 'Karobar'}><Empty text="Is period me is karobar ka koi record nahi" /></Panel>}

      {d.charts.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {d.charts.map((c) => (
            <Panel key={c.title} icon={c.kind === 'pie' ? PieIcon : BarChart3} title={c.title}>
              {!c.data.length ? <Empty text="Kuch nahi" /> : c.kind === 'pie'
                ? <Donut f={f} fmt={c.fmt} data={c.data} />
                : <Bars f={f} fmt={c.fmt} data={c.data} tick={(v) => (v.length > 10 ? `${v.slice(0, 9)}…` : v)} />}
            </Panel>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {d.tables.map((t) => (
          <Panel key={t.title} icon={Table2} title={t.title} hint={t.hint}>
            <DataTable rows={t.rows} rowKey={(_r, i) => String(i)} empty="Kuch nahi" columns={t.columns.map((c, ci) => ({
              label: c.label,
              align: c.fmt === 'text' || c.fmt === 'date' ? undefined : 'right' as const,
              render: (row: Array<string | number | null>) => <span className={ci === 0 ? 'font-medium text-slate-900' : undefined}>{f.fmt(row[ci], c.fmt)}</span>,
            }))} />
          </Panel>
        ))}
      </div>

      {d.notes.map((n) => (
        <p key={n} className="flex items-center gap-2 text-[0.75rem] text-slate-500"><Info className="h-3.5 w-3.5" />{n}</p>
      ))}
    </div>
  );
}
