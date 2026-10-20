/**
 * Custom orders: furniture made to order. Quotation → advance → karigar →
 * ready → delivery. Advances go on the customer's khata the day they come
 * in; the order's bill is made when the furniture leaves the shop. Orders
 * are cancelled, never deleted.
 *
 * Keys: N new order · / search · A analytics · G guide.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, BarChart3, CheckCircle2, ClipboardList, Download, FileText, GraduationCap, Hammer, ListChecks, PackageCheck, Plus, Truck, Wallet, XCircle,
} from 'lucide-react';
import {
  Button, FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton,
} from '@/design-system/components';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { customOrdersApi, type FurnitureCustomOrder } from '../api/custom-orders.api';
import { BarList, DueChip, Empty, ListCard, ListLoading, Pager, Pill } from '../components/ui';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { BILLED_ORDER, FURNITURE_KEYS, OPEN_ORDER, ORDER_STATUS, daysTo, orderTotal, shortDate } from '../lib/meta';

type Tab = 'open' | 'quotes' | 'making' | 'ready' | 'done' | 'cancelled' | 'all' | 'analytics';
const LIMIT = 25;
const TAB_STATUS: Record<Tab, string | undefined> = {
  open: OPEN_ORDER.join(','), quotes: 'QUOTATION', making: 'DEPOSIT_PAID,IN_PRODUCTION', ready: 'READY_FOR_DELIVERY',
  done: ['OUT_FOR_DELIVERY', ...BILLED_ORDER].join(','), cancelled: 'CANCELLED,REFUNDED', all: undefined, analytics: undefined,
};

export default function CustomOrdersPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const { sales: money } = useMasked();
  const canCreate = usePermission(PERMISSIONS.SERVICE_JOBS_MANAGE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim());
  const [page, setPage] = useState(1);

  const params = { status: TAB_STATUS[tab], search: q || undefined, page, limit: LIMIT };
  const listQ = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'page', params], queryFn: () => customOrdersApi.page(params), enabled: tab !== 'analytics', placeholderData: (p) => p });
  const sumQ = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'summary'], queryFn: () => customOrdersApi.summary() });
  const allQ = useQuery({ queryKey: [FURNITURE_KEYS.orders, 'analytics'], queryFn: () => customOrdersApi.page({ page: 1, limit: 200 }), enabled: tab === 'analytics' });
  const s = sumQ.data;
  const goNew = () => { if (canCreate) navigate('/furniture/custom-orders/new'); };
  usePageKeys(searchRef, { n: goNew, a: () => setTab('analytics') });
  const changeTab = (t: Tab) => { setTab(t); setPage(1); };

  const rows = listQ.data?.items ?? [];
  const exportCsv = () => {
    if (!rows.length) { toast.error('Is filter me koi order nahi'); return; }
    downloadCsv('furniture-orders.csv', [
      ['Order', 'Customer', 'Phone', 'Cheez', 'Lakri', 'Polish', 'Karigar', 'Order date', 'Dena hai', 'Qeemat', 'Mila', 'Baqi', 'Halat'],
      ...rows.map((o) => [o.orderNumber, o.customerName, o.customerPhone, o.productType, o.woodType ?? '', o.polishRequested ?? '', o.carpenterName ?? '',
        o.quotationDate.slice(0, 10), o.expectedDeliveryDate?.slice(0, 10) ?? '', orderTotal(o), o.totalPaid, o.balanceAmount, ORDER_STATUS[o.status]?.label ?? o.status]),
    ]);
  };
  const printList = (): PrintDoc => ({
    title: 'Custom orders',
    meta: [['Chal rahe', String((s?.quotation ?? 0) + (s?.deposit ?? 0) + (s?.production ?? 0) + (s?.ready ?? 0))], ['Late', String(s?.late ?? 0)], ['Baqi', money(s?.totalReceivable ?? 0)]],
    sections: [{
      kind: 'table', title: 'Orders',
      columns: [{ label: 'Order' }, { label: 'Customer' }, { label: 'Cheez', wideOnly: true }, { label: 'Dena hai' }, { label: 'Baqi', align: 'right' }],
      rows: rows.map((o) => [o.orderNumber, `${o.customerName} ${o.customerPhone}`, o.productType, shortDate(o.expectedDeliveryDate), money(o.balanceAmount)]),
    }],
  });

  const analytics = useMemo(() => {
    const items = (allQ.data?.items ?? []).filter((o) => o.status !== 'CANCELLED' && o.status !== 'REFUNDED');
    const group = (key: (o: FurnitureCustomOrder) => string) => {
      const m = new Map<string, { count: number; value: number }>();
      for (const o of items) {
        const k = key(o);
        const x = m.get(k) ?? { count: 0, value: 0 };
        x.count += 1; x.value += orderTotal(o);
        m.set(k, x);
      }
      return [...m.entries()].map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.value - a.value).slice(0, 10);
    };
    return { byItem: group((o) => o.productType), byCarpenter: group((o) => o.carpenterName || 'Karigar nahi'), byWood: group((o) => o.woodType || 'Likha nahi') };
  }, [allQ.data]);

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Custom orders — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: FileText, color: '#0891b2', title: 'Quotation', text: 'Customer kya banwana chahta hai — design, lakri, polish, size, qeemat aur kitne din. Sketch ya photo bhi lagayein.' },
            { icon: Wallet, color: '#16a34a', title: 'Advance', text: 'Advance usi din drawer me aata hai aur customer ke khate me jama hota hai. Baad ki qist bhi isi tarah — jitni baar chahein.' },
            { icon: Hammer, color: '#a16207', title: 'Karigar', text: 'Order karigar ko dein, kaam kitna hua (%) likhte rahein. 100% par order "Tayyar" ho jata hai.' },
            { icon: Truck, color: '#7c3aed', title: 'Delivery = bill', text: 'Furniture dukaan se nikle to bill banta hai: advance pehle katta hai, baqi udhaar khate me. Delivery page par gaari aur fitting.' },
            { icon: XCircle, color: '#e11d48', title: 'Cancel', text: 'Order mitta nahi, cancel hota hai. Advance customer ke khate me rehta hai — wapas dena ho to khate se dein.' },
          ]}
          shortcuts={[['N', 'naya order'], ['A', 'analytics'], ['/', 'search'], ['G', 'guide']]} />
      )}

      <PageHero title="Custom orders" chip={<><ClipboardList /> Order par</>} loading={sumQ.isLoading} busy={listQ.isFetching && !listQ.isLoading}
        meta="Quotation se delivery tak — advance, karigar aur baqi paisa"
        actions={<>
          <Link to="/furniture/deliveries" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Deliveries</span></Link>
          <button type="button" onClick={exportCsv} className={heroButton}><Download className="h-4 w-4" />CSV</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printList} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <button type="button" onClick={goNew} title="Naya order (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" />Order</button>}
        </>}
        stats={[
          { label: 'Ban rahe', value: String((s?.deposit ?? 0) + (s?.production ?? 0)) },
          { label: 'Late', value: String(s?.late ?? 0) },
          { label: 'Customers se baqi', value: money(s?.totalReceivable ?? 0) },
        ]} />

      <KpiRow cols={4}>
        <KpiCard icon={FileText} color="#0891b2" label="Quotation" value={s?.quotation ?? 0} hint="Advance ka intezar" active={tab === 'quotes'} onClick={() => changeTab('quotes')} />
        <KpiCard icon={Hammer} color="#a16207" label="Ban rahe" value={(s?.deposit ?? 0) + (s?.production ?? 0)} hint={s?.late ? `${s.late} late` : 'Sab waqt par'} active={tab === 'making'} onClick={() => changeTab('making')} />
        <KpiCard icon={PackageCheck} color="#16a34a" label="Tayyar" value={s?.ready ?? 0} hint="Delivery bhejein" active={tab === 'ready'} onClick={() => changeTab('ready')} />
        <KpiCard icon={Wallet} color="#7c3aed" label="Advance / wusooli" value={money(s?.totalCollected ?? 0)} hint={`${money(s?.totalReceivable ?? 0)} baqi`} />
      </KpiRow>

      <FilterBar search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Order, customer, phone, cheez ya karigar…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => { setSearch(''); setPage(1); }} />

      <ViewTabs value={tab} onChange={changeTab} hint="Order kholein — advance, karigar, kaam aur delivery"
        tabs={[
          { id: 'open', label: 'Chal rahe', icon: ClipboardList },
          { id: 'quotes', label: 'Quotation', icon: FileText, count: s?.quotation ?? null },
          { id: 'making', label: 'Ban rahe', icon: Hammer },
          { id: 'ready', label: 'Tayyar', icon: PackageCheck, count: s?.ready ?? null },
          { id: 'done', label: 'De diye', icon: CheckCircle2 },
          { id: 'cancelled', label: 'Cancel', icon: XCircle },
          { id: 'all', label: 'Sab', icon: ListChecks },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        ]} />

      {tab === 'analytics' ? (
        allQ.isLoading ? <ListLoading /> : (
          <div className="grid gap-4 lg:grid-cols-3">
            <BarList title="Kya zyada banwaya" money={money} rows={analytics.byItem} />
            <BarList title="Karigar (kaam ki qeemat)" money={money} rows={analytics.byCarpenter} />
            <BarList title="Lakri" money={money} rows={analytics.byWood} />
          </div>
        )
      ) : (
        <ListCard footer={listQ.data && <Pager page={page} total={listQ.data.total} limit={LIMIT} onPage={setPage} />}>
          {listQ.isLoading ? <ListLoading /> : rows.length === 0 ? (
            <Empty icon={ClipboardList} title="Is filter me koi order nahi" text="Bed, sofa ya almari order par banani ho to naya order banayein."
              action={canCreate ? <Button onClick={goNew}><Plus className="h-4 w-4" />Naya order</Button> : undefined} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((o) => {
                const st = ORDER_STATUS[o.status];
                return (
                  <li key={o.id}>
                    <Link to={`/furniture/custom-orders/${o.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_9rem_10rem_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{o.productType} <span className="font-mono text-[0.75rem] font-normal text-slate-400">{o.orderNumber}</span></p>
                        <p className="truncate text-[0.75rem] text-slate-500">{[o.customerName, o.customerPhone, o.woodType, o.carpenterName ? `Karigar ${o.carpenterName}` : null].filter(Boolean).join(' · ')}</p>
                        {(o.status === 'IN_PRODUCTION' || o.status === 'DEPOSIT_PAID') && (
                          <div className="mt-1.5 h-1.5 max-w-xs rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-amber-500" style={{ width: `${Math.max(o.progressPct, 3)}%` }} /></div>
                        )}
                      </div>
                      <p className="text-[0.8125rem] text-slate-700">{shortDate(o.expectedDeliveryDate)}<DueChip o={o} /></p>
                      <p className="text-[0.875rem] font-semibold tabular-nums text-slate-900">{money(orderTotal(o))}
                        <span className={`block text-[0.75rem] font-medium ${o.balanceAmount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>{o.balanceAmount > 0 ? `${money(o.balanceAmount)} baqi` : 'Poora mila'}</span>
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        {OPEN_ORDER.includes(o.status) && (daysTo(o.expectedDeliveryDate) ?? 0) < 0 && <AlertTriangle className="h-4 w-4 text-rose-600" />}
                        <Pill tone={st?.tone ?? ''}>{st?.label ?? o.status}</Pill>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </ListCard>
      )}
    </PageShell>
  );
}
