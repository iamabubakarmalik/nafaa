/**
 * Load sheets: one per van trip. Lists open, out and settled sheets with the
 * trip's value and cash (expected, handed in, short or excess). New sheets
 * are made from invoiced orders.
 *
 * Keys: N new · 1-4 tabs · ↑↓ move · Enter open.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, ClipboardCheck, Plus, RefreshCw, Truck } from 'lucide-react';
import {
  Button, DateRangeMenu, Kbd, PageHero, PageShell, Skeleton, Table, TBody, Td, Th, THead, Tr, ViewTabs,
  heroIconButton, heroPrimaryButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { PERMISSIONS } from '@core/lib/permissions';
import { usePermission } from '@core/hooks/usePermission';
import { useBusinessDayStart } from '@core/lib/business-day';
import { isDialogOpen } from '@core/lib/shortcuts';
import { DIST_KEY, distributionApi, type LoadSheetStatus } from '../api/distribution.api';
import { DistributionGate } from '../components/DistributionGate';
import { useMoney } from '../hooks/useDistribution';
import { LoadSheetModal } from '../components/LoadSheetModal';
import { Empty, Pill } from '../components/parts';
import { dayLabel, rs, SHEET_STATUS, typingInField } from '../lib/meta';

type Tab = LoadSheetStatus | 'ALL';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'OPEN', label: 'Tayyar ho rahi' }, { id: 'DISPATCHED', label: 'Raste me' }, { id: 'SETTLED', label: 'Settle' }, { id: 'ALL', label: 'Sab' },
];

export default function LoadSheetsPage() {
  return <DistributionGate><Sheets /></DistributionGate>;
}

function Sheets() {
  const navigate = useNavigate();
  const startHour = useBusinessDayStart();
  const money = useMoney();
  const canLoad = usePermission(PERMISSIONS.DISTRIBUTION_LOADSHEETS_MANAGE);
  const canSettle = usePermission(PERMISSIONS.DISTRIBUTION_SETTLE);
  const [tab, setTab] = useState<Tab>('ALL');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const [page, setPage] = useState(1);
  const [cursor, setCursor] = useState(0);
  const [creating, setCreating] = useState(false);
  const period = resolveRange(range, startHour);
  useEffect(() => { setPage(1); setCursor(0); }, [tab, range]);

  const q = useQuery({
    queryKey: [DIST_KEY, 'sheets', tab, period, page],
    queryFn: () => distributionApi.loadSheets({ status: tab === 'ALL' ? undefined : tab, from: period?.from, to: period?.to, page, limit: 30 }),
    placeholderData: keepPreviousData,
  });
  const toLoadQ = useQuery({ queryKey: [DIST_KEY, 'orders', 'to-load'], queryFn: () => distributionApi.orders({ status: 'INVOICED', unloaded: true, limit: 200 }) });
  const sheets = q.data?.sheets ?? [];
  const total = q.data?.total ?? 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || typingInField() || isDialogOpen()) return;
      if ((e.key === 'n' || e.key === 'N') && canLoad) { e.preventDefault(); setCreating(true); }
      else if (/^[1-4]$/.test(e.key)) setTab(TABS[Number(e.key) - 1].id);
      else if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); setCursor((c) => Math.min(c + 1, sheets.length - 1)); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === 'Enter' && sheets[cursor]) navigate(`/distribution/load-sheets/${sheets[cursor].id}`);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canLoad, sheets, cursor, navigate]);

  const toLoad = toLoadQ.data;

  return (
    <PageShell>
      <PageHero
        back="/distribution" backLabel="Distribution"
        title="Load sheets"
        chip={<><Truck /> Gaari ki trip</>}
        meta="Invoiced orders gaari par — maal ki list, delivery aur wapsi ke baad cash ka hisaab"
        busy={q.isFetching && !q.isLoading}
        loading={q.isLoading}
        actions={<>
          <button type="button" onClick={() => void q.refetch()} title="Taaza karein" aria-label="Taaza karein" className={heroIconButton}><RefreshCw className={cn('h-4 w-4', q.isFetching && 'animate-spin')} /></button>
          {canLoad && <button type="button" onClick={() => setCreating(true)} title="Nayi load sheet (N)" className={heroPrimaryButton}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Nayi load sheet</span></button>}
        </>}
        stats={[
          { label: 'Load baqi', value: toLoad ? String(toLoad.total) : '—', hint: toLoad ? money(toLoad.totalValue) : undefined },
          { label: 'Sheets', value: q.data ? String(total) : '—' },
        ]}
      />

      {toLoad && toLoad.total > 0 && canLoad && (
        <button type="button" onClick={() => setCreating(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3 text-left ring-1 ring-violet-200 hover:bg-violet-100/70">
          <ClipboardCheck className="h-5 w-5 shrink-0 text-violet-700" />
          <span className="min-w-0 flex-1 text-[0.875rem] text-violet-900"><b>{toLoad.total} Invoiced orders</b> ({money(toLoad.totalValue)}) abhi kisi load sheet par nahi</span>
          <span className="hidden items-center gap-1 text-[0.8125rem] font-semibold text-violet-800 sm:inline-flex">Load sheet banayein <ArrowRight className="h-4 w-4" /></span>
        </button>
      )}

      <ViewTabs value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t.id, label: t.label, count: t.id === tab ? total : null }))}
        right={<div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[0.75rem] text-slate-500 lg:inline-flex">{canLoad && <><Kbd>N</Kbd> nayi · </>}<Kbd>1</Kbd>-<Kbd>4</Kbd> tabs · <Kbd>Enter</Kbd> kholein</span>
          <DateRangeMenu value={range} onChange={setRange} startHour={startHour} defaultPreset="all" />
        </div>} />

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
          : !sheets.length ? <Empty icon={<Truck className="h-5 w-5" />} text="Is filter me koi load sheet nahi." action={canLoad ? <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>Nayi load sheet</Button> : undefined} />
            : <>
              <div className="hidden overflow-x-auto md:block">
                <Table minWidth="56rem" className="[&_table]:text-[0.8125rem]">
                  <THead className="text-left text-[0.6875rem] font-semibold uppercase tracking-wide text-slate-400">
                    <Tr>
                      <Th className="px-4 py-2 sm:px-5">Sheet</Th>
                      <Th className="px-3 py-2">Route · Gaari</Th>
                      <Th className="px-3 py-2 text-right">Invoices</Th>
                      <Th className="px-3 py-2 text-right">Value</Th>
                      <Th className="px-3 py-2 text-right">Cash</Th>
                      <Th className="px-3 py-2">Halat</Th>
                      <Th className="px-4 py-2 sm:px-5" />
                    </Tr>
                  </THead>
                  <TBody className="divide-y divide-slate-100">
                    {sheets.map((s, i) => (
                      <Tr key={s.id} onClick={() => navigate(`/distribution/load-sheets/${s.id}`)}
                        className={cn('cursor-pointer hover:bg-slate-50/80', i === cursor && 'bg-brand-50/50 shadow-[inset_3px_0_0] shadow-brand-500')}>
                        <Td className="px-4 py-2.5 sm:px-5">
                          <div className="font-semibold text-slate-900">{s.number}</div>
                          <div className="whitespace-nowrap text-[0.75rem] text-slate-500">{dayLabel(s.date)}</div>
                        </Td>
                        <Td className="max-w-[16rem] px-3 py-2.5">
                          <div className="truncate text-slate-800">{s.routeName ?? 'Mili juli'}</div>
                          <div className="truncate text-[0.75rem] text-slate-500">{[s.deliveryUserName, s.driverName, s.vehicleNo].filter(Boolean).join(' · ') || 'Delivery wala nahi lagaya'}</div>
                        </Td>
                        <Td className="px-3 py-2.5 text-right tabular-nums">{s.invoiceCount}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{money(s.totalValue)}
                          {s.returnsValue > 0 && <div className="whitespace-nowrap text-[0.6875rem] font-normal text-rose-600">wapas {rs(s.returnsValue)}</div>}</Td>
                        <Td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                          {s.status === 'SETTLED' ? <>
                            <div className="text-slate-800">{rs(s.handedIn ?? 0)} <span className="text-slate-400">/ {rs(s.expectedCash)}</span></div>
                            {s.shortAmount !== 0 && <div className={cn('text-[0.6875rem] font-semibold', s.shortAmount > 0 ? 'text-rose-600' : 'text-success-700')}>{s.shortAmount > 0 ? 'Kam' : 'Zyada'} {rs(Math.abs(s.shortAmount))}</div>}
                          </> : <span className="text-slate-400">—</span>}
                        </Td>
                        <Td className="px-3 py-2.5"><Pill tone={SHEET_STATUS[s.status].tone}>{SHEET_STATUS[s.status].label}</Pill></Td>
                        <Td className="px-4 py-2.5 text-right sm:px-5" onClick={(e) => e.stopPropagation()}>
                          {canSettle && (s.status === 'DISPATCHED' || s.status === 'OPEN')
                            ? <Link to={`/distribution/load-sheets/${s.id}/settle`}><Button size="sm" variant={s.status === 'DISPATCHED' ? 'primary' : 'secondary'}>Settle</Button></Link>
                            : <ArrowRight className="ml-auto h-4 w-4 text-slate-300" />}
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {sheets.map((s) => (
                  <li key={s.id}>
                    <Link to={`/distribution/load-sheets/${s.id}`} className="block px-4 py-3">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[0.875rem] font-semibold text-slate-900">{s.number} <span className="font-normal text-slate-500">· {dayLabel(s.date)}</span></span>
                        <Pill tone={SHEET_STATUS[s.status].tone}>{SHEET_STATUS[s.status].label}</Pill>
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-slate-500">{s.routeName ?? 'Mili juli'} · {s.invoiceCount} invoices · {[s.deliveryUserName, s.vehicleNo].filter(Boolean).join(' · ')}</span>
                      <span className="mt-1 flex items-center justify-between text-[0.8125rem]">
                        <span className="font-semibold tabular-nums text-slate-900">{money(s.totalValue)}</span>
                        {s.status === 'SETTLED' && s.shortAmount !== 0 && <span className={cn('text-[0.75rem] font-semibold', s.shortAmount > 0 ? 'text-rose-600' : 'text-success-700')}>{s.shortAmount > 0 ? 'Kam' : 'Zyada'} {rs(Math.abs(s.shortAmount))}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {total > 30 && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-[0.8125rem] text-slate-600 sm:px-5">
                  <span>{(page - 1) * 30 + 1}–{Math.min(page * 30, total)} / {total}</span>
                  <span className="flex gap-2">
                    <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Pichla</Button>
                    <Button size="sm" variant="secondary" disabled={page * 30 >= total} onClick={() => setPage(page + 1)}>Agla</Button>
                  </span>
                </div>
              )}
            </>}
      </section>

      {creating && <LoadSheetModal onClose={() => setCreating(false)} />}
    </PageShell>
  );
}
