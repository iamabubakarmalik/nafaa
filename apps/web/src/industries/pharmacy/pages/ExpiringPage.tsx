/**
 * Expiry list: every batch with stock, by how soon it expires, with the
 * money at stake at cost and at sale price. A batch can go back to the
 * distributor it came from or be written off. Search, sort and paging run
 * on the server; CSV and print take the whole filter.
 */

import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertOctagon, ArrowDownWideNarrow, CalendarClock, CalendarX, Clock, Download, FileText, GraduationCap, Hourglass,
  PackageX, ShieldAlert, Snowflake, Truck,
} from 'lucide-react';
import {
  FilterBar, FilterChip, FilterMenu, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs, heroButton, heroIconButton,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { downloadCsv } from '@core/lib/csv';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { expiryApi, type ExpiryBucket, type ExpiryRow, type ExpirySort } from '../api/expiry.api';
import { ExpiryActionModal } from '../components/ExpiryActionModal';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { daysLabel, shortDate } from '../lib/meta';

const LIMIT = 50;
const BUCKETS: Array<{ id: ExpiryBucket; label: string; icon: typeof CalendarX }> = [
  { id: 'expired', label: 'Expire ho chuki', icon: CalendarX },
  { id: '30', label: '30 din', icon: AlertOctagon },
  { id: '90', label: '90 din', icon: Clock },
  { id: '180', label: '6 mahine', icon: Hourglass },
  { id: 'all', label: 'Sab batch', icon: CalendarClock },
];
const SORTS: Array<{ value: ExpirySort; label: string }> = [
  { value: 'soon', label: 'Pehle expire hone wale' }, { value: 'value', label: 'Zyada value pehle' }, { value: 'name', label: 'Naam se' },
];

const tone = (d: number) => (d < 0 ? 'bg-rose-600 text-white' : d <= 30 ? 'bg-rose-50 text-rose-700' : d <= 90 ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600');

async function fetchAll(bucket: ExpiryBucket, search: string, sort: ExpirySort) {
  const out: ExpiryRow[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await expiryApi.list({ bucket, search: search || undefined, sort, page, limit: 200 });
    out.push(...res.items);
    if (out.length >= res.total || !res.items.length) break;
  }
  return out;
}

export default function ExpiringPage() {
  const qc = useQueryClient();
  const { cost, sales: money } = useMasked();
  const guide = usePageGuide();
  const canReturn = usePermission(PERMISSIONS.PURCHASES_CREATE);
  const canWriteOff = usePermission(PERMISSIONS.STOCK_ADJUSTMENTS_MANAGE);
  const canAct = canReturn || canWriteOff;
  const searchRef = useRef<HTMLInputElement>(null);
  const [bucket, setBucket] = useState<ExpiryBucket>('90');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ExpirySort>('soon');
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<ExpiryRow | null>(null);
  const [exporting, setExporting] = useState(false);
  const q = useDebounced(search.trim());

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['pharmacy-expiry', bucket, q, sort, page],
    queryFn: () => expiryApi.list({ bucket, search: q || undefined, sort, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
  });
  const t = data?.totals;
  const pick = (b: ExpiryBucket) => { setBucket(b); setPage(1); };
  usePageKeys(searchRef, { e: () => pick('expired'), '3': () => pick('30'), '9': () => pick('90') });

  const label = BUCKETS.find((b) => b.id === bucket)?.label ?? '';
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(bucket, q, sort);
      if (!rows.length) { toast.error('Is filter me koi batch nahi'); return; }
      downloadCsv(`expiry-${bucket}.csv`, [
        ['Dawai', 'Formula', 'Batch', 'Expiry', 'Din', 'Stock', 'Unit', 'Cost value', 'Sale value', 'Branch'],
        ...rows.map((r) => [r.product.name, r.generic, r.batchNumber, r.expiryDate.slice(0, 10), r.daysLeft, r.quantity, r.product.unit, r.value, r.saleValue, r.shop?.name ?? '']),
      ]);
      toast.success(`${rows.length} batch CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(bucket, q, sort);
    return {
      title: 'Expiry list', subtitle: label,
      meta: [['Batch', String(rows.length)], ['Cost value', cost(rows.reduce((s, r) => s + r.value, 0))]],
      sections: [{
        kind: 'table', title: 'Batch',
        columns: [{ label: 'Dawai' }, { label: 'Batch' }, { label: 'Expiry' }, { label: 'Stock', align: 'right' }, { label: 'Cost', align: 'right', wideOnly: true }],
        rows: rows.map((r) => [r.product.name, r.batchNumber, `${shortDate(r.expiryDate)} (${daysLabel(r.daysLeft)})`, `${r.quantity} ${r.product.unit}`, cost(r.value)]),
      }],
    };
  };
  const done = () => {
    setAction(null);
    ['pharmacy-expiry', 'pharmacy-expiry-source', 'products', 'products-for-pos', 'pharmacy-dashboard', 'pharmacy-expiring'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
  };

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <PageShell>
      {action && <ExpiryActionModal row={action} onDone={done} onClose={() => setAction(null)} />}
      {guide.isOpen && (
        <PageGuide title="Expiry — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: CalendarX, color: '#e11d48', title: 'Expire ho chuki', text: 'Ye dawai bechna mana hai. POS khud pehle theek batch bechta hai, magar shelf se inhe hata dein.' },
            { icon: AlertOctagon, color: '#d97706', title: '30 aur 90 din', text: 'Jaldi expire hone wale batch pehle bechein, ya waqt par distributor ko wapas karein — zyada tar distributor 3 mahine pehle tak wapas lete hain.' },
            { icon: Truck, color: '#0891b2', title: 'Distributor ko wapas', text: 'Batch par "Kya karein" dabayein. Jis purchase par ye aaya tha wahi chunein — stock aur distributor ka khata dono kam ho jate hain.' },
            { icon: PackageX, color: '#64748b', title: 'Kharab likhein', text: 'Jo wapas nahi ho sakta use kharab likh dein — stock kam hota hai aur nuqsan reports me aata hai.' },
          ]}
          shortcuts={[['/', 'search'], ['E', 'expired'], ['3', '30 din'], ['9', '90 din'], ['G', 'guide']]} />
      )}

      <PageHero title="Expiry" chip={<><CalendarClock />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !t}
        meta="Batch aur expiry — sirf jin ka stock hai"
        actions={<>
          <Link to="/purchases" className={heroButton}><Truck className="h-4 w-4" /><span className="hidden sm:inline">Purchases</span></Link>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
        </>}
        stats={[
          { label: `Expire ho chuki · ${t?.expired.batches ?? 0} batch`, value: cost(t?.expired.cost ?? 0), hint: 'cost' },
          { label: `30 din me · ${t?.d30.batches ?? 0} batch`, value: cost(t?.d30.cost ?? 0) },
          { label: `90 din me · ${t?.d90.batches ?? 0} batch`, value: cost(t?.d90.cost ?? 0) },
          { label: 'Bechne par (90 din)', value: money(t?.d90.sale ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!t ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={CalendarX} color="#e11d48" label="Expire ho chuki" value={`${t.expired.batches} batch`} hint={`${Number(t.expired.qty.toFixed(2))} cheezein · dabayein`} onClick={() => pick('expired')} active={bucket === 'expired'} />
            <KpiCard icon={AlertOctagon} color="#ea580c" label="30 din me" value={`${t.d30.batches} batch`} hint={cost(t.d30.cost)} onClick={() => pick('30')} active={bucket === '30'} />
            <KpiCard icon={Clock} color="#d97706" label="90 din me" value={`${t.d90.batches} batch`} hint={cost(t.d90.cost)} onClick={() => pick('90')} active={bucket === '90'} />
            <KpiCard icon={Hourglass} color="#0891b2" label="6 mahine me" value={`${t.d180.batches} batch`} hint={cost(t.d180.cost)} onClick={() => pick('180')} active={bucket === '180'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Dawai, formula, batch number ya barcode…" />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => { setSearch(''); setSort('soon'); }}>
        <FilterMenu icon={ArrowDownWideNarrow} label="Sort" value={sort} options={SORTS} onChange={(v) => { setSort(v); setPage(1); }} align="right" width="w-56" />
      </FilterBar>

      <ViewTabs value={bucket} onChange={pick}
        tabs={BUCKETS.map((b) => ({ id: b.id, label: b.label, icon: b.icon, count: b.id === bucket ? data?.total ?? null : null }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><CalendarClock className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search ? 'Is search me koi batch nahi' : bucket === 'expired' ? 'Koi expire dawai shelf par nahi' : 'Is muddat me koi batch expire nahi ho raha'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Purchase me batch number aur expiry likhenge to yahan dikhegi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-[0.875rem]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5">Dawai</th><th className="px-3 py-2.5">Batch</th><th className="px-3 py-2.5">Expiry</th>
                  <th className="px-3 py-2.5 text-right">Stock</th><th className="px-3 py-2.5 text-right">Cost value</th><th className="px-3 py-2.5 text-right">Sale value</th><th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((r) => (
                  <tr key={r.id} className={cn(r.daysLeft < 0 && 'bg-rose-50/40')}>
                    <td className="px-5 py-2.5">
                      <Link to={`/pharmacy-medicines/${r.product.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{r.product.name}</Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[0.75rem] text-slate-500">
                        {r.generic && <span>{r.generic}</span>}
                        {r.medicine?.isNarcotic && <span className="inline-flex items-center gap-0.5 font-semibold text-rose-700"><ShieldAlert className="h-3 w-3" />Register</span>}
                        {r.medicine?.requiresPrescription && !r.medicine.isNarcotic && <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700"><FileText className="h-3 w-3" />Rx</span>}
                        {r.medicine?.requiresColdChain && <span className="inline-flex items-center gap-0.5 font-semibold text-sky-700"><Snowflake className="h-3 w-3" />Fridge</span>}
                        {r.shop && <span>· {r.shop.name}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[0.8125rem] text-slate-700">{r.batchNumber}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-slate-800">{shortDate(r.expiryDate)}</div>
                      <span className={cn('mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold', tone(r.daysLeft))}>{daysLabel(r.daysLeft)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{Number(r.quantity.toFixed(2))} <span className="text-slate-500">{r.product.unit}</span></td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{cost(r.value)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{money(r.saleValue)}</td>
                    <td className="px-5 py-2.5 text-right">
                      {canAct && <button type="button" onClick={() => setAction(r)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[0.75rem] font-semibold text-white hover:bg-slate-800">Kya karein</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
