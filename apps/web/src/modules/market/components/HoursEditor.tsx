/**
 * Opening hours per day and holiday dates for the Market profile.
 * Stored as { mon: { open: "09:00", close: "22:00", closed?: true }, ... };
 * the server reads them in Pakistan time.
 */

import { useState } from 'react';
import { CalendarX, Copy, X } from 'lucide-react';
import { Button, Input, Switch } from '@/design-system/components';
import { msg, t } from '@core/i18n';
import type { DayKey, WorkingHours } from '../api/market.api';

const DAYS: Array<{ key: DayKey; label: string }> = [
  { key: 'mon', label: msg('Peer') }, { key: 'tue', label: msg('Mangal') }, { key: 'wed', label: msg('Budh') },
  { key: 'thu', label: msg('Jumeraat') }, { key: 'fri', label: msg('Juma') }, { key: 'sat', label: msg('Hafta') },
  { key: 'sun', label: msg('Itwar') },
];

const PRESETS: Array<{ id: string; label: string; open: string; close: string }> = [
  { id: '9-9', label: msg('9 se 9'), open: '09:00', close: '21:00' },
  { id: '10-10', label: msg('10 se 10'), open: '10:00', close: '22:00' },
  { id: '24', label: msg('24 ghante'), open: '00:00', close: '23:59' },
];

export function HoursEditor({ hours, onChange, holidays, onHolidays, disabled }: {
  hours: WorkingHours; onChange: (h: WorkingHours) => void;
  holidays: string[]; onHolidays: (d: string[]) => void; disabled?: boolean;
}) {
  const [day, setDay] = useState('');
  const setDayHours = (k: DayKey, v: Partial<{ open: string; close: string; closed: boolean }>) =>
    onChange({ ...hours, [k]: { open: '09:00', close: '21:00', ...(hours[k] ?? {}), ...v } });
  const preset = (open: string, close: string) => onChange(Object.fromEntries(DAYS.map((d) => [d.key, { open, close, closed: false }])) as WorkingHours);
  const copyMonday = () => { const m = hours.mon; if (m) onChange(Object.fromEntries(DAYS.map((d) => [d.key, { ...m }])) as WorkingHours); };
  const addHoliday = () => {
    if (!day || holidays.includes(day)) return;
    onHolidays([...holidays, day].sort());
    setDay('');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((p) => (
          <Button key={p.id} type="button" size="sm" variant="secondary" disabled={disabled} onClick={() => preset(p.open, p.close)}>{t(p.label)}</Button>
        ))}
        <Button type="button" size="sm" variant="ghost" disabled={disabled || !hours.mon} onClick={copyMonday} leftIcon={<Copy className="h-3.5 w-3.5" />}>{t('Peer wala sab din par')}</Button>
      </div>

      <div className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
        {DAYS.map((d) => {
          const h = hours[d.key];
          const open = !!h && !h.closed;
          return (
            <div key={d.key} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <span className="w-20 text-sm font-medium text-slate-800">{t(d.label)}</span>
              <Switch size="sm" checked={open} disabled={disabled} label={open ? t('Khuli') : t('Band')}
                onChange={(e) => setDayHours(d.key, { closed: !e.target.checked })} />
              {open && (
                <div className="ms-auto flex items-center gap-2">
                  <Input type="time" size="sm" aria-label={t('Kholne ka waqt')} value={h?.open ?? '09:00'} disabled={disabled}
                    onChange={(e) => setDayHours(d.key, { open: e.target.value })} wrapperClassName="w-32" />
                  <span className="text-slate-400">–</span>
                  <Input type="time" size="sm" aria-label={t('Band karne ka waqt')} value={h?.close ?? '21:00'} disabled={disabled}
                    onChange={(e) => setDayHours(d.key, { close: e.target.value })} wrapperClassName="w-32" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[0.75rem] text-slate-500">{t('Raat 12 ke baad band hoti hai to band ka waqt subah ka likhein (masalan 02:00).')}</p>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><CalendarX className="h-4 w-4 text-slate-500" />{t('Chhuttiyan')}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" size="sm" aria-label={t('Chhutti ki tareekh')} value={day} disabled={disabled} onChange={(e) => setDay(e.target.value)} wrapperClassName="w-44" />
          <Button type="button" size="sm" variant="secondary" disabled={disabled || !day} onClick={addHoliday}>{t('Chhutti jorein')}</Button>
        </div>
        {holidays.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {holidays.map((h) => (
              <span key={h} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 ps-2.5 pe-1 text-[0.75rem] font-medium text-slate-700">
                <span className="dir-ltr">{new Date(`${h.slice(0, 10)}T12:00:00`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {!disabled && (
                  <button type="button" onClick={() => onHolidays(holidays.filter((x) => x !== h))} aria-label={t('Hatayein')} className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-200">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
