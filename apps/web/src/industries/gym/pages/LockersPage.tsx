/**
 * Lockers: the register of gym lockers, who has which one and until when
 * the rent is paid. Giving a locker and each rent payment make a bill
 * (shared sale path); rent not paid goes on the member's khata. "Mahine ka
 * bill" puts one month's rent on khata for every locker whose rent ran out.
 *
 * Keys: N new lockers · / search · 1-5 views · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, Download, GraduationCap, KeyRound, LockOpen, Pencil, Plus, ReceiptText, UserPlus, Wallet, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Badge, Button, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Table, TBody, Td, Textarea, Th, THead, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton, type BadgeVariant,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import type { PrintDoc } from '@core/print';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { lockersApi, type GymLocker, type LockerView } from '../api/lockers.api';
import { MemberPicker, type PickedMember } from '../components/MemberPicker';
import { EmptyList, HeroPrint, ListSkeleton, LoadFailed, Panel, TotalsStrip } from '../components/ui';
import { GYM_KEYS, MONEY_KEYS, apiError, dateOf, num, opt, todayInput } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

const VIEWS: Array<{ id: LockerView; label: string; icon: typeof KeyRound }> = [
  { id: 'all', label: 'Sab', icon: KeyRound },
  { id: 'free', label: 'Khali', icon: LockOpen },
  { id: 'occupied', label: 'Diye hue', icon: UserPlus },
  { id: 'due', label: 'Rent baqi', icon: AlertTriangle },
  { id: 'maintenance', label: 'Repair', icon: Wrench },
];

function stateOf(l: GymLocker): { label: string; variant: BadgeVariant } {
  if (l.status === 'MAINTENANCE') return { label: 'Repair', variant: 'default' };
  if (l.status === 'FREE') return { label: 'Khali', variant: 'success' };
  if (l.due) return { label: 'Rent baqi', variant: 'warning' };
  return { label: 'Diya hua', variant: 'info' };
}

export default function LockersPage() {
  const qc = useQueryClient();
  const can = useGymCan();
  const guide = usePageGuide();
  const [params] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<LockerView>('all');
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [query, setQuery] = useState(search.trim());
  const [adding, setAdding] = useState(false);
  const [modal, setModal] = useState<{ kind: 'assign' | 'rent' | 'release' | 'edit'; l: GymLocker } | null>(null);
  const [billAll, setBillAll] = useState(false);
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);

  const q = useQuery({ queryKey: [GYM_KEYS.lockers, view, query], queryFn: () => lockersApi.list({ view, search: query || undefined }), placeholderData: (p) => p });
  const rows = q.data?.items ?? [];
  const c = q.data?.counts;
  const manage = can.book;
  const billing = can.book && can.bill;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && manage) { e.preventDefault(); setAdding(true); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      const i = Number(e.key);
      if (i >= 1 && i <= VIEWS.length) setView(VIEWS[i - 1].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const head = ['Locker', 'Haal', 'Member', 'Phone', 'Rent', 'Rent kab tak', 'Note'];
  const line = (l: GymLocker) => [l.number, stateOf(l).label, l.member?.customer?.name ?? '', l.member?.customer?.phone ?? '', String(l.monthlyRent), l.endDate ? dateOf(l.endDate) : '', l.notes ?? ''];
  const printDoc = (): PrintDoc => ({
    title: 'Lockers',
    subtitle: VIEWS.find((v) => v.id === view)?.label,
    meta: [['Lockers', String(rows.length)], ['Diye hue ka rent', formatPKR(q.data?.totals.monthlyRent ?? 0)]],
    sections: [{ kind: 'table', columns: [{ label: 'Locker' }, { label: 'Haal' }, { label: 'Member' }, { label: 'Phone', wideOnly: true }, { label: 'Rent', align: 'right' }, { label: 'Kab tak' }], rows: rows.map((l) => line(l).slice(0, 6)) }],
  });

  return (
    <PageShell>
      <PageHero
        title="Lockers"
        chip={<><KeyRound /> Gym</>}
        meta="Kis member ke paas kaunsa locker hai aur rent kab tak diya"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length} />
          <button type="button" onClick={() => downloadCsv(`gym-lockers-${view}.csv`, [head, ...rows.map(line)])} disabled={!rows.length} title="Excel (CSV)" className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {billing && (c?.due ?? 0) > 0 && <button type="button" onClick={() => setBillAll(true)} title="Rent khatam walon ka mahine ka bill" className={heroIconButton}><ReceiptText className="h-4 w-4" /></button>}
          {manage && <button type="button" onClick={() => setAdding(true)} title="Naye lockers (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naye lockers</button>}
        </>}
        stats={[{ label: 'Lockers', value: c?.all ?? 0 }, { label: 'Khali', value: c?.free ?? 0 }, { label: 'Mahine ka rent', value: formatPKR(q.data?.totals.monthlyRent ?? 0) }]}
      />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={LockOpen} color="#16a34a" label="Khali" value={c?.free ?? 0} onClick={() => setView('free')} active={view === 'free'} />
          <KpiCard icon={UserPlus} color="#2563eb" label="Diye hue" value={c?.occupied ?? 0} hint={formatPKR(q.data?.totals.monthlyRent ?? 0) + ' / mahina'} onClick={() => setView('occupied')} active={view === 'occupied'} />
          <KpiCard icon={AlertTriangle} color={(c?.due ?? 0) ? '#d97706' : '#64748b'} label="Rent baqi" value={c?.due ?? 0} hint="Rent ki date guzar gayi" onClick={() => setView('due')} active={view === 'due'} />
          <KpiCard icon={Wrench} color="#64748b" label="Repair" value={c?.maintenance ?? 0} onClick={() => setView('maintenance')} active={view === 'maintenance'} />
        </>}
      </KpiRow>

      <ViewTabs value={view} onChange={setView} hint={<>{manage && <><Kbd>N</Kbd> naye · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>5</Kbd></>}
        tabs={VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: c?.[v.id] ?? null }))} />

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Locker number, member ka naam ya phone…" />} onClear={search ? () => setSearch('') : undefined} />

      {rows.length > 0 && <TotalsStrip><span>{rows.length} lockers</span><span>Rent: <b className="tabular-nums">{formatPKR(rows.filter((l) => l.status === 'OCCUPIED').reduce((s, l) => s + l.monthlyRent, 0))}</b> / mahina</span></TotalsStrip>}

      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what="Lockers" retry={() => q.refetch()} /> : !rows.length ? (
        <EmptyList icon={KeyRound} title={view === 'all' && !query ? 'Abhi koi locker nahi' : 'Is list me koi locker nahi'} text="Lockers ek dafa likhein (jaise 1 se 40). Phir member ko locker dein — rent ka bill khud banta hai.">
          {manage && view === 'all' && !query && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>Naye lockers</Button>}
        </EmptyList>
      ) : (
        <Panel>
          <Table minWidth="50rem">
            <THead><Tr><Th>Locker</Th><Th>Member</Th><Th align="right">Rent</Th><Th>Rent kab tak</Th><Th>Haal</Th><Th /></Tr></THead>
            <TBody>{rows.map((l) => {
              const st = stateOf(l);
              return (
                <Tr key={l.id}>
                  <Td><p className="font-semibold text-slate-900">#{l.number}</p>{l.notes && <p className="max-w-[12rem] truncate text-[0.75rem] text-slate-500">{l.notes}</p>}</Td>
                  <Td>{l.member ? <><Link to={`/gym/members/${l.member.id}`} className="font-medium text-slate-900 hover:underline">{l.member.customer?.name ?? l.member.memberNumber}</Link>
                    <p className="text-[0.75rem] text-slate-500">{l.member.memberNumber}{l.member.customer?.phone ? ` · ${l.member.customer.phone}` : ''}{(l.member.customer?.balance ?? 0) > 0 ? ` · khata ${formatPKR(l.member.customer!.balance)}` : ''}</p></> : '—'}</Td>
                  <Td align="right" className="tabular-nums">{formatPKR(l.monthlyRent)}</Td>
                  <Td>{l.endDate ? <>{dateOf(l.endDate)}{l.daysLeft != null && l.daysLeft > 0 && l.daysLeft <= 7 && <p className="text-[0.6875rem] text-amber-700">{l.daysLeft} din baqi</p>}</> : '—'}</Td>
                  <Td><Badge size="xs" variant={st.variant}>{st.label}</Badge></Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      {billing && l.status === 'FREE' && <Button size="sm" leftIcon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setModal({ kind: 'assign', l })}>Member ko dein</Button>}
                      {billing && l.status === 'OCCUPIED' && <Button size="sm" variant={l.due ? 'primary' : 'secondary'} leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setModal({ kind: 'rent', l })}>Rent lein</Button>}
                      {manage && l.status === 'OCCUPIED' && <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'release', l })}>Khali karein</Button>}
                      {manage && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setModal({ kind: 'edit', l })}>Badlein</Button>}
                    </div>
                  </Td>
                </Tr>
              );
            })}</TBody>
          </Table>
        </Panel>
      )}

      {adding && <NewLockersModal onClose={() => setAdding(false)} />}
      {modal?.kind === 'assign' && <AssignModal locker={modal.l} onClose={() => setModal(null)} />}
      {modal?.kind === 'rent' && <RentModal locker={modal.l} onClose={() => setModal(null)} />}
      {modal?.kind === 'release' && <ReleaseModal locker={modal.l} onClose={() => setModal(null)} />}
      {modal?.kind === 'edit' && <EditModal locker={modal.l} onClose={() => setModal(null)} />}
      {billAll && <BillDueModal count={c?.due ?? 0} onClose={() => setBillAll(false)} onDone={() => [GYM_KEYS.lockers, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }))} />}

      {guide.isOpen && (
        <PageGuide title="Lockers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Lockers likhein', text: 'Pehla number aur kitne lockers (jaise 1 aur 40) — sab ek saath ban jate hain. Har ek ka mahine ka rent.' },
            { icon: UserPlus, color: '#16a34a', title: 'Member ko dein', text: 'Khali locker par "Member ko dein". Kitne mahine aur kitna paisa mila — bill Sales me banta hai, baqi member ke khate me.' },
            { icon: CalendarClock, color: '#d97706', title: 'Rent', text: '"Rent kab tak" guzar jaye to locker "Rent baqi" me aata hai. "Rent lein" se agle mahine ka bill. Mahine ke shuru me upar wala bill button sab ka ek mahina khate me daal deta hai.' },
            { icon: LockOpen, color: '#64748b', title: 'Khali karein', text: 'Member chabi wapas de to "Khali karein". Jo rent khate me hai woh wahin rehta hai. Ghalat bill Sales me void karein — rent ki date wapas ho jati hai.' },
          ]}
          shortcuts={[['N', 'naye lockers'], ['/', 'dhoondein'], ['1-5', 'list'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function useLockerSave() {
  const qc = useQueryClient();
  return () => [GYM_KEYS.lockers, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

function NewLockersModal({ onClose }: { onClose: () => void }) {
  const refresh = useLockerSave();
  const [number, setNumber] = useState('1');
  const [count, setCount] = useState('1');
  const [rent, setRent] = useState('');
  const [notes, setNotes] = useState('');
  const many = Number(count) > 1;
  const error = !number.trim() ? 'Locker number likhein'
    : many && !/^\d+$/.test(number.trim()) ? 'Kai lockers ke liye pehla number sirf hindsa ho'
      : !(Number(count) >= 1 && Number(count) <= 200) ? 'Ek dafa 1 se 200 lockers'
        : rent === '' ? 'Mahine ka rent likhein' : undefined;
  const save = useMutation({
    mutationFn: () => lockersApi.create({ number: number.trim(), count: Number(count) || 1, monthlyRent: Number(rent) || 0, notes: opt(notes) }),
    onSuccess: (r) => { toast.success(`${r.created} locker ban gaye`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Lockers nahi bane')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Naye lockers"
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Pehla number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={20} autoFocus hint="Jaise 1 ya A-12" />
          <Input label="Kitne lockers" inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} hint={many && /^\d+$/.test(number.trim()) ? `${number.trim()} se ${Number(number) + Number(count) - 1} tak` : 'Ek ya zyada'} />
        </div>
        <Input label="Mahine ka rent (Rs)" inputMode="decimal" value={rent} onChange={(e) => setRent(num(e.target.value))} hint="Har locker ka; baad me badal sakte hain" />
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} hint="Marzi hai — jaise 'Ladies section'" />
        {error && <p className="text-[0.8125rem] text-amber-800">{error}</p>}
      </div>
    </Modal>
  );
}

/** Months, money taken now and method: shared by "give" and "rent". */
function RentFields({ rent, months, setMonths, paid, setPaid, method, setMethod }: {
  rent: number; months: string; setMonths: (v: string) => void; paid: string; setPaid: (v: string) => void; method: PaymentMethod; setMethod: (m: PaymentMethod) => void;
}) {
  const total = rent * (Number(months) || 0);
  const amount = paid === '' ? total : Number(paid) || 0;
  return (
    <>
      <Select label="Kitne mahine" value={months} onChange={(e) => setMonths(e.target.value)} options={['1', '2', '3', '6', '12'].map((m) => ({ value: m, label: `${m} mahina · ${formatPKR(rent * Number(m))}` }))} />
      <Input label="Abhi kitna mila" inputMode="decimal" value={paid} placeholder={String(total)} onChange={(e) => setPaid(num(e.target.value))} className="text-right font-semibold tabular-nums"
        hint={amount < total ? `${formatPKR(total - amount)} member ke khate me udhaar` : 'Poora rent'} error={amount > total ? `Rent sirf ${formatPKR(total)} hai` : undefined} />
      {amount > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
    </>
  );
}

function AssignModal({ locker, onClose }: { locker: GymLocker; onClose: () => void }) {
  const refresh = useLockerSave();
  const [member, setMember] = useState<PickedMember | null>(null);
  const [rent, setRent] = useState(String(locker.monthlyRent));
  const [startDate, setStartDate] = useState(todayInput());
  const [months, setMonths] = useState('1');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const total = (Number(rent) || 0) * Number(months);
  const amount = paid === '' ? total : Number(paid) || 0;
  const error = !member ? 'Member chunein' : amount > total ? 'Zyada paisa' : undefined;
  const save = useMutation({
    mutationFn: () => lockersApi.assign(locker.id, { memberId: member!.id, monthlyRent: Number(rent) || 0, startDate, months: Number(months), paidAmount: amount, paymentMethod: method }),
    onSuccess: () => { toast.success(`Locker #${locker.number} de diya — bill Sales me`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Locker nahi diya')),
  });
  return (
    <Modal open onClose={onClose} size="md" title={`Locker #${locker.number} — member ko dein`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Dein aur bill banayein</Button></>}>
      <div className="space-y-3">
        <MemberPicker value={member} onChange={setMember} autoFocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Mahine ka rent (Rs)" inputMode="decimal" value={rent} onChange={(e) => setRent(num(e.target.value))} hint="Is member ke liye" />
          <Input label="Kab se" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <RentFields rent={Number(rent) || 0} months={months} setMonths={setMonths} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />
      </div>
    </Modal>
  );
}

function RentModal({ locker, onClose }: { locker: GymLocker; onClose: () => void }) {
  const refresh = useLockerSave();
  const [months, setMonths] = useState('1');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const total = locker.monthlyRent * Number(months);
  const amount = paid === '' ? total : Number(paid) || 0;
  const save = useMutation({
    mutationFn: () => lockersApi.rent(locker.id, { months: Number(months), paidAmount: amount, paymentMethod: method }),
    onSuccess: (r) => { toast.success(`Rent ${dateOf(r.endDate)} tak — bill Sales me`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Rent nahi likha')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Rent · Locker #${locker.number}`}
      description={`${locker.member?.customer?.name ?? ''} · abhi ${locker.endDate ? dateOf(locker.endDate) : '—'} tak`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={amount > total} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>Bill banayein</Button></>}>
      <div className="space-y-3">
        <RentFields rent={locker.monthlyRent} months={months} setMonths={setMonths} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />
        <p className="text-[0.75rem] text-slate-500">Naya mahina pichli date ke baad se shuru hota hai, chahe rent der se mile.</p>
      </div>
    </Modal>
  );
}

function ReleaseModal({ locker, onClose }: { locker: GymLocker; onClose: () => void }) {
  const refresh = useLockerSave();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => lockersApi.release(locker.id, opt(reason)),
    onSuccess: () => { toast.success(`Locker #${locker.number} khali`); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Locker #${locker.number} khali karein`} description={`${locker.member?.customer?.name ?? ''} ne chabi wapas di. Jo rent khate me hai woh wahin rehta hai.`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>Khali karein</Button></>}>
      <Textarea label="Note" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} hint="Marzi hai — jaise 'chabi wapas mil gayi'" />
    </Modal>
  );
}

function EditModal({ locker, onClose }: { locker: GymLocker; onClose: () => void }) {
  const refresh = useLockerSave();
  const [rent, setRent] = useState(String(locker.monthlyRent));
  const [notes, setNotes] = useState(locker.notes ?? '');
  const [status, setStatus] = useState<'FREE' | 'MAINTENANCE'>(locker.status === 'MAINTENANCE' ? 'MAINTENANCE' : 'FREE');
  const save = useMutation({
    mutationFn: () => lockersApi.update(locker.id, { monthlyRent: Number(rent) || 0, notes: notes.trim(), ...(locker.status !== 'OCCUPIED' && { status }) }),
    onSuccess: () => { toast.success('Locker save ho gaya'); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={`Locker #${locker.number} — badlein`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={rent === ''} onClick={() => save.mutate()}>Save</Button></>}>
      <div className="space-y-3">
        <Input label="Mahine ka rent (Rs)" inputMode="decimal" value={rent} onChange={(e) => setRent(num(e.target.value))} hint="Agle bill se lagega" />
        {locker.status !== 'OCCUPIED' && <Select label="Haal" value={status} onChange={(e) => setStatus(e.target.value as 'FREE' | 'MAINTENANCE')} options={[{ value: 'FREE', label: 'Khali (dene ke liye)' }, { value: 'MAINTENANCE', label: 'Repair me' }]} />}
        <Textarea label="Note" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} hint="Marzi hai" />
      </div>
    </Modal>
  );
}

function BillDueModal({ count, onClose, onDone }: { count: number; onClose: () => void; onDone: () => void }) {
  const save = useMutation({
    mutationFn: lockersApi.billDue,
    onSuccess: (r) => { toast.success(r.billed ? `${r.billed} lockers ka ek mahina khate me` : 'Koi locker baqi nahi tha'); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Bill nahi bane')),
  });
  return (
    <Modal open onClose={onClose} size="sm" title="Mahine ka rent bill"
      description={`${count} lockers ka rent khatam ho chuka. Har ek ka ek mahine ka bill banega aur rent member ke khate me udhaar jayega.`}
      footer={<><Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} onClick={() => save.mutate()} leftIcon={<ReceiptText className="h-4 w-4" />}>Bill banayein</Button></>}>
      <p className="text-[0.8125rem] text-slate-600">Jo member nakad de, us ke liye list me "Rent lein" behtar hai — paisa usi waqt drawer me aata hai.</p>
    </Modal>
  );
}
