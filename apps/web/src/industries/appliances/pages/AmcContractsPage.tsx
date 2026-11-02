/**
 * AMC contracts: yearly service contracts sold to customers — running ones,
 * ones ending soon (renewal calls), ended ones, money still to collect,
 * free visits used, and what customers saved.
 *
 * Keys: N new contract · / search · 1 list · 2 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, BarChart3, BellRing, CalendarClock, CheckCircle2, Download, FileSignature, Filter, GraduationCap, ListChecks, MessageCircle, Pause,
  Pencil, Plus, RefreshCw, ShieldCheck, Wallet, Wrench, XCircle,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Input, Kbd, KpiCard, KpiRow, Modal, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { downloadCsv } from '@core/lib/csv';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { PaymentMethodPicker } from '@modules/pos/components';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { amcContractsApi, type AmcContract, type AmcSummary } from '../api/amc-contracts.api';
import { Bars, Box, ListState, Panel, PayModal, Pill, ReasonModal, Strip } from '../components/ui';
import { AMC_KEY, AMC_PLANS, MONEY_KEYS, amcPlanOf, amcStatusOf, apiError, dayOnly, daysPhrase, daysTo, digits, money, waLink } from '../components/meta';
import { t as tr } from '@core/i18n';

type Tab = 'list' | 'analytics';
type View = 'active' | 'expiring' | 'expired' | 'unpaid' | 'closed' | 'all';
const VIEWS: Array<{ id: View; label: string; icon: typeof Wrench }> = [
  { id: 'active', label: tr('Chal rahe'), icon: ShieldCheck },
  { id: 'expiring', label: tr('30 din me khatam'), icon: CalendarClock },
  { id: 'expired', label: tr('Khatam'), icon: BellRing },
  { id: 'unpaid', label: tr('Paisa baqi'), icon: Wallet },
  { id: 'closed', label: tr('Renew / cancel'), icon: CheckCircle2 },
  { id: 'all', label: tr('Sab'), icon: ListChecks },
];
const viewLabel = (v: View) => VIEWS.find((x) => x.id === v)?.label ?? v;
const dueOf = (c: AmcContract) => (c.status === 'CANCELLED' ? 0 : Math.max(Number(c.contractValue) - Number(c.paidAmount), 0));

function viewParams(v: View) {
  if (v === 'active') return { status: 'ACTIVE' };
  if (v === 'expiring') return { expiringSoon: true };
  if (v === 'expired') return { expired: true };
  return {};
}

const amcMessage = (c: AmcContract, shop: string) => [
  `Assalam o alaikum ${c.customerName},`,
  `${shop}: aap ke ${c.productName ?? 'appliance'} ka AMC (${c.contractNumber}) ${dayOnly(c.expiryDate)} ko khatam ${daysTo(c.expiryDate)! < 0 ? 'ho gaya' : 'ho raha hai'}.`,
  'Renew karwa kar saal bhar ki free service jaari rakhein.',
].join('\n');

export default function AmcContractsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const canManage = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'list');
  const [view, setView] = useState<View>((params.get('view') as View) || 'active');
  const [plan, setPlan] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(params.get('id'));
  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    const next = new URLSearchParams();
    if (tab !== 'list') next.set('tab', tab);
    if (view !== 'active') next.set('view', view);
    if (openId) next.set('id', openId);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view, openId]);

  const q = { ...viewParams(view), amcType: plan || undefined, search: query || undefined };
  const listQ = useQuery({ queryKey: [AMC_KEY, 'list', q], queryFn: () => amcContractsApi.list(q), placeholderData: (p) => p, enabled: tab === 'list' });
  const statsQ = useQuery({ queryKey: [AMC_KEY, 'summary'], queryFn: amcContractsApi.summary, refetchInterval: 120_000 });
  const rows = useMemo(() => {
    const all = listQ.data ?? [];
    if (view === 'unpaid') return all.filter((c) => dueOf(c) > 0);
    if (view === 'closed') return all.filter((c) => c.status === 'RENEWED' || c.status === 'CANCELLED');
    return all;
  }, [listQ.data, view]);
  const s = statsQ.data;
  const filtered = !!plan || !!query;
  const pick = (v: View) => { setTab('list'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/appliances/amc-contracts/new'); }
      if (e.key === '1') setTab('list');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('list'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const printDoc = (): PrintDoc => ({
    title: `AMC — ${viewLabel(view)}`,
    meta: [['Contracts', String(rows.length)], ['Baqi', sales(rows.reduce((a, c) => a + dueOf(c), 0))]],
    sections: [{ kind: 'table', columns: [{ label: '#' }, { label: 'Customer' }, { label: 'Product', wideOnly: true }, { label: 'Plan' }, { label: 'Khatam' }, { label: 'Visits', align: 'right' }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((c) => [c.contractNumber, `${c.customerName} ${c.customerPhone}`, c.productName ?? '—', amcPlanOf(c.amcType).label, dayOnly(c.expiryDate), `${c.freeVisitsUsed}/${c.freeVisitsAllowed}`, sales(dueOf(c))]) }],
  });
  const exportCsv = () => downloadCsv('amc-contracts.csv', [
    ['Number', 'Plan', 'Halat', 'Customer', 'Phone', 'Product', 'Serial', 'Shuru', 'Khatam', 'Qeemat', 'Mila', 'Baqi', 'Free visits', 'Istemal', 'Mazdoori free', 'Gas free', 'Parts free'],
    ...rows.map((c) => [c.contractNumber, amcPlanOf(c.amcType).label, amcStatusOf(c.status).label, c.customerName, c.customerPhone, c.productName ?? '', c.serialNumber ?? '', dayOnly(c.startDate), dayOnly(c.expiryDate),
      c.contractValue, c.paidAmount, dueOf(c), c.freeVisitsAllowed, c.freeVisitsUsed, c.laborCovered ? 'Haan' : '', c.gasRefillCovered ? 'Haan' : '', c.freePartsAllowed ? 'Haan' : '']),
  ]);

  return (
    <PageShell>
      <PageHero
        title={tr('AMC contracts')}
        chip={<><FileSignature /> {' '}{tr('Saal bhar ki service')}</>}
        meta={tr('Contract bechein, free visits ginein, khatam hone se pehle renew karwayein')}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'list' || !rows.length} /></span>
          <button type="button" onClick={exportCsv} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">{tr('CSV')}</span></button>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/appliances/amc-contracts/new" title={tr('Naya (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya contract')}</Link>}
        </>}
        stats={s ? [
          { label: tr('Chal rahe'), value: s.active },
          { label: tr('Is mahine bike'), value: s.month.newContracts, hint: sales(s.month.billed) },
          { label: tr('Customers ne bachaya'), value: sales(s.customerSaved) },
        ] : [{ label: tr('Chal rahe'), value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={ShieldCheck} color="#16a34a" label={tr('Chal rahe')} value={s.active} hint={tr('{{visitsExhausted}} ki visits khatam', { visitsExhausted: s.visitsExhausted })} onClick={() => pick('active')} active={tab === 'list' && view === 'active'} />
          <KpiCard icon={CalendarClock} color={s.expiringSoon ? '#ea580c' : '#64748b'} label={tr('30 din me khatam')} value={s.expiringSoon} hint={tr('Renew ka phone karein')} onClick={() => pick('expiring')} active={tab === 'list' && view === 'expiring'} />
          <KpiCard icon={BellRing} color={s.expired ? '#e11d48' : '#64748b'} label={tr('Khatam')} value={s.expired} hint={s.staleActive ? tr('{{staleActive}} ki date guzar gayi', { staleActive: s.staleActive }) : tr('Purane customer')} onClick={() => pick('expired')} active={tab === 'list' && view === 'expired'} />
          <KpiCard icon={Wallet} color={s.pendingAmount ? '#d97706' : '#64748b'} label={tr('Paisa baqi')} value={sales(s.pendingAmount)} hint={tr('Khata me')} onClick={() => pick('unpaid')} active={tab === 'list' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tr('Plan war contracts aur paisa')}</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Number, customer, phone, serial…')} label={tr('Search')} />}
          chips={filtered ? <>
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
            {plan && <FilterChip onRemove={() => setPlan('')}>{amcPlanOf(plan).label}</FilterChip>}
          </> : undefined}
          onClear={() => { setSearch(''); setPlan(''); }}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-56" options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon }))} />
          <FilterMenu icon={ShieldCheck} label={plan ? amcPlanOf(plan).label : tr('Plan')} value={plan} active={!!plan} onChange={setPlan}
            options={[{ value: '', label: tr('Sab') }, ...Object.entries(AMC_PLANS).map(([k, v]) => ({ value: k, label: v.label, hint: v.hint }))]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>2</Kbd> {' '}{tr('tabs')}</>}
        tabs={[{ id: 'list', label: tr('Contracts'), icon: ListChecks, count: rows.length }, { id: 'analytics', label: tr('Analytics'), icon: BarChart3 }]} />

      {tab === 'analytics' ? <Analytics s={s} money={sales} /> : (<>
        {rows.length > 0 && <Strip><span className="text-slate-500">{viewLabel(view)}</span><span className="font-semibold text-slate-900">{tr('{{count}} contracts', { count: rows.length })}</span>{(listQ.data?.length ?? 0) >= 200 && <span className="text-slate-500">{tr('pehle 200 — search se dhoondein')}</span>}</Strip>}
        <ListState loading={listQ.isLoading} error={listQ.isError && !listQ.data} empty={!rows.length} onRetry={() => listQ.refetch()} icon={FileSignature}
          title={filtered ? tr('Is filter me kuch nahi') : view === 'expiring' ? tr('Agle 30 din me koi contract khatam nahi') : tr('Koi contract nahi')}
          hint={tr('AC ya fridge bechte waqt saal bhar ki service (AMC) bechein — har saal pakki kamai aur customer wapas aata hai.')}
          actions={canManage ? <Button onClick={() => navigate('/appliances/amc-contracts/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya contract')}</Button> : undefined}>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((c) => {
              const left = daysTo(c.expiryDate);
              const visitsLeft = Math.max(c.freeVisitsAllowed - c.freeVisitsUsed, 0);
              return (
                <li key={c.id} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: amcPlanOf(c.amcType).color }}><FileSignature className="h-5 w-5" /></span>
                  <button type="button" onClick={() => setOpenId(c.id)} className="min-w-0 flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate font-semibold text-slate-900">{c.customerName}</span>
                      <Pill meta={amcStatusOf(c.status)} />
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-600">{amcPlanOf(c.amcType).label}</span>
                      <span className="font-mono text-[0.6875rem] text-slate-400">{c.contractNumber}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{c.customerPhone} — {c.productName ?? tr('Product')}{c.serialNumber ? ` (${c.serialNumber})` : ''}</p>
                    <p className={cn('mt-0.5 text-[0.75rem]', left !== null && left <= 30 && c.status === 'ACTIVE' ? 'font-semibold text-orange-700' : 'text-slate-500')}>
                      {tr('{{expiryDate}} tak ({{left}}) · {{visitsLeft}} / {{freeVisitsAllowed}} visit baqi', { expiryDate: dayOnly(c.expiryDate), left: daysPhrase(left), visitsLeft, freeVisitsAllowed: c.freeVisitsAllowed })}
                    </p>
                  </button>
                  <div className="shrink-0 text-end">
                    <p className="font-semibold tabular-nums text-slate-900">{sales(Number(c.contractValue) || 0)}</p>
                    {dueOf(c) > 0 && <p className="text-[0.75rem] font-medium tabular-nums text-amber-700">{tr('baqi {{sales}}', { sales: sales(dueOf(c)) })}</p>}
                    <button type="button" onClick={() => setOpenId(c.id)} aria-label={tr('Kholein')} className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"><ArrowRight className="h-3.5 w-3.5 rtl-flip" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </ListState>
      </>)}

      {openId && <ContractCard id={openId} shopName={shopName} canManage={canManage} onClose={() => setOpenId(null)} />}
      {guide.isOpen && (
        <PageGuide title={tr('AMC — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#2563eb', title: tr('Contract bechein'), text: tr('"Naya contract": serial likhein, plan chunein (Basic se Comprehensive), muddat aur qeemat. Save par bill banta hai — jo na mile khata me.') },
            { icon: Wrench, color: '#7c3aed', title: tr('Free visit'), text: tr('Customer ka phone aaye to Repairs me shikayat darj karein — serial se AMC khud lagta hai aur visit gin li jati hai.') },
            { icon: RefreshCw, color: '#16a34a', title: tr('Renew'), text: tr('"30 din me khatam" roz dekhein, WhatsApp karein, phir "Renew" — naya contract purane ke khatam hone se shuru hota hai.') },
            { icon: Wallet, color: '#d97706', title: tr('Baqi paisa'), text: tr('Contract kholein → "Paisa lein". Khata aur galla dono me aata hai.') },
          ]}
          tips={[tr('Contract cancel karne se paisa wapas nahi hota — wapas karna ho to Sales se us ka bill void karein.'), tr('"Customers ne bachaya" customer ko dikhayein — renew bechne ki sab se achhi daleel.')]}
          shortcuts={[['N', 'naya'], ['/', 'dhoondein'], ['1', 'list'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

type Dialog = 'pay' | 'renew' | 'cancel' | 'suspend' | null;

function ContractCard({ id, shopName, canManage, onClose }: { id: string; shopName: string; canManage: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: [AMC_KEY, 'one', id], queryFn: () => amcContractsApi.getOne(id) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const done = (msg: string) => { toast.success(msg); [AMC_KEY, ...MONEY_KEYS].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); setDialog(null); };
  const fail = (e: unknown) => toast.error(apiError(e, tr('Nahi hua')));
  const pay = useMutation({ mutationFn: (v: { amount: number; paymentMethod: string; note?: string }) => amcContractsApi.addPayment(id, v), onSuccess: () => done(tr('Paisa mil gaya')), onError: fail });
  const status = useMutation({ mutationFn: (v: { status: 'CANCELLED' | 'SUSPENDED' | 'ACTIVE'; reason?: string }) => amcContractsApi.updateStatus(id, v), onSuccess: () => done(tr('Halat badal gayi')), onError: fail });
  const remind = useMutation({ mutationFn: () => amcContractsApi.sendReminder(id), onSuccess: () => qc.invalidateQueries({ queryKey: [AMC_KEY] }) });
  const c = q.data;
  const due = c ? dueOf(c) : 0;
  const wa = c ? waLink(c.customerPhone, amcMessage(c, shopName)) : undefined;
  const live = c && (c.status === 'ACTIVE' || c.status === 'SUSPENDED' || c.status === 'EXPIRED');

  return (
    <Modal open onClose={onClose} size="lg" title={c ? `${c.contractNumber} — ${c.customerName}` : tr('AMC')} description={c ? `${amcPlanOf(c.amcType).label} · ${c.productName ?? ''}` : undefined}
      footer={c && <>
        {wa && <a href={wa} target="_blank" rel="noreferrer" onClick={() => remind.mutate()} className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"><MessageCircle className="h-4 w-4" />{tr('Renew ki yaad')}</a>}
        <span className="flex-1" />
        {canManage && due > 0 && c.status !== 'CANCELLED' && <Button variant="secondary" leftIcon={<Wallet className="h-4 w-4" />} onClick={() => setDialog('pay')}>{tr('Paisa lein')}</Button>}
        {canManage && live && <Button variant="secondary" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => navigate(`/appliances/amc-contracts/${c.id}/edit`)}>{tr('Badlein')}</Button>}
        {canManage && live && <Button leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => setDialog('renew')}>{tr('Renew')}</Button>}
      </>}>
      {!c ? <Skeleton className="h-52 rounded-2xl" /> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Pill meta={amcStatusOf(c.status)} />
            {c.renewalReminderSent && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.6875rem] text-slate-600">{tr('Yaad dila di')}</span>}
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Box label={tr('Muddat')} value={`${dayOnly(c.startDate)} – ${dayOnly(c.expiryDate)}`} />
            <Box label={tr('Free visits')} value={`${Math.max(c.freeVisitsAllowed - c.freeVisitsUsed, 0)} / ${c.freeVisitsAllowed} baqi`} />
            <Box label={tr('Qeemat')} value={formatPKR(Number(c.contractValue))} />
            <Box label={due > 0 ? tr('Baqi') : tr('Mila')} value={formatPKR(due > 0 ? due : Number(c.paidAmount))} tone={due > 0 ? 'text-amber-700' : 'text-emerald-700'} />
          </dl>
          <div className="flex flex-wrap gap-1.5 text-[0.75rem]">
            {[[tr('Mazdoori free'), c.laborCovered], [tr('Gas free'), c.gasRefillCovered], [tr('Parts free'), c.freePartsAllowed]].map(([l, on]) => (
              <span key={l as string} className={cn('rounded-md px-2 py-0.5 ring-1', on ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-slate-50 text-slate-400 line-through ring-slate-200')}>{l}</span>
            ))}
          </div>
          <p className="text-[0.8125rem] text-slate-600">{tr('Ab tak: {{totalVisitsUsed}} visits · parts {{formatPKR}} · customer ne mazdoori me {{formatPKR2}} bachaye', { totalVisitsUsed: c.totalVisitsUsed, formatPKR: formatPKR(Number(c.totalPartsClaimed)), formatPKR2: formatPKR(Number(c.totalLaborSaved)) })}</p>
          {c.exclusions && <p className="text-[0.8125rem] text-slate-600"><strong>{tr('Cover nahi:')}</strong> {c.exclusions}</p>}
          {c.relatedRequests?.length ? (
            <div><p className="text-[0.8125rem] font-semibold text-slate-800">{tr('Visits')}</p>
              <ul className="mt-1 divide-y divide-slate-100 text-[0.8125rem]">
                {c.relatedRequests.map((r: { id: string; requestNumber: string; reportedIssue: string; status: string; requestedAt: string }) => (
                  <li key={r.id} className="flex justify-between gap-2 py-1.5"><Link className="truncate hover:underline" to={`/appliances/service-requests?id=${r.id}`}>{r.requestNumber} · {r.reportedIssue}</Link><span className="shrink-0 text-slate-500">{dayOnly(r.requestedAt)}</span></li>
                ))}
              </ul>
            </div>
          ) : null}
          {canManage && live && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Link to="/appliances/service-requests?new=1" className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-[0.8125rem] font-medium text-slate-800 hover:bg-slate-50"><Wrench className="h-4 w-4" />{tr('Visit darj karein')}</Link>
              {c.status === 'SUSPENDED'
                ? <Button size="sm" variant="secondary" loading={status.isPending} onClick={() => status.mutate({ status: 'ACTIVE' })}>{tr('Dobara chalu')}</Button>
                : <Button size="sm" variant="ghost" leftIcon={<Pause className="h-4 w-4" />} onClick={() => setDialog('suspend')}>{tr('Rok dein')}</Button>}
              <Button size="sm" variant="ghost" leftIcon={<XCircle className="h-4 w-4" />} onClick={() => setDialog('cancel')}>{tr('Cancel')}</Button>
            </div>
          )}
          {c.notes && <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 font-sans text-[0.8125rem] text-slate-600">{c.notes}</pre>}
        </div>
      )}
      {c && dialog === 'pay' && <PayModal title={tr('AMC paisa — {{contractNumber}}', { contractNumber: c.contractNumber })} due={due} pending={pay.isPending} onConfirm={(v) => pay.mutate(v)} onClose={() => setDialog(null)} />}
      {c && dialog === 'renew' && <RenewModal c={c} onClose={() => setDialog(null)} onDone={(n) => { done(tr('Renew — naya contract {{n}}', { n })); onClose(); }} />}
      {c && dialog === 'cancel' && <ReasonModal title={tr('Contract cancel')} confirm={tr('Cancel karein')} pending={status.isPending} presets={['Customer ne mana kar diya', 'Unit bik gaya', 'Paisa nahi diya']} onConfirm={(r) => status.mutate({ status: 'CANCELLED', reason: r })} onClose={() => setDialog(null)} />}
      {c && dialog === 'suspend' && <ReasonModal title={tr('Contract rok dein')} confirm={tr('Rok dein')} pending={status.isPending} presets={['Paisa baqi hai', 'Customer shehar se bahar']} onConfirm={(r) => status.mutate({ status: 'SUSPENDED', reason: r })} onClose={() => setDialog(null)} />}
    </Modal>
  );
}

function RenewModal({ c, onClose, onDone }: { c: AmcContract; onClose: () => void; onDone: (number: string) => void }) {
  const [months, setMonths] = useState(String(c.durationMonths || 12));
  const [value, setValue] = useState(String(Number(c.contractValue) || ''));
  const [visits, setVisits] = useState(String(c.freeVisitsAllowed));
  const [paid, setPaid] = useState(String(Number(c.contractValue) || ''));
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const v = Number(value) || 0;
  const p = Number(paid) || 0;
  const save = useMutation({
    mutationFn: () => amcContractsApi.renew(c.id, { durationMonths: Number(months) || 12, contractValue: v, paidAmount: p, paymentMethod: method, freeVisitsAllowed: Number(visits) || 0 }),
    onSuccess: (x) => onDone(x.contractNumber),
    onError: (e) => toast.error(apiError(e, tr('Renew nahi hua'))),
  });
  const bad = !(v > 0) || p > v + 0.01 || !(Number(months) > 0);
  return (
    <Modal open onClose={onClose} size="sm" title={tr('Renew — {{contractNumber}}', { contractNumber: c.contractNumber })} description={tr('Naya contract purane ke khatam hone ki date se shuru hoga')}
      footer={<><Button variant="secondary" onClick={onClose}>{tr('Rehne dein')}</Button><Button disabled={bad} loading={save.isPending} leftIcon={<RefreshCw className="h-4 w-4" />} onClick={() => save.mutate()}>{tr('Renew karein')}</Button></>}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label={tr('Mahine')} inputMode="numeric" value={months} onChange={(e) => setMonths(digits(e.target.value))} />
          <Input label={tr('Free visits')} inputMode="numeric" value={visits} onChange={(e) => setVisits(digits(e.target.value))} />
        </div>
        <Input label={tr('Qeemat')} inputMode="decimal" value={value} onChange={(e) => setValue(money(e.target.value))} />
        <Input label={tr('Abhi kitna mila')} inputMode="decimal" value={paid} onChange={(e) => setPaid(money(e.target.value))} error={p > v + 0.01 ? tr('Qeemat se zyada nahi') : undefined} hint={v - p > 0 ? tr('{{formatPKR}} khata me jayega', { formatPKR: formatPKR(v - p) }) : undefined} />
        {p > 0 && <PaymentMethodPicker value={method} onChange={setMethod} />}
      </div>
    </Modal>
  );
}

function Analytics({ s, money: m }: { s?: AmcSummary; money: (n: number) => string }) {
  if (!s) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-60 rounded-3xl" /><Skeleton className="h-60 rounded-3xl" /></div>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title={tr('Paisa')} hint={tr('Har contract ka bill Sales aur Profit me hai')}>
        <dl className="grid grid-cols-2 gap-3">
          <Box label={tr('Kul contracts ki qeemat')} value={m(s.totalContractValue)} /><Box label={tr('Mila')} value={m(s.totalCollected)} />
          <Box label={tr('Baqi')} value={m(s.pendingAmount)} tone={s.pendingAmount > 0 ? 'text-amber-700' : 'text-slate-900'} /><Box label={tr('Is mahine mila')} value={m(s.month.collected)} />
          <Box label={tr('Renew hue')} value={s.renewed} /><Box label={tr('Auto renew')} value={s.autoRenewCount} />
        </dl>
      </Panel>
      <Panel title={tr('Plan war')}><Bars rows={s.byType.map((b) => ({ key: b.type, label: amcPlanOf(b.type).label, value: b.count, color: amcPlanOf(b.type).color, hint: `${b.count} · ${m(b.value)}` }))} /></Panel>
    </div>
  );
}
