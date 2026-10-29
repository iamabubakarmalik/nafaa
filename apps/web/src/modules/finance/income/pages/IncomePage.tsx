/**
 * Other income ("Doosri aamdani"): company incentives, scheme claims,
 * commission, rent received, bank interest. This month against last month,
 * the monthly incomes not yet recorded, the record for a period with
 * category, company, received-via and branch filters, and twelve months.
 * Every record adds to net profit on its day.
 *
 * Keys: N new · / search · 1 record · 2 monthly.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart3, Building2, CalendarClock, ChevronDown, Copy, HandCoins, ListChecks, Pencil, PieChart, Plus, Repeat, Store, Tags, Trash2,
  TrendingDown, TrendingUp, Wallet,
} from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroPrimaryButton, resolveRange, type DateRangeValue, confirmDialog,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useIsAllShops } from '@core/stores/auth.store';
import { shopsApi } from '@modules/organization/shops/api/shops.api';
import { suppliersApi } from '@modules/purchasing/suppliers/api/suppliers.api';
import { incomeApi, incomeCategoriesApi, type Income, type IncomeQuery, type IncomeReceivedVia } from '../api/income.api';
import { IncomeCategoryManager } from '../components/IncomeCategoryManager';
import { IncomeForm, type IncomeDraft } from '../components/IncomeForm';
import { FIXED_CATEGORIES, INCOME_AFFECTED_KEYS, INCOME_CATEGORIES_KEY, INCOME_KEY, VIA, apiError, catOf, day, monthLabel } from '../components/meta';

type Tab = 'record' | 'monthly';

export default function IncomePage() {
  const qc = useQueryClient();
  const startHour = useBusinessDayStart();
  const allShops = useIsAllShops();
  const canWrite = usePermission(PERMISSIONS.INCOME_MANAGE);
  const canSeeExpenses = usePermission(PERMISSIONS.EXPENSES_VIEW);
  const searchRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('record');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [category, setCategory] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [via, setVia] = useState<'' | IncomeReceivedVia>('');
  const [shopId, setShopId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<IncomeDraft | null>(null);
  const [cats, setCats] = useState(false);

  // "?new=1" opens the form once (quick actions, Nafaa AI links).
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get('new') !== '1') return;
    if (canWrite) setForm({ mode: 'new' });
    setParams((p) => { p.delete('new'); return p; }, { replace: true });
  }, [params, setParams, canWrite]);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, category, supplierId, via, shopId, query]);
  useEffect(() => { if (!allShops) setShopId(''); }, [allShops]);

  const period = resolveRange(range, startHour);
  const q: IncomeQuery = {
    ...(period ?? {}), category: category || undefined, supplierId: supplierId || undefined, receivedVia: via || undefined,
    shopId: shopId || undefined, search: query || undefined, page, limit: 30,
  };

  const listQ = useQuery({ queryKey: [INCOME_KEY, 'list', q], queryFn: () => incomeApi.page(q), placeholderData: (p) => p, enabled: tab === 'record' });
  const overviewQ = useQuery({ queryKey: [INCOME_KEY, 'overview', shopId], queryFn: () => incomeApi.overview(shopId || undefined), placeholderData: (p) => p });
  const catsQ = useQuery({ queryKey: [INCOME_CATEGORIES_KEY], queryFn: incomeCategoriesApi.list, staleTime: 5 * 60_000 });
  const shopsQ = useQuery({ queryKey: ['shops'], queryFn: shopsApi.list, staleTime: 5 * 60_000, enabled: allShops });
  const suppliersQ = useQuery({ queryKey: ['suppliers', 'income-picker'], queryFn: () => suppliersApi.list({ status: 'active', sort: 'name', limit: 500 }), staleTime: 5 * 60_000 });

  const o = overviewQ.data;
  const data = listQ.data;
  const rows = data?.items ?? [];
  const custom = catsQ.data ?? [];
  const shops = (shopsQ.data ?? []).filter((s) => s.isActive);
  const suppliers = suppliersQ.data?.items ?? [];

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Sab categories' },
    ...FIXED_CATEGORIES.map((c) => ({ value: c.id as string, label: c.label, icon: c.icon, color: c.color })),
    ...custom.map((c) => ({ value: c.id, label: c.name, color: c.color })),
  ], [custom]);
  const catLabel = categoryOptions.find((c) => c.value === category)?.label ?? 'Category';
  const filtered = !!category || !!supplierId || !!via || !!shopId || !!query;
  const clear = () => { setCategory(''); setSupplierId(''); setVia(''); setShopId(''); setSearch(''); };
  const periodText = period ? rangeLabel(period.from, period.to) : 'Sab tareekhen';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canWrite) { e.preventDefault(); setForm({ mode: 'new' }); }
      if (e.key === '1') setTab('record');
      if (e.key === '2') setTab('monthly');
      if (e.key === '/') { e.preventDefault(); setTab('record'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canWrite]);

  const remove = useMutation({
    mutationFn: (i: Income) => incomeApi.remove(i.id),
    onSuccess: () => { toast.success('Aamdani ka record mita diya'); INCOME_AFFECTED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] })); },
    onError: (err) => toast.error(apiError(err, 'Nahi mita')),
  });
  const again = (i: Income): IncomeDraft => ({
    mode: 'new',
    prefill: { title: i.title, amount: i.amount, category: i.category, categoryId: i.categoryId, supplierId: i.supplierId, receivedVia: i.receivedVia, moneyAccountId: i.moneyAccountId, repeatMonthly: i.repeatMonthly },
  });
  const askRemove = async (i: Income) => {
    const back = i.receivedVia === 'CASH_DRAWER' ? 'Galle ka hisaab bhi wapas ho jayega.' : i.receivedVia === 'ACCOUNT' ? 'Account ki entry bhi hat jayegi.' : 'Supplier khate mein amount wapas jur jayegi.';
    if (await confirmDialog({ title: `"${i.title}" (${formatPKR(i.amount)}) mitayein?`, text: `Profit se bhi nikal jayegi. ${back}`, danger: true })) remove.mutate(i);
  };

  const change = o && o.lastMonth.amount > 0 ? Math.round(((o.month.amount - o.lastMonth.amount) / o.lastMonth.amount) * 1000) / 10 : null;
  const up = (change ?? 0) >= 0;
  const maxMonth = Math.max(1, ...(o?.months ?? []).map((m) => m.amount));

  return (
    <PageShell>
      <PageHero
        title="Doosri aamdani"
        chip={<><HandCoins /> Income</>}
        meta="Company incentive, scheme claim, commission, kiraya — sale ke ilawa jo paisa aaye, net profit mein judta hai"
        busy={(listQ.isFetching && !listQ.isLoading) || overviewQ.isFetching}
        loading={overviewQ.isLoading}
        actions={<>
          {canSeeExpenses && <Link to="/expenses" className={heroButton}><Wallet className="h-4 w-4" /> Expenses</Link>}
          <button type="button" onClick={() => setCats(true)} className={heroButton}><Tags className="h-4 w-4" /> Categories</button>
          {canWrite && <button type="button" onClick={() => setForm({ mode: 'new' })} title="Nayi aamdani (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi aamdani</button>}
        </>}
        stats={o ? [
          { label: 'Is mahine', value: formatPKR(o.month.amount), hint: `${o.month.count} records` },
          { label: 'Pichle mahine', value: formatPKR(o.lastMonth.amount) },
          ...(o.due.length ? [{ label: 'Is mahine baqi', value: String(o.due.length), hint: 'har mahine wali' }] : []),
        ] : [{ label: 'Is mahine', value: '—' }]}
      />

      <KpiRow cols={3}>
        {!o ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={HandCoins} color="#16a34a" label="Is mahine" value={formatPKR(o.month.amount)} hint={`${o.month.count} records`}
            onClick={() => { setTab('record'); setRange({ preset: 'thisMonth', custom: { from: '', to: '' } }); }} active={tab === 'record' && range.preset === 'thisMonth'} />
          <KpiCard icon={up ? TrendingUp : TrendingDown} color={change == null ? '#64748b' : up ? '#16a34a' : '#e11d48'} label="Farq"
            value={change == null ? '—' : `${up ? '+' : ''}${change}%`} hint={`Pichle mahine ${formatPKR(o.lastMonth.amount)}`}
            onClick={() => { setTab('record'); setRange({ preset: 'lastMonth', custom: { from: '', to: '' } }); }} active={tab === 'record' && range.preset === 'lastMonth'} />
          <KpiCard icon={Repeat} color="#d97706" label="Baqi mahana" value={o.due.length}
            hint={o.due.length ? `Abhi nahi likhi: ${o.due.slice(0, 2).map((d) => d.title).join(', ')}` : 'Sab likh li'} />
        </>}
      </KpiRow>

      {o && o.due.length > 0 && canWrite && (
        <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-200 sm:p-4">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-amber-900"><CalendarClock className="h-4 w-4" /> Is mahine ki abhi nahi likhi</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {o.due.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setForm(again(d))}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-white px-3 py-1 text-[0.8125rem] font-medium text-slate-800 ring-1 ring-amber-200 hover:bg-amber-100">
                  {d.title} · {formatPKR(d.amount)} <span className="font-semibold text-amber-800">Is mahine ka likhein</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'record' && (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Aamdani, number, company ya details…" label="Search" />}
          chips={filtered ? <>
            {category && <FilterChip onRemove={() => setCategory('')}>{catLabel}</FilterChip>}
            {supplierId && <FilterChip onRemove={() => setSupplierId('')}>{suppliers.find((s) => s.id === supplierId)?.name ?? 'Company'}</FilterChip>}
            {via && <FilterChip onRemove={() => setVia('')}>{VIA[via].short}</FilterChip>}
            {shopId && <FilterChip onRemove={() => setShopId('')}>{shops.find((s) => s.id === shopId)?.name ?? 'Branch'}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="thisMonth" allowAll />
          <FilterMenu icon={PieChart} label="Category" value={category} active={!!category} onChange={setCategory} options={categoryOptions} width="w-72" />
          {suppliers.length > 0 && (
            <FilterMenu icon={Building2} label="Company" value={supplierId} active={!!supplierId} onChange={setSupplierId} width="w-72"
              options={[{ value: '', label: 'Sab companies' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
          )}
          <FilterMenu icon={Wallet} label="Kahan aaya" value={via} active={!!via} onChange={setVia} align="right"
            options={[{ value: '' as const, label: 'Sab' }, ...(Object.keys(VIA) as IncomeReceivedVia[]).map((k) => ({ value: k, label: VIA[k].label, icon: VIA[k].icon, color: VIA[k].color }))]} />
          {allShops && shops.length > 1 && (
            <FilterMenu icon={Store} label="Branch" value={shopId} active={!!shopId} onChange={setShopId} align="right"
              options={[{ value: '', label: 'Sab branches' }, ...shops.map((s) => ({ value: s.id, label: s.name }))]} />
          )}
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canWrite && <><Kbd>N</Kbd> nayi · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>2</Kbd> tabs</>}
        tabs={[
          { id: 'record', label: 'Record', icon: ListChecks, count: data?.total ?? null },
          { id: 'monthly', label: 'Mahine', icon: BarChart3 },
        ]} />

      {tab === 'monthly' ? (
        <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5">
          <p className="text-sm font-semibold text-slate-900">Pichle 12 mahine</p>
          <p className="text-[0.75rem] text-slate-500">Har mahine ki doosri aamdani — net profit mein judti hai</p>
          {!o ? <Skeleton className="mt-4 h-48 rounded-xl" /> : (
            <ul className="mt-4 space-y-1.5">
              {[...o.months].reverse().map((m) => (
                <li key={m.key} className="grid grid-cols-[3.5rem_minmax(0,1fr)_6.5rem] items-center gap-2 text-[0.8125rem]">
                  <span className="text-slate-500">{monthLabel(m.key)}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${(m.amount / maxMonth) * 100}%` }} />
                  </span>
                  <span className={cn('text-right font-semibold tabular-nums', m.amount ? 'text-emerald-700' : 'text-slate-400')}>{formatPKR(m.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (<>
        {data && data.total > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{periodText}</span>
            <span className="font-semibold text-slate-900">Aamdani {formatPKR(data.totals.amount)} <span className="font-normal text-slate-500">({data.totals.count})</span></span>
            {data.byCategory.slice(0, 3).map((c) => <span key={c.key} className="text-slate-600">{c.label} {formatPKR(c.amount)}</span>)}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">Aamdani load nahi hui</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <HandCoins className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter mein koi aamdani nahi' : 'Is period mein koi doosri aamdani nahi likhi'}</p>
            <p className="mt-1 text-sm text-slate-500">Company ka incentive ya scheme claim mila? Likhein — net profit mein jud jayega.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canWrite && <Button onClick={() => setForm({ mode: 'new' })} leftIcon={<Plus className="h-4 w-4" />}>Nayi aamdani</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((i) => (
              <Row key={i.id} i={i} showShop={allShops} canWrite={canWrite} busy={remove.isPending}
                onEdit={() => setForm({ mode: 'edit', income: i })} onAgain={() => setForm(again(i))} onRemove={() => askRemove(i)} />
            ))}
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

      {form && <IncomeForm draft={form} categories={custom} onClose={() => setForm(null)} onManageCategories={() => setCats(true)} />}
      {cats && <IncomeCategoryManager categories={custom} onClose={() => setCats(false)} />}
    </PageShell>
  );
}

function Row({ i, showShop, canWrite, busy, onEdit, onAgain, onRemove }: {
  i: Income; showShop: boolean; canWrite: boolean; busy: boolean; onEdit: () => void; onAgain: () => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const cat = catOf(i);
  const v = VIA[i.receivedVia];
  const meta = [day(i.incomeDate), i.supplier?.name, showShop && i.shop?.name, i.createdBy?.fullName].filter(Boolean).join(' · ');
  return (
    <li>
      <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
          <cat.icon className="h-4 w-4" />
        </span>
        <button type="button" onClick={() => setOpen((x) => !x)} className="min-w-0 flex-1 text-left" aria-expanded={open}>
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="truncate font-semibold text-slate-900">{i.title}</span>
            <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium" style={{ backgroundColor: `${cat.color}14`, color: cat.color }}>{cat.label}</span>
            {i.repeatMonthly && <Repeat className="h-3.5 w-3.5 text-slate-400" aria-label="Har mahine" />}
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] text-slate-400"><span className="font-mono">{i.incomeNumber}</span> · {meta}</span>
        </button>
        <div className="text-right">
          <p className="text-base font-bold tabular-nums text-emerald-700">+{formatPKR(i.amount)}</p>
          <p className="inline-flex items-center gap-1 text-[0.6875rem] font-medium" style={{ color: v.color }}><v.icon className="h-3 w-3" />{v.short}</p>
        </div>
        <button type="button" onClick={() => setOpen((x) => !x)} aria-label="Details" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
          <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
        </button>
      </div>
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[0.8125rem] text-slate-700 sm:pl-[4.25rem]">
          {i.note && <p className="whitespace-pre-line rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">{i.note}</p>}
          <p className="text-slate-600">{v.label}{i.receivedVia === 'SUPPLIER_KHATA' && i.supplier ? ` — ${i.supplier.name} ko dena itna kam hua` : ''}</p>
          {canWrite && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={onEdit} leftIcon={<Pencil className="h-4 w-4" />}>Badlein</Button>
              <Button size="sm" variant="secondary" onClick={onAgain} leftIcon={<Copy className="h-4 w-4" />}>Phir likhein</Button>
              <Button size="sm" variant="ghost" onClick={onRemove} disabled={busy} leftIcon={<Trash2 className="h-4 w-4" />} className="text-rose-700">Mitayein</Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
