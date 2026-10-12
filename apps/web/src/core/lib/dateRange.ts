/** Date presets shared by every page with a period filter, as business-day keys. */

import { businessDayKey } from '@core/lib/business-day';

export type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'thisMonth' | 'lastMonth' | 'year' | 'all' | 'custom';

export const DATE_PRESETS: Array<{ id: DatePreset; label: string }> = [
  { id: 'today', label: 'Aaj' },
  { id: 'yesterday', label: 'Kal' },
  { id: 'week', label: '7 din' },
  { id: 'month', label: '30 din' },
  { id: 'thisMonth', label: 'Is mahine' },
  { id: 'lastMonth', label: 'Pichhla mahina' },
  { id: 'year', label: 'Is saal' },
  { id: 'all', label: 'Sab' },
];

const shift = (d: Date, days: number) => { const x = new Date(d); x.setDate(x.getDate() + days); return x; };

export function presetRange(preset: DatePreset, startHour: number, custom?: { from: string; to: string }): { from: string; to: string } {
  const now = new Date();
  const today = businessDayKey(now, startHour);
  const key = (d: Date) => businessDayKey(d, startHour);
  switch (preset) {
    case 'yesterday': { const y = key(shift(now, -1)); return { from: y, to: y }; }
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
    case 'all': return { from: 'all', to: today };
    case 'custom': return { from: custom?.from || today, to: custom?.to || today };
    default: return { from: today, to: today };
  }
}

export function rangeLabel(from: string, to: string) {
  const f = (k: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${k}T12:00:00`));
  if (from === 'all') return `Shuru se ${f(to)} tak`;
  return from === to ? f(from) : `${f(from)} — ${f(to)}`;
}
