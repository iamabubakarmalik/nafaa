/**
 * Installment plans (qist): phones sold on credit and split into monthly
 * installments — what is late, what falls due this week, money collected and
 * still to come. Taking an installment and a WhatsApp reminder are one tap.
 *
 * Keys: N new plan · / search · 1 plans · 2 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, CalendarClock, CheckCircle2, CreditCard, Download, Filter, GraduationCap, HandCoins, ListChecks,
  MessageCircle, Plus, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { formatPKR } from '@core/lib/format';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { emiApi, type EmiListParams, type EmiPlan, type EmiSort, type EmiView } from '../api/emi.api';
import { mobileReportsApi } from '../api/mobile-reports.api';
import { CreateEmiPlanModal } from '../components/emi/CreateEmiPlanModal';
import { RecordEmiPaymentModal } from '../components/emi/RecordEmiPaymentModal';
import { emiMessage } from '../components/slips';
import { EMI_KEY, dayOnly, daysTo, planStatusOf, waLink } from '../components/meta';

type Tab = 'plans' | 'analytics';
const VIEWS: Array<{ id: EmiView; label: string; icon: typeof CreditCard }> = [
  { id: 'active', label: 'Chal rahe', icon: CreditCard },
  { id: 'overdue', label: 'Late qist wale', icon: AlertTriangle },
  { id: 'upcoming', label: 'Is hafte qist', icon: CalendarClock },
  { id: 'done', label: 'Mukammal / band', icon: CheckCircle2 },
  { id: 'all', label: 'Sab', icon: ListChecks },
];
const viewLabel = (v: EmiView) => VIEWS.find((x) => x.id === v)?.label ?? v;
const SORTS: Array<{ value: EmiSort; label: string }> = [
  { value: 'due', label: 'Jis ki qist pehle' }, { value: 'remaining', label: 'Zyada baqi pehle' }, { value: 'new', label: 'Naye pehle' }, { value: 'old', label: 'Purane pehle' },
];

export default function EmiPlansPage() {
  const [params, setParams] = useSearchParams();
  const canManage = usePermission(PERMISSIONS.KHATA_MANAGE);
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Dukaan';
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'plans');
  const [view, setView] = useState<EmiView>((params.get('view') as EmiView) || 'active');
  const [sort, setSort] = useState<EmiSort>('due');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [collect, setCollect] = useState<EmiPlan | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, sort, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'plans') next.delete('tab'); else next.set('tab', tab);
    if (view === 'active') next.delete('view'); else next.set('view', view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view]);

  const q: EmiListParams = { view, sort, page, limit: 40, search: query || undefined };
  const listQ = useQuery({ queryKey: [EMI_KEY, 'page', q], queryFn: () => emiApi.list(q), placeholderData: (p) => p, enabled: tab === 'plans' });
  const statsQ = useQuery({ queryKey: ['emi-stats'], queryFn: () => emiApi.stats(), refetchInterval: 60_000 });
  const data = listQ.data;
  const rows = data?.items ?? [];
  const s = statsQ.data;
  const pick = (v: EmiView) => { setTab('plans'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); setCreating(true); }
      if (e.key === '1') setTab('plans');
      if (e.key === '2') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('plans'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage]);

  const fetchAll = () => emiApi.list({ ...q, page: 1, limit: 200 });
  const printDoc = async (): Promise<PrintDoc> => {
    const all = await fetchAll();
    return {
      title: `Qist plans — ${viewLabel(view)}`,
      meta: [['Plans', String(all.total)], ['Qiston me', formatPKR(all.totals.financed)], ['Mila', formatPKR(all.totals.collected)], ['Baqi', formatPKR(all.totals.remaining)]],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Plan' }, { label: 'Customer' }, { label: 'Agli qist', wideOnly: true }, { label: 'Late', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((p) => [p.planNumber, `${p.customerName} ${p.customerPhone ?? ''}`.trim(),
          p.nextDueDate ? `${dayOnly(p.nextDueDate)} · ${formatPKR(p.nextDueAmount)}` : '—', p.overdueAmount ? formatPKR(p.overdueAmount) : '—', formatPKR(p.remainingAmount)]),
      }],
      footer: all.total > all.items.length ? `Pehle ${all.items.length} plan (kul ${all.total})` : undefined,
    };
  };
  const exportCsv = async () => {
    const all = await fetchAll();
    downloadCsv('qist-plans.csv', [
      ['Plan', 'Customer', 'Phone', 'Halat', 'Kul', 'Down payment', 'Qiston me', 'Qistein', 'Mili', 'Agli qist', 'Agli amount', 'Late', 'Baqi'],
      ...all.items.map((p) => [p.planNumber, p.customerName, p.customerPhone, planStatusOf(p.status).label, p.totalAmount, p.downPayment, p.financedAmount, p.installmentCount,
        p.paidInstallmentCount, p.nextDueDate ? dayOnly(p.nextDueDate) : '', p.nextDueAmount, p.overdueAmount, p.remainingAmount]),
    ]);
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title="Qist plans"
        chip={<><CreditCard /> Installments</>}
        meta="Udhaar par phone — har mahine ki qist, late aur baqi ek nazar me"
        busy={listQ.isFetching && !listQ.isLoading}
        loading={statsQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'plans' || !rows.length} /></span>
          <button type="button" onClick={() => void exportCsv()} disabled={!rows.length} className={heroButton}><Download className="h-4 w-4" /><span className="hidden sm:inline">CSV</span></button>
          <Link to="/khata" className={heroButton}><Wallet className="h-4 w-4" /><span className="hidden sm:inline">Khata</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <button type="button" onClick={() => setCreating(true)} title="Naya plan (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya plan</button>}
        </>}
        stats={s ? [
          { label: 'Qiston me baqi', value: sales(s.activeRemaining) },
          { label: 'Late', value: sales(s.overdueAmount), hint: `${s.overdueCount} qist` },
          { label: 'Is mahine mila', value: sales(s.collectedThisMonth), hint: `${s.collectedCountThisMonth} dafa` },
        ] : [{ label: 'Qiston me baqi', value: '—' }]}
      />

      <KpiRow cols={4}>
        {!s ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CreditCard} color="#2563eb" label="Chal rahe" value={s.byStatus.find((x) => x.status === 'ACTIVE')?.count ?? 0} hint={`Baqi ${sales(s.activeRemaining)}`} onClick={() => pick('active')} active={tab === 'plans' && view === 'active'} />
          <KpiCard icon={AlertTriangle} color={s.overdueCount ? '#e11d48' : '#64748b'} label="Late qist" value={s.overdueCount} hint={s.overdueCount ? sales(s.overdueAmount) : 'Koi late nahi'} onClick={() => pick('overdue')} active={tab === 'plans' && view === 'overdue'} />
          <KpiCard icon={CalendarClock} color="#d97706" label="Is hafte" value={s.upcomingCount} hint={sales(s.upcomingAmount)} onClick={() => pick('upcoming')} active={tab === 'plans' && view === 'upcoming'} />
          <KpiCard icon={HandCoins} color="#16a34a" label="Is mahine mila" value={sales(s.collectedThisMonth)} hint={`${s.collectedCountThisMonth} dafa`} onClick={() => pick('all')} active={tab === 'plans' && view === 'all'} />
        </>}
      </KpiRow>

      {tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Sab plans — halat ke hisaab se</p>} />
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Customer, phone, plan #…" label="Search" />}
          chips={query ? <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip> : undefined}
          onClear={() => setSearch('')}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-64"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? `${counts[v.id]} plan` : undefined }))} />
          <FilterMenu icon={ArrowDownWideNarrow} label={SORTS.find((x) => x.value === sort)?.label ?? 'Tarteeb'} value={sort} onChange={setSort} align="right" options={SORTS} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'plans', label: 'Plans', icon: ListChecks, count: data?.total ?? null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <EmiAnalyticsView /> : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{data.total} plan · qiston me {sales(data.totals.financed)}</span>
            <span className="text-emerald-700">mila {sales(data.totals.collected)}</span>
            <span className="text-amber-700">baqi {sales(data.totals.remaining)}</span>
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Plans load nahi hue</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{query ? 'Is search me koi plan nahi' : view === 'overdue' ? 'Koi qist late nahi — shabash' : 'Koi plan nahi'}</p>
            <p className="mt-1 text-sm text-slate-500">POS par phone udhaar par bechein, phir yahan us bill ki qistein banayein.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => setCreating(true)} leftIcon={<Plus className="h-4 w-4" />}>Naya plan</Button>}
              {view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>Sab plans dekhein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((p) => <PlanRow key={p.id} p={p} money={sales} shopName={shopName} canManage={canManage} onCollect={() => setCollect(p)} />)}
          </ul>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.totalPages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {creating && <CreateEmiPlanModal onClose={() => setCreating(false)} />}
      {collect && <RecordEmiPaymentModal plan={collect} onClose={() => setCollect(null)} />}

      {guide.isOpen && (
        <PageGuide title="Qist plans — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CreditCard, color: '#2563eb', title: 'Pehle udhaar bill', text: 'POS par phone bechein — down payment lein, baqi udhaar. Bill ka udhaar customer ke khata me chala jata hai.' },
            { icon: Plus, color: '#7c3aed', title: 'Plan banayein', text: '"Naya plan": customer aur us ka udhaar bill chunein, kitne mahine, pehli qist kab. Udhaar barabar qiston me bat jata hai.' },
            { icon: HandCoins, color: '#16a34a', title: 'Qist lein', text: '"Qist lein" me jitne paise mile likhein — purani qist pehle poori hoti hai. Paise galla aur khata dono me aate hain.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Late', text: 'Tareekh guzarte hi qist late ho jati hai. Laal card se late wale dekhein aur WhatsApp se yaad dilayein.' },
            { icon: Wallet, color: '#0891b2', title: 'Khata', text: 'Plan sirf udhaar ko qiston me torta hai. Customer ka asal hisaab Khata me hai — dono saath chalte hain.' },
          ]}
          tips={['Qist lene aur plan banane ke liye "Khata sambhalna" ki permission chahiye.', 'Plan cancel karne se udhaar khatam nahi hota — wo khata me rehta hai.']}
          shortcuts={[['N', 'naya plan'], ['/', 'dhoondein'], ['1', 'plans'], ['2', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function PlanRow({ p, money, shopName, canManage, onCollect }: { p: EmiPlan; money: (n: number) => string; shopName: string; canManage: boolean; onCollect: () => void }) {
  const st = planStatusOf(p.status);
  const done = p.paidInstallmentCount;
  const pct = p.installmentCount ? Math.round((done / p.installmentCount) * 100) : 0;
  const late = p.overdueAmount > 0;
  const next = daysTo(p.nextDueDate);
  const wa = waLink(p.customerPhone, emiMessage(p, shopName));
  return (
    <li className="flex items-start gap-3 px-3 py-3 sm:px-4">
      <span className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', late ? 'bg-rose-50 text-rose-600' : p.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500')}>
        <CreditCard className="h-5 w-5" />
      </span>
      <Link to={`/emi-plans/${p.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate font-semibold text-slate-900">{p.customerName}</span>
          <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
          <span className="font-mono text-[0.6875rem] text-slate-400">{p.planNumber}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 w-32 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
          <span className="text-[0.75rem] text-slate-500">{done}/{p.installmentCount} qist</span>
        </div>
        <p className={cn('mt-0.5 text-[0.75rem]', late ? 'font-semibold text-rose-700' : 'text-slate-500')}>
          {late ? `${p.overdueCount} qist late · ${money(p.overdueAmount)}` : p.nextDueDate ? `Agli qist ${dayOnly(p.nextDueDate)}${next !== null && next <= 7 ? ` (${next <= 0 ? 'aaj' : `${next} din`})` : ''} · ${money(p.nextDueAmount)}` : p.customerPhone ?? ''}
        </p>
      </Link>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums text-slate-900">{money(p.remainingAmount)}</p>
        <p className="text-[0.75rem] text-slate-500">baqi</p>
        <div className="mt-1 flex justify-end gap-1">
          {wa && p.status === 'ACTIVE' && <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" title="Yaad dilayein" className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50"><MessageCircle className="h-3.5 w-3.5" /></a>}
          {canManage && p.status === 'ACTIVE' && <Button size="xs" onClick={onCollect}>Qist lein</Button>}
        </div>
      </div>
    </li>
  );
}

function EmiAnalyticsView() {
  const { sales } = useMasked();
  const q = useQuery({ queryKey: ['emi-analytics'], queryFn: () => mobileReportsApi.emiAnalytics(), staleTime: 60_000 });
  const d = q.data;
  if (q.isLoading || !d) return <Skeleton className="h-60 rounded-3xl" />;
  const max = Math.max(1, ...d.byStatus.map((b) => b.financed));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Plans halat ke hisaab se</h3>
        <ul className="mt-4 space-y-3">
          {d.byStatus.map((b) => (
            <li key={b.status}>
              <div className="flex justify-between text-[0.8125rem]"><span className="font-medium" style={{ color: planStatusOf(b.status).color }}>{planStatusOf(b.status).label} · {b.count}</span><span className="tabular-nums text-slate-600">{sales(b.financed)} · baqi {sales(b.remaining)}</span></div>
              <div className="mt-1 h-2.5 rounded-full bg-slate-100"><div className="h-2.5 rounded-full" style={{ width: `${(b.financed / max) * 100}%`, backgroundColor: planStatusOf(b.status).color }} /></div>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
        <h3 className="font-semibold text-slate-900">Chalte plans</h3>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[0.8125rem]">
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">Qiston me diya</dt><dd className="text-base font-bold tabular-nums">{sales(d.activeFinanced)}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">Baqi</dt><dd className="text-base font-bold tabular-nums text-amber-700">{sales(d.activeRemaining)}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">Late</dt><dd className="text-base font-bold tabular-nums text-rose-600">{sales(d.overdueAmount)}</dd></div>
          <div className="rounded-xl bg-slate-50 px-3 py-2"><dt className="text-slate-500">Is mahine mila</dt><dd className="text-base font-bold tabular-nums text-emerald-700">{sales(d.collectedThisMonth)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
