/**
 * Cold chain log: fridge and store temperature readings, written twice a
 * day. A reading outside the limits is a breach; insulin and vaccines from a
 * fridge that broke the 2–8°C range should be checked before selling.
 * Any staff member can write a reading.
 */

import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarRange, CheckCircle2, Clock, Download, Droplets, GraduationCap, MapPin, Snowflake, Thermometer } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterMenu, Input, KpiCard, KpiRow, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr,
  ViewTabs, heroButton, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { temperatureApi, type TemperatureLog } from '../api/temperature.api';
import { t as tr } from '@core/i18n';

interface Summary {
  total: number; breaches: number; compliancePct: number; lastReadingAt: string | null;
  byLocation: Array<{ location: string; _avg: { temperature: number | null; humidity: number | null }; _min: { temperature: number | null }; _max: { temperature: number | null }; _count: { _all: number } }>;
}

/** Usual limits by place; the shop can type its own. */
const PRESETS: Array<{ location: string; min: number; max: number }> = [
  { location: 'Fridge 1', min: 2, max: 8 }, { location: 'Fridge 2', min: 2, max: 8 }, { location: 'Freezer', min: -25, max: -15 }, { location: 'Store room', min: 15, max: 30 }, { location: 'Counter', min: 15, max: 30 },
];
const when = (v: string) => new Intl.DateTimeFormat('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(v));
const apiError = (e: unknown) => { const m = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message; return (Array.isArray(m) ? m[0] : m) ?? tr('Save nahi hua'); };

function ReadingForm({ places, onSaved }: { places: string[]; onSaved: () => void }) {
  const [location, setLocation] = useState(places[0] ?? 'Fridge 1');
  const preset = PRESETS.find((p) => p.location.toLowerCase() === location.trim().toLowerCase());
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [min, setMin] = useState(String(preset?.min ?? 2));
  const [max, setMax] = useState(String(preset?.max ?? 8));
  const [notes, setNotes] = useState('');
  const pick = (l: string) => { setLocation(l); const p = PRESETS.find((x) => x.location === l); if (p) { setMin(String(p.min)); setMax(String(p.max)); } };
  const t = temp.trim() === '' ? NaN : Number(temp);
  const out = Number.isFinite(t) && ((min !== '' && t < Number(min)) || (max !== '' && t > Number(max)));
  const save = useMutation({
    mutationFn: () => temperatureApi.create({
      location: location.trim(), temperature: t, humidity: humidity ? Number(humidity) : undefined,
      minLimit: min === '' ? undefined : Number(min), maxLimit: max === '' ? undefined : Number(max), notes: notes.trim() || undefined,
    }),
    onSuccess: (r) => { toast[r.isWithinRange ? 'success' : 'error'](r.isWithinRange ? tr('Reading likh di') : tr('Temperature had se bahar — dawai check karein')); setTemp(''); setHumidity(''); setNotes(''); onSaved(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!location.trim()) { toast.error(tr('Jagah likhein')); return; }
    if (!Number.isFinite(t) || t < -80 || t > 80) { toast.error(tr('Temperature -80 se 80 ke darmiyan likhein')); return; }
    if (min !== '' && max !== '' && Number(min) > Number(max)) { toast.error(tr('Kam se kam had zyada wali se bari hai')); return; }
    save.mutate();
  };
  const all = [...new Set([...places, ...PRESETS.map((p) => p.location)])];
  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[0.9375rem] font-semibold text-slate-900"><Thermometer className="h-4 w-4 text-brand-600" />{tr('Nayi reading')}</h2>
        <p className="text-[0.75rem] text-slate-500">{tr('Subah aur shaam — dono waqt likhein')}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {all.map((l) => <button key={l} type="button" onClick={() => pick(l)} className={cn('h-8 rounded-full px-3 text-[0.8125rem] font-medium', location === l ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}>{l}</button>)}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-6">
        <Input label={tr('Jagah')} value={location} onChange={(e) => setLocation(e.target.value)} wrapperClassName="sm:col-span-2" />
        <Input label={tr('Temperature °C')} required inputMode="decimal" autoFocus value={temp} onChange={(e) => setTemp(e.target.value.replace(/[^\d.-]/g, ''))}
          error={out ? tr('Had {{min}}–{{max}}°C se bahar', { min, max }) : undefined} />
        <Input label={tr('Nami %')} inputMode="decimal" value={humidity} onChange={(e) => setHumidity(e.target.value.replace(/[^\d.]/g, ''))} />
        <Input label={tr('Kam se kam')} inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.-]/g, ''))} />
        <Input label={tr('Zyada se zyada')} inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.-]/g, ''))} />
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Input label={tr('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tr('Bijli gayi thi, fridge ka darwaza khula tha…')} wrapperClassName="min-w-[14rem] flex-1" />
        <Button type="submit" loading={save.isPending} variant={out ? 'danger' : 'primary'}>{tr('Save reading')}</Button>
      </div>
    </form>
  );
}

export default function TemperatureLogPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const guide = usePageGuide();
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const [location, setLocation] = useState('');
  const [tab, setTab] = useState<'all' | 'breach'>('all');
  const range = resolveRange(period, startHour);
  const label = range ? rangeLabel(range.from, range.to) : tr('Sab waqt');

  const { data: logs = [], isLoading, isFetching } = useQuery({
    queryKey: ['temperature-logs', range?.from, range?.to, location],
    queryFn: () => temperatureApi.list({ from: range?.from, to: range?.to, location: location || undefined }),
    refetchInterval: 60_000,
  });
  const { data: summary } = useQuery({ queryKey: ['temperature-summary'], queryFn: () => temperatureApi.summary(7) as Promise<Summary> });
  const refresh = () => ['temperature-logs', 'temperature-summary', 'pharmacy-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const places = useMemo(() => [...new Set([...(summary?.byLocation ?? []).map((b) => b.location), ...logs.map((l) => l.location).filter(Boolean) as string[]])], [summary, logs]);
  const rows = tab === 'breach' ? logs.filter((l) => !l.isWithinRange) : logs;
  const breaches = logs.filter((l) => !l.isWithinRange).length;
  const hoursSince = summary?.lastReadingAt ? (Date.now() - new Date(summary.lastReadingAt).getTime()) / 3_600_000 : null;

  const exportCsv = () => {
    if (!rows.length) { toast.error(tr('Koi reading nahi')); return; }
    downloadCsv('temperature-log.csv', [[tr('Waqt'), tr('Jagah'), tr('Temperature'), tr('Nami'), tr('Had'), tr('Theek'), tr('Kis ne'), tr('Note')],
      ...rows.map((l) => [l.logDate, l.location, l.temperature, l.humidity, `${l.minLimit ?? ''}–${l.maxLimit ?? ''}`, l.isWithinRange ? tr('Haan') : tr('Nahi'), l.recordedBy, l.notes])]);
  };
  const printDoc = (): PrintDoc => ({
    title: tr('Temperature log'), subtitle: label,
    meta: [[tr('Readings'), String(rows.length)], [tr('Had se bahar'), String(rows.filter((l) => !l.isWithinRange).length)]],
    sections: [{ kind: 'table', title: tr('Readings'), columns: [{ label: tr('Waqt') }, { label: tr('Jagah') }, { label: tr('°C'), align: 'right' }, { label: tr('Had') }, { label: tr('Theek') }],
      rows: rows.map((l) => [when(l.logDate), l.location ?? '', String(l.temperature), `${l.minLimit ?? ''}–${l.maxLimit ?? ''}`, l.isWithinRange ? tr('Haan') : tr('NAHI')]) }],
  });

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Cold chain — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Thermometer, color: '#0891b2', title: tr('Reading likhein'), text: tr('Fridge ka thermometer dekh kar subah aur shaam temperature likhein. Jagah ek dafa chunein, agli dafa yaad rehti hai.') },
            { icon: Snowflake, color: '#2563eb', title: tr('Had'), text: tr('Fridge 2–8°C, freezer −25 se −15°C, store 15–30°C. Apni had bhi likh sakte hain.') },
            { icon: AlertTriangle, color: '#e11d48', title: tr('Had se bahar'), text: tr('Laal reading par fridge ki dawai (insulin, vaccine) check karein. Dashboard par bhi warning aati hai.') },
            { icon: Download, color: '#16a34a', title: tr('Record'), text: tr('Inspector ke liye CSV ya print — poore mahine ki readings.') },
          ]}
          shortcuts={[['G', 'guide']]} />
      )}

      <PageHero title={tr('Cold chain')} chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={!summary}
        meta={tr('Fridge aur store ka temperature')}
        actions={<>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />{tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: tr('Theek readings (7 din)'), value: `${(summary?.compliancePct ?? 100).toFixed(0)}%` },
          { label: tr('Readings (7 din)'), value: String(summary?.total ?? 0) },
          { label: tr('Had se bahar (7 din)'), value: String(summary?.breaches ?? 0) },
          { label: tr('Aakhri reading'), value: summary?.lastReadingAt ? when(summary.lastReadingAt) : '—' },
        ]} />

      {hoursSince !== null && hoursSince > 12 && (
        <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[0.875rem] font-medium text-amber-900 ring-1 ring-amber-200"><Clock className="h-4 w-4" />{tr('{{hoursSince}} ghante se koi reading nahi — abhi likh dein', { hoursSince: Math.floor(hoursSince) })}</p>
      )}

      <ReadingForm places={places} onSaved={refresh} />

      {(summary?.byLocation.length ?? 0) > 0 && (
        <KpiRow cols={Math.min(5, Math.max(3, summary!.byLocation.length)) as 3 | 4 | 5}>
          {summary!.byLocation.map((b) => (
            <KpiCard key={b.location} icon={MapPin} color="#0891b2" label={b.location} value={`${(b._avg.temperature ?? 0).toFixed(1)}°C`}
              hint={tr('{{value}}° se {{value2}}° · {{_all}} readings', { value: b._min.temperature ?? '—', value2: b._max.temperature ?? '—', _all: b._count._all })} onClick={() => setLocation(location === b.location ? '' : b.location)} active={location === b.location} />
          ))}
        </KpiRow>
      )}

      <FilterBar>
        <DateRangeMenu value={period} onChange={setPeriod} startHour={startHour} label={tr('Date')} defaultPreset="week" />
        {places.length > 0 && <FilterMenu icon={MapPin} label={tr('Jagah')} value={location || 'all'} active={!!location} options={[{ value: 'all', label: tr('Sab jagah') }, ...places.map((p) => ({ value: p, label: p }))]} onChange={(v) => setLocation(v === 'all' ? '' : v)} />}
      </FilterBar>

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'all', label: tr('Sab readings'), count: logs.length }, { id: 'breach', label: tr('Had se bahar'), icon: AlertTriangle, count: breaches }]} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? <div className="space-y-2 p-4">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 rounded-xl" />)}</div>
          : rows.length === 0 ? <p className="px-6 py-14 text-center text-[0.875rem] text-slate-500">{tab === 'breach' ? tr('Is muddat me temperature hamesha had me raha') : tr('Is muddat me koi reading nahi — upar se likhein')}</p> : (
            <Table minWidth="40rem">
              <THead><Tr>
                <Th className="px-5 py-2.5">{tr('Waqt')}</Th><Th className="px-3 py-2.5">{tr('Jagah')}</Th><Th align="right" className="px-3 py-2.5">{tr('Temperature')}</Th><Th className="px-3 py-2.5">{tr('Had')}</Th><Th className="px-3 py-2.5">{tr('Kis ne')}</Th><Th className="px-5 py-2.5">{tr('Note')}</Th>
              </Tr></THead>
              <TBody>
                {rows.map((l: TemperatureLog) => (
                  <Tr key={l.id} className={cn(!l.isWithinRange && 'bg-rose-50/60')}>
                    <Td className="whitespace-nowrap px-5 py-2 text-slate-600">{when(l.logDate)}</Td>
                    <Td className="px-3 py-2 font-medium text-slate-900">{l.location ?? '—'}</Td>
                    <Td align="right" className="px-3 py-2">
                      <span className={cn('inline-flex items-center gap-1 font-bold tabular-nums', l.isWithinRange ? 'text-slate-900' : 'text-rose-700')}>
                        {l.isWithinRange ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5" />}{tr('{{temperature}}°C', { temperature: l.temperature })}
                      </span>
                      {l.humidity != null && <span className="ms-2 inline-flex items-center gap-0.5 text-[0.75rem] text-slate-500"><Droplets className="h-3 w-3" />{l.humidity}%</span>}
                    </Td>
                    <Td className="px-3 py-2 text-slate-600">{l.minLimit ?? '—'}° – {l.maxLimit ?? '—'}°</Td>
                    <Td className="px-3 py-2 text-slate-600">{l.recordedBy ?? '—'}</Td>
                    <Td className="px-5 py-2 text-slate-600">{l.notes ?? ''}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          )}
      </section>
    </PageShell>
  );
}
