/**
 * Repair desk: bat repair, grip, racket stringing, ball and shoe work.
 * Jobs in hand (late first), ready to collect, with advance, and done.
 * Views, counts, search and paging come from the server; CSV and print
 * take the whole filter.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlarmClock, CalendarRange, CheckCircle2, ClipboardList, Download, GraduationCap, Hammer, ListChecks, PackageCheck, Plus, Wallet, Wrench,
} from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, KpiCard, KpiRow, PageHero, PageShell, SearchField, Skeleton, ViewTabs,
  heroButton, heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { downloadCsv } from '@core/lib/csv';
import { rangeLabel } from '@core/lib/dateRange';
import { useBusinessDayStart } from '@core/lib/business-day';
import { usePermission } from '@core/hooks/usePermission';
import { PERMISSIONS } from '@core/lib/permissions';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { PrintButton } from '@core/print/PrintButton';
import type { PrintDoc } from '@core/print/types';
import { useMasked } from '@modules/dashboard/engine/useMasked';
import { repairServicesApi, type RepairQuery, type RepairView, type SportsRepairService } from '../api/repair-services.api';
import { REPAIR_KEY, REPAIR_STATUS, dayOnly } from '../components/meta';
import { NewRepairModal, RepairModal } from '../components/RepairModals';
import { EmptyBlock, Pager, StatusPill, card, fetchAll, useDebounced, useListKeys } from '../components/ui';
import { t as tr } from '@core/i18n';

const LIMIT = 25;
const TABS: Array<{ id: RepairView; label: string; icon: typeof ListChecks }> = [
  { id: 'active', label: tr('Chalu'), icon: ListChecks },
  { id: 'work', label: tr('Kaam baqi'), icon: Hammer },
  { id: 'ready', label: tr('Tayyar — le jana'), icon: PackageCheck },
  { id: 'late', label: tr('Late'), icon: AlarmClock },
  { id: 'advance', label: tr('Advance wali'), icon: Wallet },
  { id: 'done', label: tr('De di / cancel'), icon: CheckCircle2 },
  { id: 'all', label: tr('Sab'), icon: ClipboardList },
];

const isLate = (r: SportsRepairService) => ['RECEIVED', 'IN_PROGRESS', 'ON_HOLD'].includes(r.status) && !!r.estimatedReadyAt && new Date(r.estimatedReadyAt).getTime() < Date.now();

export default function RepairServicesPage() {
  const startHour = useBusinessDayStart();
  const { sales: money } = useMasked();
  const guide = usePageGuide();
  const canCreate = usePermission(PERMISSIONS.POS_USE);
  const searchRef = useRef<HTMLInputElement>(null);
  const [params] = useSearchParams();
  const [tab, setTab] = useState<RepairView>(params.get('q') ? 'all' : 'active');
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [period, setPeriod] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);
  const term = useDebounced(search.trim());
  const range = resolveRange(period, startHour);

  const query: RepairQuery = useMemo(() => ({ view: tab, search: term || undefined, from: range?.from, to: range?.to }), [tab, term, range?.from, range?.to]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [REPAIR_KEY, 'page', query, page],
    queryFn: () => repairServicesApi.page({ ...query, page, limit: LIMIT }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const c = data?.counts;
  const go = (t: RepairView) => { setTab(t); setPage(1); };
  const add = useCallback(() => { if (canCreate) setAdding(true); }, [canCreate]);
  useListKeys(searchRef, add);

  const label = range ? rangeLabel(range.from, range.to) : tr('Sab waqt');
  const all = () => fetchAll((p) => repairServicesApi.page({ ...query, page: p, limit: 100 }));
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await all();
      if (!rows.length) { toast.error(tr('Is filter me koi repair nahi')); return; }
      downloadCsv('repairs.csv', [
        [tr('Number'), tr('Jama'), tr('Customer'), tr('Phone'), tr('Cheez'), tr('Brand'), tr('Kaam'), tr('Masla'), tr('Tayyar kab'), tr('Andaza'), tr('Charge'), tr('Advance'), tr('Status')],
        ...rows.map((r) => [r.serviceNumber, r.receivedAt.slice(0, 10), r.customerName, r.customerPhone, r.itemType, r.itemBrand, r.repairType, r.issue,
          r.estimatedReadyAt?.slice(0, 10), r.estimatedCost, r.finalCost, r.advancePaid, REPAIR_STATUS[r.status]?.label]),
      ]);
      toast.success(tr('{{count}} repairs CSV me', { count: rows.length }));
    } catch { toast.error(tr('Export nahi hua')); } finally { setExporting(false); }
  };
  const printDoc = async (): Promise<PrintDoc> => {
    const rows = await all();
    return {
      title: tr('Repairs'), subtitle: `${TABS.find((t) => t.id === tab)?.label} · ${label}`,
      meta: [[tr('Repairs'), String(rows.length)], [tr('Value'), money(data?.totals.value ?? 0)], [tr('Advance'), money(data?.totals.advance ?? 0)]],
      sections: [{
        kind: 'table', title: tr('Repairs'),
        columns: [{ label: tr('Number') }, { label: tr('Customer') }, { label: tr('Cheez / kaam'), wideOnly: true }, { label: tr('Tayyar'), wideOnly: true }, { label: tr('Status') }],
        rows: rows.map((r) => [r.serviceNumber, `${r.customerName} ${r.customerPhone}`, `${r.itemType} · ${r.repairType ?? r.issue}`, dayOnly(r.estimatedReadyAt), REPAIR_STATUS[r.status]?.label ?? r.status]),
      }],
    };
  };

  const items = data?.items ?? [];
  return (
    <PageShell>
      {guide.isOpen && (
        <PageGuide title={tr('Repairs — aasaan tareeqa')} onClose={guide.close}
          steps={[
            { icon: Wrench, color: '#2563eb', title: tr('Jama karein'), text: tr('Customer, phone, kya cheez aur kya kaam. Haalat aur photo likhein taake baad me jhagra na ho. Parchi print kar ke dein.') },
            { icon: Wallet, color: '#16a34a', title: tr('Advance'), text: tr('Advance customer ke khate me jama hota hai aur aaj ke cash me ginta hai.') },
            { icon: Hammer, color: '#7c3aed', title: tr('Kaam'), text: tr('Kaam shuru → Tayyar. Tayyar par WhatsApp se customer ko batayein.') },
            { icon: PackageCheck, color: '#ea580c', title: tr('Deliver + bill'), text: tr('Kaam ka charge aur stock se lagi string / grip ek bill me. Advance bill me lag jata hai, baqi udhaar khate me.') },
          ]}
          shortcuts={[['/', tr('search')], ['N', tr('nayi repair')], ['G', tr('guide')]]} />
      )}

      <PageHero title={tr('Repairs')} chip={<><CalendarRange />{label}</>} busy={isFetching && !isLoading} loading={isLoading || !c}
        meta={tr('Bat repair, grip, racket stringing, ball silai — jama se deliver tak')}
        actions={<>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className={heroButton}><Download className="h-4 w-4" />{exporting ? tr('Ban raha…') : tr('CSV')}</button>
          <span className="[&_button]:border-white/25 [&_button]:bg-white [&_button]:text-slate-800"><PrintButton doc={printDoc} label={tr('Print')} /></span>
          <button type="button" onClick={guide.open} title={tr('Guide (G)')} className={heroIconButton}><GraduationCap className="h-4 w-4" /></button>
          {canCreate && <button type="button" onClick={add} className={heroPrimaryButton}><Plus className="h-4 w-4" />{tr('Nayi repair')}</button>}
        </>}
        stats={[
          { label: tr('Is filter ki value'), value: money(data?.totals.value ?? 0) },
          { label: tr('Advance (hath me)'), value: money(data?.totals.advance ?? 0) },
          { label: tr('Lena baqi'), value: money(data?.totals.due ?? 0) },
        ]} />

      <KpiRow cols={4}>
        {!c ? Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[5.25rem] rounded-2xl" />) : (
          <>
            <KpiCard icon={Hammer} color="#7c3aed" label={tr('Kaam baqi')} value={c.work} onClick={() => go('work')} active={tab === 'work'} />
            <KpiCard icon={AlarmClock} color="#e11d48" label={tr('Late')} value={c.late} hint={tr('Batayi date guzar gayi')} onClick={() => go('late')} active={tab === 'late'} />
            <KpiCard icon={PackageCheck} color="#16a34a" label={tr('Tayyar — le jana')} value={c.ready} hint={tr('Customer ko batayein')} onClick={() => go('ready')} active={tab === 'ready'} />
            <KpiCard icon={Wallet} color="#d97706" label={tr('Advance wali')} value={c.advance} onClick={() => go('advance')} active={tab === 'advance'} />
          </>
        )}
      </KpiRow>

      <FilterBar
        search={<SearchField ref={searchRef} value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={tr('Number, customer, phone, cheez ya brand…')} />}
        chips={search.trim() ? <FilterChip onRemove={() => setSearch('')}>"{search.trim()}"</FilterChip> : undefined}
        onClear={() => setSearch('')}>
        <DateRangeMenu value={period} onChange={(v) => { setPeriod(v); setPage(1); }} startHour={startHour} label={tr('Jama ki date')} />
      </FilterBar>

      <ViewTabs value={tab} onChange={go} hint={<>{tr('Repair par click kar ke kholein')}</>}
        tabs={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, count: c ? c[t.id] : null }))} />

      <section className={card}>
        {isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <EmptyBlock icon={Wrench} title={search || tab !== 'active' ? tr('Is filter me koi repair nahi') : tr('Abhi koi repair hath me nahi')}
            text={tr('Bat, racket ya ball repair ke liye aaye to yahan jama karein aur parchi dein.')}
            action={canCreate ? <button type="button" onClick={add} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[0.875rem] font-semibold text-brand-fg"><Plus className="h-4 w-4" />{tr('Nayi repair')}</button> : undefined} />
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((r) => {
              const st = REPAIR_STATUS[r.status];
              const late = isLate(r);
              const value = r.finalCost || r.estimatedCost;
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpenId(r.id)}
                    className="grid w-full gap-2 px-4 py-3 text-start hover:bg-slate-50 sm:px-5 lg:grid-cols-[9rem_minmax(0,1.1fr)_minmax(0,1.6fr)_8rem_9rem_9rem] lg:items-center">
                    <div>
                      <p className="font-mono text-[0.8125rem] font-semibold text-slate-900">{r.serviceNumber}</p>
                      <p className="text-[0.75rem] text-slate-500">{dayOnly(r.receivedAt)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{r.customerName}</p>
                      <p className="truncate text-[0.75rem] text-slate-500">{r.customerPhone}</p>
                    </div>
                    <div className="min-w-0 text-[0.8125rem]">
                      <p className="truncate font-medium text-slate-800">{tr(r.itemType)}{r.itemBrand ? ` · ${r.itemBrand}` : ''}</p>
                      <p className="truncate text-slate-500">{r.repairType ? `${tr(r.repairType)} — ` : ''}{r.issue}</p>
                    </div>
                    <p className={cn('text-[0.8125rem]', late ? 'font-semibold text-rose-600' : 'text-slate-600')}>
                      {r.estimatedReadyAt ? `${late ? 'Late · ' : ''}${dayOnly(r.estimatedReadyAt)}` : tr('Date tay nahi')}
                    </p>
                    <div className="text-[0.8125rem] lg:text-end">
                      <p className="font-semibold tabular-nums text-slate-900">{value ? money(value) : '—'}</p>
                      {r.advancePaid > 0 && <p className="tabular-nums text-emerald-700">{tr('Advance {{advancePaid}}', { advancePaid: money(r.advancePaid) })}</p>}
                    </div>
                    <span className="lg:justify-self-end"><StatusPill tone={st.tone}>{st.label}</StatusPill></span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {data && <Pager page={page} limit={LIMIT} total={data.total} onPage={setPage} />}
      </section>

      {adding && <NewRepairModal onClose={() => setAdding(false)} onCreated={(id) => { setAdding(false); setOpenId(id); }} />}
      {openId && <RepairModal id={openId} onClose={() => setOpenId(null)} />}
    </PageShell>
  );
}
