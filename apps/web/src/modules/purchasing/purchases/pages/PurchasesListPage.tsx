/**
 * All purchases and orders: period, status (open orders, part received,
 * received, on credit, returned, cancelled), supplier and search, a page at
 * a time from the server, with totals for the whole filter.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Banknote, CalendarRange, ClipboardList, FileDown, Filter, GraduationCap, MousePointerClick, PackageCheck, Plus, RotateCcw, Search, Truck, Users, Wheat, X } from 'lucide-react';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print';
import { purchasesListDoc } from '../../print';
import {
  Button, DateRangeMenu, FilterMenu, PageHero, heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { formatPKR } from '@core/lib/format';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { suppliersApi } from '../../suppliers/api/suppliers.api';
import { purchasesApi, type PurchaseListQuery, type PurchaseListRow, type PurchaseStatus } from '../api/purchases.api';

export const STATUS: Record<PurchaseStatus, { label: string; tone: string }> = {
  PENDING: { label: 'Order — maal nahi aaya', tone: 'bg-blue-50 text-blue-700 ring-blue-200' },
  PARTIAL: { label: 'Aadha aaya', tone: 'bg-amber-50 text-amber-800 ring-amber-200' },
  RECEIVED: { label: 'Aa gaya', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  CANCELLED: { label: 'Cancel', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
};

type StatusFilter = NonNullable<PurchaseListQuery['status']>;

export default function PurchasesListPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const { cost: money } = useMasked();
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const [status, setStatus] = useState<StatusFilter>('all');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [showInsights, setShowInsights] = useState(() => { try { return localStorage.getItem('purchases-insights') !== '0'; } catch { return true; } });
  useEffect(() => { try { localStorage.setItem('purchases-insights', showInsights ? '1' : '0'); } catch { /* storage blocked */ } }, [showInsights]);

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, status, supplierId, query]);

  const period = resolveRange(range, startHour);
  const q: PurchaseListQuery = { ...(period ?? {}), status, supplierId: supplierId || undefined, search: query || undefined, page, limit: 30 };
  const listQ = useQuery({ queryKey: ['purchase-list', q], queryFn: () => purchasesApi.page(q), placeholderData: (prev) => prev });
  const summaryQ = useQuery({ queryKey: ['purchases-summary'], queryFn: purchasesApi.summary, staleTime: 60_000 });
  const suppliersQ = useQuery({ queryKey: ['suppliers', 'picker'], queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }), staleTime: 60_000 });
  const s = summaryQ.data;
  const data = listQ.data;
  const guide = usePageGuide();
  const printDoc = async () => purchasesListDoc(await purchasesApi.page({ ...q, page: 1, limit: 200 }), period ? `${period.from} — ${period.to}` : 'Sab tareekhen');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || isTyping() || isDialogOpen()) return;
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); navigate('/purchases/new'); }
      if (e.key === '/') { e.preventDefault(); document.getElementById('purchase-search')?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate]);

  const supplierOptions = useMemo(() => [{ value: '', label: 'Sab suppliers' }, ...(suppliersQ.data?.items ?? []).map((x) => ({ value: x.id, label: x.name }))], [suppliersQ.data]);

  return (
    <div className="space-y-4 pb-10">
      <PageHero
        title="Kharidari"
        chip={<><Truck /> Purchases aur orders</>}
        busy={listQ.isFetching && !listQ.isLoading}
        loading={summaryQ.isLoading}
        actions={<>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} disabled={!data?.items.length} /></span>
          <Link to="/suppliers" className={heroButton}><Users className="h-4 w-4" /> Suppliers</Link>
          <Link to="/purchases/new?order=1" className={heroButton}><ClipboardList className="h-4 w-4" /> Order</Link>
          <Link to="/purchases/new" className={heroPrimaryButton}><Plus className="h-4 w-4" /> Nayi kharidari</Link>
        </>}
        stats={s ? [
          { label: 'Is mahine', value: money(s.monthPurchases), hint: `${s.monthCount} bill` },
          { label: 'Aaj', value: money(s.todayPurchases) },
          { label: 'Suppliers ko dena', value: money(s.outstandingDue), hint: `${s.suppliersWithDue} supplier` },
          { label: 'Khule orders', value: s.openOrders ?? 0, hint: s.openOrdersValue ? money(s.openOrdersValue) : undefined },
        ] : undefined}
      />

      {s && showInsights && <Insights s={s} money={money} onClose={() => setShowInsights(false)} />}
      {s && !showInsights && (
        <button type="button" onClick={() => setShowInsights(true)} className="text-[0.8125rem] font-medium text-brand-700 hover:underline">Hafte ka graph aur top suppliers dikhayein</button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input id="purchase-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Bill #, supplier ya cheez…  ( / )" aria-label="Dhoondein"
            className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Saaf" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"><X className="h-4 w-4" /></button>}
        </div>
        <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="month" />
        <FilterMenu icon={Filter} label="Halat" value={status} active={status !== 'all'} onChange={setStatus}
          options={[
            { value: 'all', label: 'Sab' }, { value: 'PENDING', label: 'Khule orders' }, { value: 'PARTIAL', label: 'Aadha aaya' },
            { value: 'RECEIVED', label: 'Aa gaya' }, { value: 'credit', label: 'Udhaar par liya' }, { value: 'returned', label: 'Wapsi hui' }, { value: 'CANCELLED', label: 'Cancel' },
          ]} />
        <FilterMenu icon={Users} label="Supplier" value={supplierId} active={!!supplierId} onChange={setSupplierId} options={supplierOptions} width="w-72" align="right" />
      </div>

      {data && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
          <span className="text-slate-500">{data.total} bill</span>
          <span>Maal aaya <b className="tabular-nums">{money(data.totals.value)}</b></span>
          <span>Diye <b className="tabular-nums">{money(data.totals.paid)}</b></span>
          {data.totals.returned > 0 && <span>Wapas <b className="tabular-nums text-amber-700">{money(data.totals.returned)}</b></span>}
        </div>
      )}

      {listQ.isLoading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : !data?.items.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-semibold text-slate-900">Is filter me koi kharidari nahi</p>
          <p className="mt-1 text-sm text-slate-500">Muddat ya filter badlein, ya nayi kharidari karein</p>
          <Button className="mt-4" onClick={() => navigate('/purchases/new')} leftIcon={<Plus className="h-4 w-4" />}>Nayi kharidari</Button>
        </div>
      ) : (
        <ul className="space-y-2">
          {data.items.map((p) => <Row key={p.id} p={p} money={money} />)}
        </ul>
      )}

      {guide.isOpen && (
        <PageGuide title="Kharidari — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Plus, color: '#16a34a', title: 'Nayi kharidari', text: '"Nayi kharidari" dabayein. Maal aa gaya ho to seedha stock me jata hai; supplier ka udhaar khud khate me likha jata hai.' },
            { icon: ClipboardList, color: '#2563eb', title: 'Pehle order, maal baad me', text: '"Order" se supplier ko order banayein aur WhatsApp par bhej dein. Maal aaye to bill khol kar "Maal aaya" — aadha aaye to aadha.' },
            { icon: CalendarRange, color: '#7c3aed', title: 'Muddat aur filter', text: 'Upar se tareekh chunein. "Halat" se khule orders, udhaar wale, wapsi wale ya cancel bill alag dekhein; "Supplier" se ek supplier ke bill.' },
            { icon: MousePointerClick, color: '#d97706', title: 'Bill kholein', text: 'Kisi bhi bill par click karein: har cheez kis unit me aayi, kitni aayi, kitni wapas gayi, print aur cancel.' },
            { icon: RotateCcw, color: '#db2777', title: 'Kharab maal wapas', text: 'Bill ke andar "Maal wapas karein" — stock kam hoga aur supplier ka dena utna ghat jayega.' },
            { icon: FileDown, color: '#0891b2', title: 'Report', text: 'Print button se A4, PDF ya thermal par is filter ki poori list nikaalein — accountant ko bhej dein.' },
          ]}
          tips={[
            'Carton, box ya bori me khareeda maal usi unit me likhein — stock khud pieces / kg me jud jata hai.',
            'Discount, kiraya aur tax har cheez ki cost me hisse ke mutabiq judte hain, is liye munafa sahi nikalta hai.',
            'Supplier ko baad me adaigi "Suppliers" ke page se karein — har adaigi khate me darj rehti hai.',
          ]}
          shortcuts={[['N', 'nayi kharidari'], ['/', 'dhoondein'], ['G', 'guide']]}
          footer={<Link to="/suppliers" className="text-[0.8125rem] font-semibold text-brand-700 hover:underline"><Banknote className="mr-1 inline h-4 w-4" />Suppliers ka khata →</Link>}
        />
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((x) => x - 1)}>Pichla</Button>
          <span className="text-sm text-slate-600">Safha {page} / {data.pages}</span>
          <Button variant="secondary" size="sm" disabled={page >= data.pages} onClick={() => setPage((x) => x + 1)}>Agla</Button>
        </div>
      )}
    </div>
  );
}

function Row({ p, money }: { p: PurchaseListRow; money: (n: number) => string }) {
  const st = STATUS[p.status];
  const value = p.status === 'PENDING' ? p.total : p.receivedValue;
  const credit = Math.max(p.receivedValue - p.paidAmount, 0);
  const raw = p.items.some((i) => i.ingredientId);
  const first = p.items.slice(0, 3).map((i) => `${Number(i.quantity.toFixed(2))} ${i.unitName} ${i.itemName}`).join(' · ');
  return (
    <li>
      <Link to={`/purchases/${p.id}`} className="group flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{p.supplier.name}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1', st.tone)}>{st.label}</span>
            {p.returnedAmount > 0 && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] text-amber-800 ring-1 ring-amber-200">Wapsi {money(p.returnedAmount)}</span>}
            {raw && <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-[0.6875rem] text-amber-800 ring-1 ring-amber-200"><Wheat className="h-3 w-3" /> Raw</span>}
          </div>
          <p className="mt-0.5 truncate text-[0.8125rem] text-slate-600">{first}{p.items.length > 3 ? ` +${p.items.length - 3}` : ''}</p>
          <p className="mt-0.5 text-[0.75rem] text-slate-400">
            {p.purchaseNumber}{p.supplierInvoiceNo ? ` · Bill ${p.supplierInvoiceNo}` : ''} · {new Date(p.purchasedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            {p.shop?.name ? ` · ${p.shop.name}` : ''}{p.status === 'PENDING' && p.expectedAt ? ` · aana hai ${new Date(p.expectedAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-slate-900">{money(value)}</p>
          {p.status !== 'PENDING' && p.status !== 'CANCELLED' && (
            <p className={cn('text-[0.75rem] tabular-nums', credit > 0 ? 'text-rose-600' : 'text-emerald-600')}>{credit > 0 ? `Udhaar ${money(credit)}` : 'Poora diya'}</p>
          )}
        </div>
        <ArrowRight className="hidden h-4 w-4 text-slate-300 transition group-hover:text-slate-500 sm:block" />
      </Link>
    </li>
  );
}

type Summary = NonNullable<Awaited<ReturnType<typeof purchasesApi.summary>>>;

/** Last 7 days, biggest suppliers and most bought items this month. */
function Insights({ s, money, onClose }: { s: Summary; money: (n: number) => string; onClose: () => void }) {
  const max = Math.max(1, ...s.salesTrend7Days.map((d) => d.total));
  const topSup = s.topSuppliers.slice(0, 4);
  const topItems = (s.topProducts as Array<{ name?: string; product?: { name: string }; totalSpent: number; quantityPurchased: number }>).slice(0, 4);
  const supMax = Math.max(1, ...topSup.map((t) => t.totalSpent));
  return (
    <div className="relative grid gap-3 lg:grid-cols-3">
      <button type="button" onClick={onClose} aria-label="Chhupayein" className="absolute -top-2 right-0 z-10 rounded-full bg-white p-1 text-slate-400 ring-1 ring-slate-200 hover:text-slate-700"><X className="h-3.5 w-3.5" /></button>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[0.8125rem] font-semibold text-slate-800">Pichle 7 din</p>
        <div className="mt-3 flex h-24 items-end gap-1.5">
          {s.salesTrend7Days.map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-1" title={`${d.date}: ${money(d.total)} · ${d.orders} bill`}>
              <div className="w-full rounded-t-md bg-brand-500/80" style={{ height: `${Math.max((d.total / max) * 80, d.total ? 6 : 2)}px` }} />
              <span className="text-[0.625rem] text-slate-400">{new Date(`${d.date}T12:00:00`).toLocaleDateString('en-PK', { weekday: 'short' })}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[0.75rem] text-slate-500">Is mahine {money(s.monthPurchases)} · pichle mahine {money(s.lastMonthPurchases)}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[0.8125rem] font-semibold text-slate-800">Sab se zyada kharidari</p>
        <ul className="mt-2 space-y-2">
          {topSup.map((t) => (
            <li key={t.supplierId}>
              <Link to={`/suppliers/${t.supplierId}`} className="block hover:opacity-80">
                <div className="flex justify-between text-[0.8125rem]"><span className="truncate text-slate-700">{t.supplier?.name ?? '—'}</span><span className="tabular-nums text-slate-900">{money(t.totalSpent)}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${(t.totalSpent / supMax) * 100}%` }} /></div>
              </Link>
            </li>
          ))}
          {!topSup.length && <li className="text-[0.8125rem] text-slate-400">Abhi koi nahi</li>}
        </ul>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-[0.8125rem] font-semibold text-slate-800">Is mahine zyada khareeda</p>
        <ul className="mt-2 divide-y divide-slate-100">
          {topItems.map((t, i) => (
            <li key={i} className="flex justify-between gap-2 py-1.5 text-[0.8125rem]">
              <span className="truncate text-slate-700">{t.name ?? t.product?.name ?? '—'}</span>
              <span className="shrink-0 tabular-nums text-slate-900">{money(t.totalSpent)}</span>
            </li>
          ))}
          {!topItems.length && <li className="py-1.5 text-[0.8125rem] text-slate-400">Abhi koi nahi</li>}
        </ul>
      </div>
    </div>
  );
}
