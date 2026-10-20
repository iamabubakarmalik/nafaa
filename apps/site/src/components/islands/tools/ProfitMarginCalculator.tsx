'use client';

/**
 * Profit margin calculator island. Three questions shopkeepers ask:
 * - I know my cost and my price: what is my profit, margin and markup?
 * - I want a margin of X%: what price should I set?
 * - I add X% on cost (markup): what price is that, and what margin?
 * Quantity turns the per-item figures into totals. Plain arithmetic only.
 */
import { useMemo, useState } from 'react';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, useToolUsed } from './kit';

type Mode = 'price' | 'margin' | 'markup';

interface Result {
  cost: number;
  price: number;
  profit: number;
  margin: number | null;
  markup: number | null;
}

export function marginResult(mode: Mode, cost: number, input: number): Result | null {
  let price: number;
  if (mode === 'price') price = input;
  else if (mode === 'margin') {
    if (input >= 100) return null;
    price = cost / (1 - input / 100);
  } else price = cost * (1 + input / 100);
  const profit = price - cost;
  return {
    cost,
    price: round2(price),
    profit: round2(profit),
    margin: price > 0 ? (profit / price) * 100 : null,
    markup: cost > 0 ? (profit / cost) * 100 : null,
  };
}

const MODES = [
  { value: 'price', label: 'I know my price' },
  { value: 'margin', label: 'Target margin' },
  { value: 'markup', label: 'Target markup' },
] as const;

export default function ProfitMarginCalculator() {
  const used = useToolUsed('profit-margin-calculator');
  const [mode, setMode] = useState<Mode>('price');
  const [cost, setCost] = useState('');
  const [second, setSecond] = useState('');
  const [qty, setQty] = useState('1');

  const costValue = parseAmount(cost);
  const secondValue = parseAmount(second);
  const quantity = Math.max(parseAmount(qty) ?? 1, 0);

  const result = useMemo(() => {
    if (costValue === null || costValue < 0 || secondValue === null || secondValue < 0) return null;
    return marginResult(mode, costValue, secondValue);
  }, [mode, costValue, secondValue]);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const loss = result !== null && result.profit < 0;

  return (
    <ToolFrame label="Profit margin calculator">
      <InputsPanel className="space-y-5">
        <Segmented legend="What do you know?" value={mode} onChange={touch(setMode)} options={MODES} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cost per item" prefix="Rs" value={cost} onChange={touch(setCost)} placeholder="0" hint="What you paid, including freight." />
          {mode === 'price' ? (
            <Field label="Selling price per item" prefix="Rs" value={second} onChange={touch(setSecond)} placeholder="0" />
          ) : (
            <Field
              label={mode === 'margin' ? 'Margin you want' : 'Markup you add on cost'}
              suffix="%"
              value={second}
              onChange={touch(setSecond)}
              placeholder={mode === 'margin' ? 'e.g. 20' : 'e.g. 25'}
              hint={mode === 'margin' ? 'Share of the selling price you keep. Must be under 100%.' : 'Added on top of cost.'}
            />
          )}
        </div>
        <Field label="Quantity (optional)" value={qty} onChange={touch(setQty)} inputMode="numeric" hint="Items sold, to see the total profit." className="sm:max-w-[50%]" />
      </InputsPanel>

      <ResultPanel>
        {mode === 'price' ? (
          <BigResult
            label={loss ? 'Loss per item' : 'Profit per item'}
            value={result ? rupees(result.profit) : 'Rs 0'}
            note={result && result.margin !== null ? `${percent(result.margin, 1)} margin` : undefined}
          />
        ) : (
          <BigResult label="Selling price" value={result ? rupees(result.price) : 'Rs 0'} note={result ? `${rupees(result.profit)} profit per item` : undefined} />
        )}
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Cost', value: result ? rupees(result.cost) : '—' },
            { label: 'Selling price', value: result ? rupees(result.price) : '—' },
            { label: 'Profit', value: result ? rupees(result.profit) : '—' },
            { label: 'Margin (profit ÷ price)', value: result && result.margin !== null ? percent(result.margin, 2) : '—' },
            { label: 'Markup (profit ÷ cost)', value: result && result.markup !== null ? percent(result.markup, 2) : '—' },
            ...(quantity !== 1
              ? [{ label: `Total profit on ${plain(quantity)}`, value: result ? rupees(round2(result.profit * quantity)) : '—', strong: true }]
              : []),
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          Margin and markup are not the same: a 25% markup on cost gives a 20% margin on the price.
        </p>
      </ResultPanel>
    </ToolFrame>
  );
}
