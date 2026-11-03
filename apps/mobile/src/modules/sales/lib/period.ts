/**
 * Date periods for the sales, customers, bookings and loyalty screens. A
 * period is a pair of business-day keys (YYYY-MM-DD, Pakistan calendar, the
 * shop's day start respected); `from: 'all'` means no lower bound.
 */

import { useMemo, useState } from 'react';
import { businessDayKey, formatDate, pkParts } from '@/core/format';
import { msg, t } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';

export type PeriodPreset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'year' | 'all' | 'custom';

export const PERIOD_PRESETS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: msg('Aaj') },
  { value: 'yesterday', label: msg('Kal') },
  { value: 'week', label: msg('7 din') },
  { value: 'month', label: msg('Is mahine') },
  { value: 'lastMonth', label: msg('Pichla mahina') },
  { value: 'year', label: msg('Is saal') },
  { value: 'all', label: msg('Sab') },
];

const ymd = (y: number, m: number, d: number) => {
  const x = new Date(Date.UTC(y, m, d));
  return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-${String(x.getUTCDate()).padStart(2, '0')}`;
};

export interface Period { from: string; to: string }

/** Shop's day start hour (0 when the offline copy is not ready yet). */
export function useDayStart(): number {
  return useOfflineManifest().data?.dayStartHour ?? 0;
}

export function periodOf(preset: PeriodPreset, startHour: number, custom?: { from?: string; to?: string }): Period {
  const today = businessDayKey(Date.now(), startHour);
  const [y, m, d] = today.split('-').map(Number);
  switch (preset) {
    case 'today': return { from: today, to: today };
    case 'yesterday': { const k = ymd(y, m - 1, d - 1); return { from: k, to: k }; }
    case 'week': return { from: ymd(y, m - 1, d - 6), to: today };
    case 'month': return { from: ymd(y, m - 1, 1), to: today };
    case 'lastMonth': return { from: ymd(y, m - 2, 1), to: ymd(y, m - 1, 0) };
    case 'year': return { from: ymd(y, 0, 1), to: today };
    case 'custom': return { from: custom?.from || today, to: custom?.to || custom?.from || today };
    default: return { from: 'all', to: today };
  }
}

/** Short text for a period ("Today", "3 Nov to 9 Nov"). */
export function periodLabel(p: Period, preset: PeriodPreset): string {
  const known = PERIOD_PRESETS.find((x) => x.value === preset);
  if (known && preset !== 'custom') return t(known.label);
  if (p.from === 'all') return t('Sab');
  const f = shortKey(p.from);
  return p.from === p.to ? f : `${f} – ${shortKey(p.to)}`;
}

export const shortKey = (k: string) => formatDate(new Date(`${k}T12:00:00+05:00`));

/** Key of a Date (picked in the date field) as a business-day key. */
export const keyOfDate = (d: Date) => {
  const p = pkParts(d);
  return ymd(p.year, p.month, p.day);
};

/** Period state shared by the screens: a preset or a custom pair of days. */
export function usePeriod(initial: PeriodPreset = 'today') {
  const startHour = useDayStart();
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [custom, setCustom] = useState<{ from?: string; to?: string }>({});
  const period = useMemo(() => periodOf(preset, startHour, custom), [preset, startHour, custom]);
  return { preset, setPreset, custom, setCustom, period, startHour, label: periodLabel(period, preset) };
}
