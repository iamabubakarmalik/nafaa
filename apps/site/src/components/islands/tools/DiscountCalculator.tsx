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
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, pick, useToolUsed } from './kit';

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

const en = {
  frame: 'Discount calculator',
  legend: 'What do you know?',
  pctOff: '% off',
  rsOff: 'Rs off',
  findPct: 'Find the %',
  original: 'Original price',
  discount: 'Discount',
  discountPlaceholder: 'e.g. 10',
  discountAmount: 'Discount amount',
  priceAfter: 'Price after discount',
  cost: 'Your cost per item (optional)',
  costHint: 'Shows the profit left after the discount.',
  off: (r: string) => `${r} off`,
  salePrice: 'Sale price',
  customerPays: 'Customer pays',
  profitBefore: 'Profit per item before',
  profitAfter: 'Profit per item after',
  marginAfter: 'Margin after discount',
  loses: 'At this price every sale loses money.',
  sellMore: (times: string, more: string) => `To earn the same profit as before, sell ${times}× as many items (${more} more).`,
  formula: 'Sale price = price × (1 − discount ÷ 100).',
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'ڈسکاؤنٹ کیلکولیٹر',
    legend: 'آپ کو کیا معلوم ہے؟',
    pctOff: '% ڈسکاؤنٹ',
    rsOff: 'Rs ڈسکاؤنٹ',
    findPct: '% معلوم کریں',
    original: 'اصل قیمت',
    discount: 'ڈسکاؤنٹ',
    discountPlaceholder: 'مثلاً 10',
    discountAmount: 'ڈسکاؤنٹ کی رقم',
    priceAfter: 'ڈسکاؤنٹ کے بعد قیمت',
    cost: 'فی آئٹم آپ کی کاسٹ (اختیاری)',
    costHint: 'ڈسکاؤنٹ کے بعد بچنے والا پرافٹ دکھاتا ہے۔',
    off: (r) => `${r} ڈسکاؤنٹ`,
    salePrice: 'سیل کی قیمت',
    customerPays: 'گاہک دے گا',
    profitBefore: 'پہلے فی آئٹم پرافٹ',
    profitAfter: 'اب فی آئٹم پرافٹ',
    marginAfter: 'ڈسکاؤنٹ کے بعد مارجن',
    loses: 'اس قیمت پر ہر سیل میں نقصان ہے۔',
    sellMore: (times, more) => `پہلے جتنا پرافٹ کمانے کے لیے ${times} گنا آئٹم بیچیں (${more} زیادہ)۔`,
    formula: 'سیل کی قیمت = قیمت × (1 − ڈسکاؤنٹ ÷ 100)۔',
  },
};

export default function DiscountCalculator({ locale }: { locale?: string }) {
  const t = pick(STRINGS, locale);
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
    <ToolFrame label={t.frame}>
      <InputsPanel className="space-y-5">
        <Segmented
          legend={t.legend}
          value={mode}
          onChange={touch(setMode)}
          options={[
            { value: 'percent', label: t.pctOff },
            { value: 'amount', label: t.rsOff },
            { value: 'find', label: t.findPct },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.original} prefix="Rs" value={price} onChange={touch(setPrice)} placeholder="0" />
          {mode === 'percent' ? (
            <Field label={t.discount} suffix="%" value={second} onChange={touch(setSecond)} placeholder={t.discountPlaceholder} />
          ) : mode === 'amount' ? (
            <Field label={t.discountAmount} prefix="Rs" value={second} onChange={touch(setSecond)} placeholder="0" />
          ) : (
            <Field label={t.priceAfter} prefix="Rs" value={second} onChange={touch(setSecond)} placeholder="0" />
          )}
        </div>
        <Field
          label={t.cost}
          prefix="Rs"
          value={cost}
          onChange={touch(setCost)}
          placeholder="0"
          hint={t.costHint}
          className="sm:max-w-[50%]"
        />
      </InputsPanel>

      <ResultPanel>
        {mode === 'find' ? (
          <BigResult label={t.discount} value={r ? percent(r.pct, 1) : '0%'} note={r ? t.off(rupees(r.off)) : undefined} />
        ) : (
          <BigResult label={t.salePrice} value={r ? rupees(r.sale) : 'Rs 0'} note={r ? `${t.off(rupees(r.off))} · ${percent(r.pct, 1)}` : undefined} />
        )}
        <Breakdown
          className="mt-6"
          rows={[
            { label: t.original, value: r ? rupees(n(price)) : '—' },
            { label: t.discount, value: r ? `${rupees(r.off)} (${percent(r.pct, 2)})` : '—' },
            { label: t.customerPays, value: r ? rupees(r.sale) : '—', strong: true },
            ...(hasCost
              ? [
                  { label: t.profitBefore, value: rupees(round2(oldProfit)) },
                  { label: t.profitAfter, value: rupees(round2(newProfit)) },
                  { label: t.marginAfter, value: r && r.sale > 0 ? percent((newProfit / r.sale) * 100, 1) : '—' },
                ]
              : []),
          ]}
        />
        {hasCost ? (
          <p className="mt-5 text-small text-fg-muted">
            {newProfit <= 0
              ? t.loses
              : factor !== null
                ? t.sellMore(plain(round2(factor)), percent((factor - 1) * 100, 0))
                : null}
          </p>
        ) : (
          <p className="mt-5 text-small text-fg-muted">{t.formula}</p>
        )}
      </ResultPanel>
    </ToolFrame>
  );
}
