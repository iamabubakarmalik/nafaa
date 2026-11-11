/**
 * Server errors: every unexpected failure in the API and in background jobs,
 * grouped so a repeating error is one row with a count. Admins open a row for
 * the full detail and mark it resolved; a resolved error that happens again
 * reopens by itself.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, Bug, CheckCheck, CheckCircle2, Clock, Copy, Filter, Lightbulb, RotateCcw, Server, Store } from 'lucide-react';
import {
  Badge, Button, Drawer, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Skeleton, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSystemApi } from '@/api/admin-system.api';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatDateTime, formatRelative, num } from '@/lib/format';
import { DetailList, ListCard, StatusBadge, useListParams } from '@/ui';
import { jobInfo } from '../lib/jobs';

const STATUS = [{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All errors' }];
const SOURCES = [{ value: 'ALL', label: 'Requests and jobs' }, { value: 'http', label: 'Requests' }, { value: 'job', label: 'Background jobs' }];
const SORTS = [{ value: 'last', label: 'Last seen' }, { value: 'count', label: 'Most frequent' }, { value: 'first', label: 'Newest' }];

const where = (e: { source: string; method: string | null; route: string }) =>
  e.source === 'job' ? jobInfo(e.route).label : `${e.method ?? ''} ${e.route.replace(/^\/api/, '')}`.trim();

function ErrorDrawer({ id, onClose, canManage }: { id: string | null; onClose: () => void; canManage: boolean }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ['admin', 'system', 'error', id], queryFn: () => adminSystemApi.error(id!), enabled: !!id });
  const e = detail.data;
  const toggle = useMutation({
    mutationFn: () => (e!.resolvedAt ? adminSystemApi.reopenError(e!.id) : adminSystemApi.resolveError(e!.id)),
    onSuccess: () => {
      toast.success(e!.resolvedAt ? 'Error reopened' : 'Marked as resolved');
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'errors'] });
      qc.invalidateQueries({ queryKey: ['admin', 'system', 'error', id] });
    },
    onError: (err) => toast.error(apiError(err)),
  });
  const copy = () => {
    if (!e) return;
    const text = [`${where(e)}${e.status ? ` (${e.status})` : ''}`, e.message, e.lastPath ? `Path: ${e.lastPath}` : '', e.stack ?? ''].filter(Boolean).join('\n\n');
    navigator.clipboard.writeText(text).then(() => toast.success('Copied'), () => toast.error('Could not copy'));
  };

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      size="lg"
      title={e ? where(e) : 'Error'}
      description={e ? `${num(e.count)} ${e.count === 1 ? 'time' : 'times'} · last ${formatRelative(e.lastSeenAt)}` : undefined}
      footer={e && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={copy}>Copy detail</Button>
          {canManage && (
            <Button variant={e.resolvedAt ? 'secondary' : 'primary'} leftIcon={e.resolvedAt ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} loading={toggle.isPending} onClick={() => toggle.mutate()}>
              {e.resolvedAt ? 'Reopen' : 'Mark resolved'}
            </Button>
          )}
        </div>
      )}
    >
      {!e ? <Skeleton className="h-64 rounded-2xl" /> : (
        <div className="space-y-5">
          <div className="rounded-xl bg-rose-50 px-4 py-3 text-[0.875rem] font-medium text-rose-800 ring-1 ring-inset ring-rose-200 break-words">{e.message}</div>
          <DetailList cols={2} items={[
            { label: 'Where', value: e.source === 'job' ? `Background job: ${jobInfo(e.route).label}` : `${e.method} ${e.route}` },
            { label: 'Status', value: e.resolvedAt ? `Resolved ${formatRelative(e.resolvedAt)}${e.resolvedBy ? ` by ${e.resolvedBy.fullName}` : ''}` : 'Open' },
            { label: 'First seen', value: formatDateTime(e.firstSeenAt) },
            { label: 'Last seen', value: formatDateTime(e.lastSeenAt) },
            { label: 'Times', value: num(e.count) },
            { label: 'Response code', value: e.status ?? '—' },
            { label: 'Last shop', value: e.lastTenant ? <Link className="font-medium text-brand-700 hover:underline" to={`/tenants/${e.lastTenant.id}`}>{e.lastTenant.name}</Link> : '—' },
            { label: 'Last user', value: e.lastUser ? `${e.lastUser.fullName} (${e.lastUser.email})` : '—' },
          ]} />
          {e.lastPath && (
            <div>
              <p className="mb-1 text-[0.75rem] font-medium text-slate-500">Last address</p>
              <code className="block break-all rounded-lg bg-slate-100 px-3 py-2 text-[0.75rem] text-slate-700">{e.lastPath}</code>
            </div>
          )}
          <div>
            <p className="mb-1 text-[0.75rem] font-medium text-slate-500">Stack trace</p>
            {e.stack
              ? <pre className="max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-[0.6875rem] leading-relaxed text-slate-100">{e.stack}</pre>
              : <p className="text-[0.8125rem] text-slate-400">No stack trace.</p>}
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function ErrorsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const can = useCan();
  const canManage = can('system.manage');
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useListParams({ status: 'open', source: 'ALL', sort: 'last' });
  const { status, source, sort } = list.filters;
  const query = { status, source: source === 'ALL' ? undefined : source, sort, search: list.debouncedSearch || undefined };
  const errors = useQuery({
    queryKey: ['admin', 'system', 'errors', query, list.page, list.limit],
    queryFn: () => adminSystemApi.errors({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });
  const s = errors.data?.stats;
  const rows = errors.data?.items ?? [];

  const resolveAll = useMutation({
    mutationFn: adminSystemApi.resolveAll,
    onSuccess: (r) => { toast.success(`${num(r.resolved)} errors marked resolved`); qc.invalidateQueries({ queryKey: ['admin', 'system', 'errors'] }); },
    onError: (e) => toast.error(apiError(e)),
  });

  const chips = [
    status !== 'open' && <FilterChip key="st" onRemove={() => list.setFilter('status', 'open')}>{STATUS.find((x) => x.value === status)?.label}</FilterChip>,
    source !== 'ALL' && <FilterChip key="so" onRemove={() => list.setFilter('source', 'ALL')}>{SOURCES.find((x) => x.value === source)?.label}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Errors"
        chip={s ? `${num(s.open)} open` : undefined}
        busy={errors.isFetching}
        loading={errors.isLoading}
        actions={
          <>
            {canManage && !!s?.open && (
              <button type="button" className={heroButton} disabled={resolveAll.isPending}
                onClick={async () => { if (await confirmDialog({ title: `Mark all ${num(s.open)} open errors resolved?`, text: 'Any of them that happens again will reopen by itself.', yes: 'Resolve all' })) resolveAll.mutate(); }}>
                <CheckCheck className="h-4 w-4" /> Resolve all
              </button>
            )}
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Open', value: num(s.open) },
          { label: 'Seen in 24 hours', value: num(s.last24h) },
          { label: 'Open in jobs', value: num(s.openJobErrors), hint: 'Background jobs' },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search message or address" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Filter} label="Status" value={status} active={status !== 'open'} onChange={(v) => list.setFilter('status', v)} options={STATUS} />
        <FilterMenu icon={Server} label="Source" value={source} active={source !== 'ALL'} onChange={(v) => list.setFilter('source', v)} options={SOURCES} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={SORTS} align="right" />
      </FilterBar>

      <ListCard
        loading={errors.isLoading}
        empty={!rows.length}
        emptyIcon={<CheckCircle2 className="h-6 w-6" />}
        emptyTitle={status === 'open' && !list.debouncedSearch && source === 'ALL' ? 'No open errors' : 'No errors match'}
        emptyText={status === 'open' ? 'The servers have not reported any unexpected failure.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={errors.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="52rem">
          <THead>
            <Tr><Th>Error</Th><Th>Where</Th><Th align="right">Times</Th><Th>Last seen</Th><Th>Status</Th></Tr>
          </THead>
          <TBody>
            {rows.map((e) => (
              <Tr key={e.id} interactive onClick={() => setOpenId(e.id)}>
                <Td className="max-w-[26rem]">
                  <div className="line-clamp-2 break-words font-medium text-slate-900">{e.message}</div>
                  {e.lastTenantName && <div className="mt-0.5 flex items-center gap-1 text-[0.75rem] text-slate-500"><Store className="h-3 w-3" />{e.lastTenantName}</div>}
                </Td>
                <Td className="max-w-[18rem]">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={e.source === 'job' ? 'warning' : 'default'}>{e.source === 'job' ? 'Job' : e.status ?? 'Request'}</Badge>
                    <span className="truncate font-mono text-[0.75rem] text-slate-600">{where(e)}</span>
                  </div>
                </Td>
                <Td align="right" className="tabular-nums font-semibold">{num(e.count)}</Td>
                <Td className="whitespace-nowrap text-[0.8125rem]" title={formatDateTime(e.lastSeenAt)}>
                  {formatRelative(e.lastSeenAt)}
                  <span className="block text-[0.6875rem] text-slate-400">first {formatRelative(e.firstSeenAt)}</span>
                </Td>
                <Td><StatusBadge value={e.resolvedAt ? 'RESOLVED' : 'OPEN'} label={e.resolvedAt ? 'Resolved' : 'Open'} variant={e.resolvedAt ? 'success' : 'danger'} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <ErrorDrawer id={openId} onClose={() => setOpenId(null)} canManage={canManage} />

      {guide.isOpen && (
        <PageGuide
          title="Errors"
          description="Unexpected failures on the servers. Shops only saw a short “try again” message; the full detail is here."
          flowTitle="Life of an error"
          flow={[
            { label: 'Something fails', hint: 'Request or job', icon: Bug, color: '#e11d48' },
            { label: 'Grouped', hint: 'Same error = one row', icon: Server, color: '#d97706' },
            { label: 'You fix it', icon: CheckCircle2, color: '#059669' },
            { label: 'Happens again?', hint: 'Reopens', icon: RotateCcw, color: '#4f46e5' },
          ]}
          steps={[
            { icon: Bug, color: '#e11d48', title: 'Open a row', text: 'See the full message, the shop and user it last happened to, and the stack trace to share with a developer.' },
            { icon: CheckCircle2, color: '#059669', title: 'Resolve', text: 'Mark an error resolved once it is fixed. If it comes back, it reopens on its own.' },
            { icon: Clock, color: '#4f46e5', title: 'Saved every 10 seconds', text: 'Errors are written in small batches, so a new one can take a few seconds to show.' },
          ]}
          tips={['Wrong input from a shop (like a missing field) is not an error here; only real server faults are.', 'Maintenance mode answers are not counted as errors.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
