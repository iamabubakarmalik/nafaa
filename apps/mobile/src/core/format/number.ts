/**
 * Number formatting with fixed rules (no device locale), so every phone shows
 * the same thing: Latin digits, comma thousands, dot decimals.
 */

export const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 12500 -> "12,500"; 1234.5 -> "1,234.5".
 * `decimals`: exact digits; default keeps up to 2 and drops trailing zeros.
 */
export function formatNumber(value: unknown, opts: { decimals?: number; maxDecimals?: number } = {}): string {
  const n = toNumber(value);
  if (n === null) return '0';
  const neg = n < 0;
  const abs = Math.abs(n);
  let fixed: string;
  if (opts.decimals !== undefined) fixed = abs.toFixed(opts.decimals);
  else fixed = abs.toFixed(opts.maxDecimals ?? 2).replace(/\.?0+$/, '');
  const [i, d] = fixed.split('.');
  return `${neg ? '-' : ''}${group(i)}${d ? `.${d}` : ''}`;
}

/** 0.125 -> "12.5%". Pass `isFraction: false` for values already in percent. */
export function formatPercent(value: unknown, opts: { isFraction?: boolean; decimals?: number } = {}): string {
  const n = toNumber(value) ?? 0;
  const pct = opts.isFraction === false ? n : n * 100;
  return `${formatNumber(pct, { maxDecimals: opts.decimals ?? 1 })}%`;
}

/** Quantities: up to 3 decimals for weights (1.25 kg). */
export const formatQty = (value: unknown) => formatNumber(value, { maxDecimals: 3 });
