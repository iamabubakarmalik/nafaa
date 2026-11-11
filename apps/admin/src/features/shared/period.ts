/**
 * Period filter for admin lists: keeps the chosen preset and custom dates in
 * the URL (through useListParams) and turns them into from/to day keys for
 * the API. Pair it with the design-system DateRangeMenu (startHour 0).
 */

import { resolveRange, type DateRangeValue } from '@/design-system/components';
import { rangeLabel } from '@core/lib/dateRange';
import type { DatePreset } from '@core/lib/dateRange';

export const PERIOD_DEFAULTS = { period: 'all', from: '', to: '' };

interface ListLike {
  filters: Record<string, string>;
  setFilter: (key: any, value: string) => void;
}

export function periodValue(f: Record<string, string>): DateRangeValue {
  return { preset: (f.period || 'all') as DatePreset, custom: { from: f.from || '', to: f.to || '' } };
}

export function periodQuery(f: Record<string, string>): { from?: string; to?: string } {
  const r = resolveRange(periodValue(f), 0);
  return r ? { from: r.from, to: r.to } : {};
}

export function periodChip(f: Record<string, string>): string | null {
  const r = resolveRange(periodValue(f), 0);
  return r ? rangeLabel(r.from, r.to) : null;
}

export function setPeriod(list: ListLike, v: DateRangeValue) {
  list.setFilter('period', v.preset);
  list.setFilter('from', v.preset === 'custom' ? v.custom.from : '');
  list.setFilter('to', v.preset === 'custom' ? v.custom.to : '');
}

/** Clears the period filters. */
export function clearPeriod(list: ListLike) {
  list.setFilter('period', 'all');
  list.setFilter('from', '');
  list.setFilter('to', '');
}
