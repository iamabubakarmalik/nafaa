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
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, pick, useToolUsed } from './kit';

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

const en = {
  frame: 'Break-even calculator',
  fixedTitle: 'Fixed costs per month',
  fixedSub: 'Costs you pay even on a day with no sale.',
  rent: 'Rent',
  salaries: 'Salaries',
  bills: 'Electricity, gas, internet',
  other: 'Other fixed costs',
  otherHint: 'Software, loan instalment, security, generator fuel.',
  legend: 'How do you sell?',
  unit: 'One main item',
  margin: 'Many products',
  price: 'Selling price per item',
  cost: 'Cost per item',
  costHint: 'Stock or ingredients, packing, delivery per item.',
  avgMargin: 'Average gross margin',
  marginPlaceholder: 'e.g. 15',
  marginHint: 'Profit ÷ sale price across what you sell. A Nafaa profit report shows it; else estimate from a week of bills.',
  days: 'Days open per month',
  target: 'Profit you want per month (optional)',
  big: 'Break-even sales per month',
  invalid: 'Each sale loses money: the cost is at or above the price.',
  perDay: (r: string, d: string) => `${r} a day over ${d} days`,
  enterCosts: 'Enter costs and price',
  rowFixed: 'Fixed costs per month',
  rowKept: 'Kept from each sale (contribution)',
  rowProfitItem: 'Profit per item before fixed costs',
  rowItems: 'Items to sell per month',
  rowItemsDay: 'Items per day',
  salesFor: (r: string) => `Sales for ${r} profit`,
  perDayRow: 'That is per day',
  formula: 'Break-even sales = fixed costs ÷ share of each sale you keep after its cost.',
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'بریک ایون کیلکولیٹر',
    fixedTitle: 'ہر مہینے کی فکس کاسٹ',
    fixedSub: 'وہ خرچے جو اس دن بھی دینے پڑتے ہیں جب کوئی سیل نہ ہو۔',
    rent: 'کرایہ',
    salaries: 'تنخواہیں',
    bills: 'بجلی، گیس، انٹرنیٹ',
    other: 'باقی فکس خرچے',
    otherHint: 'سافٹ ویئر، قرض کی قسط، سیکیورٹی، جنریٹر کا تیل۔',
    legend: 'آپ کیسے بیچتے ہیں؟',
    unit: 'ایک ہی بڑا آئٹم',
    margin: 'بہت سی چیزیں',
    price: 'فی آئٹم بیچنے کی قیمت',
    cost: 'فی آئٹم کاسٹ',
    costHint: 'اسٹاک یا سامان، پیکنگ، فی آئٹم ڈیلیوری۔',
    avgMargin: 'اوسط گراس مارجن',
    marginPlaceholder: 'مثلاً 15',
    marginHint: 'جو کچھ بیچتے ہیں اس پر پرافٹ ÷ سیل کی قیمت۔ Nafaa کی پرافٹ رپورٹ یہ دکھاتی ہے؛ ورنہ ایک ہفتے کے بلوں سے اندازہ لگائیں۔',
    days: 'مہینے میں کتنے دن دکان کھلتی ہے',
    target: 'ہر مہینے کتنا پرافٹ چاہیے (اختیاری)',
    big: 'ہر مہینے بریک ایون سیل',
    invalid: 'ہر سیل میں نقصان ہے: کاسٹ قیمت کے برابر یا اس سے زیادہ ہے۔',
    perDay: (r, d) => `${d} دن کے حساب سے روزانہ ${r}`,
    enterCosts: 'خرچے اور قیمت لکھیں',
    rowFixed: 'ہر مہینے کی فکس کاسٹ',
    rowKept: 'ہر سیل سے بچتا ہے (کنٹری بیوشن)',
    rowProfitItem: 'فکس خرچوں سے پہلے فی آئٹم پرافٹ',
    rowItems: 'ہر مہینے کتنے آئٹم بیچنے ہیں',
    rowItemsDay: 'روزانہ آئٹم',
    salesFor: (r) => `${r} پرافٹ کے لیے سیل`,
    perDayRow: 'یعنی روزانہ',
    formula: 'بریک ایون سیل = فکس کاسٹ ÷ ہر سیل کا وہ حصہ جو اس کی کاسٹ نکال کر بچتا ہے۔',
  },
};

export default function BreakEvenCalculator({ locale }: { locale?: string }) {
  const t = pick(STRINGS, locale);
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
    <ToolFrame label={t.frame}>
      <InputsPanel className="space-y-6">
        <div>
          <h3 className="text-h4 text-fg-strong">{t.fixedTitle}</h3>
          <p className="mt-1 text-small text-fg-subtle">{t.fixedSub}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={t.rent} prefix="Rs" value={rent} onChange={touch(setRent)} placeholder="0" />
            <Field label={t.salaries} prefix="Rs" value={salaries} onChange={touch(setSalaries)} placeholder="0" />
            <Field label={t.bills} prefix="Rs" value={bills} onChange={touch(setBills)} placeholder="0" />
            <Field label={t.other} prefix="Rs" value={other} onChange={touch(setOther)} placeholder="0" hint={t.otherHint} />
          </div>
        </div>
        <Segmented
          legend={t.legend}
          value={mode}
          onChange={touch(setMode)}
          options={[
            { value: 'unit', label: t.unit },
            { value: 'margin', label: t.margin },
          ]}
        />
        {mode === 'unit' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.price} prefix="Rs" value={price} onChange={touch(setPrice)} placeholder="0" />
            <Field label={t.cost} prefix="Rs" value={cost} onChange={touch(setCost)} placeholder="0" hint={t.costHint} />
          </div>
        ) : (
          <Field
            label={t.avgMargin}
            suffix="%"
            value={margin}
            onChange={touch(setMargin)}
            placeholder={t.marginPlaceholder}
            hint={t.marginHint}
            className="sm:max-w-[50%]"
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.days} value={days} onChange={touch(setDays)} inputMode="numeric" />
          <Field label={t.target} prefix="Rs" value={target} onChange={touch(setTarget)} placeholder="0" />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label={t.big}
          value={base ? rupees(Math.ceil(base.sales)) : 'Rs 0'}
          note={invalid ? t.invalid : base ? t.perDay(rupees(Math.ceil(base.sales / openDays)), plain(openDays)) : t.enterCosts}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: t.rowFixed, value: rupees(fixed) },
            { label: t.rowKept, value: base ? percent(base.contributionRatio * 100, 1) : '—' },
            ...(mode === 'unit'
              ? [
                  { label: t.rowProfitItem, value: base ? rupees(round2(n(price) - n(cost))) : '—' },
                  { label: t.rowItems, value: base && base.units !== null ? plain(Math.ceil(base.units)) : '—' },
                  { label: t.rowItemsDay, value: base && base.units !== null ? plain(Math.ceil(base.units / openDays)) : '—' },
                ]
              : []),
            ...(goal > 0
              ? [
                  { label: t.salesFor(rupees(goal)), value: withGoal ? rupees(Math.ceil(withGoal.sales)) : '—', strong: true },
                  { label: t.perDayRow, value: withGoal ? rupees(Math.ceil(withGoal.sales / openDays)) : '—' },
                ]
              : []),
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">{t.formula}</p>
      </ResultPanel>
    </ToolFrame>
  );
}
