'use client';

/**
 * Billing period switch for the pricing table (island, < 1 KB).
 *
 * The server renders every period's price; this only sets `data-period` on
 * the closest `[data-pricing]` root (CSS in blocks.module.css shows the
 * matching price) and records `pricing_toggle`. Without JS the monthly
 * price shows and the switch is inert.
 */
import { useState } from 'react';
import { track } from '@/lib/analytics/track';

export type PricingPeriod = 'monthly' | 'quarterly' | 'yearly';

export interface PricingToggleProps {
  options: { value: PricingPeriod; label: string; note?: string }[];
  label: string;
  className?: string;
}

export function PricingToggle({ options, label, className }: PricingToggleProps) {
  const [period, setPeriod] = useState<PricingPeriod>('monthly');

  function choose(value: PricingPeriod, button: HTMLButtonElement) {
    setPeriod(value);
    button.closest<HTMLElement>('[data-pricing]')?.setAttribute('data-period', value);
    track('pricing_toggle', { period: value, label: value });
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = options.findIndex((o) => o.value === period);
    const next = options[(index + (event.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
    if (!next) return;
    const button = event.currentTarget.querySelector<HTMLButtonElement>(`[data-value="${next.value}"]`);
    if (button) {
      choose(next.value, button);
      button.focus();
    }
  }

  return (
    <div role="radiogroup" aria-label={label} className={className} onKeyDown={onKeyDown}>
      {options.map((option) => {
        const checked = option.value === period;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-value={option.value}
            onClick={(event) => choose(option.value, event.currentTarget)}
          >
            {option.label}
            {option.note ? (
              <span className="hidden whitespace-nowrap rounded-full bg-brand-500/10 px-1.5 py-px text-[0.6875rem] font-semibold text-link sm:inline">{option.note}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
