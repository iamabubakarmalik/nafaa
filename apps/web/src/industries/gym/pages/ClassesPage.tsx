/**
 * Group classes (yoga, zumba, aerobics, boxing): the schedule, seats
 * booked, and each class's member list with booking, attendance and
 * cancel. A repeat schedule makes the same slot on chosen weekdays.
 *
 * Keys: N new class · G guide.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Calendar, CheckCircle2, GraduationCap, PlayCircle, Plus, Repeat, UserCheck, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Badge, Button, DateRangeMenu, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Switch,
  Table, TBody, Td, Textarea, Th, THead, Tr, heroIconButton, heroPrimaryButton, resolveRange, type BadgeVariant, type DateRangeValue,
} from '@/design-system/components';
import { useBusinessDayStart } from '@core/lib/business-day';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { classesApi, type ClassStatus, type ClassType, type GymClass } from '../api/classes.api';
import { trainersApi } from '../api/trainers.api';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { MemberPicker, type PickedMember } from '../components/MemberPicker';
import { EmptyList, ListSkeleton, LoadFailed, Panel } from '../components/ui';
import { GYM_KEYS, MONEY_KEYS, WEEKDAYS, apiError, num, opt, shortDate, timeOf, toIso, todayInput } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

const TYPES: ClassType[] = ['YOGA', 'ZUMBA', 'AEROBICS', 'HIIT', 'CROSSFIT', 'SPINNING', 'BOXING', 'KICKBOXING', 'MMA', 'KARATE', 'DANCE', 'PILATES', 'STRETCHING', 'BOOTCAMP', 'MEDITATION', 'BODY_PUMP', 'OTHER'];
const pretty = (t: string) => (t === 'OTHER' ? 'Doosri' : t.charAt(0) + t.slice(1).toLowerCase().replace(/_/g, ' '));
const STATUS: Record<ClassStatus, { label: string; variant: BadgeVariant }> = {
  SCHEDULED: { label: 'Aane wali', variant: 'info' }, IN_PROGRESS: { label: 'Chal rahi', variant: 'warning' }, COMPLETED: { label: 'Ho gayi', variant: 'success' },
  CANCELLED: { label: 'Cancel', variant: 'danger' }, RESCHEDULED: { label: 'Waqt badla', variant: 'default' },
};

export default function ClassesPage() {
  const can = useGymCan();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const [making, setMaking] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const r = range.preset === 'week' ? { from: todayInput(), to: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10) } : resolveRange(range, startHour);
  const q = useQuery({ queryKey: [GYM_KEYS.classes, r?.from, r?.to], queryFn: () => classesApi.list({ from: r?.from, to: r?.to }), placeholderData: (p) => p });
  const rows = q.data ?? [];
  const live = rows.filter((c) => c.status !== 'CANCELLED');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.book) { e.preventDefault(); setMaking(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      <PageHero
        title="Group classes"
        chip={<><Calendar /> Gym</>}
        meta="Yoga, zumba, aerobics — schedule aur bookings"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.book && <button type="button" onClick={() => setMaking(true)} title="Nayi class (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi class</button>}
        </>}
        stats={[
          { label: 'Classes', value: live.length },
          { label: 'Seats bhari', value: live.reduce((s, c) => s + c.currentEnrolled, 0) },
          { label: 'Kul seats', value: live.reduce((s, c) => s + c.maxParticipants, 0) },
        ]}
      />

      <KpiRow cols={3}>
        {q.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Calendar} color="#2563eb" label="Aane wali" value={rows.filter((c) => c.status === 'SCHEDULED').length} />
          <KpiCard icon={Users} color="#16a34a" label="Bookings" value={live.reduce((s, c) => s + c.currentEnrolled, 0)} hint="Is period me" />
          <KpiCard icon={Ban} color="#e11d48" label="Cancel" value={rows.filter((c) => c.status === 'CANCELLED').length} />
        </>}
      </KpiRow>

      <FilterBar><DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="week" /></FilterBar>

      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what="Classes" retry={() => q.refetch()} /> : !rows.length ? (
        <EmptyList icon={Calendar} title="Is period me koi class nahi" text="Class banayein: naam, waqt, trainer aur seats. Har hafte dohrane ke liye din chun lein.">
          {can.book && <Button onClick={() => setMaking(true)} leftIcon={<Plus className="h-4 w-4" />}>Nayi class</Button>}
        </EmptyList>
      ) : (
        <Panel>
          <Table minWidth="44rem">
            <THead><Tr><Th>Waqt</Th><Th>Class</Th><Th>Trainer</Th><Th align="right">Seats</Th><Th>Haal</Th><Th /></Tr></THead>
            <TBody>{rows.map((c) => (
              <Tr key={c.id} interactive onClick={() => setOpen(c.id)}>
                <Td><p className="font-medium text-slate-900">{shortDate(c.scheduledStart)}</p><p className="text-[0.75rem] text-slate-500">{timeOf(c.scheduledStart)} – {timeOf(c.scheduledEnd)}</p></Td>
                <Td><p className="font-medium text-slate-900">{c.name}</p><p className="text-[0.75rem] text-slate-500">{pretty(c.classType)}{c.roomName ? ` · ${c.roomName}` : ''}{c.isRecurring ? ' · har hafte' : ''}</p></Td>
                <Td>{c.trainer?.staff?.fullName ?? c.trainer?.trainerNumber ?? '—'}</Td>
                <Td align="right" className="tabular-nums">{c.currentEnrolled} / {c.maxParticipants}</Td>
                <Td><Badge size="xs" variant={STATUS[c.status].variant}>{STATUS[c.status].label}</Badge></Td>
                <Td align="right"><Button size="sm" variant="secondary">Kholein</Button></Td>
              </Tr>
            ))}</TBody>
          </Table>
        </Panel>
      )}

      {making && <ClassModal onClose={() => setMaking(false)} />}
      {open && <ClassDetail id={open} onClose={() => setOpen(null)} />}

      {guide.isOpen && (
        <PageGuide title="Group classes — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Class', text: 'Naam, waqt, trainer aur kitni seats. "Har hafte" ke din chun kar end date dein — saari classes ek sath ban jati hain.' },
            { icon: Users, color: '#16a34a', title: 'Booking', text: 'Class kholein aur member jorein. Seats bhar jayein to booking ruk jati hai.' },
            { icon: UserCheck, color: '#7c3aed', title: 'Haazri', text: 'Class me aane wale par "Aaya" dabayein.' },
            { icon: Ban, color: '#e11d48', title: 'Cancel', text: 'Class cancel karne se saari bookings bhi cancel ho jati hain — members ko bata dein.' },
          ]}
          shortcuts={[['N', 'nayi class'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function ClassModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const trainersQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'list', false], queryFn: () => trainersApi.list() });
  const [name, setName] = useState('');
  const [type, setType] = useState<ClassType>('YOGA');
  const [trainerId, setTrainerId] = useState('');
  const [date, setDate] = useState(todayInput());
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('08:00');
  const [seats, setSeats] = useState('20');
  const [room, setRoom] = useState('');
  const [free, setFree] = useState(true);
  const [price, setPrice] = useState('');
  const [repeat, setRepeat] = useState<number[]>([]);
  const [until, setUntil] = useState('');
  const [notes, setNotes] = useState('');
  const error = name.trim().length < 2 ? 'Class ka naam likhein' : start >= end ? 'Khatam ka waqt shuru se baad ho' : !(Number(seats) >= 1) ? 'Seats likhein' : repeat.length && !until ? 'Dohrane ki aakhri date chunein' : undefined;
  const save = useMutation({
    mutationFn: () => classesApi.create({
      name: name.trim(), classType: type, trainerId: trainerId || null, scheduledStart: toIso(date, start), scheduledEnd: toIso(date, end),
      maxParticipants: Number(seats), roomName: opt(room), isFree: free, memberPrice: free ? 0 : Number(price) || 0, notes: opt(notes),
      ...(repeat.length && { recurrenceDays: repeat, recurrenceEndDate: until }),
    }),
    onSuccess: (r) => { toast.success('count' in r ? `${r.count} classes ban gayin` : 'Class ban gayi'); qc.invalidateQueries({ queryKey: [GYM_KEYS.classes] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Class nahi bani')),
  });
  return (
    <Modal open onClose={onClose} size="lg" title="Nayi class"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input wrapperClassName="sm:col-span-2" label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="Subah ka yoga" maxLength={80} />
        <Select label="Class" value={type} onChange={(e) => setType(e.target.value as ClassType)} options={TYPES.map((t) => ({ value: t, label: pretty(t) }))} />
        <Input label="Din" type="date" value={date} min={todayInput()} onChange={(e) => setDate(e.target.value)} />
        <Input label="Shuru" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        <Input label="Khatam" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        <Select label="Trainer" value={trainerId} onChange={(e) => setTrainerId(e.target.value)} options={[{ value: '', label: '— Koi nahi —' }, ...(trainersQ.data ?? []).map((t) => ({ value: t.id, label: t.staff?.fullName ?? t.trainerNumber }))]} />
        <Input label="Seats" inputMode="numeric" value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ''))} />
        <Input label="Kamra" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Hall 2" hint="Marzi hai" />
        <div className="sm:col-span-3 grid gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-2">
          <Switch checked={free} onChange={(e) => setFree(e.target.checked)} label="Members ke liye free" description="Fee ho to POS par 'Class' service bechein" />
          {!free && <Input label="Member fee (likhne ke liye)" inputMode="decimal" value={price} onChange={(e) => setPrice(num(e.target.value))} hint="Booking par bill nahi banta — paisa POS par lein" />}
        </div>
        <div className="sm:col-span-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[0.8125rem] font-medium text-slate-700"><Repeat className="h-4 w-4" /> Har hafte dohrayein (marzi hai)</p>
          <div className="flex flex-wrap items-center gap-1">
            {WEEKDAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => setRepeat((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i].sort()))}
                className={`h-8 rounded-lg px-2.5 text-[0.75rem] font-medium ring-1 ${repeat.includes(i) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'}`}>{d}</button>
            ))}
            {!!repeat.length && <Input type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} aria-label="Kab tak" className="h-8 w-40" />}
          </div>
        </div>
        <Textarea wrapperClassName="sm:col-span-3" label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} hint="Marzi hai" />
        {error && name && <p className="text-[0.8125rem] text-rose-600 sm:col-span-3">{error}</p>}
      </div>
    </Modal>
  );
}

function ClassDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useGymCan();
  const q = useQuery({ queryKey: [GYM_KEYS.classes, 'one', id], queryFn: () => classesApi.getOne(id) });
  const c: GymClass | undefined = q.data;
  const [member, setMember] = useState<PickedMember | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const refresh = () => [GYM_KEYS.classes, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => { refresh(); setMember(null); setPaid(''); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const openClass = c && (c.status === 'SCHEDULED' || c.status === 'IN_PROGRESS');
  const booked = (c?.bookings ?? []).filter((b) => b.status !== 'CANCELLED');
  const fee = c && !c.isFree ? c.memberPrice : 0;
  const amount = paid === '' ? fee : Number(paid) || 0;
  return (
    <Modal open onClose={onClose} size="lg" title={c ? `${c.name} · ${shortDate(c.scheduledStart)} ${timeOf(c.scheduledStart)}` : 'Class'}
      description={c ? `${c.currentEnrolled} / ${c.maxParticipants} seats${c.trainer?.staff?.fullName ? ` · ${c.trainer.staff.fullName}` : ''}${!c.isFree && c.memberPrice ? ` · fee ${formatPKR(c.memberPrice)}` : ''}` : undefined}
      footer={c && can.book && openClass ? <>
        {cancelling
          ? <><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Wajah" className="h-9" aria-label="Wajah" /><Button variant="danger" loading={run.isPending} onClick={() => run.mutate(() => classesApi.updateStatus(c.id, 'CANCELLED', opt(reason)))}>Class cancel</Button></>
          : <Button variant="ghost" className="mr-auto" onClick={() => setCancelling(true)}>Class cancel</Button>}
        {c.status === 'SCHEDULED' && <Button variant="secondary" leftIcon={<PlayCircle className="h-4 w-4" />} onClick={() => run.mutate(() => classesApi.updateStatus(c.id, 'IN_PROGRESS'))}>Shuru</Button>}
        <Button leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={() => run.mutate(() => classesApi.updateStatus(c.id, 'COMPLETED'))}>Ho gayi</Button>
      </> : undefined}>
      {q.isLoading || !c ? <ListSkeleton rows={2} /> : (
        <div className="space-y-4">
          {can.book && openClass && c.currentEnrolled < c.maxParticipants && (
            <div className="space-y-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[16rem] flex-1"><MemberPicker label="Member jorein" value={member} onChange={setMember} /></div>
                <Button disabled={!member || amount > fee || (fee > 0 && !can.bill)} loading={run.isPending}
                  onClick={() => member && run.mutate(() => classesApi.book(c.id, { memberId: member.id, ...(fee > 0 && { paidAmount: amount, paymentMethod: method }) }))}>
                  {fee > 0 ? 'Book aur bill' : 'Book karein'}
                </Button>
              </div>
              {fee > 0 && member && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Abhi kitna mila" inputMode="decimal" value={paid} placeholder={String(fee)} onChange={(e) => setPaid(num(e.target.value))} className="text-right font-semibold tabular-nums"
                    hint={!can.bill ? 'Bill ke liye POS ki permission chahiye' : amount < fee ? `${formatPKR(fee - amount)} member ke khate me udhaar` : `Fee ${formatPKR(fee)} — bill Sales me`}
                    error={amount > fee ? `Fee sirf ${formatPKR(fee)} hai` : undefined} />
                  {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
                </div>
              )}
            </div>
          )}
          {!booked.length ? <p className="py-6 text-center text-sm text-slate-500">Abhi koi booking nahi</p> : (
            <Panel>
              <Table minWidth="30rem">
                <THead><Tr><Th>Member</Th><Th>Booking</Th><Th>Haal</Th><Th /></Tr></THead>
                <TBody>{booked.map((b) => (
                  <Tr key={b.id}>
                    <Td><p className="font-medium text-slate-900">{b.member?.customer?.name ?? b.member?.memberNumber}</p><p className="text-[0.75rem] text-slate-500">{b.member?.memberNumber}</p></Td>
                    <Td>{b.bookingNumber}{b.price > 0 && <p className="text-[0.75rem] text-slate-500">{formatPKR(b.price)}{b.paidAmount < b.price ? ` · ${formatPKR(b.price - b.paidAmount)} khate me` : ''}</p>}</Td>
                    <Td>{b.attended ? <Badge size="xs" variant="success">Aaya</Badge> : <Badge size="xs" variant="info">Booked</Badge>}</Td>
                    <Td align="right">{can.book && !b.attended && c.status !== 'CANCELLED' && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="secondary" leftIcon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => run.mutate(() => classesApi.checkInBooking(b.id))}>Aaya</Button>
                        <Button size="sm" variant="ghost" title={b.saleId ? 'Paisa wapas ke liye Sales me bill ka Return karein' : undefined} onClick={() => run.mutate(() => classesApi.cancelBooking(b.id))}>Cancel</Button>
                      </div>
                    )}</Td>
                  </Tr>
                ))}</TBody>
              </Table>
            </Panel>
          )}
        </div>
      )}
    </Modal>
  );
}
