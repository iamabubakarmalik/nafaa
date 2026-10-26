'use client';

/**
 * Break-even calculator island. Fixed monthly costs against the profit each
 * sale leaves after its own cost (the contribution). Two ways in:
 * - per item: selling price and cost per item (one product, a plate, a service);
 * - average margin: a shop with many products enters its average gross margin.
 * An optional profit target shows the sales needed to earn it.
 */
import { useMemo, useState } from 'react';
import { parseAmount, percent, plain, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, useToolUsed } from './kit';

type Mode = 'unit' | 'margin';

const n = (raw: string) => Math.max(parseAmount(raw) ?? 0, 0);

export interface BreakEven {
  /** Share of each rupee of sales left after the cost of goods (0-1). */
  contributionRatio: number;
  /** Monthly sales needed to cover fixed costs (and the target profit). */
  sales: number;
  /** Items per month, in per-item mode. */
  units: number | null;
}

export function breakEven(mode: Mode, fixed: number, a: number, b: number): BreakEven | null {
  if (mode === 'unit') {
    const price = a;
    const contribution = price - b;
    if (price <= 0 || contribution <= 0) return null;
    const units = fixed / contribution;
    return { contributionRatio: contribution / price, sales: units * price, units };
  }
  const ratio = a / 100;
  if (ratio <= 0 || ratio >= 1) return null;
  return { contributionRatio: ratio, sales: fixed / ratio, units: null };
}

export default function BreakEvenCalculator() {
  const used = useToolUsed('break-even-calculator');
  const [mode, setMode] = useState<Mode>('unit');
  const [rent, setRent] = useState('');
  const [salaries, setSalaries] = useState('');
  const [bills, setBills] = useState('');
  const [other, setOther] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [margin, setMargin] = useState('');
  const [days, setDays] = useState('30');
  const [target, setTarget] = useState('');

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  const fixed = n(rent) + n(salaries) + n(bills) + n(other);
  const openDays = Math.min(Math.max(n(days) || 30, 1), 31);
  const goal = n(target);

  const base = useMemo(() => breakEven(mode, fixed, mode === 'unit' ? n(price) : n(margin), n(cost)), [mode, fixed, price, cost, margin]);
  const withGoal = useMemo(
    () => (goal > 0 ? breakEven(mode, fixed + goal, mode === 'unit' ? n(price) : n(margin), n(cost)) : null),
    [mode, fixed, goal, price, cost, margin],
  );

  const invalid = mode === 'unit' ? n(price) > 0 && n(cost) >= n(price) : n(margin) >= 100;

  return (
    <ToolFrame label="Break-even calculator">
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">Fixed costs per month</h3>
          <p className="mt-1 text-small text-fg-subtle">Costs you pay even on a day with no sale.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Rent" prefix="Rs" value={rent} onChange={touch(setRent)} placeholder="0" />
            <Field label="Salaries" prefix="Rs" value={salaries} onChange={touch(setSalaries)} placeholder="0" />
            <Field label="Electricity, gas, internet" prefix="Rs" value={bills} onChange={touch(setBills)} placeholder="0" />
            <Field label="Other fixed costs" prefix="Rs" value={other} onChange={touch(setOther)} placeholder="0" hint="Software, loan instalment, security, generator fuel." />
          </div>
        </div>
        <Segmented
          legend="How do you sell?"
          value={mode}
          onChange={touch(setMode)}
          options={[
            { value: 'unit', label: 'One main item' },
            { value: 'margin', label: 'Many products' },
          ]}
        />
        {mode === 'unit' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Selling price per item" prefix="Rs" value={price} onChange={touch(setPrice)} placeholder="0" />
            <Field label="Cost per item" prefix="Rs" value={cost} onChange={touch(setCost)} placeholder="0" hint="Stock or ingredients, packing, delivery per item." />
          </div>
        ) : (
          <Field
            label="Average gross margin"
            suffix="%"
            value={margin}
            onChange={touch(setMargin)}
            placeholder="e.g. 15"
            hint="Profit ÷ sale price across what you sell. A Nafaa profit report shows it; else estimate from a week of bills."
            className="sm:max-w-[50%]"
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Days open per month" value={days} onChange={touch(setDays)} inputMode="numeric" />
          <Field label="Profit you want per month (optional)" prefix="Rs" value={target} onChange={touch(setTarget)} placeholder="0" />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label="Break-even sales per month"
          value={base ? rupees(Math.ceil(base.sales)) : 'Rs 0'}
          note={invalid ? 'Each sale loses money: the cost is at or above the price.' : base ? `${rupees(Math.ceil(base.sales / openDays))} a day over ${plain(openDays)} days` : 'Enter costs and price'}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Fixed costs per month', value: rupees(fixed) },
            { label: 'Kept from each sale (contribution)', value: base ? percent(base.contributionRatio * 100, 1) : '—' },
            ...(mode === 'unit'
              ? [
                  { label: 'Profit per item before fixed costs', value: base ? rupees(round2(n(price) - n(cost))) : '—' },
                  { label: 'Items to sell per month', value: base && base.units !== null ? plain(Math.ceil(base.units)) : '—' },
                  { label: 'Items per day', value: base && base.units !== null ? plain(Math.ceil(base.units / openDays)) : '—' },
                ]
              : []),
            ...(goal > 0
              ? [
                  { label: `Sales for ${rupees(goal)} profit`, value: withGoal ? rupees(Math.ceil(withGoal.sales)) : '—', strong: true },
                  { label: 'That is per day', value: withGoal ? rupees(Math.ceil(withGoal.sales / openDays)) : '—' },
                ]
              : []),
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">Break-even sales = fixed costs ÷ share of each sale you keep after its cost.</p>
      </ResultPanel>
    </ToolFrame>
  );
}
