/**
 * Campaigns: email and SMS blasts to the newsletter audience. Launch, pause
 * and cancel from the row; search, status, channel, period and paging run on
 * the server.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Megaphone, Pause, PenLine, Play, Plus, Radio, Send, Tag, X } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton, heroPrimaryButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { campaignsApi } from '@/api/marketing/marketing-campaigns.api';
import { formatRelative } from '@/lib/format';
import { ListCard, StatusBadge, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GuideButton, exportList, num } from '../../lib/kit';

const STATUSES = ['DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED'];
const CHANNELS = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'ANNOUNCEMENT', 'RETARGETING'];

export function CampaignsListPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', channel: 'ALL', ...PERIOD_DEFAULTS });
  const { status, channel } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    channel: channel === 'ALL' ? undefined : channel,
    ...periodQuery(list.filters),
  };

  const stats = useQuery({ queryKey: ['mkt', 'campaigns', 'stats'], queryFn: campaignsApi.stats, staleTime: 30_000 });
  const campaigns = useQuery({
    queryKey: ['mkt', 'campaigns', query, list.page, list.limit],
    queryFn: () => campaignsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const s = stats.data;
  const rows: any[] = campaigns.data?.items ?? [];
  const chip = periodChip(list.filters);
  const refresh = () => qc.invalidateQueries({ queryKey: ['mkt', 'campaigns'] });
  const fail = (e: any) => toast.error(e.response?.data?.message ?? 'Something went wrong. Try again.');

  const launchMut = useMutation({ mutationFn: (id: string) => campaignsApi.launch(id), onSuccess: (r: any) => { toast.success(`Queued for ${r.queuedFor} recipients`); refresh(); }, onError: fail });
  const pauseMut = useMutation({ mutationFn: (id: string) => campaignsApi.pause(id), onSuccess: () => { toast.success('Paused'); refresh(); }, onError: fail });
  const cancelMut = useMutation({ mutationFn: (id: string) => campaignsApi.cancel(id), onSuccess: () => { toast.success('Cancelled'); refresh(); }, onError: fail });

  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    channel !== 'ALL' && <FilterChip key="c" onRemove={() => list.setFilter('channel', 'ALL')}>{statusLabel(channel)}</FilterChip>,
    chip && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{chip}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Campaigns"
        chip={campaigns.data ? `${num(campaigns.data.meta.total)} shown` : undefined}
        busy={campaigns.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} disabled={exporting} onClick={() => exportList<any>('campaigns', (page) => campaignsApi.list({ ...query, page, limit: 100 }), [
              { label: 'Name', value: (c) => c.name },
              { label: 'Subject', value: (c) => c.subject },
              { label: 'Channel', value: (c) => c.type },
              { label: 'Status', value: (c) => c.status },
              { label: 'Recipients', value: (c) => c.totalRecipients },
              { label: 'Sent', value: (c) => c.totalSent },
              { label: 'Opened', value: (c) => c.totalOpened },
              { label: 'Created', value: (c) => String(c.createdAt).slice(0, 10) },
            ], setExporting)}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <Link to="/marketing/campaigns/new" className={heroPrimaryButton}><Plus className="h-4 w-4" /> New campaign</Link>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'Sent', value: num(s.sent) },
          { label: 'Scheduled', value: num(s.scheduled) },
          { label: 'Open rate', value: s.openRate },
          { label: 'Click rate', value: s.clickRate, hint: `${s.ctr} click-through` },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search campaign name" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={[{ value: 'ALL', label: 'All statuses' }, ...STATUSES.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <FilterMenu icon={Radio} label="Channel" value={channel} active={channel !== 'ALL'} onChange={(v) => list.setFilter('channel', v)}
          options={[{ value: 'ALL', label: 'All channels' }, ...CHANNELS.map((v) => ({ value: v, label: statusLabel(v) }))]} />
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} label="Created" />
      </FilterBar>

      <ListCard
        loading={campaigns.isLoading}
        empty={!rows.length}
        emptyIcon={<Megaphone className="h-6 w-6" />}
        emptyTitle="No campaigns yet"
        emptyText="Create a campaign to send an email or SMS to your audience."
        emptyAction={<Link to="/marketing/campaigns/new"><Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>New campaign</Button></Link>}
        page={list.page} limit={list.limit} total={campaigns.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="56rem">
          <THead>
            <Tr><Th>Campaign</Th><Th>Channel</Th><Th>Status</Th><Th align="right">Recipients</Th><Th align="right">Sent / opened</Th><Th align="right">Created</Th><Th align="right">Actions</Th></Tr>
          </THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="max-w-xs truncate text-[0.75rem] text-slate-500">{c.subject}</div>
                </Td>
                <Td className="text-slate-600">{statusLabel(c.type)}</Td>
                <Td><StatusBadge value={c.status} /></Td>
                <Td align="right" className="tabular-nums">{num(c.totalRecipients)}</Td>
                <Td align="right" className="tabular-nums">{num(c.totalSent)} / {num(c.totalOpened)}</Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatRelative(c.createdAt)}</Td>
                <Td align="right">
                  <div className="flex justify-end gap-1">
                    {c.status === 'DRAFT' && (
                      <Button size="xs" variant="outline" leftIcon={<Play className="h-3.5 w-3.5" />} onClick={async () => {
                        if (await confirmDialog({ title: 'Launch this campaign?', text: 'Messages start sending to the audience right away.', yes: 'Launch' })) launchMut.mutate(c.id);
                      }}>Launch</Button>
                    )}
                    {c.status === 'RUNNING' && <Button size="xs" variant="secondary" leftIcon={<Pause className="h-3.5 w-3.5" />} onClick={() => pauseMut.mutate(c.id)}>Pause</Button>}
                    {(c.status === 'DRAFT' || c.status === 'SCHEDULED' || c.status === 'PAUSED') && (
                      <Button size="xs" variant="critical" leftIcon={<X className="h-3.5 w-3.5" />} onClick={async () => {
                        if (await confirmDialog({ title: 'Cancel this campaign?', text: 'It will not be sent.', yes: 'Cancel campaign', danger: true })) cancelMut.mutate(c.id);
                      }}>Cancel</Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Campaigns"
          description="Send one message to many people: your newsletter audience."
          flowTitle="Life of a campaign"
          flow={[
            { label: 'Draft', hint: 'Write it', icon: PenLine, color: '#64748b' },
            { label: 'Scheduled', hint: 'Waits for its time', icon: Megaphone, color: '#0284c7' },
            { label: 'Running', hint: 'Sending now', icon: Send, color: '#4f46e5' },
            { label: 'Completed', hint: 'Opens and clicks', icon: Play, color: '#059669' },
          ]}
          steps={[
            { icon: Plus, color: '#4f46e5', title: 'New campaign', text: 'Pick email, SMS or both, write the message and choose the audience by tags.' },
            { icon: Play, color: '#059669', title: 'Launch', text: 'A draft starts sending when you launch it. You are asked to confirm first.' },
            { icon: Pause, color: '#d97706', title: 'Pause or cancel', text: 'Pause a running campaign, or cancel one that has not been sent.' },
            { icon: Download, color: '#0284c7', title: 'Export', text: 'Export CSV downloads every campaign that matches the filters.' },
          ]}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
