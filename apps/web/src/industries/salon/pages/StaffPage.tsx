/**
 * Stylists: who takes bookings, their role, days and hours and commission
 * rate; today's load; and the commission statement for a period from
 * billed services (voided bills left out, returned services taken back),
 * with each stylist's lines, what is paid and owed, and print. Paying a
 * stylist opens their payout screen. People come from HR staff; a
 * stylist profile adds the salon side.
 *
 * Keys: N add stylist · 1 stylists · 2 commission · G guide.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarCheck, Clock, Coins, GraduationCap, Pencil, Percent, Plus, Power, Receipt, Scissors, UserPlus, Users, Wallet } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import type { PrintDoc } from '@core/print';
import {
  Avatar, Badge, Button, Card, DateRangeMenu, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, Select, Skeleton, Switch,
  Table, TBody, Td, Th, THead, Tr, ViewTabs, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { staffApi } from '@modules/organization/staff/api/staff.api';
import { appointmentsApi } from '../api/appointments.api';
import { staffProfilesApi, type CommissionType, type StaffProfile, type StaffRole } from '../api/staff-profiles.api';
import { CardTitle, EmptyList, HeroPrint, ListSkeleton, LoadFailed } from '../components/ui';
import { ROLES, SALON_KEYS, WEEKDAYS, apiError, dateOf, dayKey, roleLabel, staffName } from '../lib/meta';
import { useSalonCan } from '../lib/permissions';
import { t } from '@core/i18n';

type Tab = 'people' | 'commission';
const COMMISSION: Array<{ value: CommissionType; label: string }> = [
  { value: 'NONE', label: t('Sirf service ka rate') },
  { value: 'PERCENTAGE', label: t('% har service par') },
  { value: 'FIXED_PER_SERVICE', label: t('Fixed Rs har service par') },
  { value: 'HYBRID', label: t('% + fixed dono') },
];

export default function StaffPage() {
  const qc = useQueryClient();
  const can = useSalonCan();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { cost, sales } = useMasked();
  const [tab, setTab] = useState<Tab>('people');
  const [edit, setEdit] = useState<{ staffId: string; name: string; profile?: StaffProfile } | null>(null);
  const [adding, setAdding] = useState(false);
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [person, setPerson] = useState('');

  const listQ = useQuery({ queryKey: [SALON_KEYS.staff, 'list'], queryFn: () => staffProfilesApi.list(), staleTime: 60_000 });
  const today = new Date();
  const todayQ = useQuery({
    queryKey: [SALON_KEYS.appointments, 'day', dayKey(today)],
    queryFn: () => appointmentsApi.calendar(new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString(), new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString()),
    refetchInterval: 60_000,
  });
  const period = resolveRange(range, startHour);
  const comQ = useQuery({
    queryKey: [SALON_KEYS.staff, 'commission', period?.from, period?.to, person],
    queryFn: () => staffProfilesApi.commission({ ...(period ?? {}), staffProfileId: person || undefined }),
    enabled: can.commission,
  });
  const remove = useMutation({
    mutationFn: (p: StaffProfile) => staffProfilesApi.remove(p.id),
    onSuccess: () => { toast.success(t('Stylist list se hat gaya — history rehti hai')); qc.invalidateQueries({ queryKey: [SALON_KEYS.staff] }); },
    onError: (e) => toast.error(apiError(e, t('Nahi hata'))),
  });

  const people = listQ.data ?? [];
  const load = useMemo(() => {
    const m = new Map<string, { total: number; done: number; now: boolean }>();
    for (const a of todayQ.data ?? []) {
      if (a.status === 'CANCELLED' || a.status === 'NO_SHOW') continue;
      for (const s of a.services) {
        if (!s.staffProfileId) continue;
        const r = m.get(s.staffProfileId) ?? { total: 0, done: 0, now: false };
        r.total += 1;
        if (a.status === 'COMPLETED') r.done += 1;
        if (a.status === 'IN_PROGRESS') r.now = true;
        m.set(s.staffProfileId, r);
      }
    }
    return m;
  }, [todayQ.data]);
  const com = comQ.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && can.staff) { e.preventDefault(); setAdding(true); }
      if (e.key === '1') setTab('people');
      if (e.key === '2' && can.commission) setTab('commission');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printDoc = (): PrintDoc => ({
    title: person ? t('Commission — {{value}}', { value: com?.staff[0]?.name ?? '' }) : t('Stylist commission'),
    subtitle: com ? rangeLabel(com.from, com.to) : '',
    meta: com ? [[t('Services'), String(com.totals.services)], [t('Bill'), formatPKR(com.totals.revenue)], [t('Commission'), formatPKR(com.totals.net)]] : [],
    sections: person && com?.lines ? [{
      kind: 'table',
      columns: [{ label: t('Date') }, { label: t('Bill'), wideOnly: true }, { label: t('Customer'), wideOnly: true }, { label: t('Service') }, { label: t('Amount'), align: 'right' }, { label: t('Commission'), align: 'right' }],
      rows: com.lines.map((l) => [dateOf(l.at), l.saleNumber, l.customerName ?? '—', `${l.serviceName}${l.returned ? ' (wapas)' : ''}`, formatPKR(l.total), l.returned ? `−${formatPKR(l.commission)}` : formatPKR(l.commission)]),
    }] : [{
      kind: 'table',
      columns: [{ label: t('Stylist') }, { label: t('Services'), align: 'right' }, { label: t('Bill'), align: 'right' }, { label: t('Wapas'), align: 'right', wideOnly: true }, { label: t('Commission'), align: 'right' }],
      rows: (com?.staff ?? []).map((p) => [p.name, String(p.services), formatPKR(p.revenue), formatPKR(p.returned), formatPKR(p.net)]),
    }],
  });

  return (
    <PageShell>
      <PageHero
        title={t('Stylist aur staff')}
        chip={<><Users /> {' '}{t('Salon')}</>}
        meta={t('Kaun booking leta hai, kab kaam karta hai, kitni commission')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={listQ.isLoading}
        actions={<>
          {tab === 'commission' && <HeroPrint doc={printDoc} disabled={!com?.staff.length} />}
          <button type="button" onClick={guide.open} title={t('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {can.staff && <button type="button" onClick={() => setAdding(true)} title={t('Stylist jorein (N)')} className={heroPrimaryButton}><UserPlus className="h-4 w-4" /> {' '}{t('Stylist jorein')}</button>}
        </>}
        stats={[
          { label: t('Stylist'), value: people.length, hint: t('{{count}} booking lete hain', { count: people.filter((p) => p.isBookable).length }) },
          { label: t('Aaj chair par'), value: [...load.values()].filter((x) => x.now).length },
          ...(can.commission && com ? [{ label: t('Commission (period)'), value: cost(com.totals.net) }] : []),
        ]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Users} color="#db2777" label={t('Stylist')} value={people.length} hint={t('Salon profile wale')} onClick={() => setTab('people')} active={tab === 'people'} />
          <KpiCard icon={CalendarCheck} color="#2563eb" label={t('Aaj ke kaam')} value={[...load.values()].reduce((s, x) => s + x.total, 0)} hint={t('{{value}} ho gaye', { value: [...load.values()].reduce((s, x) => s + x.done, 0) })} />
          <KpiCard icon={Receipt} color="#16a34a" label={t('Period ka bill')} value={com ? sales(com.totals.revenue) : '—'} hint={com ? t('{{services}} services', { services: com.totals.services }) : t('Commission dekhne ki permission chahiye')} onClick={can.commission ? () => setTab('commission') : undefined} />
          <KpiCard icon={Coins} color="#ca8a04" label={t('Commission banti')} value={com ? cost(com.totals.net) : '—'} hint={t('Wapas services ke baad')} onClick={can.commission ? () => setTab('commission') : undefined} active={tab === 'commission'} />
        </>}
      </KpiRow>

      {tab === 'commission' && (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{t('Bill ki date se. Void bill shamil nahi; wapas hui service ki commission minus.')}</p>}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
          {person && <Button size="sm" variant="secondary" onClick={() => setPerson('')}>{t('Sab stylist')}</Button>}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab} hint={<>{can.staff && <><Kbd>N</Kbd> {' '}{t('jorein ·')}{' '} </>}<Kbd>1</Kbd>-<Kbd>2</Kbd> {' '}{t('tabs')}</>}
        tabs={[{ id: 'people', label: t('Stylist'), icon: Users, count: people.length }, ...(can.commission ? [{ id: 'commission' as const, label: t('Commission'), icon: Coins }] : [])]} />

      {tab === 'people' ? (
        listQ.isLoading ? <ListSkeleton /> : listQ.isError ? <LoadFailed what={t('Stylist')} retry={() => listQ.refetch()} /> : !people.length ? (
          <EmptyList icon={Scissors} title={t('Abhi koi stylist nahi')} text={t('HR staff me se jo log kaam karte hain unhein stylist banayein — phir booking, calendar aur commission un ke naam par chalte hain.')}>
            {can.staff && <Button onClick={() => setAdding(true)} leftIcon={<UserPlus className="h-4 w-4" />}>{t('Stylist jorein')}</Button>}
            <Link to="/staff/new" className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">{t('Naya staff banayein')}</Link>
          </EmptyList>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {people.map((p) => {
              const l = load.get(p.id);
              return (
                <div key={p.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                  <div className="flex items-start gap-3">
                    <Avatar name={staffName(p)} url={p.staff?.avatarUrl ?? undefined} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{staffName(p)}</p>
                      <p className="text-[0.8125rem] text-slate-500">{roleLabel(p.role)}{p.staff?.phone ? ` · ${p.staff.phone}` : ''}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.isBookable ? <Badge size="xs" variant="success">{t('Booking leta hai')}</Badge> : <Badge size="xs" variant="default">{t('Booking band')}</Badge>}
                        {l?.now && <Badge size="xs" variant="warning" dot>{t('Chair par')}</Badge>}
                      </div>
                    </div>
                    {can.staff && (
                      <button type="button" title={t('Badlein')} onClick={() => setEdit({ staffId: p.staffId, name: staffName(p), profile: p })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"><Pencil className="h-4 w-4" /></button>
                    )}
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">{t('Aaj')}</dt><dd className="font-bold tabular-nums">{l ? `${l.done}/${l.total}` : '0'}</dd></div>
                    <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">{t('Rate')}</dt><dd className="text-[0.8125rem] font-bold">{p.commissionType === 'NONE' && !p.commissionPct && !p.commissionFixed ? '—' : `${p.commissionPct ? `${p.commissionPct}%` : ''}${p.commissionFixed ? ` ${formatPKR(p.commissionFixed)}` : ''}`}</dd></div>
                    <div className="rounded-xl bg-slate-50 py-2"><dt className="text-[0.6875rem] text-slate-500">{t('Kul kaam')}</dt><dd className="font-bold tabular-nums">{p.totalAppointments}</dd></div>
                  </dl>
                  <p className="mt-2 flex items-center gap-1 text-[0.75rem] text-slate-500"><Clock className="h-3.5 w-3.5" />{p.workStartTime}–{p.workEndTime} · {p.workingDays.length === 7 ? t('Har din') : p.workingDays.map((d) => WEEKDAYS[d].slice(0, 3)).join(', ')}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link to={`/salon/appointments/new?stylist=${p.id}`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"><Plus className="h-3.5 w-3.5" /> {' '}{t('Booking')}</Link>
                    {can.commission && <button type="button" onClick={() => { setPerson(p.id); setTab('commission'); }} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"><Coins className="h-3.5 w-3.5" /> {' '}{t('Commission')}</button>}
                    {can.staff && <button type="button" onClick={() => remove.mutate(p)} className="ms-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] text-slate-500 hover:bg-rose-50 hover:text-rose-700"><Power className="h-3.5 w-3.5" /> {' '}{t('Hatayein')}</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : comQ.isLoading ? <ListSkeleton /> : !com?.staff.length ? (
        <EmptyList icon={Coins} title={t('Is period me koi commission nahi')} text={t('Counter par har service ke saath stylist chunein — bill bante hi commission yahan aa jati hai.')} />
      ) : person && com.lines ? (
        <Card flush title={<CardTitle icon={Receipt}>{t('{{name}} — har service', { name: com.staff[0]?.name })}</CardTitle>}
          actions={<span className="flex items-center gap-3"><span className="text-[0.875rem] font-bold">{cost(com.totals.net)}</span><Link to={`/salon/staff/${person}/payout`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-brand-700 ring-1 ring-slate-200 hover:bg-slate-50"><Wallet className="h-3.5 w-3.5" /> {' '}{t('Payout')}</Link></span>}>
          <Table minWidth="40rem">
            <THead><Tr><Th>{t('Date')}</Th><Th>{t('Bill')}</Th><Th>{t('Customer')}</Th><Th>{t('Service')}</Th><Th align="right">{t('Amount')}</Th><Th align="right">{t('Commission')}</Th></Tr></THead>
            <TBody>
              {com.lines.map((l) => (
                <Tr key={l.id} className={l.returned ? 'bg-rose-50/40' : ''}>
                  <Td>{dateOf(l.at)}</Td>
                  <Td><Link to={`/salon/appointments/${l.appointmentId}`} className="text-brand-700 hover:underline">{l.saleNumber}</Link></Td>
                  <Td>{l.customerName ?? t('Walk-in')}</Td>
                  <Td>{l.serviceName}{l.returned && <Badge size="xs" variant="danger" className="ms-1">{t('Wapas')}</Badge>}</Td>
                  <Td align="right" className="tabular-nums">{l.total ? formatPKR(l.total) : <span className="text-success-700">{t('Package')}</span>}</Td>
                  <Td align="right" className={cn('tabular-nums', l.returned && 'text-rose-700 line-through')}>{cost(l.commission)}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </Card>
      ) : (
        <Card flush title={<CardTitle icon={Percent}>{t('Commission — {{from}}', { from: rangeLabel(com.from, com.to) })}</CardTitle>}>
          <Table minWidth="36rem">
            <THead><Tr><Th>{t('Stylist')}</Th><Th align="right">{t('Services')}</Th><Th align="right">{t('Bill')}</Th><Th align="right">{t('Wapas')}</Th><Th align="right">{t('Commission')}</Th><Th align="right">{t('Di gayi')}</Th><Th align="right">{t('Baqi')}</Th><Th /></Tr></THead>
            <TBody>
              {com.staff.map((p) => (
                <Tr key={p.staffProfileId} className="cursor-pointer hover:bg-slate-50" onClick={() => setPerson(p.staffProfileId)}>
                  <Td className="font-medium text-slate-900">{p.name}</Td>
                  <Td align="right" className="tabular-nums">{p.services}</Td>
                  <Td align="right" className="tabular-nums">{sales(p.revenue)}</Td>
                  <Td align="right" className="tabular-nums text-rose-700">{p.returned ? `−${cost(p.returned)}` : '—'}</Td>
                  <Td align="right" className="font-semibold tabular-nums">{cost(p.net)}</Td>
                  <Td align="right" className="tabular-nums text-success-700">{p.paid ? cost(p.paid) : '—'}</Td>
                  <Td align="right" className="font-semibold tabular-nums text-amber-700">{p.unpaid ? cost(p.unpaid) : '—'}</Td>
                  <Td align="right" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/salon/staff/${p.staffProfileId}/payout`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[0.8125rem] font-medium text-brand-700 ring-1 ring-slate-200 hover:bg-slate-50"><Wallet className="h-3.5 w-3.5" /> {' '}{t('Payout')}</Link>
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
          <p className="border-t border-slate-100 px-5 py-3 text-[0.75rem] text-slate-500">{t('"Payout" se baqi commission drawer se dein — Expense likha jata hai aur slip print hoti hai.')}</p>
        </Card>
      )}

      {adding && <AddStylist existing={people.map((p) => p.staffId)} onPick={(staffId, name) => { setAdding(false); setEdit({ staffId, name }); }} onClose={() => setAdding(false)} />}
      {edit && <ProfileModal staffId={edit.staffId} name={edit.name} profile={edit.profile} onClose={() => setEdit(null)} />}

      {guide.isOpen && (
        <PageGuide title={t('Stylist — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: UserPlus, color: '#db2777', title: t('Stylist jorein'), text: t('HR staff me jo log hain un me se chunein, role aur kaam ke din / ghante likhein. Naya banda pehle HR → Staff me banayein.') },
            { icon: Percent, color: '#16a34a', title: t('Commission'), text: t('Stylist ka % ya fixed rate. Service par alag commission likhi ho to woh pehle lagti hai.') },
            { icon: Coins, color: '#ca8a04', title: t('Commission ka hisaab'), text: t('Period chunein: har stylist ki services, bill aur commission. Wapas hui service ki commission minus, void bill shamil nahi.') },
            { icon: Power, color: '#64748b', title: t('Booking band'), text: t('"Booking leta hai" band karne se stylist booking aur counter list se hat jata hai, history rehti hai.') },
          ]}
          shortcuts={[['N', t('stylist jorein')], ['1', 'stylist'], ['2', 'commission'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function AddStylist({ existing, onPick, onClose }: { existing: string[]; onPick: (staffId: string, name: string) => void; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const q = useQuery({ queryKey: ['staff', 'salon-add'], queryFn: () => staffApi.list({ status: 'ACTIVE' }) });
  const list = (q.data ?? []).filter((s) => !existing.includes(s.id) && s.fullName.toLowerCase().includes(term.trim().toLowerCase()));
  return (
    <Modal open onClose={onClose} size="md" title={t('Stylist jorein')} description={t('HR staff me se chunein. Naya banda pehle Staff page par banayein.')}>
      <div className="space-y-2">
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t('Naam dhoondein')} autoFocus />
        <div className="max-h-80 overflow-auto rounded-2xl ring-1 ring-slate-200">
          {q.isLoading ? <p className="p-3 text-[0.8125rem] text-slate-500">{t('Load ho raha hai…')}</p> : !list.length ? (
            <div className="p-4 text-center text-[0.8125rem] text-slate-500">{t('Koi nahi mila.')}{' '} <Link to="/staff/new" className="font-semibold text-brand-700">{t('Naya staff banayein')}</Link></div>
          ) : list.map((s) => (
            <button key={s.id} type="button" onClick={() => onPick(s.id, s.fullName)} className="flex w-full items-center gap-3 border-b border-slate-100 px-3 py-2.5 text-start last:border-0 hover:bg-slate-50">
              <Avatar name={s.fullName} size={32} />
              <span className="min-w-0 flex-1"><span className="block truncate text-[0.875rem] font-medium">{s.fullName}</span><span className="text-[0.75rem] text-slate-500">{s.designation} · {s.phone}</span></span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

function ProfileModal({ staffId, name, profile, onClose }: { staffId: string; name: string; profile?: StaffProfile; onClose: () => void }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<StaffRole>(profile?.role ?? 'STYLIST');
  const [type, setType] = useState<CommissionType>(profile?.commissionType ?? 'PERCENTAGE');
  const [pct, setPct] = useState(String(profile?.commissionPct ?? ''));
  const [fixed, setFixed] = useState(String(profile?.commissionFixed || ''));
  const [days, setDays] = useState<number[]>(profile?.workingDays ?? [1, 2, 3, 4, 5, 6]);
  const [from, setFrom] = useState(profile?.workStartTime ?? '10:00');
  const [to, setTo] = useState(profile?.workEndTime ?? '21:00');
  const [bookable, setBookable] = useState(profile?.isBookable ?? true);
  const pctN = Number(pct) || 0;
  const error = to <= from ? t('Chhutti ka waqt aane ke waqt ke baad rakhein') : pctN < 0 || pctN > 100 ? t('Commission 0 se 100% tak') : !days.length ? t('Kam az kam ek din chunein') : undefined;
  const save = useMutation({
    mutationFn: () => staffProfilesApi.upsert({
      staffId, role, commissionType: type,
      commissionPct: type === 'FIXED_PER_SERVICE' ? 0 : pctN,
      commissionFixed: type === 'PERCENTAGE' ? 0 : Number(fixed) || 0,
      workingDays: [...days].sort(), workStartTime: from, workEndTime: to, isBookable: bookable, isActive: true,
    }),
    onSuccess: () => { toast.success(t('{{name}} save ho gaya', { name })); qc.invalidateQueries({ queryKey: [SALON_KEYS.staff] }); onClose(); },
    onError: (e) => toast.error(apiError(e, t('Save nahi hua'))),
  });
  return (
    <Modal open onClose={onClose} size="md" title={name} description={t('Salon me role, kaam ke din aur commission')}
      footer={<><Button variant="secondary" onClick={onClose}>{t('Rehne dein')}</Button><Button loading={save.isPending} disabled={!!error} onClick={() => save.mutate()}>{t('Save')}</Button></>}>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label={t('Role')} value={role} onChange={(e) => setRole(e.target.value as StaffRole)} options={ROLES.map((r) => ({ value: r.value, label: r.label }))} />
          <Select label={t('Commission')} value={type} onChange={(e) => setType(e.target.value as CommissionType)} options={COMMISSION} hint={t('Service par apna rate ho to woh pehle lagta hai')} />
          {type !== 'FIXED_PER_SERVICE' && type !== 'NONE' && <Input label={t('Commission %')} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value.replace(/[^\d.]/g, ''))} placeholder="15" />}
          {(type === 'FIXED_PER_SERVICE' || type === 'HYBRID') && <Input label={t('Fixed Rs har service')} inputMode="decimal" value={fixed} onChange={(e) => setFixed(e.target.value.replace(/[^\d.]/g, ''))} placeholder="100" />}
        </div>
        <div>
          <p className="mb-1 text-[0.8125rem] font-medium text-slate-700">{t('Kaam ke din')}</p>
          <div className="flex flex-wrap gap-1">
            {WEEKDAYS.map((d, i) => (
              <button key={d} type="button" onClick={() => setDays((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}
                className={cn('h-8 rounded-lg px-2.5 text-[0.8125rem] font-medium ring-1', days.includes(i) ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200')}>{d.slice(0, 3)}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={t('Aane ka waqt')} type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label={t('Chhutti')} type="time" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Switch label={t('Booking leta hai')} description={t('Band ho to booking aur counter ki list me nahi aata')} checked={bookable} onChange={(e) => setBookable(e.target.checked)} />
        {error && <p className="text-[0.8125rem] text-rose-600">{error}</p>}
      </div>
    </Modal>
  );
}
