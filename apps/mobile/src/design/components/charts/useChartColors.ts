/** Series colors for charts: one palette for light and dark, taken from the theme tones. */

import { useMemo } from 'react';
import { useTheme } from '../../theme/ThemeProvider';

export function useChartColors() {
  const th = useTheme();
  return useMemo(() => {
    const c = th.colors;
    const series = [c.brand.solid, c.info.solid, c.success.solid, c.warning.solid, '#8b5cf6', '#ec4899', c.danger.solid, '#14b8a6'];
    return { series, pick: (i: number) => series[i % series.length], grid: c.divider, axis: c.textMuted, good: c.success.solid, bad: c.danger.solid, brand: c.brand.solid };
  }, [th.colors]);
}

/** Compact axis number: 1.2K, 3.4M (Latin digits). */
export function axisNumber(v: number): string {
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1_000_000) return `${s}${+(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${s}${+(a / 1_000).toFixed(a >= 10_000 ? 0 : 1)}K`;
  return `${s}${Math.round(a)}`;
}

/** Round the top of a scale to a clean number. */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
