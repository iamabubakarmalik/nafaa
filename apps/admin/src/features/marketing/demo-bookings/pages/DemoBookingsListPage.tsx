/**
 * Demo bookings: demo requests from the website. Search, status, period and
 * paging run on the server; Export CSV downloads the whole filtered list.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarCheck, CheckCircle, Download, Tag, UserCheck, Video, XCircle } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { demoBookingsApi, type DemoBooking } from '@/api/marketing/marketing-demo-bookings.api';
import { formatDate } from '@/lib/format';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, exportList, num } from '../../lib/kit';

const STATUSES = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'];

export function DemoBookingsListPage() {
  const nav = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', ...PERIOD_DEFAULTS });
  const { status } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status, ...periodQuery(list.filters) };

  const demos = useQuery({
    queryKey: ['mkt', 'demos', query, list.page, list.limit],
    queryFn: () => demoBookingsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });
  const stats = useQuery({ queryKey: ['mkt', 'demos', 'stats'], queryFn: demoBookingsApi.stats, staleTime: 30_000 });
  const s = stats.data;
  const rows: DemoBooking[] = demos.data?.items ?? [];
  const chip = periodChip(list.filters);
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    chip && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{chip}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Demo bookings"
        chip={demos.data ? `${num(demos.data.meta.total)} shown` : undefined}
        busy={demos.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<DemoBooking>('demo-bookings', (page) => demoBookingsApi.list({ ...query, page, limit: 100 }), [
              { label: 'Booking', value: (d) => d.bookingNumber },
              { label: 'Name', value: (d) => d.fullName },
              { label: 'Email', value: (d) => d.email },
              { label: 'Phone', value: (d) => d.phone },
              { label: 'Company', value: (d) => d.companyName },
              { label: 'Industry', value: (d) => d.industry },
              { label: 'Preferred date', value: (d) => d.preferredDate.slice(0, 10) },
              { label: 'Preferred time', value: (d) => d.preferredTime },
              { label: 'Status', value: (d) => d.status },
              { label: 'Interest', value: (d) => d.interestLevel },
              { label: 'Requested', value: (d) => d.createdAt.slice(0, 10) },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'Upcoming', value: num(s.upcoming) },
          { label: 'Completed', value: num(s.completed), hint: `${s.conversionRate} became shops` },
          { label: 'Conversion', value: s.conversionRate },
          { label: 'No-shows', value: num(s.noShow), hint: s.noShowRate },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, email, phone or company" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Requested" />
      </FilterBar>

      <ListCard
        loading={demos.isLoading}
        empty={!rows.length}
        emptyIcon={<Calendar className="h-6 w-6" />}
        emptyTitle="No demo bookings match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={demos.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead>
            <Tr><Th>Booking</Th><Th>Prospect</Th><Th>Preferred time</Th><Th>Industry</Th><Th>Status</Th><Th>Interest</Th></Tr>
          </THead>
          <TBody>
            {rows.map((d) => (
              <Tr key={d.id} interactive onClick={() => nav(`/marketing/demos/${d.id}`)}>
                <Td className="font-mono text-[0.75rem] text-slate-600">{d.bookingNumber}</Td>
                <Td>
                  <div className="font-semibold text-slate-900">{d.fullName}</div>
                  <div className="text-[0.75rem] text-slate-500">{d.companyName ?? d.email}</div>
                </Td>
                <Td>
                  <div className="text-slate-900">{formatDate(d.preferredDate)}</div>
                  <div className="text-[0.75rem] text-slate-500">{d.preferredTime}</div>
                </Td>
                <Td className="text-slate-600">{d.industry ?? '—'}</Td>
                <Td><StatusBadge value={d.status} /></Td>
                <Td>{d.interestLevel ? <StatusBadge value={d.interestLevel} /> : <span className="text-slate-400">—</span>}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Demo bookings"
          description="People who asked to see Nafaa. Confirm a time, run the demo, then record how it went."
          flowTitle="A demo from request to result"
          flow={[
            { label: 'Requested', hint: 'From the website', icon: Calendar, color: '#d97706' },
            { label: 'Confirmed', hint: 'Time and link sent', icon: CalendarCheck, color: '#0284c7' },
            { label: 'Demo held', hint: 'Rating, outcome', icon: Video, color: '#4f46e5' },
            { label: 'Shop signs up', hint: 'Converted', icon: UserCheck, color: '#059669' },
          ]}
          steps={[
            { icon: Calendar, color: '#d97706', title: 'Answer new requests', text: 'Pending bookings are waiting for you to confirm a time.' },
            { icon: CheckCircle, color: '#059669', title: 'Record the outcome', text: 'After the demo, mark it complete with the result and next step.' },
            { icon: XCircle, color: '#e11d48', title: 'Watch no-shows', text: 'A high no-show rate means reminders or time slots need work.' },
            { icon: Download, color: '#4f46e5', title: 'Export', text: 'Export CSV downloads every booking that matches the filters.' },
          ]}
          tips={['Press / to jump to the search box.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
