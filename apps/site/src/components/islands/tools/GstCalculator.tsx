'use client';

/**
 * GST calculator island: add sales tax to a price, or take it out of a
 * tax-inclusive price. The standard rate comes from facts.ts (with its FBR
 * source); any other rate can be typed.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { GST } from './facts';
import { parseAmount, percent, round2, rupees } from './format';
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, SourceNote, ToolFrame, pick, useToolUsed } from './kit';

type Mode = 'add' | 'remove';

export function gstSplit(amount: number, rate: number, mode: Mode): { net: number; tax: number; gross: number } {
  if (mode === 'add') {
    const tax = round2((amount * rate) / 100);
    return { net: round2(amount), tax, gross: round2(amount + tax) };
  }
  const net = round2(amount / (1 + rate / 100));
  return { net, tax: round2(amount - net), gross: round2(amount) };
}

const en = {
  frame: 'GST calculator',
  legend: 'What do you want to do?',
  add: 'Add GST to a price',
  remove: 'Remove GST from a price',
  priceBeforeTax: 'Price before tax',
  priceInclTax: 'Price including tax',
  rateLegend: 'Sales tax rate',
  standard: (r: number) => `${r}% standard`,
  otherRate: 'Other rate',
  rate: 'Rate',
  ratePlaceholder: 'e.g. 16',
  rateHint: 'Some goods have reduced or special rates, and services are taxed by the provinces at their own rates.',
  withGst: 'Price with GST',
  beforeGst: 'Price before GST',
  at: (p: string) => `At ${p}`,
  enterRate: 'Enter a rate',
  priceWithTax: 'Price with tax',
  formulaAdd: 'GST = price × rate ÷ 100.',
  formulaRemove: 'Price before tax = price with tax ÷ (1 + rate ÷ 100).',
  sourceLead: (r: number): ReactNode => <>The {r}% standard rate applies to goods under section 3(1) of the Sales Tax Act, 1990.</>,
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'GST کیلکولیٹر',
    legend: 'آپ کیا کرنا چاہتے ہیں؟',
    add: 'قیمت میں GST جوڑیں',
    remove: 'قیمت سے GST نکالیں',
    priceBeforeTax: 'ٹیکس سے پہلے قیمت',
    priceInclTax: 'ٹیکس سمیت قیمت',
    rateLegend: 'سیلز ٹیکس ریٹ',
    standard: (r) => `${r}% اسٹینڈرڈ`,
    otherRate: 'کوئی اور ریٹ',
    rate: 'ریٹ',
    ratePlaceholder: 'مثلاً 16',
    rateHint: 'کچھ چیزوں پر کم یا خاص ریٹ لگتا ہے، اور سروسز پر ہر صوبہ اپنا ریٹ لگاتا ہے۔',
    withGst: 'GST سمیت قیمت',
    beforeGst: 'GST سے پہلے قیمت',
    at: (p) => `${p} کے حساب سے`,
    enterRate: 'ریٹ لکھیں',
    priceWithTax: 'ٹیکس سمیت قیمت',
    formulaAdd: 'GST = قیمت × ریٹ ÷ 100۔',
    formulaRemove: 'ٹیکس سے پہلے قیمت = ٹیکس سمیت قیمت ÷ (1 + ریٹ ÷ 100)۔',
    sourceLead: (r) => <>{r}% اسٹینڈرڈ ریٹ سیلز ٹیکس ایکٹ 1990 کے سیکشن 3(1) کے تحت اشیاء پر لگتا ہے۔</>,
  },
};

export default function GstCalculator({ locale }: { locale?: string }) {
  const t = pick(STRINGS, locale);
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
    <ToolFrame label={t.frame}>
      <InputsPanel className="space-y-5">
        <Segmented
          legend={t.legend}
          value={mode}
          onChange={touch(setMode)}
          options={[
            { value: 'add', label: t.add },
            { value: 'remove', label: t.remove },
          ]}
        />
        <Field
          label={mode === 'add' ? t.priceBeforeTax : t.priceInclTax}
          prefix="Rs"
          value={amount}
          onChange={touch(setAmount)}
          placeholder="0"
        />
        <Segmented
          legend={t.rateLegend}
          value={ratePick}
          onChange={touch(setRatePick)}
          options={[
            ...GST.presets.map((r) => ({ value: String(r), label: t.standard(r) })),
            { value: 'custom', label: t.otherRate },
          ]}
        />
        {ratePick === 'custom' ? (
          <Field
            label={t.rate}
            suffix="%"
            value={customRate}
            onChange={touch(setCustomRate)}
            placeholder={t.ratePlaceholder}
            hint={t.rateHint}
          />
        ) : null}
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label={mode === 'add' ? t.withGst : t.beforeGst}
          value={result ? rupees(mode === 'add' ? result.gross : result.net) : 'Rs 0'}
          note={rate !== null ? t.at(percent(rate)) : t.enterRate}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: t.priceBeforeTax, value: result ? rupees(result.net) : '—' },
            { label: `GST${rate !== null ? ` (${percent(rate)})` : ''}`, value: result ? rupees(result.tax) : '—' },
            { label: t.priceWithTax, value: result ? rupees(result.gross) : '—', strong: true },
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">
          {mode === 'add' ? t.formulaAdd : t.formulaRemove}
        </p>
        <SourceNote source={GST.source} locale={locale}>
          {t.sourceLead(GST.standardRate)}
        </SourceNote>
      </ResultPanel>
    </ToolFrame>
  );
}
