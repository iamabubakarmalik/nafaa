/**
 * Date and time in Pakistan time, with quick days and the "best time"
 * suggestions from Settings for the chosen platforms.
 */

import { CalendarClock, Sparkles, X } from 'lucide-react';
import type { SocialPlatform, SocialSettings } from '@/api/admin-brand-social.api';
import { cn } from '@/lib/cn';
import { PlatformMark } from '../../lib/platforms';
import { addDays, fmtDateTime, fmtKeyShort, hhmmLabel, pkDayKey, pkTime, pkToIso, pkToday, relative } from '../../lib/time';

const fieldCls = 'h-10 rounded-lg border border-slate-300 bg-white px-3 text-[0.875rem] text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60';

export function SchedulePicker({ value, onChange, platforms, settings, disabled }: {
  value: string | null; onChange: (iso: string | null) => void; platforms: SocialPlatform[]; settings?: SocialSettings; disabled?: boolean;
}) {
  const today = pkToday();
  const day = value ? pkDayKey(value) : '';
  const time = value ? pkTime(value) : '';
  const set = (d: string, t: string) => onChange(d ? pkToIso(d, t || '10:00') : null);

  // Best times for the chosen platforms, merged by time.
  const best = new Map<string, SocialPlatform[]>();
  for (const p of platforms) for (const t of settings?.bestTimes?.[p] ?? []) best.set(t, [...(best.get(t) ?? []), p]);
  const bestTimes = [...best.entries()].sort(([a], [b]) => a.localeCompare(b));
  const quick = [0, 1, 2, 3].map((n) => addDays(today, n));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Date</span>
          <input type="date" value={day} min={today} disabled={disabled} onChange={(e) => set(e.target.value, time)} className={fieldCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[0.75rem] font-medium text-slate-600">Time (PKT)</span>
          <input type="time" value={time} step={300} disabled={disabled || !day} onChange={(e) => set(day, e.target.value)} className={fieldCls} />
        </label>
        {value && !disabled && (
          <button type="button" onClick={() => onChange(null)} className="mb-1 inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.75rem] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"><X className="h-3.5 w-3.5" />No time</button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quick.map((d, i) => (
          <button key={d} type="button" disabled={disabled} onClick={() => set(d, time || bestTimes[0]?.[0] || '10:00')}
            className={cn('h-7 rounded-full px-2.5 text-[0.75rem] font-medium ring-1 transition', d === day ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>
            {i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : fmtKeyShort(d)}
          </button>
        ))}
      </div>

      {bestTimes.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-[0.75rem] font-medium text-slate-600"><Sparkles className="h-3.5 w-3.5 text-amber-500" />Best times</p>
          <div className="flex flex-wrap gap-1.5">
            {bestTimes.map(([t, ps]) => (
              <button key={t} type="button" disabled={disabled} onClick={() => set(day || (pkTime(new Date()) < t ? today : addDays(today, 1)), t)}
                className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[0.75rem] font-semibold ring-1 transition',
                  t === time ? 'bg-amber-500 text-white ring-amber-500' : 'bg-amber-50 text-amber-800 ring-amber-200 hover:bg-amber-100')}>
                {hhmmLabel(t)}
                <span className="inline-flex -space-x-1">{ps.map((p) => <PlatformMark key={p} p={p} size={12} />)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[0.8125rem]', value ? 'bg-brand-50 text-brand-800' : 'bg-slate-50 text-slate-500')}>
        <CalendarClock className="h-4 w-4 shrink-0" />
        {value ? <span><b>{fmtDateTime(value)}</b> PKT · {relative(value)}</span> : 'Not scheduled. Pick a date, or save it as an idea for later.'}
      </p>
    </div>
  );
}
