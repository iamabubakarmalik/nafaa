/**
 * Retail / Wholesale / Credit split for the Sales and Profit tabs. Shown only
 * when the period has a line sold at a wholesale or credit price; the tiers
 * add up to the tab's headline sale and profit.
 */

import { Tags } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { PriceTier } from '@core/lib/priceTiers';
import type { PriceTierSplit as Split } from '../api';
import { DataTable, Panel, type Formatter } from './parts';

/** Dot and bar colour per tier, matching the Badge tones (neutral, info, warning). */
export const TIER_DOT: Record<PriceTier, string> = {
  RETAIL: 'bg-slate-400',
  WHOLESALE: 'bg-blue-500',
  CREDIT: 'bg-amber-500',
};

export function PriceTierSplit({ split, f, showProfit }: { split: Split | null | undefined; f: Formatter; showProfit: boolean }) {
  if (!split?.mixed) return null;
  const rows = split.tiers.filter((t) => t.bills > 0);
  const total = rows.reduce((s, t) => s + Math.max(0, t.net), 0) || 1;
  const withProfit = showProfit && rows.every((t) => t.profit != null);
  return (
    <Panel icon={Tags} title="Retail, Wholesale aur Credit" hint="Kis rate par kitni sale · ek bill me do rate hon to dono me gina">
      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
        {rows.map((t) => (
          <div key={t.tier} className={TIER_DOT[t.tier]} style={{ width: `${(Math.max(0, t.net) / total) * 100}%` }} />
        ))}
      </div>
      <DataTable rows={rows} rowKey={(t) => t.tier} columns={[
        {
          label: 'Rate',
          render: (t) => (
            <span className="inline-flex items-center gap-2 font-medium text-slate-900">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', TIER_DOT[t.tier])} />{t.label}
            </span>
          ),
        },
        { label: 'Bills', align: 'right', render: (t) => t.bills },
        { label: 'Items', align: 'right', render: (t) => f.qty(t.qty) },
        {
          label: 'Sale', align: 'right',
          render: (t) => (
            <span className="font-semibold">
              {f.money(t.net)} <span className="font-normal text-slate-400">· {((Math.max(0, t.net) / total) * 100).toFixed(0)}%</span>
            </span>
          ),
        },
        { label: 'Profit', align: 'right', hide: !withProfit, render: (t) => f.cost(t.profit) },
        { label: 'Margin', align: 'right', hide: !withProfit, render: (t) => (f.costHidden ? '—' : `${(t.margin ?? 0).toFixed(1)}%`) },
      ]} />
    </Panel>
  );
}
