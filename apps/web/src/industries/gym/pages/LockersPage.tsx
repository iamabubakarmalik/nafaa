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
import { t as tr, Trans } from '@core/i18n';

const VIEWS: Array<{ id: LockerView; label: string; icon: typeof KeyRound }> = [
  { id: 'all', label: tr('Sab'), icon: KeyRound },
  { id: 'free', label: tr('Khali'), icon: LockOpen },
  { id: 'occupied', label: tr('Diye hue'), icon: UserPlus },
  { id: 'due', label: tr('Rent baqi'), icon: AlertTriangle },
  { id: 'maintenance', label: tr('Repair'), icon: Wrench },
];

function stateOf(l: GymLocker): { label: string; variant: BadgeVariant } {
  if (l.status === 'MAINTENANCE') return { label: tr('Repair'), variant: 'default' };
  if (l.status === 'FREE') return { label: tr('Khali'), variant: 'success' };
  if (l.due) return { label: tr('Rent baqi'), variant: 'warning' };
  return { label: tr('Diya hua'), variant: 'info' };
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

  const head = [tr('Locker'), tr('Haal'), tr('Member'), tr('Phone'), tr('Rent'), tr('Rent kab tak'), tr('Note')];
  const line = (l: GymLocker) => [l.number, stateOf(l).label, l.member?.customer?.name ?? '', l.member?.customer?.phone ?? '', String(l.monthlyRent), l.endDate ? dateOf(l.endDate) : '', l.notes ?? ''];
  const printDoc = (): PrintDoc => ({
    title: tr('Lockers'),
    subtitle: VIEWS.find((v) => v.id === view)?.label,
    meta: [[tr('Lockers'), String(rows.length)], [tr('Diye hue ka rent'), formatPKR(q.data?.totals.monthlyRent ?? 0)]],
    sections: [{ kind: 'table', columns: [{ label: tr('Locker') }, { label: tr('Haal') }, { label: tr('Member') }, { label: tr('Phone'), wideOnly: true }, { label: tr('Rent'), align: 'right' }, { label: tr('Kab tak') }], rows: rows.map((l) => line(l).slice(0, 6)) }],
  });

  return (
    <PageShell>
      <PageHero
        title={tr('Lockers')}
        chip={<><KeyRound /> {' '}{tr('Gym')}</>}
        meta={tr('Kis member ke paas kaunsa locker hai aur rent kab tak diya')}
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <HeroPrint doc={printDoc} disabled={!rows.length} />
          <button type="button" onClick={() => downloadCsv(`gym-lockers-${view}.csv`, [head, ...rows.map(line)])} disabled={!rows.length} title={tr('Excel (CSV)')} className={heroIconButton}><Download className="h-4 w-4" /></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {billing && (c?.due ?? 0) > 0 && <button type="button" onClick={() => setBillAll(true)} title={tr('Rent khatam walon ka mahine ka bill')} className={heroIconButton}><ReceiptText className="h-4 w-4" /></button>}
          {manage && <button type="button" onClick={() => setAdding(true)} title={tr('Naye lockers (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naye lockers')}</button>}
        </>}
        stats={[{ label: tr('Lockers'), value: c?.all ?? 0 }, { label: tr('Khali'), value: c?.free ?? 0 }, { label: tr('Mahine ka rent'), value: formatPKR(q.data?.totals.monthlyRent ?? 0) }]}
      />

      <KpiRow cols={4}>
        {q.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={LockOpen} color="#16a34a" label={tr('Khali')} value={c?.free ?? 0} onClick={() => setView('free')} active={view === 'free'} />
          <KpiCard icon={UserPlus} color="#2563eb" label={tr('Diye hue')} value={c?.occupied ?? 0} hint={tr('{{formatPKR}} / mahina', { formatPKR: formatPKR(q.data?.totals.monthlyRent ?? 0) })} onClick={() => setView('occupied')} active={view === 'occupied'} />
          <KpiCard icon={AlertTriangle} color={(c?.due ?? 0) ? '#d97706' : '#64748b'} label={tr('Rent baqi')} value={c?.due ?? 0} hint={tr('Rent ki date guzar gayi')} onClick={() => setView('due')} active={view === 'due'} />
          <KpiCard icon={Wrench} color="#64748b" label={tr('Repair')} value={c?.maintenance ?? 0} onClick={() => setView('maintenance')} active={view === 'maintenance'} />
        </>}
      </KpiRow>

      <ViewTabs value={view} onChange={setView} hint={<>{manage && <><Kbd>N</Kbd> {' '}{tr('naye ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>5</Kbd></>}
        tabs={VIEWS.map((v) => ({ id: v.id, label: v.label, icon: v.icon, count: c?.[v.id] ?? null }))} />

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Locker number, member ka naam ya phone…')} />} onClear={search ? () => setSearch('') : undefined} />

      {rows.length > 0 && <TotalsStrip><span>{tr('{{count}} lockers', { count: rows.length })}</span><span><Trans text="Rent: {{rent}} / mahina" values={{ rent: <b className="tabular-nums">{formatPKR(rows.filter((l) => l.status === 'OCCUPIED').reduce((s, l) => s + l.monthlyRent, 0))}</b> }} /></span></TotalsStrip>}

      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what={tr('Lockers')} retry={() => q.refetch()} /> : !rows.length ? (
        <EmptyList icon={KeyRound} title={view === 'all' && !query ? tr('Abhi koi locker nahi') : tr('Is list me koi locker nahi')} text={tr('Lockers ek dafa likhein (jaise 1 se 40). Phir member ko locker dein — rent ka bill khud banta hai.')}>
          {manage && view === 'all' && !query && <Button onClick={() => setAdding(true)} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naye lockers')}</Button>}
        </EmptyList>
      ) : (
        <Panel>
          <Table minWidth="50rem">
            <THead><Tr><Th>{tr('Locker')}</Th><Th>{tr('Member')}</Th><Th align="right">{tr('Rent')}</Th><Th>{tr('Rent kab tak')}</Th><Th>{tr('Haal')}</Th><Th /></Tr></THead>
            <TBody>{rows.map((l) => {
              const st = stateOf(l);
              return (
                <Tr key={l.id}>
                  <Td><p className="font-semibold text-slate-900">#{l.number}</p>{l.notes && <p className="max-w-[12rem] truncate text-[0.75rem] text-slate-500">{l.notes}</p>}</Td>
                  <Td>{l.member ? <><Link to={`/gym/members/${l.member.id}`} className="font-medium text-slate-900 hover:underline">{l.member.customer?.name ?? l.member.memberNumber}</Link>
                    <p className="text-[0.75rem] text-slate-500">{l.member.memberNumber}{l.member.customer?.phone ? ` · ${l.member.customer.phone}` : ''}{(l.member.customer?.balance ?? 0) > 0 ? tr(' · khata {{balance}}', { balance: formatPKR(l.member.customer!.balance) }) : ''}</p></> : '—'}</Td>
                  <Td align="right" className="tabular-nums">{formatPKR(l.monthlyRent)}</Td>
                  <Td>{l.endDate ? <>{dateOf(l.endDate)}{l.daysLeft != null && l.daysLeft > 0 && l.daysLeft <= 7 && <p className="text-[0.6875rem] text-amber-700">{tr('{{daysLeft}} din baqi', { daysLeft: l.daysLeft })}</p>}</> : '—'}</Td>
                  <Td><Badge size="xs" variant={st.variant}>{st.label}</Badge></Td>
                  <Td align="right">
                    <div className="flex justify-end gap-1.5">
                      {billing && l.status === 'FREE' && <Button size="sm" leftIcon={<UserPlus className="h-3.5 w-3.5" />} onClick={() => setModal({ kind: 'assign', l })}>{tr('Member ko dein')}</Button>}
                      {billing && l.status === 'OCCUPIED' && <Button size="sm" variant={l.due ? 'primary' : 'secondary'} leftIcon={<Wallet className="h-3.5 w-3.5" />} onClick={() => setModal({ kind: 'rent', l })}>{tr('Rent lein')}</Button>}
                      {manage && l.status === 'OCCUPIED' && <Button size="sm" variant="ghost" onClick={() => setModal({ kind: 'release', l })}>{tr('Khali karein')}</Button>}
                      {manage && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setModal({ kind: 'edit', l })}>{tr('Badlein')}</Button>}
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
        <PageGuide title={tr('Lockers — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: tr('Lockers likhein'), text: tr('Pehla number aur kitne lockers (jaise 1 aur 40) — sab ek saath ban jate hain. Har ek ka mahine ka rent.') },
            { icon: UserPlus, color: '#16a34a', title: tr('Member ko dein'), text: tr('Khali locker par "Member ko dein". Kitne mahine aur kitna paisa mila — bill Sales me banta hai, baqi member ke khate me.') },
            { icon: CalendarClock, color: '#d97706', title: tr('Rent'), text: tr('"Rent kab tak" guzar jaye to locker "Rent baqi" me aata hai. "Rent lein" se agle mahine ka bill. Mahine ke shuru me upar wala bill button sab ka ek mahina khate me daal deta hai.') },
            { icon: LockOpen, color: '#64748b', title: tr('Khali karein'), text: tr('Member chabi wapas de to "Khali karein". Jo rent khate me hai woh wahin rehta hai. Ghalat bill Sales me void karein — rent ki date wapas ho jati hai.') },
          ]}
          shortcuts={[['N', tr('naye lockers')], ['/', 'dhoondein'], ['1-5', 'list'], ['G', 'guide']]}
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
  const error = !number.trim() ? tr('Locker number likhein')
    : many && !/^\d+$/.test(number.trim()) ? tr('Kai lockers ke liye pehla number sirf hindsa ho')
      : !(Number(count) >= 1 && Number(count) <= 200) ? tr('Ek dafa 1 se 200 lockers')
        : rent === '' ? tr('Mahine ka rent likhein') : undefined;
  const save = useMutation({
    mutationFn: () => lockersApi.create({ number: number.trim(), count: Number(count) || 1, monthlyRent: Number(rent) || 0, notes: opt(notes) }),
    onSuccess: (r) => { toast.success(tr('{{created}} locker ban gaye', { created: r.created })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Lockers nahi bane'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Naye lockers')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>{tr('Save')}</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Pehla number')} value={number} onChange={(e) => setNumber(e.target.value)} maxLength={20} autoFocus hint={tr('Jaise 1 ya A-12')} />
          <Input label={tr('Kitne lockers')} inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))} hint={many && /^\d+$/.test(number.trim()) ? tr('{{value}} se {{value2}} tak', { value: number.trim(), value2: Number(number) + Number(count) - 1 }) : tr('Ek ya zyada')} />
        </div>
        <Input label={tr('Mahine ka rent (Rs)')} inputMode="decimal" value={rent} onChange={(e) => setRent(num(e.target.value))} hint={tr('Har locker ka; baad me badal sakte hain')} />
        <Textarea label={tr('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} hint={tr('Marzi hai — jaise \'Ladies section\'')} />
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
      <Select label={tr('Kitne mahine')} value={months} onChange={(e) => setMonths(e.target.value)} options={['1', '2', '3', '6', '12'].map((m) => ({ value: m, label: tr('{{m}} mahina · {{formatPKR}}', { m, formatPKR: formatPKR(rent * Number(m)) }) }))} />
      <Input label={tr('Abhi kitna mila')} inputMode="decimal" value={paid} placeholder={String(total)} onChange={(e) => setPaid(num(e.target.value))} className="text-end font-semibold tabular-nums"
        hint={amount < total ? tr('{{formatPKR}} member ke khate me udhaar', { formatPKR: formatPKR(total - amount) }) : tr('Poora rent')} error={amount > total ? tr('Rent sirf {{total}} hai', { total: formatPKR(total) }) : undefined} />
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
  const error = !member ? tr('Member chunein') : amount > total ? tr('Zyada paisa') : undefined;
  const save = useMutation({
    mutationFn: () => lockersApi.assign(locker.id, { memberId: member!.id, monthlyRent: Number(rent) || 0, startDate, months: Number(months), paidAmount: amount, paymentMethod: method }),
    onSuccess: () => { toast.success(tr('Locker #{{number}} de diya — bill Sales me', { number: locker.number })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Locker nahi diya'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={tr('Locker #{{number}} — member ko dein', { number: locker.number })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{tr('Dein aur bill banayein')}</Button></>}>
      <div className="space-y-3">
        <MemberPicker value={member} onChange={setMember} autoFocus />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={tr('Mahine ka rent (Rs)')} inputMode="decimal" value={rent} onChange={(e) => setRent(num(e.target.value))} hint={tr('Is member ke liye')} />
          <Input label={tr('Kab se')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
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
    onSuccess: (r) => { toast.success(tr('Rent {{endDate}} tak — bill Sales me', { endDate: dateOf(r.endDate) })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Rent nahi likha'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Rent · Locker #{{number}}', { number: locker.number })}
      description={tr('{{value}} · abhi {{value2}} tak', { value: locker.member?.customer?.name ?? '', value2: locker.endDate ? dateOf(locker.endDate) : '—' })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={amount > total} onClick={() => save.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{tr('Bill banayein')}</Button></>}>
      <div className="space-y-3">
        <RentFields rent={locker.monthlyRent} months={months} setMonths={setMonths} paid={paid} setPaid={setPaid} method={method} setMethod={setMethod} />
        <p className="text-[0.75rem] text-slate-500">{tr('Naya mahina pichli date ke baad se shuru hota hai, chahe rent der se mile.')}</p>
      </div>
    </Modal>
  );
}

function ReleaseModal({ locker, onClose }: { locker: GymLocker; onClose: () => void }) {
  const refresh = useLockerSave();
  const [reason, setReason] = useState('');
  const save = useMutation({
    mutationFn: () => lockersApi.release(locker.id, opt(reason)),
    onSuccess: () => { toast.success(tr('Locker #{{number}} khali', { number: locker.number })); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Locker #{{number}} khali karein', { number: locker.number })} description={tr('{{value}} ne chabi wapas di. Jo rent khate me hai woh wahin rehta hai.', { value: locker.member?.customer?.name ?? '' })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button variant="danger" loading={save.isPending} onClick={() => save.mutate()}>{tr('Khali karein')}</Button></>}>
      <Textarea label={tr('Note')} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={300} hint={tr('Marzi hai — jaise \'chabi wapas mil gayi\'')} />
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
    onSuccess: () => { toast.success(tr('Locker save ho gaya')); refresh(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Locker #{{number}} — badlein', { number: locker.number })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} disabled={rent === ''} onClick={() => save.mutate()}>{tr('Save')}</Button></>}>
      <div className="space-y-3">
        <Input label={tr('Mahine ka rent (Rs)')} inputMode="decimal" value={rent} onChange={(e) => setRent(num(e.target.value))} hint={tr('Agle bill se lagega')} />
        {locker.status !== 'OCCUPIED' && <Select label={tr('Haal')} value={status} onChange={(e) => setStatus(e.target.value as 'FREE' | 'MAINTENANCE')} options={[{ value: 'FREE', label: tr('Khali (dene ke liye)') }, { value: 'MAINTENANCE', label: tr('Repair me') }]} />}
        <Textarea label={tr('Note')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} hint={tr('Marzi hai')} />
      </div>
    </Modal>
  );
}

function BillDueModal({ count, onClose, onDone }: { count: number; onClose: () => void; onDone: () => void }) {
  const save = useMutation({
    mutationFn: lockersApi.billDue,
    onSuccess: (r) => { toast.success(r.billed ? tr('{{billed}} lockers ka ek mahina khate me', { billed: r.billed }) : tr('Koi locker baqi nahi tha')); onDone(); onClose(); },
    onError: (e) => toast.error(apiError(e, tr('Bill nahi bane'))),
  });
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Mahine ka rent bill')}
      description={tr('{{count}} lockers ka rent khatam ho chuka. Har ek ka ek mahine ka bill banega aur rent member ke khate me udhaar jayega.', { count })}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button loading={save.isPending} onClick={() => save.mutate()} leftIcon={<ReceiptText className="h-4 w-4" />}>{tr('Bill banayein')}</Button></>}>
      <p className="text-[0.8125rem] text-slate-600">{tr('Jo member nakad de, us ke liye list me "Rent lein" behtar hai — paisa usi waqt drawer me aata hai.')}</p>
    </Modal>
  );
}
