/**
 * Date presets for the online store lists and reports, as business-day keys
 * in Pakistan time (the API takes from/to as YYYY-MM-DD business days).
 */

import { shiftDay } from '@nafaa/core/online-store';
import { businessDayKey } from '@/core/format';
import { msg } from '@/core/i18n';

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'thisMonth' | 'quarter' | 'all';

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  today: msg('Aaj'),
  yesterday: msg('Kal'),
  week: msg('7 din'),
  month: msg('30 din'),
  thisMonth: msg('Is mahine'),
  quarter: msg('90 din'),
  all: msg('Har date'),
};

/** from/to for a preset; null for "all". */
export function periodRange(p: PeriodPreset, now: Date = new Date()): { from: string; to: string } | null {
  const today = businessDayKey(now);
  switch (p) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const y = shiftDay(today, -1); return { from: y, to: y }; }
    case 'week': return { from: shiftDay(today, -6), to: today };
    case 'month': return { from: shiftDay(today, -29), to: today };
    case 'thisMonth': return { from: `${today.slice(0, 8)}01`, to: today };
    case 'quarter': return { from: shiftDay(today, -89), to: today };
    case 'all': return null;
  }
}

export const periodOptions = (list: PeriodPreset[]) => list.map((value) => ({ value, label: PERIOD_LABEL[value] }));
