/** Period presets (same ids and words as the web date menu), as business-day keys in Pakistan time. */

import { businessDayKey } from '@/core/format';
import { msg } from '@/core/i18n';
import { useOfflineManifest } from '@/core/offline';

export type Preset = 'today' | 'week' | 'month' | 'thisMonth' | 'lastMonth' | 'year';

export const PRESETS: Array<{ value: Preset; label: string }> = [
  { value: 'today', label: msg('Aaj') },
  { value: 'week', label: msg('7 din') },
  { value: 'month', label: msg('30 din') },
  { value: 'thisMonth', label: msg('Is mahine') },
  { value: 'lastMonth', label: msg('Pichhla mahina') },
  { value: 'year', label: msg('Is saal') },
];

const shift = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };

export function presetRange(preset: Preset, startHour = 0): { from: string; to: string } {
  const now = new Date();
  const key = (d: Date) => businessDayKey(d, startHour);
  const today = key(now);
  switch (preset) {
    case 'week': return { from: key(shift(now, -6)), to: today };
    case 'month': return { from: key(shift(now, -29)), to: today };
    case 'thisMonth': return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'lastMonth': {
      const [y, m] = today.split('-').map(Number);
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      const mm = String(pm).padStart(2, '0');
      return { from: `${py}-${mm}-01`, to: `${py}-${mm}-${String(last).padStart(2, '0')}` };
    }
    case 'year': return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default: return { from: today, to: today };
  }
}

/** The shop's business-day start hour from the last download (0 = midnight). */
export function useDayStart(): number {
  const m = useOfflineManifest();
  return (m.data as { dayStartHour?: number } | undefined)?.dayStartHour ?? 0;
}
