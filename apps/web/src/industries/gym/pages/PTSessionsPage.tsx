/**
 * Personal training: sessions booked with a trainer, single (billed when
 * done; unpaid part on khata), from the member's plan, or from a PT
 * package sold ahead (billed at sale; each done session counts as used).
 * Completing a session earns the trainer's commission. A voided session
 * bill cancels the session and takes the commission back.
 *
 * Keys: N book · P sell package · / search · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CalendarClock, CheckCircle2, Dumbbell, Flame, GraduationCap, Package, PlayCircle, Plus, UserX, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Badge, Button, DateRangeMenu, FilterBar, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch,
  Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { useBusinessDayStart } from '@core/lib/business-day';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { ptApi, type PTSession } from '../api/personal-training.api';
import { trainersApi } from '../api/trainers.api';
import { MemberPicker, type PickedMember } from '../components/MemberPicker';
import { PACKAGE_STATUS, PackagesPanel, SellPackageModal } from '../components/PtPackages';
import { EmptyList, ListSkeleton, LoadFailed, Panel } from '../components/ui';
import { GYM_KEYS, MONEY_KEYS, PT_STATUS, apiError, num, opt, shortDate, timeOf, toIso, todayInput } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

export default function PTSessionsPage() {
  const qc = useQueryClient();
  const can = useGymCan();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const searchRef = useRef<HTMLInputElement>(null);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'week', custom: { from: '', to: '' } });
  const [trainerId, setTrainerId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState<PTSession | null>(null);
  const [cancel, setCancel] = useState<PTSession | null>(null);
  const [tab, setTab] = useState<'sessions' | 'packages'>('sessions');
  const [selling, setSelling] = useState(false);
  const [pkgStatus, setPkgStatus] = useState('ACTIVE');
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  // "7 din" here means the coming week: sessions are booked ahead.
  const r = range.preset === 'week' ? { from: todayInput(), to: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10) } : resolveRange(range, startHour);
  const listQ = useQuery({
    queryKey: [GYM_KEYS.pt, r?.from, r?.to, trainerId, status, query],
    queryFn: () => ptApi.list({ from: r?.from, to: r?.to, trainerId: trainerId || undefined, status: status || undefined, search: query || undefined }),
    placeholderData: (p) => p,
  });
  const trainersQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'list', false], queryFn: () => trainersApi.list() });
  const rows = listQ.data ?? [];
  const count = (s: string) => rows.filter((x) => x.status === s).length;
  const refresh = () => [GYM_KEYS.pt, GYM_KEYS.trainers, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const move = useMutation({
    mutationFn: ({ id, s }: { id: string; s: string }) => ptApi.updateStatus(id, { status: s }),
    onSuccess: () => { toast.success('Session update ho gaya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Update nahi hua')),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.book) { e.preventDefault(); setBooking(true); }
      if ((e.key === 'p' || e.key === 'P') && can.book && can.bill) { e.preventDefault(); setSelling(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      <PageHero
        title="Personal training"
        chip={<><Flame /> Gym</>}
        meta="Trainer ke saath session — single, plan ke PT se, ya PT package se"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.book && can.bill && <button type="button" onClick={() => setSelling(true)} title="PT package bechein (P)" className={heroIconButton}><Package className="h-4 w-4" /></button>}
          {can.book && <button type="button" onClick={() => setBooking(true)} title="Session book karein (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Session book</button>}
        </>}
        stats={[
          { label: 'Booked', value: count('SCHEDULED') },
          { label: 'Ho gaye', value: count('COMPLETED') },
          { label: 'Single ki fee', value: formatPKR(rows.filter((x) => x.status === 'COMPLETED' && !x.isFromPackage).reduce((s, x) => s + x.price, 0)) },
        ]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CalendarClock} color="#2563eb" label="Booked" value={count('SCHEDULED')} onClick={() => setStatus(status === 'SCHEDULED' ? '' : 'SCHEDULED')} active={status === 'SCHEDULED'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label="Ho gaye" value={count('COMPLETED')} hint={`Commission ${formatPKR(rows.reduce((s, x) => s + x.commissionAmount, 0))}`} onClick={() => setStatus(status === 'COMPLETED' ? '' : 'COMPLETED')} active={status === 'COMPLETED'} />
          <KpiCard icon={UserX} color="#64748b" label="Nahi aaye" value={count('NO_SHOW')} onClick={() => setStatus(status === 'NO_SHOW' ? '' : 'NO_SHOW')} active={status === 'NO_SHOW'} />
          <KpiCard icon={Ban} color="#e11d48" label="Cancel" value={count('CANCELLED')} onClick={() => setStatus(status === 'CANCELLED' ? '' : 'CANCELLED')} active={status === 'CANCELLED'} />
        </>}
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab} tabs={[{ id: 'sessions', label: 'Sessions', icon: Flame }, { id: 'packages', label: 'PT packages', icon: Package }]}
        hint={<>{can.book && <><Kbd>N</Kbd> book · </>}{can.book && can.bill && <><Kbd>P</Kbd> package · </>}<Kbd>/</Kbd> search</>} />

      {tab === 'packages' ? <>
        <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Member ka naam, phone ya PTP number…" />}>
          <FilterMenu icon={Package} label={pkgStatus ? PACKAGE_STATUS[pkgStatus as keyof typeof PACKAGE_STATUS].label : 'Sab'} value={pkgStatus} active={!!pkgStatus} onChange={setPkgStatus}
            options={[{ value: '', label: 'Sab' }, ...Object.entries(PACKAGE_STATUS).map(([value, v]) => ({ value, label: v.label }))]} />
        </FilterBar>
        <PackagesPanel search={query} status={pkgStatus} onSell={() => setSelling(true)} />
      </> : <>
      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Member ka naam, phone ya PT number…" />}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="week" />
        <FilterMenu icon={Dumbbell} label={trainersQ.data?.find((t) => t.id === trainerId)?.staff?.fullName ?? 'Trainer'} value={trainerId} active={!!trainerId} onChange={setTrainerId}
          options={[{ value: '', label: 'Sab trainers' }, ...(trainersQ.data ?? []).map((t) => ({ value: t.id, label: t.staff?.fullName ?? t.trainerNumber }))]} />
      </FilterBar>
      <p className="text-[0.75rem] text-slate-500">"7 din" = aane wala hafta</p>

      {listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what="Sessions" retry={() => listQ.refetch()} /> : !rows.length ? (
        <EmptyList icon={Flame} title="Is period me koi session nahi" text="Member, trainer aur waqt chun kar session book karein. Har hafte ka same waqt bhi ek sath book ho sakta hai.">
          {can.book && <Button onClick={() => setBooking(true)} leftIcon={<Plus className="h-4 w-4" />}>Session book</Button>}
        </EmptyList>
      ) : (
        <Panel>
          <Table minWidth="52rem">
            <THead><Tr><Th>Waqt</Th><Th>Member</Th><Th>Trainer</Th><Th align="right">Fee</Th><Th>Haal</Th><Th /></Tr></THead>
            <TBody>{rows.map((s) => {
              const st = PT_STATUS[s.status] ?? { label: s.status, variant: 'default' as const };
              const open = s.status === 'SCHEDULED' || s.status === 'IN_PROGRESS';
              return (
                <Tr key={s.id}>
                  <Td><p className="font-medium text-slate-900">{shortDate(s.scheduledStart)} · {timeOf(s.scheduledStart)}</p><p className="text-[0.75rem] text-slate-500">{s.sessionNumber} · {s.durationMinutes} min</p></Td>
                  <Td>{s.member ? <Link to={`/gym/members/${s.member.id}`} className="font-medium text-slate-900 hover:underline">{s.member.customer?.name ?? s.member.memberNumber}</Link> : '—'}{s.focusArea && <p className="text-[0.75rem] text-slate-500">{s.focusArea}</p>}</Td>
                  <Td>{s.trainer?.staff?.fullName ?? s.trainer?.trainerNumber}</Td>
                  <Td align="right" className="tabular-nums">{s.isFromPackage ? <Badge size="xs" variant="info">{s.saleId ? 'Package se' : 'Plan se'}</Badge> : formatPKR(s.price)}{s.status === 'COMPLETED' && !s.isFromPackage && s.paidAmount < s.price && <p className="text-[0.6875rem] text-amber-700">{formatPKR(s.price - s.paidAmount)} khate me</p>}</Td>
                  <Td><Badge size="xs" variant={st.variant}>{st.label}</Badge>{s.cancellationReason && <p className="max-w-[12rem] truncate text-[0.6875rem] text-slate-500">{s.cancellationReason}</p>}</Td>
                  <Td align="right">
                    {can.book && (
                      <div className="flex justify-end gap-1.5">
                        {s.status === 'SCHEDULED' && <Button size="sm" variant="ghost" leftIcon={<PlayCircle className="h-3.5 w-3.5" />} onClick={() => move.mutate({ id: s.id, s: 'IN_PROGRESS' })}>Shuru</Button>}
                        {open && <Button size="sm" leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => (s.isFromPackage || s.price <= 0 ? move.mutate({ id: s.id, s: 'COMPLETED' }) : setDone(s))}>Ho gaya</Button>}
                        {s.status === 'SCHEDULED' && <Button size="sm" variant="ghost" onClick={() => move.mutate({ id: s.id, s: 'NO_SHOW' })}>Nahi aaya</Button>}
                        {s.status === 'NO_SHOW' && <Button size="sm" variant="ghost" onClick={() => move.mutate({ id: s.id, s: 'SCHEDULED' })}>Dobara book</Button>}
                        {(open || s.status === 'NO_SHOW') && <Button size="sm" variant="ghost" onClick={() => setCancel(s)}>Cancel</Button>}
                      </div>
                    )}
                  </Td>
                </Tr>
              );
            })}</TBody>
          </Table>
        </Panel>
      )}
      </>}

      {selling && <SellPackageModal onClose={() => setSelling(false)} />}
      {booking && <BookModal onClose={() => setBooking(false)} onDone={refresh} />}
      {done && <CompleteModal session={done} onClose={() => setDone(null)} onDone={refresh} />}
      {cancel && <CancelSessionModal session={cancel} onClose={() => setCancel(null)} onDone={refresh} />}

      {guide.isOpen && (
        <PageGuide title="Personal training — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Book', text: 'Member, trainer aur waqt chunein. Plan ya PT package me sessions hon to "Package se" — alag bill nahi banta. Warna trainer ke rate par single session.' },
            { icon: Package, color: '#7c3aed', title: 'PT package', text: 'Kai sessions ek saath bechein (P). Bill abhi banta hai, baqi paisa khate me. Har session hone par ek session use hota hai; din guzar jayein to bache sessions khatam.' },
            { icon: CheckCircle2, color: '#16a34a', title: 'Ho gaya', text: 'Single session ka bill isi waqt Sales me banta hai; jo paisa na mile woh khate me. Trainer ki commission bhi isi waqt banti hai.' },
            { icon: Wallet, color: '#ca8a04', title: 'Commission', text: 'Trainers ke safhe par har trainer ki baqi commission hai; wahan se payout karein (drawer se kharcha).' },
            { icon: Ban, color: '#e11d48', title: 'Ghalti', text: 'Mukammal session ka bill ghalat ho to Sales me void karein — session cancel aur commission wapas ho jati hai.' },
          ]}
          shortcuts={[['N', 'book'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function BookModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const trainersQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'available'], queryFn: () => trainersApi.list({ available: true }) });
  const trainers = trainersQ.data ?? [];
  const [member, setMember] = useState<PickedMember | null>(null);
  const [trainerId, setTrainerId] = useState('');
  const trainer = trainers.find((t) => t.id === (trainerId || trainers[0]?.id));
  const [date, setDate] = useState(todayInput());
  const [time, setTime] = useState('18:00');
  const [mins, setMins] = useState('60');
  const [fromPlan, setFromPlan] = useState(false);
  const [packageId, setPackageId] = useState('');
  const pkgQ = useQuery({
    queryKey: [GYM_KEYS.ptPackages, 'member', member?.id],
    queryFn: () => ptApi.packages({ memberId: member!.id, status: 'ACTIVE', limit: 20 }),
    enabled: !!member && fromPlan,
  });
  const packages = (pkgQ.data?.items ?? []).filter((p) => p.sessionsLeft > 0);
  const [price, setPrice] = useState('');
  const [weeks, setWeeks] = useState('1');
  const [focus, setFocus] = useState('');
  const error = !member ? 'Member chunein' : !trainer ? 'Trainer chunein' : !(Number(mins) >= 15) ? 'Kam se kam 15 min' : undefined;
  const save = useMutation({
    mutationFn: () => ptApi.create({
      memberId: member!.id, trainerId: trainer!.id, scheduledStart: toIso(date, time), durationMinutes: Number(mins), isFromPackage: fromPlan,
      ...(fromPlan && packageId && { packageId }),
      ...(!fromPlan && price !== '' && { price: Number(price) }), weeks: Number(weeks) || 1, focusArea: opt(focus),
    }),
    onSuccess: (r) => { toast.success('count' in r ? `${r.count} sessions book ho gaye` : `${r.sessionNumber} book ho gaya`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Book nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title="PT session book karein"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Book karein</Button></>}>
      <div className="space-y-3">
        <MemberPicker value={member} onChange={setMember} autoFocus />
        <Select label="Trainer" value={trainer?.id ?? ''} onChange={(e) => setTrainerId(e.target.value)} options={trainers.map((t) => ({ value: t.id, label: `${t.staff?.fullName ?? t.trainerNumber} · ${formatPKR(t.perSessionRate)} · ${t.workStartTime}–${t.workEndTime}` }))}
          hint={!trainers.length ? 'Pehle Trainers me trainer jorein' : undefined} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Din" type="date" value={date} min={todayInput()} onChange={(e) => setDate(e.target.value)} />
          <Input label="Waqt" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Input label="Minute" inputMode="numeric" value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ''))} />
        </div>
        <Switch checked={fromPlan} onChange={(e) => setFromPlan(e.target.checked)} label="Package se" description="Plan ya PT package ke sessions me se — alag bill nahi" />
        {fromPlan && member && (
          <Select label="Kis me se" value={packageId} onChange={(e) => setPackageId(e.target.value)}
            options={[{ value: '', label: 'Khud chunein (pehle plan, phir package)' }, ...packages.map((p) => ({ value: p.id, label: `${p.packageNumber} · ${p.sessionsLeft} baqi${p.trainer?.name ? ` · ${p.trainer.name}` : ''}` }))]}
            hint={pkgQ.isSuccess && !packages.length ? 'Is member ka koi chalta PT package nahi — plan ke PT se lagega' : undefined} />
        )}
        {!fromPlan && <Input label="Session fee" inputMode="decimal" value={price} placeholder={String(trainer?.perSessionRate ?? 0)} onChange={(e) => setPrice(num(e.target.value))} hint="Khali chhorein to trainer ka rate. Bill session hone par banta hai." />}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Har hafte dohrayein" value={weeks} onChange={(e) => setWeeks(e.target.value)} options={['1', '2', '4', '8', '12'].map((w) => ({ value: w, label: w === '1' ? 'Sirf ek' : `${w} hafte` }))} />
          <Input label="Kis par kaam" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Chest, legs, wazan kam" hint="Marzi hai" />
        </div>
      </div>
    </Modal>
  );
}

function CompleteModal({ session: s, onClose, onDone }: { session: PTSession; onClose: () => void; onDone: () => void }) {
  const can = useGymCan();
  const [paid, setPaid] = useState(String(s.price));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const amount = Number(paid) || 0;
  const save = useMutation({
    mutationFn: () => ptApi.updateStatus(s.id, { status: 'COMPLETED', paidAmount: amount, paymentMethod: method }),
    onSuccess: () => { toast.success('Session ho gaya — bill Sales me'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Session ho gaya · ${s.sessionNumber}`} description={`Fee ${formatPKR(s.price)} ka bill banega`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!can.bill || amount > s.price} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bill banayein</Button></>}>
      <div className="space-y-3">
        {!can.bill && <p className="text-[0.8125rem] text-amber-800">Bill banane ke liye POS ki permission chahiye.</p>}
        <Input label="Abhi kitna mila" inputMode="decimal" value={paid} onChange={(e) => setPaid(num(e.target.value))} className="text-right font-semibold tabular-nums"
          hint={amount < s.price ? `${formatPKR(s.price - amount)} member ke khate me udhaar` : 'Poora paisa'} />
        {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
      </div>
    </Modal>
  );
}

function CancelSessionModal({ session: s, onClose, onDone }: { session: PTSession; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => ptApi.updateStatus(s.id, { status: 'CANCELLED', cancellationReason: opt(reason) }),
    onSuccess: () => { toast.success('Session cancel'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Cancel nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Cancel · ${s.sessionNumber}`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>Cancel karein</Button></>}>
      <Textarea label="Wajah" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} hint="Marzi hai" />
    </Modal>
  );
}
