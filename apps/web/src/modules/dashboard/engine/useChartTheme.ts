/**
 * Chart colors that follow the user's accent color and light/dark mode.
 * Recharts takes plain color strings, so the scale is computed here rather
 * than read from CSS variables.
 */

import { useMemo } from 'react';
import { buildScale, useAppearance } from '@/design-system';

export function useChartTheme() {
  const { accentHex, isDark } = useAppearance();
  return useMemo(() => {
    // The scale holds "r g b" channel strings for CSS variables; SVG fills need a full color.
    const scale = buildScale(accentHex);
    const brand = (step: keyof typeof scale) => `rgb(${scale[step]})`;
    return {
      isDark,
      primary: isDark ? brand(400) : brand(600),
      primarySoft: isDark ? brand(800) : brand(200),
      highlight: isDark ? '#fbbf24' : '#f59e0b',
      profit: isDark ? '#4ade80' : '#16a34a',
      grid: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.25)',
      axis: { fontSize: 11, fill: isDark ? '#64748b' : '#94a3b8' },
      tooltip: {
        contentStyle: {
          borderRadius: 10,
          border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f1f5f9' : '#0f172a',
          fontSize: 12,
          boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
        },
        labelStyle: { color: isDark ? '#94a3b8' : '#64748b', fontWeight: 600 },
        cursor: { fill: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.12)' },
      },
    };
  }, [accentHex, isDark]);
}

/** Payment method colors, fixed so "Cash" is always the same color everywhere. */
export const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#16a34a', CARD: '#2563eb', JAZZCASH: '#ea580c', EASYPAISA: '#22c55e',
  BANK_TRANSFER: '#7c3aed', CREDIT: '#e11d48', ONLINE: '#0891b2',
};

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash', CARD: 'Card', JAZZCASH: 'JazzCash', EASYPAISA: 'Easypaisa',
  BANK_TRANSFER: 'Bank transfer', CREDIT: 'Udhaar', ONLINE: 'Online',
};
