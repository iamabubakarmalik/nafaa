/**
 * Deletion requests: users and shops that asked to be deleted. Nothing runs
 * by itself; an admin processes each request by hand once its grace period
 * is over.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Lightbulb, ShieldAlert, Store, Trash2, UserX, Users } from 'lucide-react';
import {
  Alert, Badge, Button, Drawer, FilterBar, FilterChip, FilterMenu, Input, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, ViewTabs, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminDeletionRequestsApi, type DeletionRequest } from '@/api/admin-deletion-requests.api';
import { formatDate } from '@/lib/format';
import { DetailList, ListCard, StatusBadge, useListParams } from '@/ui';
import { num } from '@/lib/format';

const daysUntil = (v: string) => Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000);

const TABS = ['pending', 'due', 'in_grace', 'processed', 'cancelled', 'all'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { pending: 'Open', due: 'Due now', in_grace: 'In grace', processed: 'Processed', cancelled: 'Cancelled', all: 'All' };

function Status({ r }: { r: DeletionRequest }) {
  const d = daysUntil(r.dueAt);
  if (r.status === 'DUE') return <Badge variant="danger">{d < 0 ? `Due, ${-d}d late` : 'Due today'}</Badge>;
  if (r.status === 'IN_GRACE') return <Badge variant="warning">In grace, {d}d left</Badge>;
  return <StatusBadge value={r.status} />;
}

export default function DeletionRequestsPage() {
  const qc = useQueryClient();
  const guide = usePageGuide();
  const list = useListParams({ status: 'pending', kind: 'ALL' });
  const { status, kind } = list.filters;
  const [open, setOpen] = useState<DeletionRequest | null>(null);
  const [typed, setTyped] = useState('');

  const query = { status, kind: kind === 'ALL' ? undefined : kind, search: list.debouncedSearch || undefined };
  const data = useQuery({
    queryKey: ['admin', 'deletion-requests', query, list.page, list.limit],
    queryFn: () => adminDeletionRequestsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = data.data?.items ?? [];
  const counts = data.data?.counts;

  const process = useMutation({
    mutationFn: (r: DeletionRequest) => adminDeletionRequestsApi.process(r.id),
    onSuccess: (res) => {
      toast.success(res.alreadyProcessed ? 'Already processed' : 'Request processed');
      setOpen(null); setTyped('');
      qc.invalidateQueries({ queryKey: ['admin', 'deletion-requests'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Could not process'),
  });

  const word = open ? (open.kind === 'USER' ? 'DELETE USER' : 'DELETE SHOP') : '';
  const chips = kind !== 'ALL' ? [<FilterChip key="k" onRemove={() => list.setFilter('kind', 'ALL')}>{kind === 'user' ? 'Users only' : 'Shops only'}</FilterChip>] : [];

  return (
    <PageShell>
      <PageHero
        title="Deletion requests"
        chip={counts ? `${num(counts.due + counts.inGrace)} open` : undefined}
        busy={data.isFetching}
        loading={data.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={counts ? [
          { label: 'Due now', value: num(counts.due), hint: 'Ready to process' },
          { label: 'In grace', value: num(counts.inGrace), hint: 'Waiting period' },
          { label: 'Processed', value: num(counts.processed) },
          { label: 'Cancelled', value: num(counts.cancelled) },
        ] : undefined}
      />

      <ViewTabs
        tabs={TABS.map((t) => ({ id: t, label: TAB_LABEL[t], count: counts ? (t === 'due' ? counts.due : t === 'in_grace' ? counts.inGrace : t === 'processed' ? counts.processed : t === 'cancelled' ? counts.cancelled : t === 'pending' ? counts.due + counts.inGrace : null) : null }))}
        value={status as Tab}
        onChange={(v) => list.setFilter('status', v)}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, email or shop" />}
        chips={chips.length ? chips : undefined}
        onClear={() => list.setFilter('kind', 'ALL')}
      >
        <FilterMenu icon={Users} label="Who" value={kind} active={kind !== 'ALL'} onChange={(v) => list.setFilter('kind', v)} align="right"
          options={[{ value: 'ALL', label: 'Users and shops' }, { value: 'user', label: 'Users only' }, { value: 'tenant', label: 'Shops only' }]} />
      </FilterBar>

      <ListCard
        loading={data.isLoading}
        empty={!rows.length}
        emptyIcon={<UserX className="h-6 w-6" />}
        emptyTitle="No requests here"
        emptyText="Requests appear when a user or shop owner asks to delete their account."
        page={list.page} limit={list.limit} total={data.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="46rem">
          <THead><Tr><Th>Who</Th><Th>Type</Th><Th>Requested</Th><Th>Due</Th><Th>Status</Th></Tr></THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.id} interactive onClick={() => { setOpen(r); setTyped(''); }}>
                <Td>
                  <div className="font-semibold text-slate-900">{r.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{r.kind === 'USER' ? `${r.email} · ${r.tenantName}` : `${r.userCount ?? 0} users`}</div>
                </Td>
                <Td><span className="inline-flex items-center gap-1.5 text-slate-700">{r.kind === 'USER' ? <Users className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}{r.kind === 'USER' ? 'User' : 'Shop'}</span></Td>
                <Td className="whitespace-nowrap text-slate-600">{formatDate(r.requestedAt)}</Td>
                <Td className="whitespace-nowrap text-slate-600">{formatDate(r.dueAt)}</Td>
                <Td><Status r={r} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={open?.name ?? ''}
        description={open ? (open.kind === 'USER' ? 'User deletion request' : 'Shop deletion request') : undefined}
        footer={open?.status === 'DUE' ? (
          <Button variant="danger" fullWidth disabled={typed !== word} loading={process.isPending} leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => open && process.mutate(open)}>
            Process deletion
          </Button>
        ) : undefined}
      >
        {open && (
          <div className="space-y-5">
            <Status r={open} />
            <DetailList cols={2} items={[
              { label: 'Requested', value: formatDate(open.requestedAt) },
              { label: 'Grace ends', value: formatDate(open.dueAt) },
              { label: 'Shop', value: open.tenantName },
              { label: 'Email', value: open.email, hidden: !open.email },
              { label: 'Reason', value: open.reason, hidden: !open.reason },
              { label: 'Processed', value: open.processedAt ? formatDate(open.processedAt) : null, hidden: !open.processedAt },
              { label: 'Purge after', value: open.purgeAfter ? formatDate(open.purgeAfter) : null, hidden: !open.purgeAfter },
            ]} />

            <Alert tone="warning" title="What will happen" icon={<ShieldAlert className="h-4 w-4 text-amber-600" />}>
              {open.kind === 'USER' ? (
                <ul className="list-disc space-y-1 ps-4">
                  <li>Sign-in is disabled. Sessions, refresh tokens and push tokens are removed.</li>
                  <li>The name becomes "Deleted user", the email is replaced, and phone and photo are cleared.</li>
                  <li>Sales and other business records stay, linked to the anonymized user.</li>
                </ul>
              ) : (
                <ul className="list-disc space-y-1 ps-4">
                  <li>The shop is closed (suspended). All {open.userCount ?? 0} of its users are deactivated and anonymized.</li>
                  <li>Business data is not deleted. It is marked for purge after 90 days.</li>
                  <li>The purge itself is a separate decision by the owner.</li>
                </ul>
              )}
              <p className="mt-2">Every step is written to the activity log. Processing again does nothing.</p>
            </Alert>

            {open.status === 'DUE' && (
              <Input label={<>Type <span className="font-mono font-bold">{word}</span> to confirm</>} value={typed} onChange={(e) => setTyped(e.target.value)} />
            )}
            {open.status === 'IN_GRACE' && (
              <Alert tone="info" icon={<Clock className="h-4 w-4 text-blue-600" />}>The grace period is not over. This can be processed from {formatDate(open.dueAt)}.</Alert>
            )}
            {open.status === 'PROCESSED' && (
              <Alert tone="success" icon={<CheckCircle2 className="h-4 w-4 text-success-600" />}>Already processed.</Alert>
            )}
          </div>
        )}
      </Drawer>

      {guide.isOpen && (
        <PageGuide
          title="Deletion requests"
          description="People and shops that asked to be deleted. You process each one by hand after the waiting period."
          flowTitle="Life of a request"
          flow={[
            { label: 'Asks to delete', icon: UserX, color: '#4f46e5' },
            { label: 'Grace period', hint: 'User 30 days, shop 7', icon: Clock, color: '#d97706' },
            { label: 'Due', hint: 'You process it', icon: Trash2, color: '#e11d48' },
            { label: 'Processed', icon: CheckCircle2, color: '#059669' },
          ]}
          steps={[
            { icon: Clock, color: '#d97706', title: 'Grace period', text: 'During grace the owner can still cancel. Nothing can be processed yet.' },
            { icon: Trash2, color: '#e11d48', title: 'Process when due', text: 'Open a due request, read what will happen, type the confirm words and process it.' },
            { icon: CheckCircle2, color: '#059669', title: 'Kept for audit', text: 'Processed and cancelled requests stay listed. Every step is in the activity log.' },
          ]}
          tips={['Business records are not deleted. Personal details are anonymized.', 'Super admin accounts cannot be processed here.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
