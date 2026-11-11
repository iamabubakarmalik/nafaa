/**
 * Delivery log for one channel (email or SMS): every message the platform
 * sent, searchable by recipient and text, filtered by status and period, paged
 * on the server. Failed messages can be retried and a test message sent.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Beaker, CheckCircle2, Download, Lightbulb, Mail, MessageSquare, RefreshCw, Search, Send, Tag, XCircle } from 'lucide-react';
import {
  Button, DateRangeMenu, FilterBar, FilterChip, FilterMenu, Input, Modal, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr,
  heroButton, resolveRange, type DateRangeValue,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommunicationsApi, type EmailLog, type PageMeta, type SmsLog } from '@/api/admin-communications.api';
import { formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { errMsg, num } from './kit';

type Kind = 'email' | 'sms';
type Row = EmailLog | SmsLog;

const STATUSES = ['ALL', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED'];
const dateTime = (v: string) => new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export function DeliveryLogsPage({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const isEmail = kind === 'email';
  const label = isEmail ? 'Email' : 'SMS';
  const [exporting, setExporting] = useState(false);
  const [showTest, setShowTest] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [range, setRange] = useState<DateRangeValue>({ preset: 'all', custom: { from: '', to: '' } });
  const period = resolveRange(range, 0);
  const list = useListParams({ status: 'ALL' });
  const status = list.filters.status;

  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status, from: period?.from, to: period?.to };
  const fetchLogs = (p: { page: number; limit: number }): Promise<{ items: Row[]; meta: PageMeta }> => (isEmail
    ? adminCommunicationsApi.emailLogs({ ...query, ...p })
    : adminCommunicationsApi.smsLogs({ ...query, ...p }));
  const logs = useQuery({
    queryKey: ['admin-delivery-logs', kind, query, list.page, list.limit],
    queryFn: () => fetchLogs({ page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({
    queryKey: ['admin-delivery-stats', kind],
    queryFn: () => (isEmail ? adminCommunicationsApi.emailStats() : adminCommunicationsApi.smsStats()),
    staleTime: 30_000,
  });
  const s = stats.data;
  const rows: Row[] = logs.data?.items ?? [];

  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-delivery-logs'] }); qc.invalidateQueries({ queryKey: ['admin-delivery-stats'] }); };
  const retry = useMutation({
    mutationFn: (id: string) => (isEmail ? adminCommunicationsApi.retryEmail(id) : adminCommunicationsApi.retrySms(id)),
    onSuccess: () => { toast.success(`${label} retried`); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const test = useMutation({
    mutationFn: () => (isEmail ? adminCommunicationsApi.testEmail(testTo.trim()) : adminCommunicationsApi.testSms(testTo.trim())),
    onSuccess: () => { toast.success(`Test ${label} sent`); setShowTest(false); setTestTo(''); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await fetchLogs({ page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.meta.totalPages } };
      });
      downloadCsv<Row>(`${kind}-logs`, all, [
        { label: 'Date', value: (l) => l.createdAt },
        { label: isEmail ? 'To' : 'Phone', value: (l) => ('toEmail' in l ? l.toEmail : l.toPhone) },
        { label: isEmail ? 'Subject' : 'Message', value: (l) => ('subject' in l ? l.subject : l.message) },
        { label: 'Template', value: (l) => l.templateSlug }, { label: 'Shop', value: (l) => l.tenant?.name },
        { label: 'Status', value: (l) => l.status }, { label: 'Error', value: (l) => l.errorMessage },
      ]);
      toast.success(`${num(all.length)} messages exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    range.preset !== 'all' && <FilterChip key="d" onRemove={() => setRange({ preset: 'all', custom: { from: '', to: '' } })}>{period ? `${period.from} to ${period.to}` : 'Period'}</FilterChip>,
  ].filter(Boolean);
  const Icon = isEmail ? Mail : MessageSquare;

  return (
    <PageShell>
      <PageHero
        title={`${label} logs`}
        chip={logs.data ? `${num(logs.data.meta.total)} shown` : undefined}
        busy={logs.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={() => setShowTest(true)}><Beaker className="h-4 w-4" /> Send test</button>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Total', value: num(s.total), hint: s.queued ? `${num(s.queued)} waiting` : undefined },
          { label: 'Sent', value: num(s.sent) },
          { label: 'Failed', value: num(s.failed) },
          isEmail ? { label: 'Today', value: num(s.today) } : { label: 'Cost', value: formatPKR(s.totalCost ?? 0), hint: `${num(s.today)} today · ${s.provider || 'provider off'}` },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder={isEmail ? 'Search address, subject, template or shop' : 'Search phone, message, template or shop'} />}
        chips={chips.length ? chips : undefined}
        onClear={() => { list.clear(); setRange({ preset: 'all', custom: { from: '', to: '' } }); }}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={STATUSES.map((v) => ({ value: v, label: v === 'ALL' ? 'All statuses' : statusLabel(v) }))} />
        <DateRangeMenu value={range} onChange={(v) => { setRange(v); list.setPage(1); }} startHour={0} />
      </FilterBar>

      <ListCard
        loading={logs.isLoading}
        empty={!!logs.error || !rows.length}
        emptyIcon={<Icon className="h-6 w-6" />}
        emptyTitle={logs.error ? `Could not load ${label} logs` : `No ${label} messages match`}
        emptyText={logs.error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={logs.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="56rem">
          <THead>
            <Tr><Th>Date</Th><Th>{isEmail ? 'To' : 'Phone'}</Th><Th>{isEmail ? 'Subject' : 'Message'}</Th><Th>Shop</Th><Th>Status</Th>{!isEmail && <Th align="right">Cost</Th>}<Th align="right">Action</Th></Tr>
          </THead>
          <TBody>
            {rows.map((l) => (
              <Tr key={l.id} className="align-top">
                <Td className="whitespace-nowrap text-[0.75rem]">{dateTime(l.createdAt)}</Td>
                <Td>
                  <div className="text-slate-900">{'toEmail' in l ? l.toEmail : l.toPhone}</div>
                  {'toName' in l && l.toName && <div className="text-[0.75rem] text-slate-500">{l.toName}</div>}
                </Td>
                <Td className="max-w-[24rem]">
                  <div className="line-clamp-2 font-medium text-slate-900">{'subject' in l ? l.subject : l.message}</div>
                  {l.templateSlug && <div className="font-mono text-[0.6875rem] text-slate-500">{l.templateSlug}</div>}
                </Td>
                <Td className="text-[0.8125rem]">{l.tenant?.name ?? '—'}</Td>
                <Td>
                  <StatusBadge value={l.status} />
                  {l.errorMessage && <div className="mt-1 max-w-[16rem] text-[0.6875rem] text-rose-600">{l.errorMessage}</div>}
                  {l.retryCount > 0 && <div className="mt-0.5 text-[0.6875rem] text-slate-500">Retries: {l.retryCount}</div>}
                </Td>
                {!isEmail && <Td align="right">{'cost' in l ? formatPKR(Number(l.cost) || 0) : ''}</Td>}
                <Td align="right">
                  {l.status === 'FAILED' && (
                    <Button size="xs" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} loading={retry.isPending && retry.variables === l.id} onClick={() => retry.mutate(l.id)}>Retry</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <Modal open={showTest} onClose={() => setShowTest(false)} size="sm" title={`Send a test ${label}`} description={isEmail ? 'Check that email delivery works.' : 'Check that SMS delivery works.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowTest(false)}>Cancel</Button>
            <Button leftIcon={<Send className="h-4 w-4" />} loading={test.isPending} disabled={!testTo.trim()} onClick={() => test.mutate()}>Send</Button>
          </>
        }>
        <Input label={isEmail ? 'Recipient email' : 'Recipient phone'} type={isEmail ? 'email' : 'tel'} value={testTo} onChange={(e) => setTestTo(e.target.value)}
          placeholder={isEmail ? 'test@example.com' : '03001234567'} />
      </Modal>

      {guide.isOpen && (
        <PageGuide
          title={`${label} logs`}
          description={`Every ${label} message the platform sent, with its delivery status.`}
          flowTitle="Life of a message"
          flow={[
            { label: 'Queued', hint: 'Waiting to go', icon: Send, color: '#0284c7' },
            { label: 'Sent', hint: 'Handed to provider', icon: CheckCircle2, color: '#059669' },
            { label: 'Failed', hint: 'Error is shown', icon: XCircle, color: '#e11d48' },
            { label: 'Retry', hint: 'Send it again', icon: RefreshCw, color: '#d97706' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find a message', text: isEmail ? 'Search by address, subject, template or shop name.' : 'Search by phone, text, template or shop name.' },
            { icon: Tag, color: '#0284c7', title: 'Filter', text: 'Narrow by status and period. Days are Pakistan time.' },
            { icon: RefreshCw, color: '#d97706', title: 'Retry', text: 'A failed message shows its error. Retry sends it again.' },
          ]}
          tips={['Send test checks that delivery works before a bulk send.', 'Export CSV downloads every message that matches the filters.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
