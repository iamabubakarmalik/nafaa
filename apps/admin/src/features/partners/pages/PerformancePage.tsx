/**
 * Partner performance for a period, per partner or per city: visits, leads,
 * signups, activations, paid signups, earnings, the revenue their shops paid
 * Nafaa, and ROI (revenue ÷ earnings). Table with CSV export.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, Banknote, Download, Handshake, Lightbulb, MapPin, Store, TrendingUp, Users } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterMenu, PageHero, PageShell, SearchField, Segmented, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminPartnersApi, type PerformanceRow } from '@/api/admin-partners.api';
import { cn } from '@/lib/cn';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { PARTNER_TYPES, TYPE_LABEL } from '../lib/partner-text';

const SORTS = [
  { value: 'paid', label: 'Paid signups' },
  { value: 'signups', label: 'Signups' },
  { value: 'revenue', label: 'Revenue' },
  { value: 'earnings', label: 'Earnings' },
  { value: 'roi', label: 'ROI' },
  { value: 'visits', label: 'Visits' },
  { value: 'leads', label: 'Leads' },
];

const roiText = (roi: number | null) => (roi == null ? '—' : `${roi.toFixed(1)}×`);

export default function PerformancePage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ group: 'partner', type: 'ALL', sort: 'paid', period: 'thisMonth', from: '', to: '' });
  const { group, type, sort } = list.filters;
  const query = {
    group, sort, type: type === 'ALL' ? undefined : type, search: list.debouncedSearch || undefined, ...periodQuery(list.filters),
  };
  const perf = useQuery({
    queryKey: ['admin', 'partners', 'performance', query, list.page, list.limit],
    queryFn: () => adminPartnersApi.performance({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = perf.data?.rows ?? [];
  const tot = perf.data?.totals;
  const period = periodChip(list.filters) ?? 'All time';

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminPartnersApi.performance({ ...query, page, limit: 100 });
        return { items: r.rows, meta: r.meta };
      });
      downloadCsv<PerformanceRow>(`partner-performance-${group}`, all, [
        { label: group === 'city' ? 'City' : 'Partner', value: (r) => r.label },
        ...(group === 'city' ? [{ label: 'Partners', value: (r: PerformanceRow) => r.partners }] : [{ label: 'Code and city', value: (r: PerformanceRow) => r.sub }]),
        { label: 'Visits', value: (r) => r.visits },
        { label: 'Leads', value: (r) => r.leads },
        { label: 'Signups', value: (r) => r.signups },
        { label: 'Activations', value: (r) => r.activations },
        { label: 'Paid signups', value: (r) => r.paid },
        { label: 'Earnings (PKR)', value: (r) => Math.round(r.earnings) },
        { label: 'Revenue (PKR)', value: (r) => Math.round(r.revenue) },
        { label: 'ROI', value: (r) => r.roi },
      ]);
      toast.success(`${num(all.length)} rows exported (${period})`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageShell>
      <PageHero
        title="Partner performance"
        chip={period}
        busy={perf.isFetching}
        loading={perf.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export CSV'}</span></button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={tot ? [
          { label: 'Paid signups', value: num(tot.paid), hint: `${num(tot.signups)} signed up · ${num(tot.activations)} activated` },
          { label: 'Revenue from their shops', value: formatPKR(tot.revenue) },
          { label: 'Partner earnings', value: formatPKR(tot.earnings) },
          { label: 'ROI', value: roiText(tot.roi), hint: 'Revenue ÷ earnings' },
        ] : undefined}
      />

      <FilterBar search={<SearchField value={list.search} onChange={list.setSearch} placeholder={group === 'city' ? 'Search city' : 'Search partner, code or city'} />}>
        <Segmented value={group as 'partner' | 'city'} onChange={(v) => list.setFilter('group', v)} label="Group by"
          items={[{ value: 'partner', label: 'By partner' }, { value: 'city', label: 'By city' }]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} defaultPreset="thisMonth" />
        <FilterMenu icon={Handshake} label="Type" value={type} active={type !== 'ALL'} onChange={(v) => list.setFilter('type', v)}
          options={[{ value: 'ALL', label: 'All types' }, ...PARTNER_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))]} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={SORTS} align="right" />
      </FilterBar>

      <ListCard loading={perf.isLoading} empty={!rows.length} emptyIcon={<TrendingUp className="h-6 w-6" />}
        emptyTitle="Nothing in this period" emptyText="No partner visits, leads, signups or earnings in the chosen period."
        page={list.page} limit={list.limit} total={perf.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}>
        <Table minWidth="64rem">
          <THead>
            <Tr>
              <Th>{group === 'city' ? 'City' : 'Partner'}</Th>
              <Th align="right">Visits</Th>
              <Th align="right">Leads</Th>
              <Th align="right">Signups</Th>
              <Th align="right">Activated</Th>
              <Th align="right">Paid</Th>
              <Th align="right">Earnings</Th>
              <Th align="right">Revenue</Th>
              <Th align="right">ROI</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.key} interactive={!!r.partnerId} onClick={r.partnerId ? () => navigate(`/partners/${r.partnerId}`) : undefined}>
                <Td>
                  <div className="font-semibold text-slate-900">{r.label}</div>
                  <div className="text-[0.75rem] text-slate-500">{group === 'city' ? `${num(r.partners)} partners` : r.sub}</div>
                </Td>
                <Td align="right">{num(r.visits)}</Td>
                <Td align="right">{num(r.leads)}</Td>
                <Td align="right">{num(r.signups)}</Td>
                <Td align="right">{num(r.activations)}</Td>
                <Td align="right" className="font-semibold text-slate-900">{num(r.paid)}</Td>
                <Td align="right" className="whitespace-nowrap">{formatPKRFull(r.earnings)}</Td>
                <Td align="right" className="whitespace-nowrap">{formatPKRFull(r.revenue)}</Td>
                <Td align="right" className={cn('font-semibold', r.roi == null ? 'text-slate-400' : r.roi >= 1 ? 'text-emerald-700' : 'text-rose-700')}>{roiText(r.roi)}</Td>
              </Tr>
            ))}
            {tot && rows.length > 0 && (
              <Tr className="bg-slate-50 font-semibold">
                <Td className="text-slate-900">Total{list.debouncedSearch ? ' (matching)' : ''}</Td>
                <Td align="right">{num(tot.visits)}</Td>
                <Td align="right">{num(tot.leads)}</Td>
                <Td align="right">{num(tot.signups)}</Td>
                <Td align="right">{num(tot.activations)}</Td>
                <Td align="right" className="text-slate-900">{num(tot.paid)}</Td>
                <Td align="right" className="whitespace-nowrap">{formatPKRFull(tot.earnings)}</Td>
                <Td align="right" className="whitespace-nowrap">{formatPKRFull(tot.revenue)}</Td>
                <Td align="right">{roiText(tot.roi)}</Td>
              </Tr>
            )}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Partner performance"
          description="Who brings shops that pay, and what that costs in commission."
          flowTitle="What is counted"
          flow={[
            { label: 'Visits', hint: 'Fake ones left out', icon: MapPin, color: '#64748b' },
            { label: 'Signups', icon: Store, color: '#4f46e5' },
            { label: 'Paid', icon: Banknote, color: '#059669' },
            { label: 'ROI', hint: 'Revenue ÷ earnings', icon: TrendingUp, color: '#d97706' },
          ]}
          steps={[
            { icon: Users, color: '#4f46e5', title: 'By partner or city', text: 'Switch the grouping to compare people or cities.' },
            { icon: Banknote, color: '#059669', title: 'Revenue', text: 'Approved payments the partner’s shops made to Nafaa in the period.' },
            { icon: TrendingUp, color: '#d97706', title: 'ROI', text: 'Revenue divided by the partner’s earnings in the period (reversed earnings left out). Above 1× means the shops paid more than the commission.' },
          ]}
          tips={[
            'Each number counts events inside the period: a signup in October and its payment in November show in different months.',
            'Employee salaries are paid outside Nafaa and are not part of earnings or ROI.',
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
