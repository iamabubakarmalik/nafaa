/** Cosmetics labels and helpers shared by the screens and the counter (web cosmetics lib/meta.ts). */

import { msg, t } from '@/core/i18n';
import { businessDayKey, formatDate } from '@/core/format';
import { queryClient } from '@/core/query/client';
import type { StatusTone } from '@/design';
import type { DamageStatus } from '@/modules/inventory/stock/api';

export const COSMETICS_KEYS = { expiry: 'cosmetics-expiry', testers: 'cosmetics-testers' } as const;

/** Reason written on a damage record when a tester is opened; the Testers screen finds them by it. */
export const TESTER_REASON = 'Tester khola';

export const SHADE_PRESETS = [
  { group: msg('Foundation / concealer'), values: [msg('Fair'), msg('Light'), msg('Light beige'), msg('Medium'), msg('Warm beige'), msg('Tan'), msg('Deep')] },
  { group: msg('Lipstick'), values: [msg('Nude'), msg('Pink'), msg('Red'), msg('Maroon'), msg('Coral'), msg('Brown'), msg('Mauve')] },
  { group: msg('Size'), values: ['15 ml', '30 ml', '50 ml', '100 ml', '200 ml'] },
];


export const TESTER_STATUS: Record<DamageStatus, { label: string; tone: StatusTone }> = {
  REPORTED: { label: msg('Manzoori baqi'), tone: 'warning' },
  APPROVED: { label: msg('Stock se nikla'), tone: 'success' },
  WRITTEN_OFF: { label: msg('Stock se nikla'), tone: 'success' },
  REJECTED: { label: msg('Rad'), tone: 'danger' },
};

/** Whole days from today to a date (negative when past), in the shop's business days. */
export function daysFrom(d?: string | null): number | null {
  if (!d) return null;
  const a = Date.parse(`${businessDayKey()}T00:00:00Z`);
  const b = Date.parse(`${businessDayKey(d)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export const dayOnly = (d?: string | null) => (d ? formatDate(d, { year: true }) : '—');

export const expiryTone = (days: number | null): StatusTone => (days == null ? 'neutral' : days < 0 ? 'danger' : days <= 7 ? 'danger' : days <= 30 ? 'warning' : 'neutral');
export const expiryText = (days: number | null): string => (days == null ? '' : days < 0 ? t('Expire ho gaya') : days === 0 ? t('Aaj expire') : t('{{d}} din me expire', { d: days }));

export function refreshCosmetics(keys: string[]) {
  [...keys, 'damage', 'inv', 'offline'].forEach((k) => void queryClient.invalidateQueries({ queryKey: [k] }));
}
