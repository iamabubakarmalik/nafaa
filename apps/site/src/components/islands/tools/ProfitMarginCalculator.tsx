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
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, pick, useToolUsed } from './kit';

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

const en = {
  frame: 'Profit margin calculator',
  legend: 'What do you know?',
  modes: [
    { value: 'price', label: 'I know my price' },
    { value: 'margin', label: 'Target margin' },
    { value: 'markup', label: 'Target markup' },
  ] as { value: Mode; label: string }[],
  cost: 'Cost per item',
  costHint: 'What you paid, including freight.',
  price: 'Selling price per item',
  marginWant: 'Margin you want',
  markupAdd: 'Markup you add on cost',
  marginPlaceholder: 'e.g. 20',
  markupPlaceholder: 'e.g. 25',
  marginHint: 'Share of the selling price you keep. Must be under 100%.',
  markupHint: 'Added on top of cost.',
  qty: 'Quantity (optional)',
  qtyHint: 'Items sold, to see the total profit.',
  lossPer: 'Loss per item',
  profitPer: 'Profit per item',
  marginNote: (p: string) => `${p} margin`,
  sellingPrice: 'Selling price',
  profitNote: (r: string) => `${r} profit per item`,
  rowCost: 'Cost',
  rowProfit: 'Profit',
  rowMargin: 'Margin (profit ÷ price)',
  rowMarkup: 'Markup (profit ÷ cost)',
  totalProfit: (q: string) => `Total profit on ${q}`,
  footnote: 'Margin and markup are not the same: a 25% markup on cost gives a 20% margin on the price.',
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'پرافٹ مارجن کیلکولیٹر',
    legend: 'آپ کو کیا معلوم ہے؟',
    modes: [
      { value: 'price', label: 'قیمت معلوم ہے' },
      { value: 'margin', label: 'مارجن کا ہدف' },
      { value: 'markup', label: 'مارک اپ کا ہدف' },
    ],
    cost: 'فی آئٹم کاسٹ',
    costHint: 'جتنے میں خریدا، کرایہ بھاڑا ملا کر۔',
    price: 'فی آئٹم بیچنے کی قیمت',
    marginWant: 'آپ کتنا مارجن چاہتے ہیں',
    markupAdd: 'کاسٹ پر کتنا مارک اپ لگاتے ہیں',
    marginPlaceholder: 'مثلاً 20',
    markupPlaceholder: 'مثلاً 25',
    marginHint: 'بیچنے کی قیمت کا وہ حصہ جو آپ کے پاس بچتا ہے۔ 100% سے کم ہونا چاہیے۔',
    markupHint: 'کاسٹ کے اوپر لگتا ہے۔',
    qty: 'تعداد (اختیاری)',
    qtyHint: 'کتنے آئٹم بیچے، تاکہ کل پرافٹ نظر آئے۔',
    lossPer: 'فی آئٹم نقصان',
    profitPer: 'فی آئٹم پرافٹ',
    marginNote: (p) => `${p} مارجن`,
    sellingPrice: 'بیچنے کی قیمت',
    profitNote: (r) => `فی آئٹم ${r} پرافٹ`,
    rowCost: 'کاسٹ',
    rowProfit: 'پرافٹ',
    rowMargin: 'مارجن (پرافٹ ÷ قیمت)',
    rowMarkup: 'مارک اپ (پرافٹ ÷ کاسٹ)',
    totalProfit: (q) => `${q} آئٹم پر کل پرافٹ`,
    footnote: 'مارجن اور مارک اپ ایک چیز نہیں: کاسٹ پر 25% مارک اپ لگائیں تو قیمت پر 20% مارجن بنتا ہے۔',
  },
};

export default function ProfitMarginCalculator({ locale }: { locale?: string }) {
  const t = pick(STRINGS, locale);
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
    <ToolFrame label={t.frame}>
      <InputsPanel className="space-y-5">
        <Segmented legend={t.legend} value={mode} onChange={touch(setMode)} options={t.modes} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t.cost} prefix="Rs" value={cost} onChange={touch(setCost)} placeholder="0" hint={t.costHint} />
          {mode === 'price' ? (
            <Field label={t.price} prefix="Rs" value={second} onChange={touch(setSecond)} placeholder="0" />
          ) : (
            <Field
              label={mode === 'margin' ? t.marginWant : t.markupAdd}
              suffix="%"
              value={second}
              onChange={touch(setSecond)}
              placeholder={mode === 'margin' ? t.marginPlaceholder : t.markupPlaceholder}
              hint={mode === 'margin' ? t.marginHint : t.markupHint}
            />
          )}
        </div>
        <Field label={t.qty} value={qty} onChange={touch(setQty)} inputMode="numeric" hint={t.qtyHint} className="sm:max-w-[50%]" />
      </InputsPanel>

      <ResultPanel>
        {mode === 'price' ? (
          <BigResult
            label={loss ? t.lossPer : t.profitPer}
            value={result ? rupees(result.profit) : 'Rs 0'}
            note={result && result.margin !== null ? t.marginNote(percent(result.margin, 1)) : undefined}
          />
        ) : (
          <BigResult label={t.sellingPrice} value={result ? rupees(result.price) : 'Rs 0'} note={result ? t.profitNote(rupees(result.profit)) : undefined} />
        )}
        <Breakdown
          className="mt-6"
          rows={[
            { label: t.rowCost, value: result ? rupees(result.cost) : '—' },
            { label: t.sellingPrice, value: result ? rupees(result.price) : '—' },
            { label: t.rowProfit, value: result ? rupees(result.profit) : '—' },
            { label: t.rowMargin, value: result && result.margin !== null ? percent(result.margin, 2) : '—' },
            { label: t.rowMarkup, value: result && result.markup !== null ? percent(result.markup, 2) : '—' },
            ...(quantity !== 1
              ? [{ label: t.totalProfit(plain(quantity)), value: result ? rupees(round2(result.profit * quantity)) : '—', strong: true }]
              : []),
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">{t.footnote}</p>
      </ResultPanel>
    </ToolFrame>
  );
}
