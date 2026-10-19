/**
 * Trainers: staff who train members, with their PT rate, commission rule
 * and working hours. Commission is earned on every completed PT session
 * (single or from a plan); what is owed is earned minus paid. Paying it
 * writes an expense (cash comes out of the drawer), so the day book and
 * profit show it. Salary is paid from Staff → Tankhwah, not here.
 *
 * Keys: N new trainer · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Dumbbell, Flame, GraduationCap, HandCoins, Pencil, Plus, Receipt, UserMinus, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Avatar, Badge, Button, DateRangeMenu, FilterBar, Input, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, Switch,
  Table, TBody, Td, Th, THead, Tr, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { useBusinessDayStart } from '@core/lib/business-day';
import { formatPKR } from '@core/lib/format';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { PaymentMethodPicker } from '@modules/pos/components';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { trainersApi, type Trainer, type TrainerInput, type TrainerRole } from '../api/trainers.api';
import { EmptyList, ListSkeleton, LoadFailed, Panel } from '../components/ui';
import { GYM_KEYS, WEEKDAYS, apiError, dateOf, num } from '../lib/meta';
import { useGymCan } from '../lib/permissions';

const ROLES: Array<{ value: TrainerRole; label: string }> = [
  { value: 'PERSONAL_TRAINER', label: 'Personal trainer' }, { value: 'HEAD_TRAINER', label: 'Head trainer' },
  { value: 'STRENGTH_COACH', label: 'Strength coach' }, { value: 'CARDIO_COACH', label: 'Cardio coach' },
  { value: 'YOGA_INSTRUCTOR', label: 'Yoga' }, { value: 'ZUMBA_INSTRUCTOR', label: 'Zumba' }, { value: 'CROSSFIT_COACH', label: 'CrossFit' },
  { value: 'BOXING_COACH', label: 'Boxing' }, { value: 'MMA_COACH', label: 'MMA' }, { value: 'DANCE_INSTRUCTOR', label: 'Dance' },
  { value: 'NUTRITIONIST', label: 'Diet expert' }, { value: 'PHYSIOTHERAPIST', label: 'Physio' }, { value: 'OTHER', label: 'Doosra' },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;
const nameOf = (t: Trainer) => t.staff?.fullName ?? t.trainerNumber;
const rule = (t: Pick<Trainer, 'commissionPct' | 'commissionFixed'>) =>
  [t.commissionPct ? `${t.commissionPct}%` : '', t.commissionFixed ? `${formatPKR(t.commissionFixed)} har session` : ''].filter(Boolean).join(' + ') || 'Commission nahi';

export default function TrainersPage() {
  const can = useGymCan();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [left, setLeft] = useState(false);
  const [edit, setEdit] = useState<Trainer | 'new' | null>(null);
  const [money, setMoney] = useState<Trainer | null>(null);
  const q = useQuery({ queryKey: [GYM_KEYS.trainers, 'list', left], queryFn: () => trainersApi.list({ includeLeft: left }) });
  const all = q.data ?? [];
  const rows = all.filter((t) => (left ? !t.isActive : t.isActive) && `${nameOf(t)} ${t.trainerNumber} ${t.staff?.phone ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const live = all.filter((t) => t.isActive);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.staff) { e.preventDefault(); setEdit('new'); }
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageShell>
      <PageHero
        title="Trainers"
        chip={<><Dumbbell /> Gym</>}
        meta="PT ka rate, commission aur payout"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.staff && <button type="button" onClick={() => setEdit('new')} title="Naya trainer (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Trainer jorein</button>}
        </>}
        stats={[
          { label: 'Trainers', value: live.length },
          { label: 'PT sessions', value: live.reduce((s, t) => s + t.totalSessions, 0) },
          { label: 'Kul commission bani', value: can.commission ? formatPKR(live.reduce((s, t) => s + t.totalCommission, 0)) : '—' },
        ]}
      />

      <KpiRow cols={3}>
        {q.isLoading ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Dumbbell} color="#16a34a" label="Kaam par" value={live.filter((t) => t.isAvailable).length} hint={`${live.length} trainers`} onClick={() => setLeft(false)} active={!left} />
          <KpiCard icon={Flame} color="#e11d48" label="PT se Sale" value={formatPKR(live.reduce((s, t) => s + t.totalRevenue, 0))} hint="Single sessions ke bill" />
          <KpiCard icon={UserMinus} color="#64748b" label="Chhor gaye" value="Dekhein" hint="Purane trainers" onClick={() => setLeft(true)} active={left} />
        </>}
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Trainer ka naam, number ya phone…" />} />

      {q.isLoading ? <ListSkeleton /> : q.isError ? <LoadFailed what="Trainers" retry={() => q.refetch()} /> : !rows.length ? (
        <EmptyList icon={Dumbbell} title={left ? 'Koi purana trainer nahi' : 'Koi trainer nahi'} text="Trainer pehle Staff me banda hota hai. Phir yahan jorein aur PT ka rate aur commission likhein.">
          {can.staff && !left && <Button onClick={() => setEdit('new')} leftIcon={<Plus className="h-4 w-4" />}>Trainer jorein</Button>}
        </EmptyList>
      ) : (
        <Panel>
          <Table minWidth="48rem">
            <THead><Tr><Th>Trainer</Th><Th>Kaam</Th><Th align="right">PT rate</Th><Th>Commission</Th><Th align="right">Sessions</Th><Th /></Tr></THead>
            <TBody>{rows.map((t) => (
              <Tr key={t.id}>
                <Td><div className="flex items-center gap-3"><Avatar name={nameOf(t)} url={t.photoUrl} size={36} /><div><p className="font-medium text-slate-900">{nameOf(t)}</p><p className="text-[0.75rem] text-slate-500">{t.trainerNumber}{t.staff?.phone ? ` · ${t.staff.phone}` : ''}</p></div></div></Td>
                <Td>{roleLabel(t.role)}<p className="text-[0.75rem] text-slate-500">{t.workStartTime}–{t.workEndTime} · {t.workingDays.map((d) => WEEKDAYS[d]?.slice(0, 2)).join(' ')}</p></Td>
                <Td align="right" className="tabular-nums">{formatPKR(t.perSessionRate)}</Td>
                <Td>{rule(t)}{!t.isAvailable && t.isActive && <div><Badge size="xs">Chhutti par</Badge></div>}</Td>
                <Td align="right" className="tabular-nums">{t.totalSessions}</Td>
                <Td align="right">
                  <div className="flex justify-end gap-1.5">
                    {can.commission && <Button size="sm" variant="secondary" leftIcon={<HandCoins className="h-3.5 w-3.5" />} onClick={() => setMoney(t)}>Commission</Button>}
                    {can.staff && <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEdit(t)}>Badlein</Button>}
                  </div>
                </Td>
              </Tr>
            ))}</TBody>
          </Table>
        </Panel>
      )}

      {edit && <TrainerModal trainer={edit === 'new' ? null : edit} taken={all.map((t) => t.staffId)} onClose={() => setEdit(null)} />}
      {money && <CommissionModal trainer={money} onClose={() => setMoney(null)} />}

      {guide.isOpen && (
        <PageGuide title="Trainers — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Jorna', text: 'Trainer pehle Staff me banda banta hai (tankhwah wahan). Phir yahan chunein aur PT ka rate likhein.' },
            { icon: Flame, color: '#e11d48', title: 'Commission', text: 'Har mukammal PT session par commission banti hai: rate ka % aur/ya fixed amount. Plan wale session par bhi banti hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Payout', text: 'Commission dena kharcha hai: cash drawer se nikalta hai aur Day book aur Profit me aata hai. Jitni baqi ho utni hi de sakte hain.' },
            { icon: Receipt, color: '#7c3aed', title: 'Tankhwah', text: 'Mahana tankhwah Staff → Tankhwah se dein, yahan se nahi — warna do dafa likhi jayegi.' },
          ]}
          shortcuts={[['N', 'trainer jorein'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function TrainerModal({ trainer, taken, onClose }: { trainer: Trainer | null; taken: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const staffQ = useQuery({ queryKey: ['staff', 'gym-trainer-pick'], queryFn: () => staffApi.list({ status: 'ACTIVE' }), enabled: !trainer });
  const free = (staffQ.data ?? []).filter((s) => !taken.includes(s.id) || (trainer && s.id === trainer.staffId));
  const [staffId, setStaffId] = useState(trainer?.staffId ?? '');
  const [role, setRole] = useState<TrainerRole>(trainer?.role ?? 'PERSONAL_TRAINER');
  const [rate, setRate] = useState(String(trainer?.perSessionRate ?? ''));
  const [pct, setPct] = useState(String(trainer?.commissionPct ?? ''));
  const [fixed, setFixed] = useState(String(trainer?.commissionFixed ?? ''));
  const [startT, setStartT] = useState(trainer?.workStartTime ?? '06:00');
  const [endT, setEndT] = useState(trainer?.workEndTime ?? '22:00');
  const [days, setDays] = useState<number[]>(trainer?.workingDays ?? [1, 2, 3, 4, 5, 6]);
  const [skills, setSkills] = useState((trainer?.specializations ?? []).join(', '));
  const [available, setAvailable] = useState(trainer?.isAvailable ?? true);
  const [leaving, setLeaving] = useState(false);
  const error = !trainer && !staffId ? 'Staff me se banda chunein' : Number(pct) > 100 ? 'Commission 100% se zyada nahi' : startT >= endT ? 'Kaam ka waqt sahi likhein' : undefined;
  const save = useMutation({
    mutationFn: () => {
      const body: TrainerInput = {
        role, perSessionRate: Number(rate) || 0, commissionPct: Number(pct) || 0, commissionFixed: Number(fixed) || 0,
        workStartTime: startT, workEndTime: endT, workingDays: days, isAvailable: available,
        specializations: skills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20),
      };
      return trainer ? trainersApi.update(trainer.id, body) : trainersApi.create({ ...body, staffId });
    },
    onSuccess: () => { toast.success('Trainer save ho gaya'); qc.invalidateQueries({ queryKey: [GYM_KEYS.trainers] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const remove = useMutation({
    mutationFn: () => trainersApi.remove(trainer!.id),
    onSuccess: () => { toast.success('Trainer "chhor gaye" me'); qc.invalidateQueries({ queryKey: [GYM_KEYS.trainers] }); onClose(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  return (
    <Modal open onClose={onClose} size="md" title={trainer ? `${nameOf(trainer)} — badlein` : 'Trainer jorein'}
      footer={<>
        {trainer?.isActive && (leaving
          ? <Button variant="danger" className="mr-auto" loading={remove.isPending} onClick={() => remove.mutate()}>Haan, chhor gaya</Button>
          : <Button variant="ghost" className="mr-auto" onClick={() => setLeaving(true)} leftIcon={<UserMinus className="h-4 w-4" />}>Chhor gaya</Button>)}
        <Button variant="secondary" onClick={onClose}>Rehne dein</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>Save</Button>
      </>}>
      <div className="grid gap-3 sm:grid-cols-2">
        {!trainer && (
          <Select wrapperClassName="sm:col-span-2" label="Staff me se" value={staffId} onChange={(e) => setStaffId(e.target.value)}
            options={[{ value: '', label: staffQ.isLoading ? 'Load ho raha hai…' : '— Chunein —' }, ...free.map((s) => ({ value: s.id, label: `${s.fullName}${s.designation ? ` · ${s.designation}` : ''}` }))]}
            hint={<>Nahi mila? <Link to="/staff/new" className="font-semibold text-brand-700 hover:underline">Staff me naya banda</Link></>} />
        )}
        <Select label="Kaam" value={role} onChange={(e) => setRole(e.target.value as TrainerRole)} options={ROLES} />
        <Input label="PT session rate (Rs)" inputMode="decimal" value={rate} onChange={(e) => setRate(num(e.target.value))} placeholder="1500" hint="Single session ka bill isi par" />
        <Input label="Commission %" inputMode="decimal" value={pct} onChange={(e) => setPct(num(e.target.value))} placeholder="40" hint="Session ki qeemat ka hissa" />
        <Input label="Fixed commission (har session)" inputMode="decimal" value={fixed} onChange={(e) => setFixed(num(e.target.value))} placeholder="0" hint="Marzi hai" />
        <Input label="Kaam shuru" type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
        <Input label="Kaam khatam" type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-[0.8125rem] font-medium text-slate-700">Kaam ke din</p>
          <div className="flex flex-wrap gap-1">{WEEKDAYS.map((d, i) => (
            <button key={d} type="button" onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i].sort()))}
              className={`h-8 rounded-lg px-2.5 text-[0.75rem] font-medium ring-1 ${days.includes(i) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200'}`}>{d}</button>
          ))}</div>
        </div>
        <Input wrapperClassName="sm:col-span-2" label="Mahaarat" value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Wazan kam, body building, ladies" hint="Comma laga kar" />
        <Switch checked={available} onChange={(e) => setAvailable(e.target.checked)} label="Kaam par" description="Off = chhutti par, PT book nahi hoga" />
        {error && (trainer || staffId) && <p className="text-[0.8125rem] text-rose-600 sm:col-span-2">{error}</p>}
      </div>
    </Modal>
  );
}

function CommissionModal({ trainer, onClose }: { trainer: Trainer; onClose: () => void }) {
  const qc = useQueryClient();
  const can = useGymCan();
  const startHour = useBusinessDayStart();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const r = resolveRange(range, startHour);
  const cQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'commission', trainer.id, r?.from, r?.to], queryFn: () => trainersApi.commission(trainer.id, r?.from, r?.to) });
  const pQ = useQuery({ queryKey: [GYM_KEYS.trainers, 'payouts', trainer.id], queryFn: () => trainersApi.payouts(trainer.id) });
  const c = cQ.data;
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const owed = Math.max(c?.owed ?? 0, 0);
  const value = amount === '' ? owed : Number(amount) || 0;
  const error = !(value > 0) ? 'Baqi commission nahi' : value > owed + 0.01 ? `Baqi sirf ${formatPKR(owed)}` : undefined;
  const pay = useMutation({
    mutationFn: () => trainersApi.pay(trainer.id, { amount: value, paymentMethod: method, note: note.trim() || undefined }),
    onSuccess: (x) => { toast.success(`${formatPKR(value)} diye · ${x.expenseNumber}`); setAmount(''); setNote(''); [GYM_KEYS.trainers, 'expenses', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (e) => toast.error(apiError(e, 'Payout nahi hua')),
  });
  const lines = useMemo(() => c?.lines ?? [], [c]);
  return (
    <Modal open onClose={onClose} size="lg" title={`Commission · ${nameOf(trainer)}`} description={rule(trainer)}>
      <div className="space-y-4">
        {cQ.isLoading ? <ListSkeleton rows={2} /> : !c ? <LoadFailed what="Commission" retry={() => cQ.refetch()} /> : (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['Kul bani', c.earned], ['Di gayi', c.paid], ['Baqi', c.owed]].map(([l, v]) => (
                <div key={l as string} className="rounded-xl bg-slate-50 px-2 py-2 ring-1 ring-slate-200"><p className="text-[0.75rem] text-slate-500">{l}</p><p className="font-semibold tabular-nums text-slate-900">{formatPKR(v as number)}</p></div>
              ))}
            </div>
            {c.owed < 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900">Zyada di gayi: kisi session ka bill void hua. Agli commission isi me se katti jayegi.</p>}
            {can.payCommission && owed > 0 && (
              <div className="space-y-3 rounded-2xl bg-success-50/60 p-3 ring-1 ring-success-200">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input label="Kitna dena hai" inputMode="decimal" value={amount} placeholder={String(owed)} onChange={(e) => setAmount(num(e.target.value))} className="text-right font-semibold tabular-nums" hint="Khali chhorein to poori baqi" />
                  <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="October ki commission" hint="Marzi hai" />
                </div>
                <PaymentMethodPicker value={method} onChange={setMethod} label="Kahan se diye" />
                <Button loading={pay.isPending} disabled={!!error} onClick={() => pay.mutate()} leftIcon={<Wallet className="h-4 w-4" />}>{formatPKR(value)} dein (kharcha)</Button>
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">Sessions · {c.period.sessions} · {formatPKR(c.period.commission)}</p>
              <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" />
            </div>
            {!lines.length ? <p className="py-6 text-center text-sm text-slate-500">Is period me koi mukammal session nahi</p> : (
              <Panel>
                <Table minWidth="34rem">
                  <THead><Tr><Th>Session</Th><Th>Member</Th><Th>Din</Th><Th align="right">Qeemat</Th><Th align="right">Commission</Th></Tr></THead>
                  <TBody>{lines.map((l) => (
                    <Tr key={l.id}><Td className="font-medium">{l.sessionNumber}</Td><Td>{l.member?.name ?? l.member?.memberNumber ?? '—'}</Td><Td>{dateOf(l.actualEnd ?? l.scheduledStart)}</Td>
                      <Td align="right" className="tabular-nums">{l.isFromPackage ? 'Plan se' : formatPKR(l.price)}</Td><Td align="right" className="tabular-nums">{formatPKR(l.commissionAmount)}</Td></Tr>
                  ))}</TBody>
                </Table>
              </Panel>
            )}
          </>
        )}
        <div>
          <p className="mb-2 font-semibold text-slate-900">Payouts</p>
          {!pQ.data?.length ? <p className="text-sm text-slate-500">Abhi koi payout nahi</p> : (
            <ul className="divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
              {pQ.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-[0.8125rem]">
                  <span>{dateOf(p.expenseDate)} · {p.expenseNumber}{p.description ? ` · ${p.description}` : ''}</span>
                  <span className="tabular-nums font-semibold">{formatPKR(p.amount)}{p.status === 'CANCELLED' && <Badge size="xs" variant="danger" className="ml-1">Cancel</Badge>}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[0.75rem] text-slate-500">Tankhwah <Link to="/staff/salary/new" className="font-semibold text-brand-700 hover:underline">Staff → Tankhwah</Link> se dein.</p>
        </div>
      </div>
    </Modal>
  );
}
