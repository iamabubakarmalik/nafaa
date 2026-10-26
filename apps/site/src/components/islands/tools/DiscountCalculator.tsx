'use client';

/**
 * Discount and sale price calculator island.
 * - Percent off: price and discount % give the sale price.
 * - Amount off: price and rupees off give the sale price and the %.
 * - Find the %: price before and after give the discount %.
 * With the cost per item it also shows what the discount does to profit,
 * and how many more items must sell to earn the same profit as before.
 */
import { useMemo, useState } from 'react';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, useToolUsed } from './kit';

type Mode = 'percent' | 'amount' | 'find';

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export function discountResult(mode: Mode, price: number, second: number): { sale: number; off: number; pct: number } | null {
  if (price <= 0) return null;
  let sale: number;
  if (mode === 'percent') {
    if (second > 100) return null;
    sale = price * (1 - second / 100);
  } else if (mode === 'amount') {
    if (second > price) return null;
    sale = price - second;
  } else {
    if (second <= 0 || second > price) return null;
    sale = second;
  }
  const off = price - sale;
  return { sale: round2(sale), off: round2(off), pct: (off / price) * 100 };
}

export default function DiscountCalculator() {
  const used = useToolUsed('discount-calculator');
  const [mode, setMode] = useState<Mode>('percent');
  const [price, setPrice] = useState('');
  const [second, setSecond] = useState('');
  const [cost, setCost] = useState('');

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const r = useMemo(() => discountResult(mode, n(price), n(second)), [mode, price, second]);
  const c = n(cost);
  const oldProfit = n(price) - c;
  const newProfit = r ? r.sale - c : 0;
  const hasCost = c > 0 && r !== null;
  /** Items needed after the discount to earn what one item earned before. */
  const factor = hasCost && newProfit > 0 && oldProfit > 0 ? oldProfit / newProfit : null;

  return (
    <ToolFrame label="Discount calculator">
      <InputsPanel className="space-y-5">
        <Segmented
          legend="What do you know?"
          value={mode}
          onChange={touch(setMode)}
          options={[
            { value: 'percent', label: '% off' },
            { value: 'amount', label: 'Rs off' },
            { value: 'find', label: 'Find the %' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Original price" prefix="Rs" value={price} onChange={touch(setPrice)} placeholder="0" />
          {mode === 'percent' ? (
            <Field label="Discount" suffix="%" value={second} onChange={touch(setSecond)} placeholder="e.g. 10" />
          ) : mode === 'amount' ? (
            <Field label="Discount amount" prefix="Rs" value={second} onChange={touch(setSecond)} placeholder="0" />
          ) : (
            <Field label="Price after discount" prefix="Rs" value={second} onChange={touch(setSecond)} placeholder="0" />
          )}
        </div>
        <Field
          label="Your cost per item (optional)"
          prefix="Rs"
          value={cost}
          onChange={touch(setCost)}
          placeholder="0"
          hint="Shows the profit left after the discount."
          className="sm:max-w-[50%]"
        />
      </InputsPanel>

      <ResultPanel>
        {mode === 'find' ? (
          <BigResult label="Discount" value={r ? percent(r.pct, 1) : '0%'} note={r ? `${rupees(r.off)} off` : undefined} />
        ) : (
          <BigResult label="Sale price" value={r ? rupees(r.sale) : 'Rs 0'} note={r ? `${rupees(r.off)} off · ${percent(r.pct, 1)}` : undefined} />
        )}
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Original price', value: r ? rupees(n(price)) : '—' },
            { label: 'Discount', value: r ? `${rupees(r.off)} (${percent(r.pct, 2)})` : '—' },
            { label: 'Customer pays', value: r ? rupees(r.sale) : '—', strong: true },
            ...(hasCost
              ? [
                  { label: 'Profit per item before', value: rupees(round2(oldProfit)) },
                  { label: 'Profit per item after', value: rupees(round2(newProfit)) },
                  { label: 'Margin after discount', value: r && r.sale > 0 ? percent((newProfit / r.sale) * 100, 1) : '—' },
                ]
              : []),
          ]}
        />
        {hasCost ? (
          <p className="mt-5 text-small text-fg-muted">
            {newProfit <= 0
              ? 'At this price every sale loses money.'
              : factor !== null
                ? `To earn the same profit as before, sell ${plain(round2(factor))}× as many items (${percent((factor - 1) * 100, 0)} more).`
                : null}
          </p>
        ) : (
          <p className="mt-5 text-small text-fg-muted">Sale price = price × (1 − discount ÷ 100).</p>
        )}
      </ResultPanel>
    </ToolFrame>
  );
}
