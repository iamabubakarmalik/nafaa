/**
 * Period picker used across pages: presets (today, 7 days, this month…)
 * plus custom from/to dates, on business days. Built on FilterMenu, so it
 * opens as a bottom sheet on phones.
 */

import { CalendarRange } from 'lucide-react';
import { businessDayKey } from '@core/lib/business-day';
import { DATE_PRESETS, presetRange, rangeLabel, type DatePreset } from '@core/lib/dateRange';
import { FilterMenu } from './FilterMenu';

export interface DateRangeValue { preset: DatePreset; custom: { from: string; to: string } }

/** The business-day keys a value covers; null for "all time". */
export function resolveRange(v: DateRangeValue, startHour: number): { from: string; to: string } | null {
  if (v.preset === 'all') return null;
  return presetRange(v.preset, startHour, v.custom);
}

export function DateRangeMenu({ value, onChange, startHour, label = 'Period', allowAll = true, defaultPreset = 'all' }: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  startHour: number;
  label?: string;
  /** Offer "Sab" (no period). */
  allowAll?: boolean;
  /** The preset that counts as "not filtered" (not highlighted). */
  defaultPreset?: DatePreset;
}) {
  const presets = DATE_PRESETS.filter((p) => allowAll || p.id !== 'all');
  const range = resolveRange(value, startHour);
  const today = businessDayKey(new Date(), startHour);
  return (
    <FilterMenu icon={CalendarRange} label={label} value={value.preset} active={value.preset !== defaultPreset} width="w-72"
      options={[
        ...presets.map((p) => ({ value: p.id, label: p.label, hint: p.id === value.preset && range ? rangeLabel(range.from, range.to) : undefined })),
        { value: 'custom' as const, label: 'Apni date', hint: value.preset === 'custom' && range ? rangeLabel(range.from, range.to) : 'Neeche se chunein' },
      ]}
      onChange={(preset) => onChange({ ...value, preset })}
      footer={() => (
        <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-100 p-2 pt-3">
          {(['from', 'to'] as const).map((k) => (
            <label key={k} className="text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
              {k === 'from' ? 'Se' : 'Tak'}
              <input type="date" max={today} value={value.custom[k] || (range?.[k] ?? '')}
                onChange={(e) => onChange({ preset: 'custom', custom: { from: value.custom.from || range?.from || today, to: value.custom.to || range?.to || today, [k]: e.target.value } })}
                className="mt-1 block h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-[0.8125rem] font-normal normal-case tracking-normal text-slate-900" />
            </label>
          ))}
        </div>
      )} />
  );
}
