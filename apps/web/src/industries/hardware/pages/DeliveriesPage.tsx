/**
 * Delivery challans: goods going to sites. Open challans (today and late
 * first), part-delivered ones with goods still to send, delivered and
 * cancelled. Counts, search and paging come from the server; CSV and print
 * take the whole filter.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CalendarRange, CheckCircle2, Clock, Download, GraduationCap, ListChecks, PackageCheck, Plus, Receipt, Truck } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { deliveriesApi, type Delivery, type DeliveryQuery, type DeliveryTab } from '../api/deliveries.api';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { CHALLAN_STATUS, OPEN_CHALLAN, qty, shortDate, vehicleLabel } from '../lib/meta';

const LIMIT = 25;
const TABS: Array<{ id: DeliveryTab; label: string; icon: typeof ListChecks }> = [
  { id: 'all', label: 'Sab', icon: ListChecks },
  { id: 'open', label: 'Bhejna / raste me', icon: Truck },
  { id: 'today', label: 'Aaj aur late', icon: Clock },
  { id: 'partial', label: 'Kuch pohancha', icon: PackageCheck },
  { id: 'delivered', label: 'Pohanch gaya', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancel', icon: Ban },
];

async function fetchAll(q: DeliveryQuery) {
  const out: Delivery[] = [];
  for (let page = 1; page <= 40; page++) {
    const res = await deliveriesApi.page({ ...q, page, limit: 100 });
    out.push(...res.items);
    if (out.length >= res.total || !res.items.length) break;
  }
  return out;
}

const late = (d: Delivery) => OPEN_CHALLAN.includes(d.status) && !!d.scheduledDate && new Date(d.scheduledDate).getTime() < new Date().setHours(0, 0, 0, 0);

export default function DeliveriesPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const saleId = params.get('sale') ?? undefined;
  const projectId = params.get('project') ?? undefined;
  const [tab, setTab] = useState<DeliveryTab>(saleId || projectId ? 'all' : 'open');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());
  const range = resolveRange(period, startHour);

  const query: DeliveryQuery = useMemo(() => ({ tab, search: q || undefined, from: range?.from, to: range?.to, saleId, projectId }), [tab, q, range?.from, range?.to, saleId, projectId]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['hardware-deliveries', query, page],
    queryFn: () => deliveriesApi.page({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const c = data?.counts;
  const go = (t: DeliveryTab) => { setTab(t); setPage(1); };
  usePageKeys(searchRef, { n: () => navigate('/hardware/deliveries/new') });

  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(query);
      if (!rows.length) { toast.error('Is filter me koi challan nahi'); return; }
      downloadCsv('challan.csv', [
        ['Challan', 'Tareekh', 'Bill', 'Customer', 'Phone', 'Pata', 'Maal', 'Gaari', 'Driver', 'Bhejne ki tareekh', 'Kiraya', 'Status'],
        ...rows.map((r) => [r.deliveryNumber, r.createdAt.slice(0, 10), r.saleNumber, r.customerName, r.customerPhone, r.deliveryAddress,
          r.items.map((i) => `${i.itemName} x${qty(i.orderedQty)}`).join('; '), [vehicleLabel(r.vehicleType), r.vehicleNumber].filter(Boolean).join(' '),
          r.driverName, r.scheduledDate?.slice(0, 10), r.totalCharges, CHALLAN_STATUS[r.status].label]),
      ]);
      toast.success(`${rows.length} challan CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(query);
    return {
      title: 'Delivery challan', subtitle: label,
      meta: [['Challan', String(rows.length)], ['Kiraya / mazdoori', money(data?.charges ?? 0)]],
      sections: [{
        kind: 'table', title: 'Challan',
        columns: [{ label: 'Challan' }, { label: 'Customer' }, { label: 'Pata', wideOnly: true }, { label: 'Gaari', wideOnly: true }, { label: 'Status' }],
        rows: rows.map((r) => [r.deliveryNumber, r.customerName, r.deliveryAddress, [vehicleLabel(r.vehicleType), r.vehicleNumber].filter(Boolean).join(' '), CHALLAN_STATUS[r.status].label]),
      }],
    };
  };

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Challan — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: Receipt, color: '#2563eb', title: 'Bill se challan', text: 'Bill banne ke baad "Challan banayein" — sirf wahi maal aata hai jo abhi bhejna baqi hai. Aadha aaj, baqi kal alag challan par.' },
            { icon: Truck, color: '#7c3aed', title: 'Gaari aur driver', text: 'Gaari, number aur driver likhein, print kar ke driver ko dein. "Nikal gaya" dabayein.' },
            { icon: PackageCheck, color: '#16a34a', title: 'Pohanch gaya', text: 'Site par jitna utra wo likhein. Kam utra to baqi maal bill par dobara bhejne ke liye aa jata hai.' },
            { icon: Ban, color: '#e11d48', title: 'Stock aur paisa', text: 'Challan stock ya paisa nahi badalta — wo bill ne kar diya. Maal wapas aaye to Sales se Return karein.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'naya challan'], ['G', 'guide']]} />
      )}

      <PageHero title="Delivery challan" chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !c}
        meta="Site par maal — bill se challan, aadhi aur poori delivery"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/hardware/deliveries/new" className={heroPrimaryButton}><Plus className="h-4 w-4" />Naya challan</Link>
        </>}
        stats={[
          { label: 'Bhejna / raste me', value: String(c?.open ?? 0) },
          { label: 'Aaj aur late', value: String(c?.today ?? 0) },
          { label: 'Kiraya / mazdoori', value: money(data?.charges ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Clock} color="#d97706" label="Aaj aur late" value={c.today} hint="Gaari tayyar karein" onClick={() => go('today')} active={tab === 'today'} />
            <KpiCard icon={Truck} color="#7c3aed" label="Bhejna / raste me" value={c.open} onClick={() => go('open')} active={tab === 'open'} />
            <KpiCard icon={PackageCheck} color="#ea580c" label="Kuch pohancha" value={c.partial} hint="Baqi maal bhejna hai" onClick={() => go('partial')} active={tab === 'partial'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Pohanch gaya" value={c.delivered} onClick={() => go('delivered')} active={tab === 'delivered'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Challan number, customer, pata, gaari, driver ya item…" />}
        chips={search.trim() || saleId || projectId ? <>
          {saleId && <FilterChip onRemove={() => navigate('/hardware/deliveries')}>Ek bill</FilterChip>}
          {projectId && <FilterChip onRemove={() => navigate('/hardware/deliveries')}>Ek site</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); if (saleId || projectId) navigate('/hardware/deliveries'); }}>
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label="Date" />
      </FilterBar>

      <ViewTabs value={tab} onChange={go} hint={<>Challan par click kar ke kholein</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c ? c[t.id] : null }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Truck className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || tab !== 'all' ? 'Is filter me koi challan nahi' : 'Abhi koi challan nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Bill ke baad site par maal bhejna ho to challan banayein.</p>
            <Link to="/hardware/deliveries/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />Naya challan</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const st = CHALLAN_STATUS[r.status];
              return (
                <li key={r.id}>
                  <Link to={`/hardware/deliveries/${r.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5 lg:grid-cols-[9rem_minmax(0,1.2fr)_minmax(0,1.5fr)_minmax(0,1fr)_9rem] lg:items-center">
                    <div>
                      <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.deliveryNumber}</p>
                      <p className="text-[0.75rem] text-slate-500">{r.saleNumber ? `Bill ${r.saleNumber}` : 'Bill ke bagair'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{r.customerName}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{r.deliveryAddress}</p>
                    </div>
                    <p className="min-w-0 truncate text-[0.8125rem] text-slate-600">{r.items.map((i) => `${i.itemName} ×${qty(i.orderedQty)}`).join(', ')}</p>
                    <div className="min-w-0 text-[0.8125rem]">
                      <p className="truncate text-slate-700">{[vehicleLabel(r.vehicleType), r.vehicleNumber].filter(Boolean).join(' · ')}</p>
                      <p className={cn('truncate text-[0.75rem]', late(r) ? 'font-semibold text-rose-600' : 'text-slate-500')}>{r.scheduledDate ? `${late(r) ? 'Late · ' : ''}${shortDate(r.scheduledDate)}${r.scheduledTime ? ` ${r.scheduledTime}` : ''}` : 'Tareekh tay nahi'}</p>
                    </div>
                    <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 lg:justify-self-end', st.tone)}>{st.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {data && data.total > LIMIT && (
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-[0.8125rem] text-slate-600">
            <span>{(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, data.total)} / {data.total}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Pichla</button>
              <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-8 rounded-lg px-3 font-semibold ring-1 ring-slate-200 disabled:opacity-40">Agla</button>
            </div>
          </footer>
        )}
      </section>
    </PageShell>
  );
}
