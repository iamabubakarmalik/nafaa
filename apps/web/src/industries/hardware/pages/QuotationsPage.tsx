/**
 * Quotations list: open estimates waiting for the customer, accepted ones
 * waiting for a bill, billed, expired and closed. Counts, search and paging
 * come from the server; CSV and print take the whole filter.
 */

import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, CalendarClock, CalendarRange, CheckCircle2, Download, FilePlus, FileText, GraduationCap, ListChecks, Receipt, Send } from 'lucide-react';
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
import { quotationsApi, type Quotation, type QuotationQuery, type QuotationTab } from '../api/quotations.api';
import { useDebounced, usePageKeys } from '../hooks/usePageKeys';
import { QUOTE_STATUS, shortDate } from '../lib/meta';

const LIMIT = 25;
const TABS: Array<{ id: QuotationTab; label: string; icon: typeof ListChecks }> = [
  { id: 'all', label: 'Sab', icon: ListChecks },
  { id: 'open', label: 'Jawab baqi', icon: Send },
  { id: 'accepted', label: 'Maan li', icon: CheckCircle2 },
  { id: 'converted', label: 'Bill ban gaya', icon: Receipt },
  { id: 'expired', label: 'Waqt guzar gaya', icon: CalendarClock },
  { id: 'rejected', label: 'Band', icon: Ban },
];

async function fetchAll(q: QuotationQuery) {
  const out: Quotation[] = [];
  for (let page = 1; page <= 40; page++) {
    const res = await quotationsApi.page({ ...q, page, limit: 100 });
    out.push(...res.items);
    if (out.length >= res.total || !res.items.length) break;
  }
  return out;
}

const daysLeft = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);

export default function QuotationsPage() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<QuotationTab>((params.get('tab') as QuotationTab) || 'all');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const projectId = params.get('project') ?? undefined;
  const q = useDebounced(search.trim());
  const range = resolveRange(period, startHour);

  const query: QuotationQuery = useMemo(() => ({ tab, search: q || undefined, from: range?.from, to: range?.to, projectId }), [tab, q, range?.from, range?.to, projectId]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['hardware-quotations', query, page],
    queryFn: () => quotationsApi.page({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const c = data?.counts;
  const go = (t: QuotationTab) => { setTab(t); setPage(1); };
  usePageKeys(searchRef, { n: () => navigate('/hardware/quotations/new') });

  const label = range ? rangeLabel(range.from, range.to) : 'Sab waqt';
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll(query);
      if (!rows.length) { toast.error('Is filter me koi quotation nahi'); return; }
      downloadCsv('quotations.csv', [
        ['Number', 'Tareekh', 'Customer', 'Phone', 'Site', 'Items', 'Amount', 'Chalegi', 'Status'],
        ...rows.map((r) => [r.quotationNumber, r.createdAt.slice(0, 10), r.customerName, r.customerPhone, r.project?.name, r._count?.items ?? r.items.length, r.total, r.validUntil.slice(0, 10), QUOTE_STATUS[r.status].label]),
      ]);
      toast.success(`${rows.length} quotations CSV me`);
    } catch { toast.error('Export nahi hua'); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await fetchAll(query);
    return {
      title: 'Quotations', subtitle: label,
      meta: [['Quotations', String(rows.length)], ['Jawab baqi', money(data?.values.open ?? 0)], ['Maan li', money(data?.values.accepted ?? 0)]],
      sections: [{
        kind: 'table', title: 'Quotations',
        columns: [{ label: 'Number' }, { label: 'Customer' }, { label: 'Tareekh', wideOnly: true }, { label: 'Status' }, { label: 'Amount', align: 'right' }],
        rows: rows.map((r) => [r.quotationNumber, r.customerName, shortDate(r.createdAt), QUOTE_STATUS[r.status].label, money(r.total)]),
      }],
    };
  };

  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title="Quotations — aasaan tareeqa" onClose={guide.close}
          steps={[
            { icon: FilePlus, color: '#2563eb', title: 'Quotation banayein', text: 'Thekedar ya customer ko rate dena ho to items aur quantity likhein — print ya WhatsApp karein.' },
            { icon: Send, color: '#0891b2', title: 'Jawab ka intezar', text: '"Jawab baqi" me wo quotations jo customer ke paas hain. Call kar ke poochein; badle to nayi revision.' },
            { icon: Receipt, color: '#16a34a', title: 'Bill banayein', text: 'Customer maan le to quotation khol kar "Bill banayein" — cash, card, split ya udhaar. Stock aur khata khud update.' },
            { icon: CalendarClock, color: '#d97706', title: 'Waqt guzar gaya', text: 'Rate purane ho gaye — dobara bhejne se nayi muddat shuru hoti hai.' },
          ]}
          shortcuts={[['/', 'search'], ['N', 'nayi quotation'], ['G', 'guide']]} />
      )}

      <PageHero title="Quotations" chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !c}
        meta="Estimate — customer maan le to ek click me bill"
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? 'Ban raha…' : 'CSV'}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label="Print" /></span>
          <button type="button" onClick={guide.open} title="Guide (G)" className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          <Link to="/hardware/quotations/new" className={heroPrimaryButton}><FilePlus className="h-4 w-4" />Nayi quotation</Link>
        </>}
        stats={[
          { label: 'Jawab baqi', value: money(data?.values.open ?? 0), hint: `${c?.open ?? 0} quotation` },
          { label: 'Maan li, bill baqi', value: money(data?.values.accepted ?? 0) },
          { label: 'Bill ban gaya', value: money(data?.values.converted ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Send} color="#0891b2" label="Jawab baqi" value={c.open} hint="Customer ko call karein" onClick={() => go('open')} active={tab === 'open'} />
            <KpiCard icon={CheckCircle2} color="#16a34a" label="Maan li" value={c.accepted} hint="Ab bill banayein" onClick={() => go('accepted')} active={tab === 'accepted'} />
            <KpiCard icon={Receipt} color="#7c3aed" label="Bill ban gaya" value={c.converted} onClick={() => go('converted')} active={tab === 'converted'} />
            <KpiCard icon={CalendarClock} color="#d97706" label="Waqt guzar gaya" value={c.expired} hint="Dobara bhejein ya band" onClick={() => go('expired')} active={tab === 'expired'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Quotation number, customer, phone ya item…" />}
        chips={search.trim() || projectId ? <>
          {projectId && <FilterChip onRemove={() => navigate('/hardware/quotations')}>Ek site</FilterChip>}
          {search.trim() && <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip>}
        </> : undefined}
        onClear={() => { setSearch(''); if (projectId) navigate('/hardware/quotations'); }}>
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label="Date" />
      </FilterBar>

      <ViewTabs value={tab} onChange={go} hint={<>Quotation par click kar ke kholein</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c ? c[t.id] : null }))} />

      <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><FileText className="h-7 w-7" /></span>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">{search || tab !== 'all' ? 'Is filter me koi quotation nahi' : 'Abhi koi quotation nahi'}</h3>
            <p className="mt-1 text-[0.875rem] text-slate-500">Thekedar rate maange to "Nayi quotation" banayein.</p>
            <Link to="/hardware/quotations/new" className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><FilePlus className="h-4 w-4" />Nayi quotation</Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const st = QUOTE_STATUS[r.status];
              const left = daysLeft(r.validUntil);
              const open = ['DRAFT', 'SENT', 'VIEWED', 'REVISED'].includes(r.status);
              return (
                <li key={r.id}>
                  <Link to={`/hardware/quotations/${r.id}`} className="grid gap-2 px-4 py-3 hover:bg-slate-50 sm:px-5 lg:grid-cols-[9rem_minmax(0,1.2fr)_minmax(0,1.6fr)_9rem_8rem] lg:items-center">
                    <div>
                      <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.quotationNumber}{r.revisionNumber > 0 && <span className="ml-1 text-slate-400">R{r.revisionNumber}</span>}</p>
                      <p className="text-[0.75rem] text-slate-500">{shortDate(r.createdAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{r.customerName}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{[r.customerPhone, r.project?.name].filter(Boolean).join(' · ') || '—'}</p>
                    </div>
                    <p className="min-w-0 truncate text-[0.8125rem] text-slate-600">
                      {r.items.map((i) => i.itemName).join(', ')}{(r._count?.items ?? 0) > r.items.length ? ` +${(r._count?.items ?? 0) - r.items.length}` : ''}
                    </p>
                    <div>
                      <span className={cn('w-fit rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1', st.tone)}>{st.label}</span>
                      {open && <p className={cn('mt-0.5 text-[0.6875rem]', left <= 2 ? 'text-amber-700' : 'text-slate-500')}>{left <= 0 ? 'Aaj aakhri din' : `${left} din baqi`}</p>}
                    </div>
                    <p className="text-right text-[0.9375rem] font-bold tabular-nums text-slate-900">{money(r.total)}</p>
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
