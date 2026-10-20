'use client';

/**
 * GST calculator island: add sales tax to a price, or take it out of a
 * tax-inclusive price. The standard rate comes from facts.ts (with its FBR
 * source); any other rate can be typed.
 */
import { useMemo, useState } from 'react';
import { GST } from './facts';
import { parseAmount, percent, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, SourceNote, ToolFrame, useToolUsed } from './kit';

type Mode = 'add' | 'remove';

export function gstSplit(amount: number, rate: number, mode: Mode): { net: number; tax: number; gross: number } {
  if (mode === 'add') {
    const tax = round2((amount * rate) / 100);
    return { net: round2(amount), tax, gross: round2(amount + tax) };
  }
  const net = round2(amount / (1 + rate / 100));
  return { net, tax: round2(amount - net), gross: round2(amount) };
}

export default function GstCalculator() {
  const used = useToolUsed('gst-calculator');
  const [mode, setMode] = useState<Mode>('add');
  const [amount, setAmount] = useState('');
  const [ratePick, setRatePick] = useState<string>(String(GST.standardRate));
  const [customRate, setCustomRate] = useState('');

  const rate = ratePick === 'custom' ? parseAmount(customRate) : Number(ratePick);
  const value = parseAmount(amount);
  const result = useMemo(() => {
    if (value === null || value < 0 || rate === null || rate < 0 || rate > 100) return null;
    return gstSplit(value, rate, mode);
  }, [value, rate, mode]);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    used();
    setter(v);
  };

  return (
    <ToolFrame label="GST calculator">
      <InputsPanel className="space-y-5">
        <Segmented
          legend="What do you want to do?"
          value={mode}
          onChange={touch(setMode)}
          options={[
            { value: 'add', label: 'Add GST to a price' },
            { value: 'remove', label: 'Remove GST from a price' },
          ]}
        />
        <Field
          label={mode === 'add' ? 'Price before tax' : 'Price including tax'}
          prefix="Rs"
          value={amount}
          onChange={touch(setAmount)}
          placeholder="0"
        />
        <Segmented
          legend="Sales tax rate"
          value={ratePick}
          onChange={touch(setRatePick)}
          options={[
            ...GST.presets.map((r) => ({ value: String(r), label: `${r}% standard` })),
            { value: 'custom', label: 'Other rate' },
          ]}
        />
        {ratePick === 'custom' ? (
          <Field
            label="Rate"
            suffix="%"
            value={customRate}
            onChange={touch(setCustomRate)}
            placeholder="e.g. 16"
            hint="Some goods have reduced or special rates, and services are taxed by the provinces at their own rates."
          />
        ) : null}
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label={mode === 'add' ? 'Price with GST' : 'Price before GST'}
          value={result ? rupees(mode === 'add' ? result.gross : result.net) : 'Rs 0'}
          note={rate !== null ? `At ${percent(rate)}` : 'Enter a rate'}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: 'Price before tax', value: result ? rupees(result.net) : '—' },
            { label: `GST${rate !== null ? ` (${percent(rate)})` : ''}`, value: result ? rupees(result.tax) : '—' },
            { label: 'Price with tax', value: result ? rupees(result.gross) : '—', strong: true },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          {mode === 'add' ? 'GST = price × rate ÷ 100.' : 'Price before tax = price with tax ÷ (1 + rate ÷ 100).'}
        </p>
        <SourceNote source={GST.source}>The {GST.standardRate}% standard rate applies to goods under section 3(1) of the Sales Tax Act, 1990.</SourceNote>
      </ResultPanel>
    </ToolFrame>
  );
}
