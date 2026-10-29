/**
 * Profit on khata (udhaar) bills, shown the same way on every screen.
 *
 *   Haath mein aaya profit   profit whose money came in during the period
 *   Udhaar mein profit       profit of the period's bills still owed
 *
 * The shop picks which one is the headline (Settings → Reports, "Udhaar ka
 * profit kab ginein"); both are always shown, and the reconcile line shows
 * that bill profit = in hand on this period's bills + still on khata (+ forgiven).
 * Figures come from the API (business-math.helper); nothing is worked out here
 * except that sum. Renders nothing when the split is missing (cost hidden).
 */

import { Link } from 'react-router-dom';
import { AlertTriangle, HandCoins, Hourglass } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';

export interface ProfitSplit {
  basis: 'PAID' | 'BILL';
  billProfit: number;
  realised: number;
  fromOlderBills: number;
  pending: number;
  writtenOff: number;
  headline: number;
  /** Lines sold with no cost anywhere: their whole sale was counted as profit. */
  noCost?: { products: number; lines: number; revenue: number };
}

/** Products page filtered to products with no cost price. */
export const NO_COST_LINK = '/products?noCost=1';

/** Number of products sold with no cost in the split, or 0. */
export const noCostCount = (s: ProfitSplit | null | undefined) => s?.noCost?.products ?? 0;

/**
 * Short warning when sold items had no cost: their whole sale was counted as
 * profit, so the profit looks bigger than it is. Renders nothing for 0.
 */
export function NoCostWarning({ count, className }: { count: number; className?: string }) {
  if (!(count > 0)) return null;
  return (
    <p className={cn('flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[0.75rem] leading-snug text-amber-900', className)}>
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {count.toLocaleString('en-PK')} {count === 1 ? 'cheez' : 'cheezon'} ki Cost nahi likhi — un ki poori sale Profit gini gayi.{' '}
        <Link to={NO_COST_LINK} className="whitespace-nowrap font-semibold underline-offset-2 hover:underline">Cost bharein →</Link>
      </span>
    </p>
  );
}

export const BASIS_LABEL: Record<ProfitSplit['basis'], string> = {
  PAID: 'Paisa milne par',
  BILL: 'Bill bante hi',
};

type Money = (n: number) => string;

/** True when the split has anything worth showing apart from the bill profit. */
export function splitMatters(s: ProfitSplit | null | undefined): s is ProfitSplit {
  return !!s && (Math.abs(s.pending) > 0.5 || Math.abs(s.fromOlderBills) > 0.5 || Math.abs(s.writtenOff) > 0.5);
}

/** One-line hint, e.g. for a KPI: "Haath mein Rs 5,000 · udhaar mein Rs 1,200". */
export function splitHint(s: ProfitSplit | null | undefined, money: Money = formatPKR): string | null {
  if (!s) return null;
  const bare = noCostCount(s);
  if (bare > 0) return `${bare} cheezon ki Cost nahi likhi — Profit zyada dikh raha hai`;
  if (!splitMatters(s)) return null;
  return `Haath mein ${money(s.realised)} · udhaar mein ${money(s.pending)}`;
}

interface Props {
  split: ProfitSplit | null | undefined;
  money?: Money;
  /** "is period", "aaj", "is mahine" — used in the reconcile line. */
  periodLabel?: string;
  /** Smaller, no outer border (inside another card). */
  compact?: boolean;
  /** Show even when nothing is on khata. */
  always?: boolean;
  className?: string;
}

/** The two figures side by side with the line that ties them to the bill profit. */
export function ProfitSplitCard({ split, money = formatPKR, periodLabel = 'is period', compact, always, className }: Props) {
  if (!split) return null;
  const bare = noCostCount(split);
  if (!always && !splitMatters(split)) return bare > 0 ? <NoCostWarning count={bare} className={className} /> : null;
  const onPeriodBills = split.realised - split.fromOlderBills;
  const headlineIs = split.basis === 'PAID' ? 'realised' : 'bill';
  return (
    <div className={cn(!compact && 'rounded-xl border border-slate-200 bg-white p-3 sm:p-4', 'space-y-3', className)}>
      {/* Compact cards sit in narrow side columns, so their figures stack. */}
      <div className={cn('grid grid-cols-1 gap-2', !compact && 'sm:grid-cols-2')}>
        <Figure
          icon={<HandCoins className="h-4 w-4" />} tone="emerald" label="Haath mein aaya profit" value={money(split.realised)}
          note={headlineIs === 'realised' ? 'Headline profit yahi hai' : 'Jis ka paisa aa gaya'} strong={headlineIs === 'realised'}
        />
        <Figure
          icon={<Hourglass className="h-4 w-4" />} tone="amber" label="Udhaar mein profit" value={money(split.pending)}
          note="Abhi aana hai — customer ke paisa dene par haath mein aayega"
        />
      </div>
      <NoCostWarning count={bare} />
      <div className="space-y-1 rounded-lg bg-slate-50 px-3 py-2 text-[0.75rem] leading-relaxed text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Bill ka profit {money(split.billProfit)}</span>
          {' = '}haath mein ({periodLabel} ke bills) {money(onPeriodBills)} + udhaar mein {money(split.pending)}
          {Math.abs(split.writtenOff) > 0.5 && <> + maaf kiya {money(split.writtenOff)}</>}
        </p>
        {Math.abs(split.fromOlderBills) > 0.5 && (
          <p>Pehle ke udhaar se aaya profit: <span className="font-semibold text-slate-800">{money(split.fromOlderBills)}</span> (haath mein aaye profit me shamil)</p>
        )}
        <p className="text-slate-500">
          Udhaar ka profit: <span className="font-medium text-slate-700">{BASIS_LABEL[split.basis]}</span>
          {headlineIs === 'bill' && <> — headline me bill ka poora profit hai</>}
          {' · '}<Link to="/settings/reports" className="font-medium text-brand-700 underline-offset-2 hover:underline">badlein</Link>
        </p>
      </div>
    </div>
  );
}

function Figure({ icon, label, value, note, tone, strong }: { icon: React.ReactNode; label: string; value: string; note: string; tone: 'emerald' | 'amber'; strong?: boolean }) {
  return (
    <div className={cn('flex items-start gap-2.5 rounded-lg border px-3 py-2.5', tone === 'emerald' ? 'border-success-200 bg-success-50/60' : 'border-amber-200 bg-amber-50/60')}>
      <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md', tone === 'emerald' ? 'bg-success-100 text-success-700' : 'bg-amber-100 text-amber-700')}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[0.75rem] font-medium text-slate-600">{label}</p>
        <p className={cn('whitespace-nowrap tabular-nums text-slate-900', strong ? 'text-lg font-bold' : 'text-base font-semibold')}>{value}</p>
        <p className="text-[0.6875rem] text-slate-500">{note}</p>
      </div>
    </div>
  );
}
