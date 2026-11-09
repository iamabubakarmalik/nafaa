/**
 * Content calendar: month grid or week columns. Each day shows its festival
 * or sale day and its posts (status dot, time, platforms); clicking an empty
 * part of a day starts a new post on that day.
 */

import { Plus } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';
import type { Festival, SocialPost } from './social.api';
import { PlatformMark, STATUS_META, addDaysKey } from './platforms';

const WEEKDAYS = [t('Pir'), t('Mangal'), t('Budh'), t('Jumeraat'), t('Juma'), t('Hafta'), t('Itwar')];

/** Monday on or before a day. */
export const mondayOf = (key: string) => {
  const d = new Date(`${key}T12:00:00`);
  return addDaysKey(key, -((d.getDay() + 6) % 7));
};

/** The days the month view shows (whole weeks around the month). */
export function monthGrid(anchor: string): string[] {
  const first = `${anchor.slice(0, 7)}-01`;
  const start = mondayOf(first);
  const next = new Date(`${first}T12:00:00`);
  next.setMonth(next.getMonth() + 1);
  const last = addDaysKey(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`, -1);
  const days: string[] = [];
  for (let d = start; d <= last || days.length % 7 !== 0; d = addDaysKey(d, 1)) days.push(d);
  return days;
}

export const weekDays = (anchor: string) => Array.from({ length: 7 }, (_, i) => addDaysKey(mondayOf(anchor), i));

const timeOf = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' }) : '');

export function CalendarView({ view, days, anchorMonth, today, posts, festivals, onOpen, onNew }: {
  view: 'month' | 'week';
  days: string[];
  anchorMonth: string;
  today: string;
  posts: SocialPost[];
  festivals: Festival[];
  onOpen: (p: SocialPost) => void;
  onNew: (day: string) => void;
}) {
  const byDay = new Map<string, SocialPost[]>();
  for (const p of posts) if (p.day) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);
  const festOf = new Map<string, Festival[]>();
  for (const f of festivals) festOf.set(f.date, [...(festOf.get(f.date) ?? []), f]);

  return (
    <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
      <div className={cn('grid min-w-[44rem] grid-cols-7')}>
        {WEEKDAYS.map((d) => <div key={d} className="border-b border-slate-100 px-2 py-2 text-center text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">{d}</div>)}
        {days.map((day) => {
          const list = byDay.get(day) ?? [];
          const fest = festOf.get(day) ?? [];
          const out = view === 'month' && day.slice(0, 7) !== anchorMonth;
          const max = view === 'month' ? 3 : 12;
          return (
            <div key={day} role="button" tabIndex={0} onClick={() => onNew(day)} onKeyDown={(e) => { if (e.key === 'Enter') onNew(day); }}
              aria-label={t('{{day}} par nayi post', { day })}
              className={cn('group relative flex flex-col gap-1 border-b border-e border-slate-100 p-1.5 text-start outline-none transition hover:bg-slate-50/80 focus-visible:ring-2 focus-visible:ring-sky-400',
                view === 'month' ? 'min-h-[7.5rem]' : 'min-h-[22rem]', out && 'bg-slate-50/60')}>
              <div className="flex items-center justify-between">
                <span className={cn('inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[0.75rem] font-semibold tabular-nums',
                  day === today ? 'bg-slate-900 text-white' : out ? 'text-slate-300' : 'text-slate-600')}>
                  {Number(day.slice(8))}
                </span>
                <Plus className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" />
              </div>
              {fest.map((f) => (
                <span key={f.key} title={`${f.idea}${f.approx ? ` · ${t('chand ke hisaab se 1 din aage peeche')}` : ''}`}
                  className="truncate rounded-md bg-rose-50 px-1.5 py-0.5 text-[0.625rem] font-semibold text-rose-700 ring-1 ring-rose-100">
                  {f.name}{f.approx ? ' *' : ''}
                </span>
              ))}
              {list.slice(0, max).map((p) => (
                <button key={p.id} type="button" onClick={(e) => { e.stopPropagation(); onOpen(p); }}
                  className="flex w-full items-center gap-1 rounded-md bg-slate-50 px-1.5 py-1 text-start text-[0.6875rem] ring-1 ring-slate-200/70 hover:bg-white hover:shadow-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: STATUS_META[p.status].dot }} aria-label={STATUS_META[p.status].label} />
                  <span className="shrink-0 tabular-nums text-slate-500">{timeOf(p.scheduledAt)}</span>
                  <span className={cn('min-w-0 flex-1 truncate font-medium text-slate-800', p.status === 'POSTED' && 'text-slate-500 line-through decoration-slate-300')}>
                    {p.title || p.caption.split('\n')[0] || t('Post')}
                  </span>
                  <span className="flex shrink-0 -space-x-1">{p.platforms.slice(0, 3).map((pl) => <PlatformMark key={pl} p={pl} size={12} />)}</span>
                </button>
              ))}
              {list.length > max && <span className="px-1 text-[0.625rem] font-semibold text-slate-500">{t('+{{count}} aur', { count: list.length - max })}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
