/**
 * New booking or walk-in. Customer (saved or a new name and phone), the
 * services with their stylist, the date and time (the stylist's bookings
 * that day are shown so a free slot is easy to find), notes and an
 * optional advance that goes on the customer's khata.
 *
 * Keys: Ctrl+Enter save · Esc back.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Clock, Plus, Scissors, Trash2, UserRound, Wallet } from 'lucide-react';
import { HeroBack } from '@core/components/HeroBack';
import { Button, Card, Input, Kbd, PageHero, PageShell, Segmented, Select, Textarea } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { appointmentsApi } from '../api/appointments.api';
import { CustomerField, emptyCustomer, useServices, useStylists, type CustomerValue } from '../components/fields';
import { CardTitle } from '../components/ui';
import { listPriceFor } from '../pos/useSalonBill';
import { SALON_KEYS, apiError, categoryLabel, dayKey, minutes, staffName, timeOf, toIso } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';

interface Line { key: string; serviceId: string; staffProfileId: string; price: string; notes: string }
let n = 0;
const newLine = (serviceId = ''): Line => ({ key: `l${n++}`, serviceId, staffProfileId: '', price: '', notes: '' });

export default function NewAppointmentPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const can = useSalonCan();
  const { services } = useServices();
  const stylists = useStylists();
  const lock = useRef(false);

  const now = new Date();
  const roundedNow = new Date(Math.ceil(now.getTime() / (15 * 60_000)) * 15 * 60_000);
  const [mode, setMode] = useState<'booking' | 'walkin'>(params.get('walkin') ? 'walkin' : 'booking');
  const [customer, setCustomer] = useState<CustomerValue>(emptyCustomer);
  const [date, setDate] = useState(params.get('date') || dayKey(now));
  const [time, setTime] = useState(params.get('time') || `${String(roundedNow.getHours()).padStart(2, '0')}:${String(roundedNow.getMinutes()).padStart(2, '0')}`);
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [guests, setGuests] = useState('1');
  const [notes, setNotes] = useState('');
  const [advance, setAdvance] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [tried, setTried] = useState(false);

  useEffect(() => {
    const sp = params.get('stylist');
    if (sp) setLines((ls) => ls.map((l, i) => (i === 0 && !l.staffProfileId ? { ...l, staffProfileId: sp } : l)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const svc = (id: string) => services.find((s) => s.id === id);
  const sty = (id: string) => stylists.all.find((s) => s.id === id);
  const priced = lines.map((l) => {
    const list = listPriceFor(svc(l.serviceId), sty(l.staffProfileId));
    return { l, list, price: l.price === '' ? list : Number(l.price) || 0, minutes: svc(l.serviceId)?.durationMinutes ?? 0 };
  });
  const total = priced.reduce((s, p) => s + p.price, 0);
  const length = priced.reduce((s, p) => s + p.minutes, 0);
  const adv = Number(advance) || 0;

  // That day's bookings of the chosen stylists, to find a free slot.
  const chosen = [...new Set(lines.map((l) => l.staffProfileId).filter(Boolean))];
  const dayQ = useQuery({
    queryKey: [SALON_KEYS.appointments, 'day', date],
    queryFn: () => appointmentsApi.calendar(new Date(`${date}T00:00:00`).toISOString(), new Date(`${date}T23:59:59`).toISOString()),
    enabled: mode === 'booking' && !!date,
    staleTime: 30_000,
  });
  const busy = useMemo(() => (dayQ.data ?? [])
    .filter((a) => !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(a.status))
    .flatMap((a) => a.services.filter((s) => s.staffProfileId && chosen.includes(s.staffProfileId)).map((s) => ({ id: `${a.id}${s.serviceId}`, who: s.staffName, from: a.scheduledStart, to: a.scheduledEnd, customer: a.customerName }))),
  [dayQ.data, chosen]);

  const errors = {
    customer: !customer.customerId && !customer.name.trim() ? 'Customer ka naam likhein ya purana customer chunein' : undefined,
    services: !lines.some((l) => l.serviceId) ? 'Kam az kam ek service chunein' : undefined,
    when: mode === 'booking' && (!date || !time) ? 'Date aur waqt chunein' : mode === 'booking' && new Date(`${date}T${time}`).getTime() < Date.now() - 15 * 60_000 ? 'Guzra hua waqt hai — abhi aaye hain to "Walk-in" chunein' : undefined,
    advance: adv < 0 || adv > total + 0.01 ? `Advance bill (${formatPKR(total)}) se zyada nahi` : adv > 0 && !customer.customerId && !customer.phone.trim() ? 'Advance ke liye customer ka phone likhein (khata khulta hai)' : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);

  const save = useMutation({
    mutationFn: async () => {
      const apt = await appointmentsApi.create({
        customerId: customer.customerId || undefined,
        customerName: customer.customerId ? undefined : customer.name.trim(),
        customerPhone: customer.customerId ? undefined : customer.phone.trim() || undefined,
        customerNotes: notes.trim() || undefined,
        walkIn: mode === 'walkin' || undefined,
        scheduledStart: mode === 'walkin' ? new Date().toISOString() : toIso(date, time),
        numberOfGuests: Number(guests) > 1 ? Number(guests) : undefined,
        services: priced.filter((p) => p.l.serviceId).map((p) => ({
          serviceId: p.l.serviceId,
          staffProfileId: p.l.staffProfileId || undefined,
          price: p.l.price === '' ? undefined : p.price,
          notes: p.l.notes.trim() || undefined,
        })),
      });
      if (adv > 0) {
        try { await appointmentsApi.addPayment(apt.id, { amount: adv, paymentMethod: method }); } catch (e) { toast.error(apiError(e, 'Booking ban gayi magar advance jama nahi hua — detail se dobara lein')); }
      }
      return apt;
    },
    onSuccess: (apt) => {
      qc.invalidateQueries({ queryKey: [SALON_KEYS.appointments] });
      toast.success(mode === 'walkin' ? `${apt.appointmentNumber} queue me aa gaya` : `${apt.appointmentNumber} book ho gaya — ${timeOf(apt.scheduledStart)}`);
      navigate(mode === 'walkin' ? '/salon/appointments?view=queue' : `/salon/appointments/${apt.id}`);
    },
    onError: (e) => toast.error(apiError(e, 'Booking nahi bani')),
    onSettled: () => { lock.current = false; },
  });
  const submit = () => {
    setTried(true);
    if (invalid) { toast.error(Object.values(errors).find(Boolean)!); return; }
    if (lock.current || save.isPending) return;
    lock.current = true; save.mutate();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Enter' || e.key === 's')) { e.preventDefault(); submit(); }
      if (e.key === 'Escape' && !isDialogOpen()) navigate(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const set = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const svcOptions = [{ value: '', label: '— Service chunein —' }, ...services.map((s) => ({ value: s.id, label: `${s.name} · ${formatPKR(Number(s.discountPrice ?? s.price))} · ${minutes(s.durationMinutes)}` }))];
  const staffOptions = [{ value: '', label: '— Koi bhi / baad me —' }, ...stylists.bookable.map((s) => ({ value: s.id, label: staffName(s) }))];

  return (
    <PageShell>
      <PageHero
        title={<HeroBack to="/salon/appointments" label="Appointments">{mode === 'walkin' ? 'Walk-in — queue me daalein' : 'Nayi booking'}</HeroBack>}
        meta={mode === 'walkin' ? 'Customer abhi aaya hai — kaam ke baad counter par bill' : 'Customer, services, stylist aur waqt'}
        actions={<span className="hidden items-center gap-1.5 text-[0.75rem] text-white/70 sm:inline-flex"><Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> save</span>}
        stats={[
          { label: 'Kul bill (andaza)', value: formatPKR(total) },
          { label: 'Waqt lagega', value: length ? minutes(length) : '—' },
          ...(mode === 'booking' && date && time ? [{ label: 'Kab', value: `${new Date(`${date}T${time}`).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })} · ${timeOf(new Date(`${date}T${time}`).toISOString())}` }] : []),
        ]}
      />
      {!can.book && <p className="rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Booking ke liye "Service bookings sambhalna" ki permission chahiye.</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <Card className="rounded-2xl" title={<CardTitle icon={UserRound}>Customer</CardTitle>}>
            <div className="space-y-3">
              <Segmented label="Kis tarah" value={mode} onChange={setMode} items={[{ value: 'booking', label: 'Booking (baad ka waqt)' }, { value: 'walkin', label: 'Walk-in (abhi aaye)' }]} />
              <CustomerField value={customer} onChange={setCustomer} error={tried ? errors.customer : undefined} hint="Purana customer chunne se us ki history aur khata saath rehta hai" />
            </div>
          </Card>

          <Card className="rounded-2xl" title={<CardTitle icon={Scissors}>Services aur stylist</CardTitle>}
            actions={<Button size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setLines((ls) => [...ls, newLine()])}>Aur service</Button>}>
            <div className="space-y-3">
              {priced.map(({ l, list }, i) => (
                <div key={l.key} className="rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_7rem_auto] sm:items-end">
                    <Select label={i === 0 ? 'Service' : undefined} value={l.serviceId} onChange={(e) => set(l.key, { serviceId: e.target.value, price: '' })} options={svcOptions}
                      error={tried && i === 0 && errors.services ? errors.services : undefined} />
                    <Select label={i === 0 ? 'Stylist' : undefined} value={l.staffProfileId} onChange={(e) => set(l.key, { staffProfileId: e.target.value })} options={staffOptions} />
                    <Input label={i === 0 ? 'Rate' : undefined} inputMode="decimal" value={l.price} placeholder={String(list || '')} onChange={(e) => set(l.key, { price: e.target.value.replace(/[^\d.]/g, '') })} />
                    <button type="button" aria-label="Hatayein" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                      className="mb-1 flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {l.serviceId && <p className="mt-1.5 text-[0.75rem] text-slate-500">{categoryLabel(svc(l.serviceId)?.category)} · {minutes(svc(l.serviceId)?.durationMinutes ?? 0)}{l.price === '' ? ' · list rate' : ' · tay shuda rate'}</p>}
                </div>
              ))}
              <p className="text-[0.75rem] text-slate-500">Rate khali chhorein to list rate lagta hai. Stylist ki commission bill bante waqt banti hai.</p>
            </div>
          </Card>

          <Card className="rounded-2xl" title={<CardTitle icon={CalendarClock}>Notes</CardTitle>}>
            <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Input label="Kitne log" inputMode="numeric" value={guests} onChange={(e) => setGuests(e.target.value.replace(/\D/g, ''))} hint="Bridal party / group" />
              <Textarea label="Customer ki baat" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000}
                placeholder="Shaadi 20 Nov, light makeup pasand, allergy…" hint="Stylist ko kaam se pehle dikhta hai" />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {mode === 'booking' && (
            <Card className="rounded-2xl" title={<CardTitle icon={Clock}>Waqt</CardTitle>}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Date" type="date" value={date} min={dayKey(now)} onChange={(e) => setDate(e.target.value)} error={tried ? errors.when : undefined} />
                  <Input label="Waqt" type="time" value={time} step={900} onChange={(e) => setTime(e.target.value)} />
                </div>
                {chosen.length > 0 && (
                  <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
                    <p className="text-[0.75rem] font-semibold text-slate-600">Is din stylist ki bookings</p>
                    {!busy.length ? <p className="mt-1 text-[0.8125rem] text-success-700">Poora din khali hai</p> : (
                      <ul className="mt-1 space-y-1">
                        {busy.map((b) => (
                          <li key={b.id} className={cn('flex justify-between gap-2 text-[0.8125rem]', time && new Date(`${date}T${time}`) < new Date(b.to) && new Date(new Date(`${date}T${time}`).getTime() + length * 60_000) > new Date(b.from) ? 'font-semibold text-rose-700' : 'text-slate-700')}>
                            <span>{timeOf(b.from)} – {timeOf(b.to)}</span><span className="truncate">{b.who} · {b.customer ?? ''}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="rounded-2xl" title={<CardTitle icon={Wallet}>Advance (marzi)</CardTitle>}>
            <div className="space-y-3">
              <Input label="Advance amount" inputMode="decimal" value={advance} onChange={(e) => setAdvance(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0"
                error={tried ? errors.advance : undefined} hint="Customer ke khate me jama hota hai aur bill me khud kat jata hai" />
              {adv > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>Wapas</Button>
            <Button fullWidth size="lg" loading={save.isPending} disabled={!can.book} onClick={submit}>
              {mode === 'walkin' ? 'Queue me daalein' : 'Booking pakki karein'}
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
