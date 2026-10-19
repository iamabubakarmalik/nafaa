/**
 * Bulk orders (weddings, offices, schools): this week, late, booked without
 * advance and money to collect; the record by view with search, event-date,
 * kind and sort; what the kitchen must make for booked orders against stock;
 * and analytics. Next step, payments, slips, WhatsApp and the bill at
 * hand-over work from the row.
 *
 * Keys: N new order · / search · 1 orders · 2 kitchen · 3 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Building2, Cake, CalendarDays, ChefHat, Clock, FileSpreadsheet, Filter, GraduationCap,
  ListChecks, MessageCircle, Plus, Printer, Receipt, ShoppingBag, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { bulkOrdersApi, type BulkQuery, type BulkView } from '../api/bulk-orders.api';
import { BulkAnalytics, BulkKitchen, BulkOrderRow } from '../components/bulk/BulkViews';
import { useBulkActions } from '../components/bulk/useBulkActions';
import { BULK_KEY, BULK_TYPES, bulkPrice, bulkTypeOf, dateTime, downloadCsv, statusOf } from '../components/meta';

type Tab = 'orders' | 'kitchen' | 'analytics';
type Sort = NonNullable<BulkQuery['sort']>;

const VIEWS: Array<{ id: BulkView; label: string }> = [
  { id: 'active', label: 'Chal rahe' }, { id: 'week', label: 'Is hafte' }, { id: 'late', label: 'Late' },
  { id: 'noAdvance', label: 'Bina advance' }, { id: 'unpaid', label: 'Paisa baqi' }, { id: 'done', label: 'Poore / cancel' }, { id: 'all', label: 'Sab' },
];
const viewLabel = (v: BulkView) => VIEWS.find((x) => x.id === v)?.label ?? v;

export default function BakeryBulkOrdersPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const shopName = useAuthStore((s) => s.tenant?.name) || 'Bakery';
  const canManage = usePermission(PERMISSIONS.BAKERY_ORDERS_MANAGE);
  const canRefund = usePermission(PERMISSIONS.RETURNS_CREATE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>('orders');
  const [view, setView] = useState<BulkView>('active');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [aRange, setARange] = useState<DateRangeValue>({ preset: 'year', custom: { from: '', to: '' } });
  const [type, setType] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [days, setDays] = useState(3);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, type, sort, query]);

  const period = resolveRange(range, startHour);
  const aPeriod = resolveRange(aRange, startHour);
  const q: BulkQuery = { view, page, limit: 30, sort, search: query || undefined, orderType: type || undefined, ...(period ?? {}) };
  const listQ = useQuery({ queryKey: [BULK_KEY, 'page', q], queryFn: () => bulkOrdersApi.page(q), placeholderData: (p) => p, enabled: tab === 'orders', refetchInterval: 120_000 });
  const sumQ = useQuery({ queryKey: [BULK_KEY, 'summary', 'open'], queryFn: () => bulkOrdersApi.summary(), refetchInterval: 120_000 });
  const act = useBulkActions(shopName);
  const data = listQ.data;
  const rows = data?.items ?? [];
  const open = sumQ.data?.open;
  const filtered = !!type || !!query || range.preset !== 'all';
  const clear = () => { setType(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: BulkView) => { setTab('orders'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/bakery/bulk-orders/new'); }
      if (e.key === '1') setTab('orders');
      if (e.key === '2') setTab('kitchen');
      if (e.key === '3') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('orders'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await bulkOrdersApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: `Bare orders — ${viewLabel(view)}`,
      subtitle: period ? rangeLabel(period.from, period.to) : 'Sab tareekhen',
      meta: [['Orders', String(all.total)], ...(all.totals ? [['Kul', formatPKR(all.totals.value)] as [string, string], ['Baqi lena', formatPKR(all.totals.due)] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: 'Event' }, { label: 'Order', wideOnly: true }, { label: 'Kis ka' }, { label: 'Qisam', wideOnly: true }, { label: 'Halat', wideOnly: true }, { label: 'Kul', align: 'right' }, { label: 'Baqi', align: 'right' }],
        rows: all.items.map((o) => [dateTime(o.eventDate), o.orderNumber, `${o.organizationName} ${o.contactPhone}`, bulkTypeOf(o.orderType).label, statusOf(o.status).label, formatPKR(bulkPrice(o)), formatPKR(Math.max(bulkPrice(o) - o.paidAmount, 0))]),
      }],
    };
  };

  return (
    <PageShell>
      <PageHero
        title="Bare orders"
        chip={<><ShoppingBag /> Shadi, daftar, event</>}
        meta="Ek shadi ka order poore hafte ki sale jitna — advance, kitchen aur bill ek jagah"
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'orders' || !rows.length} /></span>
          <button type="button" title="CSV" className={heroIconButton} disabled={!rows.length}
            onClick={() => downloadCsv('bare-orders', ['Order', 'Kis ka', 'Phone', 'Qisam', 'Event', 'Mehmaan', 'Halat', 'Kul', 'Mila'], rows.map((o) => [o.orderNumber, o.organizationName, o.contactPhone, bulkTypeOf(o.orderType).label, dateTime(o.eventDate), o.totalGuests, statusOf(o.status).label, bulkPrice(o), o.paidAmount]))}>
            <FileSpreadsheet className="h-4 w-4" />
          </button>
          <Link to="/bakery/cake-orders" className={heroButton}><Cake className="h-4 w-4" /><span className="hidden sm:inline">Cake orders</span></Link>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/bakery/bulk-orders/new" title="Naya order (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Naya order</Link>}
        </>}
        stats={open ? [
          { label: 'Chal rahe', value: open.count, hint: sales(open.value) },
          { label: 'Is hafte', value: open.week, hint: open.late ? `${open.late} late` : undefined },
          { label: 'Lena baqi', value: sales(open.due) },
        ] : [{ label: 'Chal rahe', value: '—' }]}
      />

      <KpiRow cols={5}>
        {!open ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={CalendarDays} color="#d97706" label="Is hafte" value={open.week} hint="Agle 7 din" onClick={() => pick('week')} active={tab === 'orders' && view === 'week'} />
          <KpiCard icon={AlertTriangle} color={open.late ? '#e11d48' : '#64748b'} label="Late" value={open.late} hint={open.late ? 'Date guzar gayi' : 'Koi late nahi'} onClick={() => pick('late')} active={tab === 'orders' && view === 'late'} />
          <KpiCard icon={ListChecks} color="#7c3aed" label="Chal rahe" value={open.count} hint={sales(open.value)} onClick={() => pick('active')} active={tab === 'orders' && view === 'active'} />
          <KpiCard icon={Clock} color={open.noAdvance ? '#e11d48' : '#64748b'} label="Bina advance" value={open.noAdvance} hint="Pakke magar paisa nahi" onClick={() => pick('noAdvance')} active={tab === 'orders' && view === 'noAdvance'} />
          <KpiCard icon={Wallet} color="#0891b2" label="Lena baqi" value={sales(open.due)} hint="Chalte orders par" onClick={() => pick('unpaid')} active={tab === 'orders' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'kitchen' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Pakke orders ki saari cheezein jama — stock minus kar ke kitna banana baqi</p>}>
          <div className="flex gap-1.5">{[1, 3, 7].map((d) => <button key={d} type="button" onClick={() => setDays(d)} className={cn('h-10 rounded-full px-3.5 text-[0.8125rem] font-semibold ring-1', days === d ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50')}>{d === 1 ? 'Kal tak' : `${d} din`}</button>)}</div>
        </FilterBar>
      ) : tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">Jin orders ka event is period me hai</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="year" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder="Idara, rabta, phone, jagah, order #…" label="Search" />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>Event: {rangeLabel(period.from, period.to)}</FilterChip>}
            {type && <FilterChip onRemove={() => setType('')}>{bulkTypeOf(type).label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView}
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, hint: data?.counts ? `${data.counts[v.id]} orders` : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label="Event ki date" />
          <FilterMenu icon={Building2} label="Qisam" value={type} active={!!type} onChange={setType} options={[{ value: '', label: 'Sab qismein' }, ...BULK_TYPES.map((t) => ({ value: t.value, label: `${t.emoji} ${t.label}` }))]} />
          <FilterMenu icon={ArrowDownWideNarrow} label={sort === 'amount' ? 'Bari rakam pehle' : sort === 'recent' ? 'Naye pehle' : 'Jo pehle dena'} value={sort} onChange={setSort} align="right"
            options={[{ value: 'due', label: 'Jis ka event pehle' }, { value: 'recent', label: 'Naye pehle' }, { value: 'amount', label: 'Bari rakam pehle' }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> naya · </>}<Kbd>/</Kbd> search · <Kbd>1</Kbd>-<Kbd>3</Kbd> tabs</>}
        tabs={[
          { id: 'orders', label: 'Orders', icon: ShoppingBag, count: data?.total ?? null },
          { id: 'kitchen', label: 'Kya banana hai', icon: ChefHat },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? <BulkAnalytics range={aPeriod} onType={(t) => { setType(t); setView('all'); setTab('orders'); }} />
        : tab === 'kitchen' ? <BulkKitchen days={days} />
          : (<>
            {data && data.total > 0 && data.totals && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
                <span className="text-slate-500">{viewLabel(view)}</span>
                <span className="font-semibold text-slate-900">{data.total} orders · {sales(data.totals.value)}</span>
                {data.totals.due > 0 && <button type="button" onClick={() => setView('unpaid')} className="text-amber-700 hover:underline">Lena baqi {sales(data.totals.due)}</button>}
              </div>
            )}
            {listQ.isLoading ? <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
              : listQ.isError && !data ? (
                <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
                  <p className="font-semibold text-slate-900">Orders load nahi hue</p>
                  <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>Dobara koshish</Button>
                </div>
              ) : !rows.length ? (
                <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
                  <ShoppingBag className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-3 font-semibold text-slate-900">{filtered ? 'Is filter me koi order nahi' : view === 'late' ? 'Koi order late nahi — shabash' : 'Koi bara order nahi'}</p>
                  <p className="mt-1 text-sm text-slate-500">Shadi, daftar ki party ya school ka function — bare order yahan aate hain. Ek cake ho to Cake orders istemal karein.</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {canManage && <Button onClick={() => navigate('/bakery/bulk-orders/new')} leftIcon={<Plus className="h-4 w-4" />}>Naya bara order</Button>}
                    {filtered && <Button variant="ghost" onClick={clear}>Filter saaf karein</Button>}
                    {!filtered && view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>Sab orders dekhein</Button>}
                  </div>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
                  {rows.map((o) => <BulkOrderRow key={o.id} o={o} a={{ canManage, busyId: act.busyId, shopName, next: act.next, back: act.back, pay: act.pay, cancel: act.cancel, refund: canRefund ? act.refund : undefined }} />)}
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

      {act.modals}

      {guide.isOpen && (
        <PageGuide title="Bare orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#d97706', title: 'Order likhein', text: 'Idara, rabta, event ki date aur waqt, cheezein aur rate. Advance mila to order khud "Pakka" ho jata hai.' },
            { icon: ChefHat, color: '#7c3aed', title: 'Kya banana hai', text: 'Agle 1, 3 ya 7 din ke pakke orders ki saari cheezein jama — stock minus kar ke kitna banana hai. Kitchen ke liye print karein.' },
            { icon: Wallet, color: '#0891b2', title: 'Advance', text: '"Paisa mila" se advance likhein. Pakke order bina advance ke laal dikhte hain.' },
            { icon: Receipt, color: '#16a34a', title: 'De diya = bill', text: 'Dete hi asli bill banta hai: stock ghatta hai, Sale me aata hai, baqi khate me. Ek order ka bill do dafa nahi banta.' },
            { icon: Printer, color: '#ea580c', title: 'Parchi', text: 'Customer ki parchi me rate aur baqi; kitchen parchi me sirf cheezein aur ginti.' },
            { icon: MessageCircle, color: '#22c55e', title: 'WhatsApp', text: 'Order ki details, event aur baqi paisa khud likha hua jata hai.' },
          ]}
          tips={[
            'Har cheez apne maal se jorein — "Kya banana hai" me stock tabhi milta hai aur bill me stock ghatta hai.',
            'Shadi ke order ka 50% advance pehle lein.',
            'Order likhne ke liye "Bakery orders sambhalna" ki permission chahiye.',
          ]}
          shortcuts={[['N', 'naya order'], ['/', 'dhoondein'], ['1', 'orders'], ['2', 'kya banana hai'], ['3', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
