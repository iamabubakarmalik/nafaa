/**
 * The front desk. Scan a card or QR, or type the member number or phone:
 * the member's card shows with membership, days left and fee due. A
 * running member goes in with one key; an ended, used-up or frozen card is
 * stopped with the reason and a Renew button (someone with members edit
 * may still let them in with a note). Guests are logged against the member
 * who brought them. Tabs: who is inside now (check out, or everyone at day
 * close), every visit, and rush hours.
 *
 * Keys: / scan box · Enter look up / let in · M guest · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, BarChart3, CalendarCheck, Clock, Download, GraduationCap, ListChecks, LogIn, LogOut, ScanLine, UserPlus, Users } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Avatar, Badge, Button, DateRangeMenu, FilterBar, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Segmented, Skeleton,
  Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs, heroIconButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { useBusinessDayStart } from '@core/lib/business-day';
import { downloadCsv } from '@core/lib/csv';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { attendanceApi, type Attendance, type CheckInMethod, type DeskLookup } from '../api/attendance.api';
import type { Membership } from '../api/memberships.api';
import { RenewModal, SellModal } from '../components/MembershipModals';
import { MemberPicker, type PickedMember } from '../components/MemberPicker';
import { CardTitle, Columns, EmptyList, HeroPrint, ListSkeleton, LoadFailed, Pager, Panel, StatTile } from '../components/ui';
import { GYM_KEYS, apiError, dateOf, daysLeft, minutes, timeOf } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

type Tab = 'inside' | 'visits' | 'analytics';
const METHOD_LABEL: Record<string, string> = { MANUAL: 'Haath se', QR_CODE: 'QR', RFID_CARD: 'Card', BIOMETRIC: 'Ungli', MOBILE_APP: 'App', FACIAL_RECOGNITION: 'Chehra' };
const nameOf = (a: Attendance) => (a.isGuest ? a.guestName ?? 'Mehmaan' : a.member?.customer?.name ?? a.member?.memberNumber ?? '—');

export default function AttendancePage() {
  const qc = useQueryClient();
  const can = useGymCan();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const scanRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('inside');
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<CheckInMethod>('MANUAL');
  const [found, setFound] = useState<DeskLookup | null>(null);
  const [override, setOverride] = useState(false);
  const [guest, setGuest] = useState(false);
  const [closeDay, setCloseDay] = useState(false);
  const [renew, setRenew] = useState<Membership | null>(null);
  const [sell, setSell] = useState<PickedMember | null>(null);
  const refresh = () => [GYM_KEYS.attendance, GYM_KEYS.members, 'currently-inside', 'gym-dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const insideQ = useQuery({ queryKey: [GYM_KEYS.attendance, 'inside'], queryFn: attendanceApi.currentlyInside, refetchInterval: 30_000 });
  const todayKey = resolveRange({ preset: 'today', custom: { from: '', to: '' } }, startHour);
  const todayQ = useQuery({ queryKey: [GYM_KEYS.attendance, 'today-stats', todayKey?.from], queryFn: () => attendanceApi.dailyStats(todayKey?.from, todayKey?.to), refetchInterval: 60_000 });
  const inside = insideQ.data ?? [];

  const lookup = useMutation({
    mutationFn: (c: string) => attendanceApi.lookup(c),
    onSuccess: (r) => setFound(r),
    onError: (e) => { setFound(null); toast.error(apiError(e, 'Member nahi mila')); },
  });
  const letIn = useMutation({
    mutationFn: (body: { allowExpired?: boolean; notes?: string }) => attendanceApi.checkIn({ memberId: found!.member.id, method, ...body }),
    onSuccess: (r) => {
      toast.success(`${found?.member.customer?.name ?? 'Member'} andar${r.warnings.length ? ` · ${r.warnings.join(' · ')}` : ''}`);
      setFound(null); setCode(''); setOverride(false); refresh();
      window.setTimeout(() => scanRef.current?.focus(), 0);
    },
    onError: (e) => toast.error(apiError(e, 'Check-in nahi hua')),
  });
  const checkOut = useMutation({
    mutationFn: (id: string) => attendanceApi.checkOut(id),
    onSuccess: () => { toast.success('Check-out ho gaya'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Check-out nahi hua')),
  });

  const submit = () => {
    const c = code.trim();
    if (found && !found.block && !found.inside && !letIn.isPending) { letIn.mutate({}); return; }
    if (c) lookup.mutate(c);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isDialogOpen()) return;
      if (isTyping()) return;
      if (e.key === '/') { e.preventDefault(); scanRef.current?.focus(); }
      if (e.key === 'm' || e.key === 'M') { e.preventDefault(); setGuest(true); }
      if (e.key === 'Enter' && found && !found.block && !found.inside) { e.preventDefault(); letIn.mutate({}); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => { scanRef.current?.focus(); }, []);

  const t = todayQ.data;
  const ms = found?.membership;
  return (
    <PageShell>
      <PageHero
        title="Check-in"
        chip={<><LogIn /> Gym</>}
        meta="Card, QR, member number ya phone — scan karein aur Enter"
        busy={insideQ.isFetching && !insideQ.isLoading}
        loading={todayQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <button type="button" onClick={() => setGuest(true)} title="Mehmaan (M)" className={heroIconButton}><UserPlus className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: 'Aaj aaye', value: t?.total ?? 0 },
          { label: 'Abhi andar', value: inside.length },
          { label: 'Mehmaan', value: t?.guests ?? 0 },
        ]}
      />

      <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <form className="min-w-[16rem] flex-1" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <Input ref={scanRef} label="Scan ya likhein" value={code} onChange={(e) => { setCode(e.target.value); setFound(null); setOverride(false); }} leftIcon={<ScanLine className="h-4 w-4" />}
              placeholder="MEM-00012, card, QR ya 03001234567" hint={<>Enter dabayein{found && !found.block ? ' — dobara Enter se andar' : ''}</>} className="h-12 text-lg" />
          </form>
          <Segmented label="Tareeqa" value={method} onChange={setMethod} items={[{ value: 'MANUAL', label: 'Haath se' }, { value: 'RFID_CARD', label: 'Card' }, { value: 'QR_CODE', label: 'QR' }]} />
          <Button onClick={submit} loading={lookup.isPending} leftIcon={<LogIn className="h-4 w-4" />}>{found && !found.block && !found.inside ? 'Andar bhejein' : 'Dhoondein'}</Button>
        </div>

        {found && (
          <div className={`mt-4 rounded-2xl p-4 ring-1 ${found.block ? 'bg-rose-50 ring-rose-200' : found.warnings.length ? 'bg-amber-50 ring-amber-200' : 'bg-success-50 ring-success-200'}`}>
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={found.member.customer?.name ?? found.member.memberNumber} url={found.member.photoUrl} size={64} />
              <div className="min-w-0 flex-1">
                <Link to={`/gym/members/${found.member.id}`} className="text-lg font-bold text-slate-900 hover:underline">{found.member.customer?.name ?? '—'}</Link>
                <p className="text-[0.8125rem] text-slate-600">{found.member.memberNumber}{found.member.customer?.phone ? ` · ${found.member.customer.phone}` : ''}</p>
                {ms && <p className="mt-1 text-[0.875rem] text-slate-800">{ms.plan?.name ?? 'Membership'} · {dateOf(ms.endDate)} tak{daysLeft(ms.endDate) >= 0 ? ` (${daysLeft(ms.endDate)} din)` : ''}{ms.visitsRemaining != null ? ` · ${ms.visitsRemaining} visits` : ''}</p>}
                {found.block && <p className="mt-2 flex items-center gap-1.5 font-semibold text-rose-700"><AlertTriangle className="h-4 w-4" />{found.message}</p>}
                {found.inside && <p className="mt-2 font-semibold text-amber-800">Pehle se andar hai — {timeOf(found.inside.checkInAt)} se</p>}
                {!!found.warnings.length && <ul className="mt-1 text-[0.8125rem] text-amber-900">{found.warnings.map((w) => <li key={w}>• {w}</li>)}</ul>}
              </div>
              <div className="flex flex-wrap gap-2">
                {!found.block && !found.inside && <Button size="lg" loading={letIn.isPending} onClick={() => letIn.mutate({})} leftIcon={<LogIn className="h-5 w-5" />}>Andar (Enter)</Button>}
                {found.inside && <Button variant="secondary" loading={checkOut.isPending} onClick={() => checkOut.mutate(found.inside!.id)} leftIcon={<LogOut className="h-4 w-4" />}>Check-out</Button>}
                {found.block && can.bill && ms && ms.status !== 'CANCELLED' && <Button onClick={() => setRenew({ ...ms, member: { id: found.member.id, memberNumber: found.member.memberNumber, customerId: found.member.customer?.id ?? '', customer: found.member.customer } })}>Renew</Button>}
                {found.block === 'NO_MEMBERSHIP' && can.bill && <Button onClick={() => setSell({ id: found.member.id, name: found.member.customer?.name ?? found.member.memberNumber, phone: found.member.customer?.phone, memberNumber: found.member.memberNumber })}>Plan bechein</Button>}
                {found.block && found.block !== 'MEMBER_INACTIVE' && can.members && !found.inside && <Button variant="ghost" onClick={() => setOverride(true)}>Phir bhi andar</Button>}
              </div>
            </div>
          </div>
        )}
      </div>

      <KpiRow cols={4}>
        {todayQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Users} color="#16a34a" label="Abhi andar" value={inside.length} hint="Pichhle 16 ghante me aaye" onClick={() => setTab('inside')} active={tab === 'inside'} />
          <KpiCard icon={CalendarCheck} color="#2563eb" label="Aaj ki visits" value={t?.total ?? 0} hint={`${t?.members ?? 0} alag members`} onClick={() => setTab('visits')} active={tab === 'visits'} />
          <KpiCard icon={UserPlus} color="#7c3aed" label="Mehmaan" value={t?.guests ?? 0} hint="Member ke saath" />
          <KpiCard icon={Clock} color="#ca8a04" label="Aam waqt" value={minutes(t?.avgMinutes)} hint="Andar kitni der" onClick={() => setTab('analytics')} active={tab === 'analytics'} />
        </>}
      </KpiRow>

      <ViewTabs value={tab} onChange={setTab} hint={<><Kbd>/</Kbd> scan · <Kbd>Enter</Kbd> andar · <Kbd>M</Kbd> mehmaan</>}
        right={tab === 'inside' && inside.length > 0 ? <Button size="sm" variant="secondary" onClick={() => setCloseDay(true)} leftIcon={<LogOut className="h-4 w-4" />}>Sab ko bahar (din band)</Button> : undefined}
        tabs={[{ id: 'inside', label: 'Andar', icon: Users, count: inside.length }, { id: 'visits', label: 'Visits', icon: ListChecks }, { id: 'analytics', label: 'Rush ka waqt', icon: BarChart3 }]} />

      {tab === 'inside' && (insideQ.isLoading ? <ListSkeleton /> : !inside.length ? (
        <EmptyList icon={Users} title="Abhi koi andar nahi" text="Member ka card scan karein ya number likh kar Enter dabayein." />
      ) : (
        <Panel>
          <Table minWidth="34rem">
            <THead><Tr><Th>Kaun</Th><Th>Kab se</Th><Th>Kitni der</Th><Th>Tareeqa</Th><Th /></Tr></THead>
            <TBody>{inside.map((a) => (
              <Tr key={a.id}>
                <Td><p className="font-medium text-slate-900">{nameOf(a)}</p><p className="text-[0.75rem] text-slate-500">{a.isGuest ? `Mehmaan · ${a.member?.customer?.name ?? ''} ke saath` : a.member?.memberNumber}</p></Td>
                <Td>{timeOf(a.checkInAt)}</Td>
                <Td>{minutes(Math.round((Date.now() - new Date(a.checkInAt).getTime()) / 60000))}</Td>
                <Td>{METHOD_LABEL[a.method] ?? a.method}{a.notes && <p className="max-w-[14rem] truncate text-[0.6875rem] text-amber-700">{a.notes}</p>}</Td>
                <Td align="right"><Button size="sm" variant="secondary" loading={checkOut.isPending && checkOut.variables === a.id} onClick={() => checkOut.mutate(a.id)} leftIcon={<LogOut className="h-3.5 w-3.5" />}>Bahar</Button></Td>
              </Tr>
            ))}</TBody>
          </Table>
        </Panel>
      ))}
      {tab === 'visits' && <Visits startHour={startHour} />}
      {tab === 'analytics' && <Rush startHour={startHour} />}

      {override && found && <OverrideModal name={found.member.customer?.name ?? found.member.memberNumber} reason={found.message ?? ''} busy={letIn.isPending}
        onConfirm={(notes) => letIn.mutate({ allowExpired: true, notes })} onClose={() => setOverride(false)} />}
      {guest && <GuestModal onClose={() => setGuest(false)} onDone={refresh} />}
      {closeDay && <CloseDayModal count={inside.length} onClose={() => setCloseDay(false)} onDone={refresh} />}
      {renew && <RenewModal membership={renew} onClose={() => { setRenew(null); setFound(null); }} />}
      {sell && <SellModal member={sell} onClose={() => { setSell(null); setFound(null); }} />}

      {guide.isOpen && (
        <PageGuide title="Check-in — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: ScanLine, color: '#2563eb', title: 'Scan', text: 'Card ya QR scan karein, ya member number / phone likh kar Enter. Member ka card khulta hai: plan, kitne din baqi, fee baqi.' },
            { icon: LogIn, color: '#16a34a', title: 'Andar', text: 'Sab theek ho to dobara Enter — member andar. Fee baqi ho ya membership khatam hone wali ho to peela nishan aata hai.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Ruk gaya', text: 'Membership khatam, visits khatam ya freeze ho to laal nishan aur Renew ka button. "Phir bhi andar" sirf members edit wala kar sakta hai, wajah likh kar.' },
            { icon: LogOut, color: '#7c3aed', title: 'Din band', text: 'Gym band karte waqt "Sab ko bahar" dabayein taake kal ki ginti saaf ho.' },
          ]}
          shortcuts={[['/', 'scan box'], ['Enter', 'dhoondein / andar'], ['M', 'mehmaan'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function Visits({ startHour }: { startHour: number }) {
  const [range, setRange] = useState<DateRangeValue>({ preset: 'today', custom: { from: '', to: '' } });
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'' | 'member' | 'guest'>('');
  const [page, setPage] = useState(1);
  useEffect(() => { const t = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => setPage(1), [range, kind]);
  const r = resolveRange(range, startHour);
  const q = useQuery({
    queryKey: [GYM_KEYS.attendance, 'page', r?.from, r?.to, query, kind, page],
    queryFn: () => attendanceApi.page({ from: r?.from, to: r?.to, search: query || undefined, isGuest: kind === '' ? undefined : kind === 'guest', page, limit: 50 }),
    placeholderData: (p) => p,
  });
  const rows = q.data?.items ?? [];
  const line = (a: Attendance) => [dateOf(a.checkInAt), timeOf(a.checkInAt), a.checkOutAt ? timeOf(a.checkOutAt) : 'Andar', nameOf(a), a.isGuest ? 'Mehmaan' : a.member?.memberNumber ?? '', minutes(a.durationMinutes), METHOD_LABEL[a.method] ?? a.method];
  const head = ['Din', 'Andar', 'Bahar', 'Kaun', 'Number', 'Waqt', 'Tareeqa'];
  const doc = (): PrintDoc => ({ title: 'Gym visits', subtitle: r ? `${r.from} – ${r.to}` : 'Sab', meta: [['Visits', String(q.data?.total ?? 0)]], sections: [{ kind: 'table', columns: head.map((label) => ({ label })), rows: rows.map(line) }] });
  return (
    <div className="space-y-3">
      <FilterBar search={<SearchField value={search} onChange={setSearch} placeholder="Naam, phone ya MEM number…" />}>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="today" />
        <FilterMenu icon={Users} label={kind === 'guest' ? 'Mehmaan' : kind === 'member' ? 'Members' : 'Sab'} value={kind} active={!!kind} onChange={setKind}
          options={[{ value: '', label: 'Sab' }, { value: 'member', label: 'Members' }, { value: 'guest', label: 'Mehmaan' }]} />
        <HeroPrint doc={doc} disabled={!rows.length} />
        <Button size="sm" variant="secondary" disabled={!rows.length} onClick={() => downloadCsv('gym-visits.csv', [head, ...rows.map(line)])} leftIcon={<Download className="h-4 w-4" />}>Excel</Button>
      </FilterBar>
      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what="Visits" retry={() => q.refetch()} /> : !rows.length ? <EmptyList icon={CalendarCheck} title="Is period me koi visit nahi" text="Period badal kar dekhein." /> : (
        <>
          <Panel>
            <Table minWidth="40rem">
              <THead><Tr>{head.map((h) => <Th key={h}>{h}</Th>)}</Tr></THead>
              <TBody>{rows.map((a) => {
                const l = line(a);
                return <Tr key={a.id}>{l.map((c, i) => <Td key={i} className={i === 3 ? 'font-medium text-slate-900' : undefined}>{c}</Td>)}</Tr>;
              })}</TBody>
            </Table>
          </Panel>
          <Pager page={q.data?.page ?? 1} pages={q.data?.pages ?? 1} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function Rush({ startHour }: { startHour: number }) {
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const r = resolveRange(range, startHour);
  const q = useQuery({ queryKey: [GYM_KEYS.attendance, 'stats', r?.from, r?.to], queryFn: () => attendanceApi.dailyStats(r?.from, r?.to) });
  const s = q.data;
  const hours = (s?.byHour ?? []).filter((h) => h.hour >= 5 || h.count > 0);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><DateRangeMenu value={range} onChange={setRange} startHour={startHour} allowAll={false} defaultPreset="month" /></div>
      {q.isLoading ? <ListSkeleton /> : !s ? <LoadFailed what="Analytics" retry={() => q.refetch()} /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile icon={CalendarCheck} label="Kul visits" value={s.total} sub={`${s.byDay.length} din`} />
            <StatTile icon={Users} label="Alag members" value={s.members} tone="green" />
            <StatTile icon={UserPlus} label="Mehmaan" value={s.guests} tone="violet" />
            <StatTile icon={Clock} label="Aam waqt andar" value={minutes(s.avgMinutes)} tone="amber" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={Clock}>Ghante ke hisaab se</CardTitle></p>
              <Columns items={hours.map((h) => ({ key: String(h.hour), label: `${h.hour % 12 || 12}${h.hour < 12 ? 'a' : 'p'}`, value: h.count }))} /></Panel>
            <Panel className="p-4"><p className="mb-3 font-semibold text-slate-900"><CardTitle icon={CalendarCheck}>Roz ki visits</CardTitle></p>
              <Columns items={s.byDay.slice(-31).map((d) => ({ key: d.day, label: d.day.slice(8), value: d.count, title: `${d.day}: ${d.count}` }))} /></Panel>
          </div>
        </>
      )}
    </div>
  );
}

function OverrideModal({ name, reason, busy, onConfirm, onClose }: { name: string; reason: string; busy: boolean; onConfirm: (notes: string) => void; onClose: () => void }) {
  const [notes, setNotes] = useState('');
  return (
    <Modal open onClose={onClose} size="sm" title={`${name} ko phir bhi andar?`} description={reason}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={busy} disabled={notes.trim().length < 3} onClick={() => onConfirm(notes.trim())}>Andar bhejein</Button></>}>
      <Textarea label="Wajah" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} autoFocus placeholder="Kal fee de ga / malik ne kaha" hint="Zaroori — visit par likhi rehti hai" />
    </Modal>
  );
}

function GuestModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [host, setHost] = useState<PickedMember | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const save = useMutation({
    mutationFn: () => attendanceApi.checkIn({ isGuest: true, invitedByMemberId: host!.id, guestName: name.trim(), guestPhone: phone.trim() || undefined }),
    onSuccess: () => { toast.success(`${name} andar (mehmaan)`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Mehmaan andar nahi gaya')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Mehmaan" description="Member ke saath aaya dost. Plan ke mehmaan pass se ginta hai."
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!host || name.trim().length < 2} onClick={() => save.mutate()}>Andar bhejein</Button></>}>
      <div className="space-y-3">
        <MemberPicker label="Kis ke saath" value={host} onChange={setHost} autoFocus />
        <Input label="Mehmaan ka naam" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
        <Input label="Phone" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} hint="Marzi hai — baad me member banane ke liye" />
        <p className="text-[0.75rem] text-slate-500">Mehmaan se paisa lena ho to POS par "Day pass" bechein.</p>
      </div>
    </Modal>
  );
}

function CloseDayModal({ count, onClose, onDone }: { count: number; onClose: () => void; onDone: () => void }) {
  const save = useMutation({
    mutationFn: attendanceApi.checkOutAll,
    onSuccess: (r) => { toast.success(`${r.count} log bahar`); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Din band — sab ko bahar?" description={`${count} log abhi andar likhe hain. Sab ka check-out abhi ke waqt par hoga; purane din ke khule visits check-in se 2 ghante baad band honge.`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()} leftIcon={<LogOut className="h-4 w-4" />}>Sab ko bahar</Button></>}>
      <p className="text-[0.8125rem] text-slate-600">Paise ka hisaab (drawer ginna aur band karna) <Link to="/cash-register" className="font-semibold text-brand-700 hover:underline">Cash register</Link> par hota hai; aaj ki fees aur kharche Day book me.</p>
    </Modal>
  );
}
