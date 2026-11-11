/**
 * Marketing leads: every prospect from the website (forms, demos, chat,
 * newsletter), scored and ranked. Search, filters, period and paging run on
 * the server; Export CSV downloads the whole filtered list.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Download, Flame, MessageSquare, Tag, Thermometer, Users, UserCheck, Phone, Target } from 'lucide-react';
import {
  DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { leadsApi, type Lead } from '@/api/marketing/marketing-leads.api';
import { formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, TemperatureBadge, exportList, num } from '../../lib/kit';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'PROPOSAL_SENT', 'NEGOTIATING', 'CONVERTED', 'LOST', 'UNRESPONSIVE', 'DO_NOT_CONTACT'];
const TEMPS = ['FIRE', 'HOT', 'WARM', 'COLD'];

export function LeadsListPage() {
  const nav = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', temperature: 'ALL', ...PERIOD_DEFAULTS });
  const { status, temperature } = list.filters;

  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    temperature: temperature === 'ALL' ? undefined : temperature,
    ...periodQuery(list.filters),
  };
  const leads = useQuery({
    queryKey: ['mkt', 'leads', query, list.page, list.limit],
    queryFn: () => leadsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['mkt', 'leads', 'stats'], queryFn: leadsApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows: Lead[] = leads.data?.items ?? [];
  const chip = periodChip(list.filters);

  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    temperature !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('temperature', 'ALL')}>{statusLabel(temperature)}</FilterChip>,
    chip && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{chip}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Leads"
        chip={s ? `${num(s.total)} total` : undefined}
        busy={leads.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<Lead>('leads', (page) => leadsApi.list({ ...query, page, limit: 100 }), [
              { label: 'Lead number', value: (l) => l.leadNumber },
              { label: 'Name', value: (l) => l.fullName },
              { label: 'Email', value: (l) => l.email },
              { label: 'Phone', value: (l) => l.phone },
              { label: 'Company', value: (l) => l.companyName },
              { label: 'Industry', value: (l) => l.industry },
              { label: 'Source', value: (l) => l.source },
              { label: 'Status', value: (l) => l.status },
              { label: 'Temperature', value: (l) => l.temperature },
              { label: 'Score', value: (l) => l.score },
              { label: 'Created', value: (l) => l.createdAt.slice(0, 10) },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'Total leads', value: num(s.total), hint: `${num(s.converted)} converted` },
          { label: 'Fire and hot', value: num(s.temperature.fire + s.temperature.hot), hint: 'Ready to talk to' },
          { label: 'Average score', value: s.averageScore, hint: 'Out of 100' },
          { label: 'Conversion', value: s.conversionRate, hint: 'Leads that became shops' },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, email, phone or company" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <FilterMenu icon={Thermometer} label="Temperature" value={temperature} active={temperature !== 'ALL'} onChange={(v) => list.setFilter('temperature', v)}
          options={[{ value: 'ALL', label: 'All temperatures' }, ...TEMPS.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Created" />
      </FilterBar>

      <ListCard
        loading={leads.isLoading}
        empty={!rows.length}
        emptyIcon={<Users className="h-6 w-6" />}
        emptyTitle="No leads match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={leads.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead>
            <Tr>
              <Th>Lead</Th><Th>Source</Th><Th>Temperature</Th><Th>Score</Th><Th>Status</Th>
              <Th align="right">Activities</Th><Th align="right">Created</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((l) => (
              <Tr key={l.id} interactive onClick={() => nav(`/marketing/leads/${l.id}`)}>
                <Td>
                  <div className="font-semibold text-slate-900">{l.fullName}</div>
                  <div className="text-[0.75rem] text-slate-500">{l.companyName ?? l.email ?? l.phone}</div>
                </Td>
                <Td className="text-slate-600">{statusLabel(l.source)}</Td>
                <Td><TemperatureBadge value={l.temperature} /></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-slate-200">
                      <div className={`h-1.5 rounded-full ${l.score >= 80 ? 'bg-rose-500' : l.score >= 60 ? 'bg-amber-500' : l.score >= 40 ? 'bg-sky-500' : 'bg-slate-400'}`} style={{ width: `${Math.min(100, l.score)}%` }} />
                    </div>
                    <span className="text-[0.75rem] font-semibold tabular-nums text-slate-700">{l.score}</span>
                  </div>
                </Td>
                <Td><StatusBadge value={l.status} /></Td>
                <Td align="right" className="tabular-nums text-slate-600">{l._count?.activities ?? 0}</Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatRelative(l.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Leads"
          description="Every person who showed interest in Nafaa from the website, scored by how ready they are."
          flowTitle="How a lead moves"
          flow={[
            { label: 'Visitor acts', hint: 'Form, demo, chat', icon: MessageSquare, color: '#4f46e5' },
            { label: 'Lead created', hint: 'Scored 0 to 100', icon: Flame, color: '#e11d48' },
            { label: 'You follow up', hint: 'Call, email, demo', icon: Phone, color: '#0284c7' },
            { label: 'Becomes a shop', hint: 'Converted', icon: UserCheck, color: '#059669' },
          ]}
          steps={[
            { icon: Thermometer, color: '#e11d48', title: 'Start with fire and hot', text: 'The score rises with every action, so the hottest leads sit at the top of the list.' },
            { icon: Target, color: '#4f46e5', title: 'Open a lead', text: 'See contact details, log calls and meetings, and change the status as the talk moves on.' },
            { icon: Calendar, color: '#0284c7', title: 'Pick a period', text: 'Use Created to see only leads from a week or a month.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every lead that matches the filters, not only this page.' },
          ]}
          tips={['Press / to jump to the search box.', 'Filters stay in the address, so you can share the link.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
