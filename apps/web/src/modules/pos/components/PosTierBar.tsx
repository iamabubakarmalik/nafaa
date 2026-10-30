/**
 * Price tier on the bill: Retail, Wholesale or Credit (udhaar). The bar is
 * tinted by the active tier so the cashier always sees which prices the bill
 * uses. Tiers this cashier may not pick are shown but locked. A small chip
 * under a line lets one line use another tier.
 */

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Lock, Store, Truck } from 'lucide-react';
import { Kbd } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { PRICE_TIER_LABEL, tierPrice, type PriceTier } from '@core/lib/priceTiers';
import type { PosCartLine } from '../lib/posCart';
import { t as tr } from '@core/i18n';

const ICON: Record<PriceTier, typeof Store> = { RETAIL: Store, WHOLESALE: Truck, CREDIT: BookOpen };

/** Tint per tier: neutral for retail, blue for wholesale, amber for credit. */
export const TIER_TINT: Record<PriceTier, { bar: string; on: string; chip: string }> = {
  RETAIL: { bar: 'bg-slate-50 ring-slate-200', on: 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200', chip: 'bg-slate-100 text-slate-700 ring-slate-200' },
  WHOLESALE: { bar: 'bg-blue-50 ring-blue-200', on: 'bg-blue-600 text-white shadow-sm', chip: 'bg-blue-50 text-blue-700 ring-blue-200' },
  CREDIT: { bar: 'bg-amber-50 ring-amber-200', on: 'bg-amber-500 text-white shadow-sm', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },
};

export function PosTierBar({ tier, choices, canPick, onPick, udhaar, udhaarExtra = 0, hidePrices }: {
  tier: PriceTier;
  choices: PriceTier[];
  canPick: (t: PriceTier) => boolean;
  onPick: (t: PriceTier) => void;
  /** The udhaar rule put the bill on the credit price (checkout open). */
  udhaar?: boolean;
  udhaarExtra?: number;
  hidePrices?: boolean;
}) {
  const shown: PriceTier = udhaar ? 'CREDIT' : tier;
  return (
    <div className={cn('rounded-xl p-1 ring-1 transition-colors', TIER_TINT[shown].bar)}>
      <div role="radiogroup" aria-label={tr('Price tier (Alt+T)')} className="flex items-center gap-1">
        {choices.map((t) => {
          const Icon = ICON[t];
          const locked = !canPick(t);
          const active = t === tier;
          return (
            <button key={t} type="button" role="radio" aria-checked={active} disabled={locked && !active}
              title={locked ? tr('Price tier badalne ki permission nahi') : tr('{{value}} price (Alt+T)', { value: PRICE_TIER_LABEL[t] })}
              onClick={() => onPick(t)}
              className={cn('inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[0.8125rem] font-semibold transition',
                active ? TIER_TINT[t].on : 'text-slate-600 hover:bg-white/70 hover:text-slate-900',
                locked && !active && 'cursor-not-allowed opacity-50')}>
              {locked && !active ? <Lock className="h-3.5 w-3.5 shrink-0" /> : <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span className="truncate">{PRICE_TIER_LABEL[t]}</span>
            </button>
          );
        })}
        <Kbd className="hidden h-5 shrink-0 xl:inline-flex">Alt T</Kbd>
      </div>
      {udhaar && tier !== 'CREDIT' && (
        <p className="px-1.5 pb-0.5 pt-1 text-[0.75rem] font-medium text-amber-900">
          {tr('Udhaar bill: Credit price lag gayi{{value}}', { value: udhaarExtra > 0.005 && !hidePrices ? ` (+${formatPKR(udhaarExtra)})` : '' })}
        </p>
      )}
    </div>
  );
}

/**
 * The tier of one bill line, as a small chip. It opens a short list of the
 * tiers with this line's price at each; picking one sets the line only.
 */
export function PosLineTier({ line, billTier, choices, canPick, onPick, editable, hidePrices }: {
  line: PosCartLine;
  billTier: PriceTier;
  choices: PriceTier[];
  canPick: (t: PriceTier) => boolean;
  onPick: (t: PriceTier) => void;
  /** Per-line tier allowed in Settings and the line can be re-priced. */
  editable: boolean;
  hidePrices?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (ev: MouseEvent) => { if (!box.current?.contains(ev.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);
  const tier = line.priceTier ?? 'RETAIL';
  const label = tr('{{value}} price{{value2}}', { value: PRICE_TIER_LABEL[tier], value2: line.tierLocked && tier !== billTier ? tr(' (sirf ye line)') : '' });
  if (!editable || !line.tierSrc) {
    return <span className={cn('inline-flex h-5 items-center rounded-full px-1.5 text-[0.6875rem] font-semibold ring-1', TIER_TINT[tier].chip)}>{label}</span>;
  }
  return (
    <div ref={box} className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} title={tr('Is line ki price tier (T)')}
        className={cn('inline-flex h-5 items-center gap-0.5 rounded-full ps-1.5 pe-1 text-[0.6875rem] font-semibold ring-1', TIER_TINT[tier].chip)}>
        {label}<ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div role="menu" className="absolute start-0 top-6 z-20 w-48 overflow-hidden rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {choices.map((t) => {
            const locked = !canPick(t);
            return (
              <button key={t} type="button" role="menuitemradio" aria-checked={t === tier} disabled={locked}
                onClick={() => { setOpen(false); onPick(t); }}
                className={cn('flex w-full items-center justify-between gap-2 px-3 py-1.5 text-start text-[0.8125rem] hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50',
                  t === tier && 'font-semibold text-slate-900')}>
                <span className="inline-flex items-center gap-1.5">{locked && <Lock className="h-3 w-3" />}{PRICE_TIER_LABEL[t]}</span>
                <span className="tabular-nums text-slate-500">{hidePrices ? '••••' : formatPKR(tierPrice(line.tierSrc!, t))}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
