/** Cosmetics labels and small helpers shared by the pages and the counter. */

import { t } from '@core/i18n';
export const COSMETICS_KEYS = { expiry: 'cosmetics-expiry', testers: 'cosmetics-testers' } as const;

/** Reason written on a damage record when a tester is opened; the Testers page finds them by it. */
export const TESTER_REASON = 'Tester khola'; // i18n-ignore: stored value

export const SHADE_PRESETS = [
  { group: t('Foundation / concealer'), values: [t('Fair'), t('Light'), t('Light beige'), t('Medium'), t('Warm beige'), t('Tan'), t('Deep')] },
  { group: t('Lipstick'), values: [t('Nude'), t('Pink'), t('Red'), t('Maroon'), t('Coral'), t('Brown'), t('Mauve')] },
  { group: t('Size'), values: ['15 ml', '30 ml', '50 ml', '100 ml', '200 ml'] },
];

// Category names are saved and matched against existing ones, so they stay untranslated.
export const CATEGORY_SUGGESTIONS = ['Makeup', 'Skincare', 'Haircare', 'Fragrance', 'Nail', 'Tools', 'Bridal'];

/** Whole days from today to `d` (negative when past), in the shop's local days. */
export function daysFrom(d?: string | null): number | null {
  if (!d) return null;
  const a = new Date(); a.setHours(0, 0, 0, 0);
  const b = new Date(d); b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export const dayOnly = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export function apiError(e: unknown, fallback: string) {
  const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return (Array.isArray(m) ? m[0] : m) || fallback;
}
