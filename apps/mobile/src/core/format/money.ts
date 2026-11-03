/**
 * Money is always "Rs 12,500" with Latin digits and shown left-to-right, in
 * every language (use <Amount> in UI, which also isolates direction).
 */

import { formatNumber, toNumber } from './number';

export const CURRENCY_PREFIX = 'Rs';

export interface MoneyOptions {
  /** Exact decimal digits. Default: none for whole amounts, else 2. */
  decimals?: number;
  /** 1.25 L, 12.5K, 1.20 Cr. */
  compact?: boolean;
  /** Prefix + for positive values (changes, differences). */
  signed?: boolean;
  /** Omit the "Rs" prefix. */
  bare?: boolean;
}

export function formatMoney(amount: unknown, opts: MoneyOptions = {}): string {
  const n = toNumber(amount) ?? 0;
  const sign = n < 0 ? '-' : opts.signed && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  let body: string;
  if (opts.compact && abs >= 1000) {
    if (abs >= 10_000_000) body = `${formatNumber(abs / 10_000_000, { maxDecimals: 2 })} Cr`;
    else if (abs >= 100_000) body = `${formatNumber(abs / 100_000, { maxDecimals: 2 })} L`;
    else body = `${formatNumber(abs / 1000, { maxDecimals: 1 })}K`;
  } else if (opts.decimals !== undefined) {
    body = formatNumber(abs, { decimals: opts.decimals });
  } else {
    body = Number.isInteger(Math.round(abs * 100) / 100) ? formatNumber(abs, { decimals: 0 }) : formatNumber(abs, { decimals: 2 });
  }
  return opts.bare ? `${sign}${body}` : `${sign}${CURRENCY_PREFIX} ${body}`;
}

/** Same as the web formatPKR (always 2 decimals), for receipts and exports. */
export const formatPKR = (amount: unknown) => formatMoney(amount, { decimals: 2 });

/** Parses user input such as "12,500.5" or "Rs 300". */
export function parseMoney(input: string): number | null {
  const cleaned = input.replace(/rs\.?/i, '').replace(/[,\s]/g, '');
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
