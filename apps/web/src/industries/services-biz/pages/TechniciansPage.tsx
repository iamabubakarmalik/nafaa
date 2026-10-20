/**
 * Technicians: who is free, on a job or on leave, their open jobs, rating
 * and pay terms; the commission each earned on billed jobs in a period and
 * paying it from the drawer (an expense, with a slip to sign); and past
 * payouts.
 *
 * Keys: N new technician · 1-3 tabs · / search · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Briefcase, Download, GraduationCap, History, Pencil, Plus, Power, Printer, Star, UserCog, Users, Wallet, Wrench } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import {
  Button, DateRangeMenu, FilterBar, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Select, Skeleton, TBody, THead, Table, Td, Th, Tr, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { techniciansApi, type TechStatus, type Technician, type TechnicianInput } from '../api/technicians.api';
import { TechnicianModal } from '../components/TechnicianModal';
import { printCommissionSlip } from '../components/slips';
import { COMMISSION_KEY, MONEY_KEYS, TECH_KEY, TECH_STATUSES, apiError, dateTime, dayOnly, levelOf, techStatusOf, tradeOf } from '../components/meta';

type Tab = 'team' | 'commission' | 'payouts';
const THIS_MONTH: DateRangeValue = { preset: 'thisMonth', custom: { from: '', to: '' } };

export default function TechniciansPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const startHour = useBusinessDayStart();
  const { sales } = useMasked();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const canStaff = usePermission(PERMISSIONS.STAFF_MANAGE);
  const canJobs = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const viewPay = usePermission(PERMISSIONS.COMMISSION_VIEW);
  const managePay = usePermission(PERMISSIONS.COMMISSION_MANAGE);
  const addExpense = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const canSeePay = viewPay || managePay;
  const canPay = managePay && addExpense;
  useReceiptSetup();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('team');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Technician | null | 'new'>(null);
  const [off, setOff] = useState<Technician | null>(null);
  const [range, setRange] = useState<DateRangeValue>(THIS_MONTH);
  const [paying, setPaying] = useState<{ technicianId: string; name: string; amount: number } | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const period = resolveRange(range, startHour) ?? resolveRange(THIS_MONTH, startHour)!;

  const listQ = useQuery({ queryKey: [TECH_KEY], queryFn: () => techniciansApi.list(), refetchInterval: 60_000 });
  const statQ = useQuery({ queryKey: [COMMISSION_KEY, period.from, period.to], queryFn: () => techniciansApi.commission(period.from, period.to), enabled: canSeePay });
  const payoutsQ = useQuery({ queryKey: [COMMISSION_KEY, 'payouts'], queryFn: () => techniciansApi.payouts(), enabled: canSeePay && tab === 'payouts' });
  const all = listQ.data ?? [];
  const rows = useMemo(() => {
    const w = search.trim().toLowerCase();
    return all.filter((t) => !w || `${t.staff?.fullName ?? ''} ${t.staff?.phone ?? ''} ${t.serviceAreas.join(' ')} ${tradeOf(t.primarySkill)}`.toLowerCase().includes(w));
  }, [all, search]);
  const count = (s: TechStatus) => all.filter((t) => t.status === s).length;
  const st = statQ.data;

  const refresh = () => [TECH_KEY, COMMISSION_KEY].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const save = useMutation({
    mutationFn: (v: TechnicianInput) => techniciansApi.upsert(v),
    onSuccess: () => { toast.success('Technician save ho gaya'); refresh(); setEditing(null); },
    onError: (e) => toast.error(apiError(e, 'Save nahi hua')),
  });
  const status = useMutation({
    mutationFn: (v: { id: string; status: TechStatus }) => techniciansApi.updateStatus(v.id, v.status),
    onSuccess: () => { toast.success('Halat badal di'); refresh(); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => techniciansApi.remove(id),
    onSuccess: () => { toast.success('Technician band — purani jobs aur commission wese hi'); refresh(); setOff(null); },
    onError: (e) => toast.error(apiError(e, 'Nahi hua')),
  });
  const pay = useMutation({
    mutationFn: () => techniciansApi.pay({ technicianId: paying!.technicianId, from: period.from, to: period.to, paymentMethod: method, note: note.trim() || undefined }),
    onSuccess: (slip) => {
      toast.success(`${slip.technicianName} ko ${sales(slip.amount)} commission di — ${slip.ref}`, { action: { label: 'Slip', onClick: () => printCommissionSlip(slip, shopName) } });
      [COMMISSION_KEY, TECH_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      setPaying(null); setNote('');
    },
    onError: (e) => toast.error(apiError(e, 'Commission nahi di gayi')),
  });
  const openSlip = async (ref: string) => {
    try { printCommissionSlip(await techniciansApi.slip(ref), shopName); } catch (e) { toast.error(apiError(e, 'Slip nahi mili')); }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canStaff) { e.preventDefault(); setEditing('new'); }
      if (e.key === '1') setTab('team');
      if (e.key === '2' && canSeePay) setTab('commission');
      if (e.key === '3' && canSeePay) setTab('payouts');
      if (e.key === '/') { e.preventDefault(); setTab('team'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canStaff, canSeePay]);

  const exportCsv = () => {
    if (tab === 'commission' && st) {
      downloadCsv(`commission-${period.from}-${period.to}.csv`, [
        ['Technician', 'Job', 'Bill #', 'Date', 'Customer', 'Kaam', 'Bill', 'Kaam ka hissa', 'Return', 'Kaam ka return', 'Commission', 'Di gayi'],
        ...st.lines.map((l) => [l.technicianName, l.jobNumber, l.saleNumber, dayOnly(l.billedAt), l.customerName ?? '', l.serviceName, l.bill, l.work, l.refunded, l.workReturned, l.commission, l.paidRef ?? '']),
      ]);
      return;
    }
    downloadCsv('technicians.csv', [
      ['Naam', 'Phone', 'Darja', 'Hunar', 'Halat', 'Chaalu jobs', 'Mukammal jobs', 'Rating', 'Commission', '%', 'Fixed', 'Areas'],
      ...rows.map((t) => [t.staff?.fullName ?? '', t.staff?.phone ?? '', levelOf(t.level), tradeOf(t.primarySkill), techStatusOf(t.status).label, t.openJobs ?? 0, t.completedJobs, t.avgRating ?? '', t.commissionType, t.commissionPct, t.fixedPerJob, t.serviceAreas.join(' / ')]),
    ]);
  };

  return (
    <PageShell>
      <PageHero
        title="Technicians"
        chip={<><Users /> Team</>}
        meta="Kaun free hai, kis ke paas kitna kaam, aur commission ka hisaab"
        loading={listQ.isLoading}
        actions={<>
          <button type="button" onClick={exportCsv} disabled={tab === 'payouts'} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <Link to="/services-biz/dispatch" className={heroButton}><Wrench className="h-4 w-4" /><span className="hidden sm:inline">Dispatch</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canStaff && <button type="button" onClick={() => setEditing('new')} title="Naya (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Technician</button>}
        </>}
        stats={[
          { label: 'Technicians', value: all.length },
          { label: 'Abhi free', value: count('AVAILABLE') },
          ...(canSeePay && st ? [{ label: `Commission (${rangeLabel(period.from, period.to)})`, value: sales(st.totals.commission), hint: st.totals.unpaid ? `${sales(st.totals.unpaid)} deni hai` : undefined }] : []),
        ]}
      />

      <KpiRow cols={4}>
        {listQ.isLoading ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Users} color="#16a34a" label="Free" value={count('AVAILABLE')} hint="Kaam de sakte hain" />
          <KpiCard icon={Wrench} color="#7c3aed" label="Kaam par" value={count('ON_JOB')} hint={`${all.reduce((s, t) => s + (t.openJobs ?? 0), 0)} chaalu jobs`} />
          <KpiCard icon={Power} color="#64748b" label="Chhutti / duty khatam" value={count('ON_LEAVE') + count('OFF_DUTY') + count('ON_BREAK')} />
          <KpiCard icon={Wallet} color="#d97706" label="Commission deni hai" value={canSeePay && st ? sales(st.totals.unpaid) : '—'} hint={canSeePay ? rangeLabel(period.from, period.to) : 'Permission nahi'} onClick={canSeePay ? () => setTab('commission') : undefined} active={tab === 'commission'} />
        </>}
      </KpiRow>

      {tab === 'team' ? (
        <FilterBar search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Naam, phone, area, hunar…" label="Search" />} />
      ) : tab === 'commission' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Bill hui jobs par: kaam (visit + labour) ka hissa, discount aur return ke baad</p>}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Period" allowAll={false} defaultPreset="thisMonth" />
        </FilterBar>
      ) : <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Di gayi commission — har payout Expense me likha hai</p>} />}

      <ViewTabs value={tab} onChange={setTab} hint={<>{canStaff && <><Kbd>N</Kbd> naya · </>}<Kbd>1</Kbd>-<Kbd>3</Kbd> tabs</>}
        tabs={[
          { id: 'team', label: 'Team', icon: Users, count: rows.length },
          ...(canSeePay ? [{ id: 'commission' as Tab, label: 'Commission', icon: Banknote }, { id: 'payouts' as Tab, label: 'Payouts', icon: History }] : []),
        ]} />

      {tab === 'team' && (listQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : !rows.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
          <UserCog className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">{search ? 'Koi nahi mila' : 'Abhi koi technician nahi'}</p>
          <p className="mt-1 text-sm text-slate-500">Pehle HR → Staff me banda jorein, phir yahan technician banayein aur commission likhein.</p>
          {canStaff && <Button className="mt-4" onClick={() => setEditing('new')} leftIcon={<Plus className="h-4 w-4" />}>Technician</Button>}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => {
            const s = techStatusOf(t.status);
            return (
              <article key={t.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-base font-bold text-sky-700">{(t.staff?.fullName ?? 'T').charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{t.staff?.fullName ?? 'Technician'}</p>
                    <p className="truncate text-[0.8125rem] text-slate-500">{[levelOf(t.level), t.primarySkill ? tradeOf(t.primarySkill) : null, t.staff?.phone].filter(Boolean).join(' · ')}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', s.tone)}>{s.label}</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.75rem]">
                  <div className="rounded-xl bg-slate-50 py-2"><dt className="text-slate-500">Chaalu</dt><dd className="text-base font-bold text-slate-900">{t.openJobs ?? 0}</dd></div>
                  <div className="rounded-xl bg-slate-50 py-2"><dt className="text-slate-500">Mukammal</dt><dd className="text-base font-bold text-slate-900">{t.completedJobs}</dd></div>
                  <div className="rounded-xl bg-slate-50 py-2"><dt className="text-slate-500">Rating</dt><dd className="inline-flex items-center gap-0.5 text-base font-bold text-slate-900">{t.avgRating ? <><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{t.avgRating.toFixed(1)}</> : '—'}</dd></div>
                </dl>
                <p className="mt-2 text-[0.75rem] text-slate-500">
                  {t.commissionType === 'NONE' ? 'Commission nahi' : [t.commissionPct ? `${t.commissionPct}% kaam ka` : null, t.fixedPerJob ? `${sales(t.fixedPerJob)} har job` : null].filter(Boolean).join(' + ') || 'Commission likhi nahi'}
                  {t.serviceAreas.length > 0 && ` · ${t.serviceAreas.join(', ')}`}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
                  {canJobs && (
                    <Select aria-label="Halat" value={t.status} wrapperClassName="w-36" size="sm" onChange={(e) => status.mutate({ id: t.id, status: e.target.value as TechStatus })}
                      options={TECH_STATUSES.map((x) => ({ value: x, label: techStatusOf(x).label }))} />
                  )}
                  <Link to={`/services-biz/jobs?technician=${t.staffId}&view=all`} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-medium text-sky-700 hover:bg-sky-50"><Briefcase className="h-3.5 w-3.5" />Jobs</Link>
                  {canStaff && <button type="button" onClick={() => setEditing(t)} className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-medium text-slate-700 hover:bg-slate-100"><Pencil className="h-3.5 w-3.5" />Badlein</button>}
                  {canStaff && <button type="button" onClick={() => setOff(t)} className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-medium text-rose-700 hover:bg-rose-50"><Power className="h-3.5 w-3.5" />Band</button>}
                </div>
              </article>
            );
          })}
        </div>
      ))}

      {tab === 'commission' && (statQ.isLoading ? <Skeleton className="h-64 rounded-3xl" /> : !st?.technicians.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Is period me koi bill hui job nahi</p><p className="mt-1 text-sm text-slate-500">Commission job ka bill banne par banti hai.</p></div>
      ) : (<>
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Table minWidth="40rem">
            <THead><Tr><Th>Technician</Th><Th align="right">Jobs</Th><Th align="right">Bill</Th><Th align="right">Kaam ka hissa</Th><Th align="right">Commission</Th><Th align="right">Di gayi</Th><Th align="right">Deni hai</Th><Th /></Tr></THead>
            <TBody>
              {st.technicians.map((t) => (
                <Tr key={t.technicianId}>
                  <Td className="font-semibold text-slate-900">{t.name}</Td>
                  <Td align="right">{t.jobs}</Td>
                  <Td align="right" className="tabular-nums">{sales(t.bill)}</Td>
                  <Td align="right" className="tabular-nums">{sales(t.work)}</Td>
                  <Td align="right" className="font-semibold tabular-nums">{sales(t.commission)}</Td>
                  <Td align="right" className="tabular-nums text-emerald-700">{sales(t.paid)}</Td>
                  <Td align="right" className={cn('font-semibold tabular-nums', t.unpaid > 0 ? 'text-amber-700' : 'text-slate-400')}>{sales(t.unpaid)}</Td>
                  <Td align="right">{canPay && t.unpaid > 0 && <Button size="sm" onClick={() => setPaying({ technicianId: t.technicianId, name: t.name, amount: t.unpaid })}>Dein</Button>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
        <div className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          <Table minWidth="44rem">
            <THead><Tr><Th>Job</Th><Th>Technician</Th><Th>Kaam</Th><Th align="right">Kaam ka hissa</Th><Th align="right">Return</Th><Th align="right">Commission</Th><Th>Payout</Th></Tr></THead>
            <TBody>
              {st.lines.map((l) => (
                <Tr key={l.jobId}>
                  <Td><Link to={`/services-biz/jobs/${l.jobId}`} className="font-mono text-[0.8125rem] font-semibold text-brand-700 hover:underline">{l.jobNumber}</Link><span className="block text-[0.75rem] text-slate-500">{dayOnly(l.billedAt)}</span></Td>
                  <Td>{l.technicianName}</Td>
                  <Td><span className="line-clamp-1">{l.serviceName}</span><span className="block text-[0.75rem] text-slate-500">{l.customerName ?? ''}</span></Td>
                  <Td align="right" className="tabular-nums">{sales(l.work)}</Td>
                  <Td align="right" className="tabular-nums">{l.refunded ? sales(l.refunded) : '—'}{l.refunded > 0 && <span className="block text-[0.6875rem] text-slate-500">{l.workReturned > 0 ? `Kaam ${sales(l.workReturned)} kata` : 'Sirf parts — commission nahi kati'}</span>}</Td>
                  <Td align="right" className="font-semibold tabular-nums">{sales(l.commission)}</Td>
                  <Td>{l.paidRef && !l.paidRef.startsWith('HOLD-') ? <button type="button" onClick={() => void openSlip(l.paidRef!)} className="font-mono text-[0.75rem] text-emerald-700 hover:underline">{l.paidRef}</button> : <span className="text-[0.75rem] text-amber-700">Baqi</span>}</Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        </div>
      </>))}

      {tab === 'payouts' && (payoutsQ.isLoading ? <Skeleton className="h-48 rounded-3xl" /> : !payoutsQ.data?.length ? (
        <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80"><p className="font-semibold text-slate-900">Abhi koi commission nahi di gayi</p></div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {payoutsQ.data.map((p) => (
            <li key={p.ref} className="flex items-center gap-3 px-4 py-3">
              <Banknote className="h-5 w-5 text-emerald-600" />
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">{p.technicianName}</span><span className="text-[0.75rem] text-slate-500">{p.ref} · {dateTime(p.paidAt)} · {p.jobs} jobs · {p.expense?.paymentMethod ?? ''}</span></span>
              <span className="font-semibold tabular-nums">{sales(p.amount)}</span>
              <button type="button" onClick={() => void openSlip(p.ref)} aria-label="Slip print" title="Slip" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><Printer className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      ))}

      {editing && <TechnicianModal tech={editing === 'new' ? null : editing} taken={all.map((t) => t.staffId)} pending={save.isPending} onSave={(v) => save.mutate(v)} onClose={() => setEditing(null)} />}
      {off && (
        <Modal open onClose={() => setOff(null)} size="sm" title={`${off.staff?.fullName ?? 'Technician'} band karein?`} description="Nayi job me nahi aayega. Purani jobs, rating aur commission ka hisaab wese hi rahega."
          footer={<><Button variant="secondary" onClick={() => setOff(null)}>Rehne dein</Button><Button variant="danger" loading={remove.isPending} onClick={() => remove.mutate(off.id)}>Band karein</Button></>}>
          {(off.openJobs ?? 0) > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">Is ke paas {off.openJobs} chaalu jobs hain — pehle kisi aur ko dein.</p>}
        </Modal>
      )}
      {paying && (
        <Modal open onClose={() => setPaying(null)} size="sm" title={`Commission dein — ${paying.name}`} description={`${rangeLabel(period.from, period.to)} ki baqi commission: Expense me likhi jayegi`}
          footer={<><Button variant="secondary" onClick={() => setPaying(null)}>Rehne dein</Button><Button loading={pay.isPending} onClick={() => pay.mutate()} leftIcon={<Banknote className="h-4 w-4" />}>{sales(paying.amount)} dein</Button></>}>
          <div className="space-y-3">
            <PaymentMethodPicker value={method} onChange={setMethod} label="Kaise di" hint={method === 'CASH' ? 'Cash drawer se niklega' : 'Bank / wallet se — drawer me nahi'} />
            <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} hint="Marzi hai" />
          </div>
        </Modal>
      )}

      {guide.isOpen && (
        <PageGuide title="Technicians — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: 'Technician banayein', text: 'HR → Staff me banda ho to yahan "Technician" se us ka hunar, din, waqt, areas aur commission likhein.' },
            { icon: Wrench, color: '#7c3aed', title: 'Halat', text: 'Kaam par jaate hi khud "Kaam par" ho jata hai; chhutti ya break yahan se lagayein — Dispatch par free wale pehle aate hain.' },
            { icon: Banknote, color: '#16a34a', title: 'Commission', text: 'Har bill hui job par kaam (visit + labour) ka % ya fixed — parts par nahi. Discount aur return ke baad ka hisaab.' },
            { icon: Wallet, color: '#d97706', title: 'Commission dena', text: '"Dein" se drawer (ya bank) se paisa — Expense me likha jata hai, day book aur profit me aata hai. Slip print karke sign karwayein.' },
          ]}
          tips={['Commission dekhne ke liye "Commission view", dene ke liye "Commission manage" aur "Expense create" ki permission chahiye.']}
          shortcuts={[['N', 'naya'], ['1-3', 'tabs'], ['/', 'dhoondein'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
