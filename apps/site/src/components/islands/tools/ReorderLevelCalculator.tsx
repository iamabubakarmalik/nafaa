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
import { BigResult, Breakdown, Field, InputsPanel, ResultPanel, Segmented, ToolFrame, pick, useToolUsed } from './kit';

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

const en = {
  frame: 'Reorder level calculator',
  defaultUnit: 'pcs',
  sold: 'Quantity sold',
  soldPlaceholder: 'e.g. 240',
  soldHint: 'From your sales report or register.',
  period: 'In how many days',
  unit: 'Unit',
  lead: 'Lead time',
  days: 'days',
  leadPlaceholder: 'e.g. 4',
  leadHint: 'Days from placing the order until the stock is on your shelf.',
  safety: 'Safety stock',
  safetyDays: 'Extra days of sale',
  safetyPeak: 'From a busy week',
  extraDays: 'Extra days to keep',
  extraDaysHint: 'Cover for a late supplier or a busy day.',
  mostSold: (u: string) => `Most sold in one day (${u})`,
  longestLead: 'Longest lead time',
  onHand: (u: string) => `Stock on hand now (${u}, optional)`,
  orderFor: 'Order enough for',
  orderForHint: 'Days of sale after the delivery arrives.',
  big: 'Reorder level',
  orderWhen: (l: string, u: string) => `Order when stock falls to ${l} ${u}.`,
  enter: 'Enter sales and lead time',
  rowAvg: 'Average sale per day',
  rowLead: 'Sold during the lead time',
  rowLasts: 'Stock lasts about',
  daysValue: (d: string) => `${d} days`,
  orderNow: 'Order now',
  suggested: 'Suggested order when you reorder',
  formula: 'Reorder level = average daily sale × lead time + safety stock.',
};

const STRINGS: { en: typeof en; ur: typeof en } = {
  en,
  ur: {
    frame: 'ری آرڈر لیول کیلکولیٹر',
    defaultUnit: 'پیس',
    sold: 'کتنا بیچا',
    soldPlaceholder: 'مثلاً 240',
    soldHint: 'اپنی سیل رپورٹ یا رجسٹر سے دیکھیں۔',
    period: 'کتنے دن میں',
    unit: 'یونٹ',
    lead: 'مال آنے کا وقت (لیڈ ٹائم)',
    days: 'دن',
    leadPlaceholder: 'مثلاً 4',
    leadHint: 'آرڈر دینے سے لے کر مال شیلف پر آنے تک کتنے دن لگتے ہیں۔',
    safety: 'سیفٹی اسٹاک',
    safetyDays: 'سیل کے اضافی دن',
    safetyPeak: 'رش والے ہفتے سے',
    extraDays: 'کتنے اضافی دن کا اسٹاک رکھیں',
    extraDaysHint: 'سپلائر دیر کرے یا رش ہو تو یہ کام آتا ہے۔',
    mostSold: (u) => `ایک دن میں سب سے زیادہ سیل (${u})`,
    longestLead: 'سب سے لمبا لیڈ ٹائم',
    onHand: (u) => `ابھی کتنا اسٹاک ہے (${u}، اختیاری)`,
    orderFor: 'کتنے دن کا آرڈر دیں',
    orderForHint: 'مال پہنچنے کے بعد کتنے دن کی سیل۔',
    big: 'ری آرڈر لیول',
    orderWhen: (l, u) => `جب اسٹاک ${l} ${u} رہ جائے تو آرڈر دیں۔`,
    enter: 'سیل اور لیڈ ٹائم لکھیں',
    rowAvg: 'روزانہ اوسط سیل',
    rowLead: 'لیڈ ٹائم میں کتنا بکے گا',
    rowLasts: 'اسٹاک تقریباً چلے گا',
    daysValue: (d) => `${d} دن`,
    orderNow: 'ابھی آرڈر دیں',
    suggested: 'آرڈر کرتے وقت کتنا منگوائیں',
    formula: 'ری آرڈر لیول = روزانہ اوسط سیل × لیڈ ٹائم + سیفٹی اسٹاک۔',
  },
};

export default function ReorderLevelCalculator({ locale }: { locale?: string }) {
  const t = pick(STRINGS, locale);
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
  const [unit, setUnit] = useState(t.defaultUnit);

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
  const u = unit.trim() || t.defaultUnit;

  return (
    <ToolFrame label={t.frame}>
      <InputsPanel className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_7rem]">
          <Field label={t.sold} value={sold} onChange={touch(setSold)} placeholder={t.soldPlaceholder} hint={t.soldHint} />
          <Field label={t.period} value={period} onChange={touch(setPeriod)} inputMode="numeric" />
          <Field label={t.unit} inputMode="text" value={unit} onChange={touch(setUnit)} />
        </div>
        <Field
          label={t.lead}
          suffix={t.days}
          value={lead}
          onChange={touch(setLead)}
          placeholder={t.leadPlaceholder}
          hint={t.leadHint}
          className="sm:max-w-[50%]"
        />
        <Segmented
          legend={t.safety}
          value={safetyMode}
          onChange={touch(setSafetyMode)}
          options={[
            { value: 'days', label: t.safetyDays },
            { value: 'peak', label: t.safetyPeak },
          ]}
        />
        {safetyMode === 'days' ? (
          <Field label={t.extraDays} suffix={t.days} value={safetyDays} onChange={touch(setSafetyDays)} hint={t.extraDaysHint} className="sm:max-w-[50%]" />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.mostSold(u)} value={maxDaily} onChange={touch(setMaxDaily)} placeholder="0" />
            <Field label={t.longestLead} suffix={t.days} value={maxLead} onChange={touch(setMaxLead)} placeholder="0" />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t.onHand(u)} value={onHand} onChange={touch(setOnHand)} placeholder="0" />
          <Field label={t.orderFor} suffix={t.days} value={cover} onChange={touch(setCover)} hint={t.orderForHint} />
        </div>
      </InputsPanel>

      <ResultPanel>
        <BigResult
          label={t.big}
          value={ready ? `${plain(r.level)} ${u}` : `0 ${u}`}
          note={ready ? t.orderWhen(plain(r.level), u) : t.enter}
        />
        <Breakdown
          className="mt-6"
          rows={[
            { label: t.rowAvg, value: ready ? `${plain(round2(avgDaily))} ${u}` : '—' },
            { label: t.rowLead, value: ready ? `${plain(r.leadDemand)} ${u}` : '—' },
            { label: t.safety, value: ready ? `${plain(r.safetyStock)} ${u}` : '—' },
            ...(stock !== null && ready
              ? [
                  { label: t.rowLasts, value: daysLeft !== null ? t.daysValue(plain(Math.floor(daysLeft))) : '—' },
                  { label: orderNow ? t.orderNow : t.suggested, value: orderQty !== null ? `${plain(orderQty)} ${u}` : '—', strong: true },
                ]
              : []),
          ]}
        />
        <p className="mt-5 text-small text-fg-muted">{t.formula}</p>
      </ResultPanel>
    </ToolFrame>
  );
}
