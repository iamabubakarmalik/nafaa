/**
 * All purchases and orders: period, status (open orders, part received,
 * received, on credit, returned, cancelled), supplier and search, a page at
 * a time from the server, with totals for the whole filter.
 */

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardList, Filter, PackageCheck, Plus, Search, Truck, Users, Wheat, X } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterMenu, PageHero, heroButton, heroPrimaryButton, resolveRange, type DateRangeValue,
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

  useEffect(() => { const t = setTimeout(() => setQuery(search.trim()), 250); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [range, status, supplierId, query]);

  const period = resolveRange(range, startHour);
  const q: PurchaseListQuery = { ...(period ?? {}), status, supplierId: supplierId || undefined, search: query || undefined, page, limit: 30 };
  const listQ = useQuery({ queryKey: ['purchase-list', q], queryFn: () => purchasesApi.page(q), placeholderData: (prev) => prev });
  const summaryQ = useQuery({ queryKey: ['purchases-summary'], queryFn: purchasesApi.summary, staleTime: 60_000 });
  const suppliersQ = useQuery({ queryKey: ['suppliers', 'picker'], queryFn: () => suppliersApi.list({ status: 'active', sort: 'recent', limit: 500 }), staleTime: 60_000 });
  const s = summaryQ.data;
  const data = listQ.data;

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
