/**
 * Day board by stylist: one column per stylist, the day's bookings as
 * blocks at their time, a red line at "now", and the week strip to jump
 * between days. Clicking an empty slot books that stylist at that time;
 * clicking a block opens the appointment.
 *
 * Keys: ← → day · T today · N new booking · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus, ChevronLeft, ChevronRight, GraduationCap, ListChecks, MousePointerClick, Scissors, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { Button, Kbd, PageHero, PageShell, Skeleton, heroButton, heroIconButton, heroPrimaryButton } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { appointmentsApi, type Appointment } from '../api/appointments.api';
import { useStylists } from '../components/fields';
import { EmptyList } from '../components/ui';
import { SALON_KEYS, STATUS, dayKey, staffName, timeOf } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

const START = 8;
const END = 23;
const ROW = 48; // pixels per hour
const DAY_MS = 86_400_000;

const atMidnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function CalendarViewPage() {
  const navigate = useNavigate();
  const can = useSalonCan();
  const guide = usePageGuide();
  const stylists = useStylists();
  const [day, setDay] = useState(() => atMidnight(new Date()));
  const weekStart = useMemo(() => new Date(day.getTime() - day.getDay() * DAY_MS), [day]);

  const weekQ = useQuery({
    queryKey: [SALON_KEYS.appointments, 'calendar', dayKey(weekStart)],
    queryFn: () => appointmentsApi.calendar(weekStart.toISOString(), new Date(weekStart.getTime() + 7 * DAY_MS - 1).toISOString()),
    refetchInterval: 60_000,
  });
  const all = weekQ.data ?? [];
  const today = all.filter((a) => dayKey(new Date(a.scheduledStart)) === dayKey(day) && a.status !== 'CANCELLED');
  const columns = stylists.bookable.length ? stylists.bookable : stylists.all;
  const unassigned = today.filter((a) => !a.services.some((s) => s.staffProfileId));
  const cols = [...columns.map((s) => ({ id: s.id, name: staffName(s) })), ...(unassigned.length ? [{ id: '', name: 'Bina stylist' }] : [])];

  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);
  const isToday = dayKey(day) === dayKey(now);
  const nowTop = ((now.getHours() + now.getMinutes() / 60) - START) * ROW;

  const shift = (n: number) => setDay((d) => new Date(d.getTime() + n * DAY_MS));
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'ArrowLeft') shift(-1);
      if (e.key === 'ArrowRight') shift(1);
      if (e.key === 't' || e.key === 'T') setDay(atMidnight(new Date()));
      if ((e.key === 'n' || e.key === 'N') && can.book) navigate(`/salon/appointments/new?date=${dayKey(day)}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const blocksFor = (colId: string) => today.filter((a) => (colId ? a.services.some((s) => s.staffProfileId === colId) : !a.services.some((s) => s.staffProfileId)));
  const book = (colId: string, hour: number) => {
    if (!can.book) return;
    const time = `${String(Math.floor(hour)).padStart(2, '0')}:${hour % 1 ? '30' : '00'}`;
    navigate(`/salon/appointments/new?date=${dayKey(day)}&time=${time}${colId ? `&stylist=${colId}` : ''}`);
  };

  return (
    <PageShell>
      <PageHero
        title="Calendar"
        chip={<><Scissors /> {day.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long' })}</>}
        meta="Har stylist ka din — khali jagah par click se booking"
        busy={weekQ.isFetching && !weekQ.isLoading}
        actions={<>
          <Link to="/salon/appointments" className={heroButton}><ListChecks className="h-4 w-4" /><span className="hidden sm:inline">List</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.book && <Link to={`/salon/appointments/new?date=${dayKey(day)}`} className={heroPrimaryButton}><CalendarPlus className="h-4 w-4" /> Booking</Link>}
        </>}
        stats={[
          { label: 'Is din bookings', value: today.length },
          { label: 'Ho gaye', value: today.filter((a) => a.status === 'COMPLETED').length },
          { label: 'Is hafte', value: all.filter((a) => a.status !== 'CANCELLED').length },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-white p-2 shadow-sm ring-1 ring-slate-200/80">
        <Button size="sm" variant="ghost" aria-label="Pichla din" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)).map((d) => {
            const n = all.filter((a) => dayKey(new Date(a.scheduledStart)) === dayKey(d) && a.status !== 'CANCELLED').length;
            const active = dayKey(d) === dayKey(day);
            return (
              <button key={d.toISOString()} type="button" onClick={() => setDay(d)}
                className={cn('flex min-w-[4.5rem] flex-1 flex-col items-center rounded-2xl px-2 py-1.5 transition', active ? 'bg-slate-900 text-white' : dayKey(d) === dayKey(now) ? 'bg-brand-50 text-brand-800' : 'hover:bg-slate-50')}>
                <span className="text-[0.6875rem] opacity-80">{d.toLocaleDateString('en-PK', { weekday: 'short' })}</span>
                <span className="text-[0.9375rem] font-bold">{d.getDate()}</span>
                <span className={cn('text-[0.625rem]', active ? 'text-white/80' : 'text-slate-500')}>{n ? `${n} booking` : '—'}</span>
              </button>
            );
          })}
        </div>
        <Button size="sm" variant="ghost" aria-label="Agla din" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
        {!isToday && <Button size="sm" variant="secondary" onClick={() => setDay(atMidnight(new Date()))}>Aaj</Button>}
      </div>

      {weekQ.isLoading || stylists.loading ? <Skeleton className="h-[32rem] rounded-3xl" /> : !cols.length ? (
        <EmptyList icon={Users} title="Koi stylist nahi" text="Pehle Staff page par stylist banayein — phir har stylist ka din yahan dikhta hai.">
          <Link to="/salon/staff" className="inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white">Staff kholein</Link>
        </EmptyList>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <div className="flex" style={{ minWidth: `${4 + cols.length * 11}rem` }}>
            <div className="w-16 shrink-0 border-r border-slate-100">
              <div className="h-10 border-b border-slate-100" />
              <div className="relative" style={{ height: (END - START) * ROW }}>
                {Array.from({ length: END - START }, (_, i) => (
                  <span key={i} className="absolute right-2 -translate-y-1/2 text-[0.6875rem] text-slate-400" style={{ top: i * ROW }}>{((START + i) % 12) || 12}{START + i < 12 ? 'am' : 'pm'}</span>
                ))}
              </div>
            </div>
            {cols.map((c) => (
              <div key={c.id || 'none'} className="min-w-[11rem] flex-1 border-r border-slate-100 last:border-0">
                <div className="flex h-10 items-center justify-center border-b border-slate-100 px-2 text-[0.8125rem] font-semibold text-slate-800"><span className="truncate">{c.name}</span></div>
                <div className="relative" style={{ height: (END - START) * ROW }}>
                  {Array.from({ length: (END - START) * 2 }, (_, i) => (
                    <button key={i} type="button" aria-label={`${c.name} ${START + i / 2} baje booking`} onClick={() => book(c.id, START + i / 2)}
                      className={cn('absolute inset-x-0 block hover:bg-brand-50/60', i % 2 === 0 ? 'border-t border-slate-100' : 'border-t border-dashed border-slate-50')}
                      style={{ top: (i * ROW) / 2, height: ROW / 2 }} />
                  ))}
                  {blocksFor(c.id).map((a) => <Block key={a.id} a={a} />)}
                  {isToday && nowTop > 0 && nowTop < (END - START) * ROW && <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-rose-500" style={{ top: nowTop }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {guide.isOpen && (
        <PageGuide title="Calendar — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Users, color: '#db2777', title: 'Har stylist ka column', text: 'Har column ek stylist ka din hai. Rang se halat: neela booked, jamni aa gaye, narangi chair par, hara ho gaya, laal nahi aaye.' },
            { icon: MousePointerClick, color: '#7c3aed', title: 'Khali jagah = booking', text: 'Kisi stylist ke khali waqt par click karein — booking form us stylist aur waqt ke saath khulta hai.' },
            { icon: CalendarPlus, color: '#0891b2', title: 'Din badlein', text: 'Upar hafte ki patti se din chunein, ya ← → dabayein. "Aaj" se wapas aaj par.' },
          ]}
          shortcuts={[['←', 'pichla din'], ['→', 'agla din'], ['T', 'aaj'], ['N', 'nayi booking'], ['G', 'guide']]}
        />
      )}
      <p className="hidden text-center text-[0.75rem] text-slate-500 sm:block"><Kbd>←</Kbd> <Kbd>→</Kbd> din · <Kbd>T</Kbd> aaj · <Kbd>N</Kbd> booking</p>
    </PageShell>
  );
}

function Block({ a }: { a: Appointment }) {
  const s = new Date(a.scheduledStart);
  const e = new Date(a.scheduledEnd);
  const top = Math.max(((s.getHours() + s.getMinutes() / 60) - START) * ROW, 0);
  const height = Math.max(((e.getTime() - s.getTime()) / 3_600_000) * ROW, 22);
  const st = STATUS[a.status];
  return (
    <Link to={`/salon/appointments/${a.id}`} className="absolute inset-x-1 z-[5] overflow-hidden rounded-lg px-2 py-1 text-[0.75rem] shadow-sm ring-1 hover:z-20 hover:shadow-md"
      style={{ top, height, background: `${st.color}1a`, borderLeft: `3px solid ${st.color}`, color: '#0f172a' }}
      title={`${a.customerName ?? 'Walk-in'} · ${timeOf(a.scheduledStart)} – ${timeOf(a.scheduledEnd)} · ${st.label}`}>
      <p className="truncate font-semibold">{a.customerName || 'Walk-in'}</p>
      <p className="truncate text-slate-600">{timeOf(a.scheduledStart)} · {a.services.map((x) => x.serviceName).join(', ')}</p>
    </Link>
  );
}
