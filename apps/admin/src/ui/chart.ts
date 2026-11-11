/**
 * Chart colors read from the theme variables, so charts follow the accent
 * color and dark mode. Used by every recharts chart in the admin panel.
 */

import { useMemo } from 'react';
import { useAppearanceStore } from '@/design-system';

export function cssColor(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `rgb(${v.split(/[\s,]+/).join(' ')})` : fallback;
}

export function useChartColors() {
  const theme = useAppearanceStore((s) => `${s.resolved.accentHex}|${s.resolved.mode}|${s.systemPrefersDark}`);
  return useMemo(() => ({
    line: cssColor('--brand-500', '#6366f1'),
    second: '#0d9488',
    grid: cssColor('--bd-slate-200', '#e2e8f0'),
    text: cssColor('--tx-slate-500', '#64748b'),
  }), [theme]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Series colors that stay apart for color-blind readers. */
export const SERIES = ['#4f46e5', '#0d9488', '#d97706', '#db2777', '#0284c7'];
