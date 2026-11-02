/**
 * Cake orders: what is due today and tomorrow, what is late or ready and
 * the money still to collect; the record by view (active, today, late…)
 * with search, due-date, delivery and occasion filters; the week ahead by
 * day; and analytics. The next step, payments, the slip, WhatsApp and the
 * bill at hand-over all work from the row.
 *
 * Keys: N new order · / search · 1 orders · 2 week · 3 analytics · G guide.
 */

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowDownWideNarrow, BarChart3, Cake, CalendarDays, CheckCircle2, ChefHat, Clock, Filter, GraduationCap, ListChecks,
  MessageCircle, PartyPopper, Plus, Printer, Receipt, ShoppingBag, Truck, Wallet,
} from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton, type PrintDoc } from '@core/print';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Kbd, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { rangeLabel } from '@core/lib/dateRange';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useAuthStore } from '@core/stores/auth.store';
import { useReceiptSetup } from '@core/receipt/setup';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { cakeOrdersApi, type CakeOrderQuery, type CakeOrderView, type CakeOrder } from '../api/cake-orders.api';
import { OCCASIONS } from '../api/constants';
import { CakeAnalytics } from '../components/cake/CakeAnalytics';
import { CakeOrderRow } from '../components/cake/CakeOrderRow';
import { CakeWeek } from '../components/cake/CakeWeek';
import { useCakeActions } from '../components/cake/useCakeActions';
import { CAKE_KEY, DELIVERY, cakeLine, dateTime, deliveryOf, dueOf, occasionOf, statusOf } from '../components/meta';
import { t as tr } from '@core/i18n';

type Tab = 'orders' | 'week' | 'analytics';
type Sort = NonNullable<CakeOrderQuery['sort']>;

const VIEWS: Array<{ id: CakeOrderView; label: string; icon: typeof Cake }> = [
  { id: 'active', label: tr('Chal rahe'), icon: ListChecks },
  { id: 'today', label: tr('Aaj dena hai'), icon: Clock },
  { id: 'tomorrow', label: tr('Kal dena hai'), icon: CalendarDays },
  { id: 'late', label: tr('Late'), icon: AlertTriangle },
  { id: 'ready', label: tr('Tayyar / raaste me'), icon: CheckCircle2 },
  { id: 'unpaid', label: tr('Paisa baqi'), icon: Wallet },
  { id: 'done', label: tr('De diye / cancel'), icon: Receipt },
  { id: 'all', label: tr('Sab'), icon: Cake },
];
const viewLabel = (v: CakeOrderView) => VIEWS.find((x) => x.id === v)?.label ?? v;

export default function CakeOrdersPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const startHour = useBusinessDayStart();
  const shopName = useAuthStore((s) => s.tenant?.name) || tr('Bakery');
  const canManage = usePermission(PERMISSIONS.BAKERY_ORDERS_MANAGE);
  const { sales } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  useReceiptSetup();

  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'orders');
  const [view, setView] = useState<CakeOrderView>((params.get('view') as CakeOrderView) || 'active');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [aRange, setARange] = useState<DateRangeValue>({ preset: 'thisMonth', custom: { from: '', to: '' } });
  const [delivery, setDelivery] = useState('');
  const [occasion, setOccasion] = useState('');
  const [sort, setSort] = useState<Sort>('due');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [view, range, delivery, occasion, sort, query]);
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === 'orders') next.delete('tab'); else next.set('tab', tab);
    if (view === 'active') next.delete('view'); else next.set('view', view);
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, view]);

  const period = resolveRange(range, startHour);
  const aPeriod = resolveRange(aRange, startHour);
  const q: CakeOrderQuery = {
    view, page, limit: 30, sort, search: query || undefined, deliveryType: delivery || undefined, occasion: occasion || undefined,
    ...(period ?? {}),
  };
  const listQ = useQuery({ queryKey: [CAKE_KEY, 'page', q], queryFn: () => cakeOrdersApi.page(q), placeholderData: (p) => p, refetchInterval: 60_000, enabled: tab === 'orders' });
  const sumQ = useQuery({ queryKey: [CAKE_KEY, 'summary', 'open'], queryFn: () => cakeOrdersApi.summary(), refetchInterval: 60_000 });
  const act = useCakeActions(shopName);

  const data = listQ.data;
  const rows = data?.items ?? [];
  const open = sumQ.data?.open;
  const filtered = !!delivery || !!occasion || !!query || range.preset !== 'all';
  const clear = () => { setDelivery(''); setOccasion(''); setSearch(''); setRange({ preset: 'all', custom: { from: '', to: '' } }); };
  const pick = (v: CakeOrderView) => { setTab('orders'); setView(v); };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canManage) { e.preventDefault(); navigate('/bakery/cake-orders/new'); }
      if (e.key === '1') setTab('orders');
      if (e.key === '2') setTab('week');
      if (e.key === '3') setTab('analytics');
      if (e.key === '/') { e.preventDefault(); setTab('orders'); window.setTimeout(() => searchRef.current?.focus(), 0); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canManage, navigate]);

  const printDoc = async (): Promise<PrintDoc> => {
    const all = await cakeOrdersApi.page({ ...q, page: 1, limit: 100 });
    return {
      title: tr('Cake orders — {{view}}', { view: viewLabel(view) }),
      subtitle: period ? rangeLabel(period.from, period.to) : tr('Sab tareekhen'),
      meta: [[tr('Orders'), String(all.total)], ...(all.totals ? [[tr('Kul'), formatPKR(all.totals.value)] as [string, string], [tr('Baqi lena'), formatPKR(all.totals.due)] as [string, string]] : [])],
      sections: [{
        kind: 'table',
        columns: [{ label: tr('Kab') }, { label: tr('Order'), wideOnly: true }, { label: tr('Customer') }, { label: tr('Cake'), wideOnly: true }, { label: tr('Halat'), wideOnly: true }, { label: tr('Kul'), align: 'right' }, { label: tr('Baqi'), align: 'right' }],
        rows: all.items.map((o: CakeOrder) => [dateTime(o.neededBy), o.orderNumber, `${o.customerName} ${o.customerPhone}`, cakeLine(o), statusOf(o.status).label, formatPKR(o.total), formatPKR(dueOf(o))]),
      }],
      footer: all.total > all.items.length ? tr('Pehle {{count}} orders (kul {{total}})', { count: all.items.length, total: all.total }) : undefined,
    };
  };

  const counts = data?.counts;
  return (
    <PageShell>
      <PageHero
        title={tr('Cake orders')}
        chip={<><Cake /> {' '}{tr('Booking')}</>}
        meta={tr('Aaj book, kal do — advance, sajawat aur bill ek jagah')}
        busy={(listQ.isFetching && !listQ.isLoading) || sumQ.isFetching}
        loading={sumQ.isLoading}
        actions={<>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={tab !== 'orders' || !rows.length} /></span>
          <Link to="/bakery/bulk-orders" className={heroButton}><ShoppingBag className="h-4 w-4" /><span className="hidden sm:inline">{tr('Bare orders')}</span></Link>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canManage && <Link to="/bakery/cake-orders/new" title={tr('Naya order (N)')} className={heroPrimaryButton}><Plus className="h-4 w-4" /> {' '}{tr('Naya order')}</Link>}
        </>}
        stats={open ? [
          { label: tr('Chal rahe orders'), value: open.count, hint: sales(open.value) },
          { label: tr('Aaj dena hai'), value: open.today, hint: open.late ? tr('{{late}} late', { late: open.late }) : undefined },
          { label: tr('Lena baqi'), value: sales(open.due), hint: open.unpaid ? tr('{{unpaid}} orders', { unpaid: open.unpaid }) : undefined },
        ] : [{ label: tr('Chal rahe orders'), value: '—' }]}
      />

      <KpiRow cols={5}>
        {!open ? Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : <>
          <KpiCard icon={Clock} color="#d97706" label={tr('Aaj dena hai')} value={open.today} hint={tr('Kal {{tomorrow}}', { tomorrow: open.tomorrow })} onClick={() => pick('today')} active={tab === 'orders' && view === 'today'} />
          <KpiCard icon={AlertTriangle} color={open.late ? '#e11d48' : '#64748b'} label={tr('Late')} value={open.late} hint={open.late ? tr('Customer ko foran batayein') : tr('Koi late nahi')} onClick={() => pick('late')} active={tab === 'orders' && view === 'late'} />
          <KpiCard icon={ChefHat} color="#7c3aed" label={tr('Chal rahe')} value={open.count} hint={sales(open.value)} onClick={() => pick('active')} active={tab === 'orders' && view === 'active'} />
          <KpiCard icon={CheckCircle2} color="#16a34a" label={tr('Tayyar')} value={open.ready} hint={tr('Dene ke liye')} onClick={() => pick('ready')} active={tab === 'orders' && view === 'ready'} />
          <KpiCard icon={Wallet} color={open.advanceShort ? '#e11d48' : '#0891b2'} label={tr('Lena baqi')} value={sales(open.due)}
            hint={open.advanceShort ? tr('{{advanceShort}} ka advance adhoora', { advanceShort: open.advanceShort }) : tr('{{unpaid}} orders par', { unpaid: open.unpaid })} onClick={() => pick('unpaid')} active={tab === 'orders' && view === 'unpaid'} />
        </>}
      </KpiRow>

      {tab === 'week' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tr('Agle 7 din — har din ke cake waqt ke hisaab se. Card par click karein to order khulega.')}</p>} />
      ) : tab === 'analytics' ? (
        <FilterBar search={<p className="flex min-w-0 flex-1 items-center text-[0.8125rem] text-slate-500">{tr('Jin orders ki dene ki date is period me hai')}</p>}>
          <DateRangeMenu value={aRange} onChange={setARange} startHour={startHour} defaultPreset="thisMonth" allowAll={false} />
        </FilterBar>
      ) : (
        <FilterBar
          search={<SearchField ref={searchRef} value={search} onChange={setSearch} placeholder={tr('Customer, phone, order #, cake par likha…')} label={tr('Search')} />}
          chips={filtered ? <>
            {range.preset !== 'all' && period && <FilterChip onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{tr('Dena: {{from}}', { from: rangeLabel(period.from, period.to) })}</FilterChip>}
            {delivery && <FilterChip onRemove={() => setDelivery('')}>{deliveryOf(delivery).label}</FilterChip>}
            {occasion && <FilterChip onRemove={() => setOccasion('')}>{occasionOf(occasion).label}</FilterChip>}
            {query && <FilterChip onRemove={() => setSearch('')}>"{query}"</FilterChip>}
          </> : undefined}
          onClear={clear}>
          <FilterMenu icon={Filter} label={viewLabel(view)} value={view} active={view !== 'active'} onChange={setView} width="w-72"
            options={VIEWS.map((v) => ({ value: v.id, label: v.label, icon: v.icon, hint: counts ? tr('{{value}} orders', { value: counts[v.id] }) : undefined }))} />
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} label={tr('Dene ki date')} />
          <FilterMenu icon={Truck} label={tr('Kaise dena')} value={delivery} active={!!delivery} onChange={setDelivery}
            options={[{ value: '', label: tr('Sab') }, ...DELIVERY.map((d) => ({ value: d.id as string, label: d.label, icon: d.icon }))]} />
          <FilterMenu icon={PartyPopper} label={tr('Mauqa')} value={occasion} active={!!occasion} onChange={setOccasion} align="right" width="w-64"
            options={[{ value: '', label: tr('Sab mauqe') }, ...OCCASIONS.map((o) => ({ value: o.value, label: `${o.emoji} ${o.label}` }))]} />
          <FilterMenu icon={ArrowDownWideNarrow} label={sort === 'amount' ? tr('Bari rakam pehle') : sort === 'recent' ? tr('Naye pehle') : tr('Jo pehle dena')} value={sort} onChange={setSort} align="right"
            options={[{ value: 'due', label: tr('Jo pehle dena hai') }, { value: 'recent', label: tr('Naye book pehle') }, { value: 'amount', label: tr('Bari rakam pehle') }]} />
        </FilterBar>
      )}

      <ViewTabs value={tab} onChange={setTab}
        hint={<>{canManage && <><Kbd>N</Kbd> {' '}{tr('naya ·')}{' '} </>}<Kbd>/</Kbd> {' '}{tr('search ·')}{' '} <Kbd>1</Kbd>-<Kbd>3</Kbd> {' '}{tr('tabs')}</>}
        tabs={[
          { id: 'orders', label: tr('Orders'), icon: ListChecks, count: data?.total ?? null },
          { id: 'week', label: tr('Hafta'), icon: CalendarDays },
          { id: 'analytics', label: tr('Analytics'), icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        <CakeAnalytics range={aPeriod} onOccasion={(k) => { setOccasion(k); setView('all'); setTab('orders'); }} />
      ) : tab === 'week' ? (
        <CakeWeek startHour={startHour} />
      ) : (<>
        {data && data.total > 0 && data.totals && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl bg-white px-4 py-2.5 text-[0.8125rem] shadow-sm ring-1 ring-slate-200/80">
            <span className="text-slate-500">{viewLabel(view)}</span>
            <span className="font-semibold text-slate-900">{tr('{{total}} orders · {{sales}}', { total: data.total, sales: sales(data.totals.value) })}</span>
            {data.totals.due > 0 && <button type="button" onClick={() => setView('unpaid')} className="text-amber-700 hover:underline">{tr('Lena baqi {{due}}', { due: sales(data.totals.due) })}</button>}
          </div>
        )}

        {listQ.isLoading ? (
          <div className="space-y-2 rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        ) : listQ.isError && !data ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <p className="font-semibold text-slate-900">{tr('Orders load nahi hue')}</p>
            <Button className="mt-3" variant="secondary" onClick={() => listQ.refetch()}>{tr('Dobara koshish')}</Button>
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-slate-200/80">
            <Cake className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-900">{filtered ? tr('Is filter me koi order nahi') : view === 'late' ? tr('Koi order late nahi — shabash') : view === 'today' ? tr('Aaj koi cake nahi dena') : tr('Koi order nahi')}</p>
            <p className="mt-1 text-sm text-slate-500">{tr('Birthday ya shadi ka cake pehle se book karein — advance lein, parchi dein, waqt par yaad dilaye ga.')}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {canManage && <Button onClick={() => navigate('/bakery/cake-orders/new')} leftIcon={<Plus className="h-4 w-4" />}>{tr('Naya order')}</Button>}
              {filtered && <Button variant="ghost" onClick={clear}>{tr('Filter saaf karein')}</Button>}
              {!filtered && view !== 'all' && <Button variant="ghost" onClick={() => setView('all')}>{tr('Sab orders dekhein')}</Button>}
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
            {rows.map((o) => <CakeOrderRow key={o.id} o={o} a={{ canManage, busyId: act.busyId, shopName, next: act.next, back: act.back, pay: act.pay, cancel: act.cancel }} />)}
          </ul>
        )}

        {data && data.pages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>{tr('Pichla')}</Button>
            <span className="text-sm text-slate-600">{tr('Safha {{page}} / {{pages}}', { page, pages: data.pages })}</span>
            <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>{tr('Agla')}</Button>
          </div>
        )}
      </>)}

      {act.modals}

      {guide.isOpen && (
        <PageGuide title={tr('Cake orders — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Plus, color: '#db2777', title: tr('Order likhein'), text: tr('"Naya order": customer, cake ki details, design ki photo, kab chahiye aur advance. Save hote hi WhatsApp par tasdeeq bhej sakte hain.') },
            { icon: ChefHat, color: '#7c3aed', title: tr('Agla qadam — ek button'), text: tr('Pakka → banana shuru → sajawat → tayyar → (pahunchana ho to "bhej diya") → de diya. Ghalti ho to "Ek qadam peeche".') },
            { icon: Receipt, color: '#16a34a', title: tr('"De diya" = asli bill'), text: tr('Cake dete hi bill banta hai: jura hua maal stock se ghatta hai, rakam Sale me aati hai aur baqi customer ke khate me. Ek order ka bill do dafa nahi banta.') },
            { icon: Wallet, color: '#0891b2', title: tr('Advance'), text: tr('"Paisa mila" se advance likhein. Advance poora hote hi order khud "Advance mila" ho jata hai.') },
            { icon: Printer, color: '#ea580c', title: tr('Parchi'), text: tr('Customer ki parchi me rakam aur baqi; kitchen parchi me sirf banane ki tafseel. Dukaan ke bill design me chhapti hai.') },
            { icon: MessageCircle, color: '#22c55e', title: tr('WhatsApp'), text: tr('Har order par WhatsApp button — order ki details, waqt aur baqi paisa khud likha hua jata hai.') },
          ]}
          tips={[
            tr('Aaj aur Late wale card roz subah dekhein — late cake ka customer wapas nahi aata.'),
            tr('Bara cake bina advance ke na banayein; list me adhoora advance peela dikhta hai.'),
            tr('"Hafta" tab se pata chalta hai kis din zyada kaam hai.'),
            tr('Order likhne aur badalne ke liye "Bakery orders sambhalna" ki permission chahiye.'),
          ]}
          shortcuts={[['N', tr('naya order')], ['/', 'dhoondein'], ['1', 'orders'], ['2', 'hafta'], ['3', 'analytics'], ['G', 'guide']]}
        />
      )}
    </PageShell>
  );
}
