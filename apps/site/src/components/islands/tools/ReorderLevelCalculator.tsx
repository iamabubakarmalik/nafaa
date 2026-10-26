'use client';

/**
 * Stock reorder level calculator island.
 *   reorder level = average daily sale × lead time + safety stock
 * Safety stock is either a number of extra days of sale, or worked out from
 * the worst week the visitor remembers (max daily sale × longest lead time −
 * average daily sale × usual lead time). With the stock on hand it says
 * whether to order now and how much to order to cover the next period.
 */
import { useMemo, useState } from 'react';
import { parseAmount, plain, round2 } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, useToolUsed } from './kit';

type Safety = 'days' | 'peak';

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function reorderLevel(
  avgDaily: number,
  leadDays: number,
  safety: { mode: 'days'; days: number } | { mode: 'peak'; maxDaily: number; maxLead: number },
): { safetyStock: number; leadDemand: number; level: number } {
  const leadDemand = avgDaily * leadDays;
  const safetyStock = safety.mode === 'days' ? avgDaily * safety.days : Math.max(safety.maxDaily * safety.maxLead - leadDemand, 0);
  return { safetyStock: round2(safetyStock), leadDemand: round2(leadDemand), level: Math.ceil(leadDemand + safetyStock) };
}

export default function ReorderLevelCalculator() {
  const used = useToolUsed('reorder-level-calculator');
  const [sold, setSold] = useState('');
  const [period, setPeriod] = useState('30');
  const [lead, setLead] = useState('');
  const [safetyMode, setSafetyMode] = useState<Safety>('days');
  const [safetyDays, setSafetyDays] = useState('3');
  const [maxDaily, setMaxDaily] = useState('');
  const [maxLead, setMaxLead] = useState('');
  const [onHand, setOnHand] = useState('');
  const [cover, setCover] = useState('15');
  const [unit, setUnit] = useState('pcs');

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const days = n(period) || 30;
  const avgDaily = n(sold) / days;
  const r = useMemo(
    () =>
      reorderLevel(
        avgDaily,
        n(lead),
        safetyMode === 'days' ? { mode: 'days', days: n(safetyDays) } : { mode: 'peak', maxDaily: n(maxDaily), maxLead: n(maxLead) || n(lead) },
      ),
    [avgDaily, lead, safetyMode, safetyDays, maxDaily, maxLead],
  );
  const stock = parseAmount(onHand);
  const ready = avgDaily > 0 && n(lead) > 0;
  const daysLeft = ready && stock !== null ? stock / avgDaily : null;
  const orderNow = ready && stock !== null && stock <= r.level;
  // Enough to cover the lead time plus the chosen period, topped up to the safety stock.
  const orderQty = ready && stock !== null ? Math.max(Math.ceil(avgDaily * (n(lead) + n(cover)) + r.safetyStock - stock), 0) : null;
  const u = unit.trim() || 'pcs';

  return (
    <ToolFrame label="Reorder level calculator">
      <InputsPanel className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_7rem]">
          <Field label="Quantity sold" value={sold} onChange={touch(setSold)} placeholder="e.g. 240" hint="From your sales report or register." />
          <Field label="In how many days" value={period} onChange={touch(setPeriod)} inputMode="numeric" />
          <Field label="Unit" inputMode="text" value={unit} onChange={touch(setUnit)} />
        </div>
        <Field
          label="Lead time"
          suffix="days"
          value={lead}
          onChange={touch(setLead)}
          placeholder="e.g. 4"
          hint="Days from placing the order until the stock is on your shelf."
          className="sm:max-w-[50%]"
        />
        <Segmented
          legend="Safety stock"
          value={safetyMode}
          onChange={touch(setSafetyMode)}
          options={[
            { value: 'days', label: 'Extra days of sale' },
            { value: 'peak', label: 'From a busy week' },
          ]}
        />
        {safetyMode === 'days' ? (
          <Field label="Extra days to keep" suffix="days" value={safetyDays} onChange={touch(setSafetyDays)} hint="Cover for a late supplier or a busy day." className="sm:max-w-[50%]" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Most sold in one day (${u})`} value={maxDaily} onChange={touch(setMaxDaily)} placeholder="0" />
            <Field label="Longest lead time" suffix="days" value={maxLead} onChange={touch(setMaxLead)} placeholder="0" />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Stock on hand now (${u}, optional)`} value={onHand} onChange={touch(setOnHand)} placeholder="0" />
          <Field label="Order enough for" suffix="days" value={cover} onChange={touch(setCover)} hint="Days of sale after the delivery arrives." />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label="Reorder level"
          value={ready ? `${plain(r.level)} ${u}` : `0 ${u}`}
          note={ready ? `Order when stock falls to ${plain(r.level)} ${u}.` : 'Enter sales and lead time'}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Average sale per day', value: ready ? `${plain(round2(avgDaily))} ${u}` : '—' },
            { label: 'Sold during the lead time', value: ready ? `${plain(r.leadDemand)} ${u}` : '—' },
            { label: 'Safety stock', value: ready ? `${plain(r.safetyStock)} ${u}` : '—' },
            ...(stock !== null && ready
              ? [
                  { label: 'Stock lasts about', value: daysLeft !== null ? `${plain(Math.floor(daysLeft))} days` : '—' },
                  { label: orderNow ? 'Order now' : 'Suggested order when you reorder', value: orderQty !== null ? `${plain(orderQty)} ${u}` : '—', strong: true },
                ]
              : []),
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">Reorder level = average daily sale × lead time + safety stock.</p>
      </ResultPanel>
    </ToolFrame>
  );
}
