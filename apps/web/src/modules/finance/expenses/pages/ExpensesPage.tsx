/**
 * Shop expenses: today and this month against last month, the biggest
 * category and unpaid bills; the record for a period with category, payment,
 * branch, staff and status filters; bills that come back every month; and
 * analytics. Cash expenses come out of the open cash shift.
 *
 * Keys: N new expense · / search · 1 record · 2 monthly · 3 analytics · G guide.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownWideNarrow, BarChart3, CalendarClock, CheckCircle2, ChevronDown, CircleSlash, Clock, Copy, CreditCard, Filter, FolderTree,
  GraduationCap, ImageIcon, ListChecks, Pencil, PieChart, Plus, Printer, Receipt, Repeat, RotateCcw, Store, Tags, Trash2, TrendingDown,
  TrendingUp, UserRound, Wallet, WifiOff,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue, confirmDialog } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import {
  expenseCategoriesApi, expensesApi, type Expense, type ExpenseFilter, type ExpenseMethod, type ExpenseQuery, type ExpenseStatus,
} from '../api/expenses.api';
import { CategoryManager } from '../components/CategoryManager';
import { ExpenseAnalytics } from '../components/ExpenseAnalytics';
import { AFFECTED_KEYS, ExpenseForm, type ExpenseDraft } from '../components/ExpenseForm';
import { RepeatingList } from '../components/RepeatingList';
import { VoucherPrintModal } from '../components/VoucherPrintModal';
import { CATEGORIES_KEY, EXPENSES_KEY, METHODS, STATUS, apiError, catOf, day, dayTime, methodOf } from '../components/meta';
import { expensesDoc } from '../components/print';

type Tab = 'record' | 'repeating' | 'analytics';
type StatusFilter = '' | ExpenseStatus;
type Sort = 'recent' | 'amount';

export default function ExpensesPage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const canWrite = usePermission(PERMISSIONS.EXPENSES_CREATE);
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('record');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [categoryId, setCategoryId] = useState('');
  const [method, setMethod] = useState<'' | ExpenseMethod>('');
  const [shopId, setShopId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [sort, setSort] = useState<Sort>('recent');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<ExpenseDraft | null>(null);
  const [cats, setCats] = useState(false);
  const [voucher, setVoucher] = useState<Expense | null>(null);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, categoryId, method, shopId, staffId, status, sort, query]);
  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);

  const period = resolveRange(range, startHour);
  const filters: ExpenseFilter = {
    ...(period ?? {}), categoryId: categoryId || undefined, paymentMethod: method || undefined, shopId: shopId || undefined,
    createdById: staffId || undefined, search: query || undefined,
  };
  const q: ExpenseQuery = { ...filters, status: status || undefined, sort, page, limit: 30 };

  const listQ = useQuery({ queryKey: [EXPENSES_KEY, 'list', q], queryFn: () => expensesApi.page(q), placeholderData: (p) => p, enabled: tab === 'record' });
  const overviewQ = useQuery({ queryKey: [EXPENSES_KEY, 'overview', shopId], queryFn: () => expensesApi.overview(shopId || undefined), placeholderData: (p) => p });
  const repeatQ = useQuery({ queryKey: [EXPENSES_KEY, 'repeating', shopId], queryFn: () => expensesApi.repeating(shopId || undefined), staleTime: 60_000 });
  const catsQ = useQuery({ queryKey: [CATEGORIES_KEY], queryFn: expenseCategoriesApi.list, staleTime: 5 * 60_000 });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops });

  const o = overviewQ.data;
  const data = listQ.data;
  const rows = data?.items ?? [];
  const categories = catsQ.data ?? [];
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const people = o?.people ?? [];
  const register = o?.register;

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Sab categories' },
    { value: 'none', label: 'Bina category' },
    ...categories.map((c) => ({ value: c.id, label: `${c.icon ? `${c.icon} ` : ''}${c.name}`, color: c.color })),
  ], [categories]);
  const catLabel = categoryId === 'none' ? 'Bina category' : categories.find((c) => c.id === categoryId)?.name ?? 'Category';
  const filtered = !!categoryId || !!method || !!shopId || !!staffId || !!status || !!query;
  const clear = () => { setCategoryId(''); setMethod(''); setShopId(''); setStaffId(''); setStatus(''); setSearch(''); };
  const periodText = period ? rangeLabel(period.from, period.to) : 'Sab tareekhen';
  const filterText = [
    categoryId && catLabel, method && methodOf(method).label, shopId && shops.find((s) => s.id === shopId)?.name,
    staffId && people.find((p) => p.id === staffId)?.fullName, status && STATUS[status].label, query && `"${query}"`,
  ].filter(Boolean).join(' · ');
  const printDoc = async () => expensesDoc(await expensesApi.page({ ...q, page: 1, limit: 200 }), periodText, filterText, status || undefined);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canWrite) { e.preventDefault(); setForm({ mode: 'new' }); }
      if (e.key === '1') setTab('record');
      if (e.key === '2') setTab('repeating');
      if (e.key === '3') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('record'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canWrite]);

  const refresh = () => AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  const pay = useMutation({
    mutationFn: (e: Expense) => expensesApi.pay(e.id),
    onSuccess: (e) => { toast.success(`${formatPKR(e.amount)} ada — ${methodOf(e.paymentMethod).label}`); refresh(); },
    onError: (err) => toast.error(apiError(err, 'Ada nahi hua')),
  });
  const setState = useMutation({
    mutationFn: ({ e, to }: { e: Expense; to: ExpenseStatus }) => expensesApi.update(e.id, { status: to }),
    onSuccess: (e) => { toast.success(e.status === 'CANCELLED' ? 'Expense cancel — hisaab se nikal gaya' : 'Expense wapas hisaab me'); refresh(); },
    onError: (err) => toast.error(apiError(err, 'Nahi hua')),
  });
  const remove = useMutation({
    mutationFn: (e: Expense) => expensesApi.remove(e.id),
    onSuccess: () => { toast.success('Expense mita diya'); refresh(); },
    onError: (err) => toast.error(apiError(err, 'Nahi mita')),
  });

  const actions: RowActions = {
    canWrite,
    edit: (e) => setForm({ mode: 'edit', expense: e }),
    again: (e) => setForm({ mode: 'new', title: e.title, amount: e.amount, categoryId: e.category?.id, paymentMethod: e.paymentMethod, description: e.description ?? undefined }),
    print: setVoucher,
    pay: async (e) => { if ((await confirmDialog({ title: `"${e.title}" ${formatPKR(e.amount)} abhi ada karein (${methodOf(e.paymentMethod).label})?`, text: `Tareekh aaj ki ho jayegi.${e.paymentMethod === 'CASH' ? ' Cash khuli shift ke galle se ghatega.' : ''}` }))) pay.mutate(e); },
    cancel: async (e) => { if ((await confirmDialog({ title: `"${e.title}" cancel karein?`, text: 'Record rahega magar hisaab me nahi ginega.', danger: true }))) setState.mutate({ e, to: 'CANCELLED' }); },
    restore: (e) => setState.mutate({ e, to: 'PAID' }),
    remove: async (e) => { if ((await confirmDialog({ title: `"${e.title}" (${formatPKR(e.amount)}) hamesha ke liye mitayein?`, text: 'Behtar hai "Cancel" karein — record bhi rehta hai.', danger: true }))) remove.mutate(e); },
    busy: pay.isPending || setState.isPending || remove.isPending,
  };

  const top = o?.topCategory;
  const up = (o?.change ?? 0) > 0;

  return (
    <PageShell>
      <PageHero
        title="Expenses"
        chip={<><Wallet /> Expenses</>}
        meta="Kiraya, bijli, salary, chai-pani — har expense ek jagah"
        busy={(listQ.isFetching && !listQ.isLoading) || overviewQ.isFetching}
        loading={overviewQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'record' || !rows.length} /></span>
          <button type="button" onClick={() => setCats(true)} className={heroButton}><Tags className="h-4 w-4" /> Categories</button>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canWrite && <button type="button" onClick={() => setForm({ mode: 'new' })} title="Naya expense (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya expense</button>}
        </>}
        stats={o ? [
          { label: 'Is mahine', value: formatPKR(o.month.amount), hint: `${o.month.count} expenses` },
          { label: 'Aaj', value: formatPKR(o.today.amount), hint: o.today.count ? `${o.today.count}` : undefined },
          { label: 'Baqi bill', value: formatPKR(o.pending.amount), hint: o.pending.count ? `${o.pending.count}` : undefined },
          ...(register?.open ? [{ label: 'Shift me cash expense', value: formatPKR(register.cashExpenses), hint: register.registerNumber }] : []),
        ] : [{ label: 'Is mahine', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!o ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Receipt} color="#e11d48" label="Aaj" value={formatPKR(o.today.amount)} hint={o.today.count ? `${o.today.count} expenses` : 'Aaj abhi koi nahi'}
            onClick={() => { setTab('record'); setRange({ preset: 'today', custom: { from: '', to: '' } }); }} active={tab === 'record' && range.preset === 'today'} />
          <KpiCard icon={Wallet} color="#7c3aed" label="Is mahine" value={formatPKR(o.month.amount)} hint={`${o.month.count} expenses`}
            onClick={() => { setTab('record'); setRange({ preset: 'thisMonth', custom: { from: '', to: '' } }); }} active={tab === 'record' && range.preset === 'thisMonth' && !status} />
          <KpiCard icon={up ? TrendingUp : TrendingDown} color={o.change == null ? '#64748b' : up ? '#e11d48' : '#16a34a'} label="Pichle mahine se"
            value={o.change == null ? '—' : `${up ? '+' : ''}${o.change}%`}
            hint={`Isi din tak ${formatPKR(o.lastMonth.toDate)} · poora ${formatPKR(o.lastMonth.full)}`}
            onClick={() => { setTab('record'); setRange({ preset: 'lastMonth', custom: { from: '', to: '' } }); }} active={tab === 'record' && range.preset === 'lastMonth'} />
          <KpiCard icon={FolderTree} color={top?.color ?? '#64748b'} label="Sab se bara expense" value={top ? `${top.icon ? `${top.icon} ` : ''}${top.name}` : '—'}
            hint={top ? `${formatPKR(top.amount)} · mahine ka ${top.share}%` : 'Is mahine abhi kuch nahi'}
            onClick={top ? () => { setTab('record'); setRange({ preset: 'thisMonth', custom: { from: '', to: '' } }); setCategoryId(top.id); } : undefined} active={!!top && categoryId === top.id} />
          <KpiCard icon={Clock} color="#d97706" label="Baqi bill" value={o.pending.count}
            hint={o.pending.count ? `${formatPKR(o.pending.amount)}${o.pending.oldest ? ` · ${day(o.pending.oldest)} se` : ''}` : 'Koi bill baqi nahi'}
            onClick={() => { setTab('record'); setStatus('PENDING'); setRange({ preset: 'all', custom: { from: '', to: '' } }); }} active={tab === 'record' && status === 'PENDING'} />
        </>}
      </KpiRow>

      {tab === 'repeating' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Pichle 3 mahine dekh kar — jo expense baar baar aata hai woh yahan hai</p>}>
          {allShops && shops.length > 1 && <BranchFilter value={shopId} onChange={setShopId} shops={shops} />}
        </FilterBar>
      ) : (
        <FilterBar
          search={tab === 'record'
            ? <SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Expense, number, category ya details…" label="Search" />
            : <p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Saare charts isi period ke hain; pichli itni hi period se muqabla</p>}
          chips={filtered ? <>
            {categoryId && <FilterChip onRemove={() => setCategoryId('')}>{catLabel}</FilterChip>}
            {method && <FilterChip onRemove={() => setMethod('')}>{methodOf(method).label}</FilterChip>}
            {shopId && <FilterChip onRemove={() => setShopId('')}>{shops.find((s) => s.id === shopId)?.name ?? 'Branch'}</FilterChip>}
            {staffId && <FilterChip onRemove={() => setStaffId('')}>{people.find((p) => p.id === staffId)?.fullName ?? 'Staff'}</FilterChip>}
            {status && tab === 'record' && <FilterChip onRemove={() => setStatus('')}>{STATUS[status].label}</FilterChip>}
            {query && tab === 'record' && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll={tab === 'record'} />
          <FilterMenu icon={PieChart} label="Category" value={categoryId} active={!!categoryId} onChange={setCategoryId} options={categoryOptions} width="w-72" />
          <FilterMenu icon={CreditCard} label="Kaise diye" value={method} active={!!method} onChange={setMethod}
            options={[{ value: '' as const, label: 'Sab tareeqe' }, ...METHODS.map((m) => ({ value: m.id, label: m.label, icon: m.icon, color: m.color }))]} />
          {allShops && shops.length > 1 && <BranchFilter value={shopId} onChange={setShopId} shops={shops} />}
          {people.length > 1 && (
            <FilterMenu icon={UserRound} label="Staff" value={staffId} active={!!staffId} onChange={setStaffId} align="right"
              options={[{ value: '', label: 'Sab staff' }, ...people.map((p) => ({ value: p.id, label: p.fullName }))]} />
          )}
          {tab === 'record' && (
            <FilterMenu icon={Filter} label="Haal" value={status} active={!!status} onChange={setStatus} align="right"
              options={[{ value: '' as StatusFilter, label: 'Sab' }, ...(Object.keys(STATUS) as ExpenseStatus[]).map((k) => ({ value: k as StatusFilter, label: STATUS[k].label, icon: STATUS[k].icon }))]} />
          )}
          {tab === 'record' && (
            <FilterMenu icon={ArrowDownWideNarrow} label={sort === 'amount' ? 'Bari amount pehle' : 'Naye pehle'} value={sort} onChange={setSort} align="right"
              options={[{ value: 'recent', label: 'Naye pehle' }, { value: 'amount', label: 'Bari amount pehle' }]} />
          )}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canWrite && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>3</Kbd> tabs</>}
        tabs={[
          { id: 'record', label: 'Record', icon: ListChecks, count: data?.total ?? null },
          { id: 'repeating', label: 'Har mahine', icon: Repeat, count: repeatQ.data?.due || null },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        <ExpenseAnalytics filters={filters} onCategory={(id) => { setCategoryId(id); setTab('record'); }} />
      ) : tab === 'repeating' ? (
        <RepeatingList data={repeatQ.data} loading={repeatQ.isLoading} failed={repeatQ.isError}
          onRecord={(r) => canWrite ? setForm({ mode: 'new', title: r.title, amount: r.lastAmount, categoryId: r.category?.id, paymentMethod: r.paymentMethod }) : toast.error('Expense likhne ki permission nahi')} />
      ) : (<>
        {data?.offline && (
          <p className="flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-2.5 text-[0.8125rem] text-amber-900 ring-1 ring-amber-200">
            <WifiOff className="h-4 w-4" /> Internet nahi — is phone me save expenses dikh rahe hain. Naye expenses bhi likh sakte hain, internet aate hi chale jayenge.
          </p>
        )}
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{periodText}</span>
            <span className="font-semibold text-slate-900">Kharch hua {formatPKR(data.totals.paid)} <span className="font-normal text-slate-500">({data.totals.paidCount} ada)</span></span>
            {data.totals.pendingCount > 0 && <button type="button" onClick={() => setStatus('PENDING')} className="text-amber-700 hover:underline">Baqi {formatPKR(data.totals.pending)} ({data.totals.pendingCount})</button>}
            {data.totals.cancelledCount > 0 && <span className="text-slate-400">Cancel {data.totals.cancelledCount} — kul me nahi</span>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Expenses load nahi hue</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Wallet className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi expense nahi' : 'Is period me koi expense nahi likha'}</p>
            <p className="mt-1 text-sm text-slate-500">Bijli, kiraya, salary ya chai-pani — likhte rahein taake net profit pata chale.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canWrite && <Button onClick={() => setForm({ mode: 'new' })} leftIcon={<Plus className="h-4 w-4" />}>Naya expense</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((e) => <Row key={e.id} e={e} a={actions} showShop={allShops} />)}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
            <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
          </div>
        )}
      </>)}

      {form && <ExpenseForm draft={form} categories={categories} register={register} onClose={() => setForm(null)} onManageCategories={() => setCats(true)} />}
      {cats && <CategoryManager categories={categories} onClose={() => setCats(false)} />}
      {voucher && <VoucherPrintModal expense={voucher} onClose={() => setVoucher(null)} />}

      {guide.isOpen && (
        <PageGuide title="Expenses — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#e11d48', title: 'Expense likhein', text: '"Naya expense" dabayein: kis cheez ka, amount, category aur kahan se diye. Jaldi wale button se naam aur category khud bhar jati hai.' },
            { icon: Wallet, color: '#16a34a', title: 'Cash aur galla', text: 'Aaj ka cash expense khuli shift ke galle se ghatta hai, shift band karte waqt hisaab sahi aata hai. JazzCash, bank aur card galle ko nahi chhoote.' },
            { icon: Clock, color: '#d97706', title: 'Baqi bill', text: 'Bill aaya magar paise baad me dene hain? "Baad me dene" chunein. Dete waqt "Ada karein" dabayein — us din ki date lagti hai.' },
            { icon: Repeat, color: '#7c3aed', title: 'Har mahine wale', text: 'Kiraya, bijli, salary jaise expenses "Har mahine" tab me aate hain aur batate hain ke is mahine kaunsa abhi nahi likha.' },
            { icon: BarChart3, color: '#2563eb', title: 'Analytics', text: 'Category ka chart, roz aur mahine ka expense, branch, staff aur sab se bare expenses. Category par click karein to sirf woh dikhega.' },
            { icon: Printer, color: '#0891b2', title: 'Print', text: 'Upar Print se poori list (A4, PDF ya thermal). Kisi expenses ko khol kar "Voucher" se dastkhat wali parchi.' },
          ]}
          tips={[
            'Har mahine ek hi naam likhein (maslan "Dukaan ka kiraya") taake Nafaa yaad dila sake.',
            'Ghalat expense mitane ke bajaye "Cancel" karein — record rehta hai, hisaab se nikal jata hai.',
            'Bill ki photo lagayein — baad me jhagre ya audit me kaam aati hai.',
            'Expense likhne ke liye Team settings me "Expenses likhna" ki permission chahiye.',
          ]}
          shortcuts={[['N', 'naya expense'], ['/', 'dhoondein'], ['1', 'record'], ['2', 'har mahine'], ['3', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}

function BranchFilter({ value, onChange, shops }: { value: string; onChange: (v: string) => void; shops: Array<{ id: string; name: string }> }) {
  return (
    <FilterMenu icon={Store} label="Branch" value={value} active={!!value} onChange={onChange}
      options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />
  );
}

interface RowActions {
  canWrite: boolean;
  busy: boolean;
  edit: (e: Expense) => void;
  again: (e: Expense) => void;
  print: (e: Expense) => void;
  pay: (e: Expense) => void;
  cancel: (e: Expense) => void;
  restore: (e: Expense) => void;
  remove: (e: Expense) => void;
}

function Row({ e, a, showShop }: { e: Expense; a: RowActions; showShop: boolean }) {
  const [open, setOpen] = useState(false);
  const cat = catOf(e);
  const m = methodOf(e.paymentMethod);
  const st = STATUS[e.status];
  const cancelled = e.status === 'CANCELLED';
  const meta = [dayTime(e.expenseDate), showShop && e.shop?.name, e.createdBy?.fullName].filter(Boolean).join(' · ');
  return (
    <li className={cn(cancelled && 'bg-slate-50/60')}>
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
          {cat.icon || <Receipt className="h-4 w-4" />}
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={cn('truncate font-semibold text-slate-900', cancelled && 'text-slate-400 line-through')}>{e.title}</span>
            <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium" style={{ backgroundColor: `${cat.color}14`, color: cat.color }}>{cat.name}</span>
            {e.status !== 'PAID' && <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}><st.icon className="h-3 w-3" />{st.label}</span>}
            {e.attachmentUrl && <ImageIcon className="h-3.5 w-3.5 text-slate-400" aria-label="Photo lagi hai" />}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400"><span className="font-mono">{e.expenseNumber}</span> · {meta}</span>
        </button>
        <div className="text-right">
          <p className={cn('text-base font-bold tabular-nums', cancelled ? 'text-slate-400 line-through' : 'text-rose-700')}>{formatPKR(e.amount)}</p>
          <p className="inline-flex items-center gap-1 text-[0.6875rem] font-medium" style={{ color: m.color }}><m.icon className="h-3 w-3" />{m.label}</p>
        </div>
        {e.status === 'PENDING' && a.canWrite && (
          <Button size="sm" onClick={() => a.pay(e)} disabled={a.busy} leftIcon={<CheckCircle2 className="h-4 w-4" />} className="hidden sm:inline-flex">Ada karein</Button>
        )}
        <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Details" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] text-slate-700 sm:pl-[4.25rem]">
          {e.description && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">{e.description}</p>}
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
            <Fact k="Date" v={day(e.expenseDate)} />
            <Fact k="Kaise diye" v={m.label} />
            {e.shop?.name && <Fact k="Branch" v={e.shop.name} />}
            {e.createdBy?.fullName && <Fact k="Kis ne likha" v={e.createdBy.fullName} />}
          </dl>
          {e.attachmentUrl && (
            <a href={e.attachmentUrl} target="_blank" rel="noreferrer" className="block h-24 w-24 overflow-hidden rounded-xl ring-1 ring-slate-200">
              <img src={e.attachmentUrl} alt="Bill ki photo" loading="lazy" className="h-full w-full object-cover" />
            </a>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => a.print(e)} leftIcon={<Printer className="h-4 w-4" />}>Voucher</Button>
            {a.canWrite && <>
              {e.status === 'PENDING' && <Button size="sm" onClick={() => a.pay(e)} disabled={a.busy} leftIcon={<CheckCircle2 className="h-4 w-4" />} className="sm:hidden">Ada karein</Button>}
              <Button size="sm" variant="secondary" onClick={() => a.edit(e)} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>
              <Button size="sm" variant="secondary" onClick={() => a.again(e)} leftIcon={<Copy className="h-4 w-4" />}>Phir likhein</Button>
              {cancelled
                ? <Button size="sm" variant="secondary" onClick={() => a.restore(e)} disabled={a.busy} leftIcon={<RotateCcw className="h-4 w-4" />}>Wapas hisaab me</Button>
                : <Button size="sm" variant="secondary" onClick={() => a.cancel(e)} disabled={a.busy} leftIcon={<CircleSlash className="h-4 w-4" />}>Cancel</Button>}
              <Button size="sm" variant="ghost" onClick={() => a.remove(e)} disabled={a.busy} leftIcon={<Trash2 className="h-4 w-4" />} className="text-rose-700">Mitayein</Button>
            </>}
          </div>
          {e.status === 'PENDING' && <p className="flex items-center gap-1.5 text-[0.75rem] text-amber-800"><CalendarClock className="h-3.5 w-3.5" />Yeh bill abhi dena hai. Ada karne par aaj ki date lagegi.</p>}
        </div>
      )}
    </li>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-3 sm:block"><dt className="text-[0.75rem] text-slate-500">{k}</dt><dd className="font-medium text-slate-900">{v}</dd></div>;
}
