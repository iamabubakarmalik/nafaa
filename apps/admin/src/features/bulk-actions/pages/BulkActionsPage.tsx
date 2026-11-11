/**
 * Bulk actions: pick shops (search, filter, tick across pages) and either
 * change their status or send them one message.
 */

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, Lightbulb, ListChecks, Megaphone, Pause, Play, Send, Store, Tag, X } from 'lucide-react';
import {
  Alert, Button, Card, Checkbox, FilterBar, FilterChip, FilterMenu, Input, PageHero, PageShell, SearchField, Segmented, Select, Table, TBody, Td, Textarea, Th, THead, Tr, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminTenantsApi, type TenantStatus } from '@/api/admin-tenants.api';
import { adminBulkApi } from '@/api/admin-bulk.api';
import { ListCard, StatusBadge, fetchAllPages, statusLabel, useListParams } from '@/ui';

const STATUSES: Array<TenantStatus | 'ALL'> = ['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];
const num = (n: number) => n.toLocaleString('en-PK');

export default function BulkActionsPage() {
  const guide = usePageGuide();
  const list = useListParams({ status: 'ALL' });
  const { status } = list.filters;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [mode, setMode] = useState<'STATUS' | 'BROADCAST'>('STATUS');
  const [newStatus, setNewStatus] = useState('SUSPENDED');
  const [reason, setReason] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : (status as TenantStatus) };
  const shops = useQuery({
    queryKey: ['admin', 'bulk-shops', query, list.page, list.limit],
    queryFn: () => adminTenantsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const rows = shops.data?.items ?? [];
  const total = shops.data?.meta.total ?? 0;
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const fail = (e: any) => toast.error(e?.response?.data?.message || 'Could not complete the action');
  const statusMut = useMutation({
    mutationFn: () => adminBulkApi.updateStatus([...selected], newStatus, reason || undefined),
    onSuccess: (r) => { toast.success(`${num(r.updatedCount)} shops updated`); setSelected(new Set()); setReason(''); shops.refetch(); },
    onError: fail,
  });
  const sendMut = useMutation({
    mutationFn: () => adminBulkApi.broadcast([...selected], title, message),
    onSuccess: (r) => { toast.success(`Message sent to ${num(r.sentCount)} shops`); setSelected(new Set()); setTitle(''); setMessage(''); },
    onError: fail,
  });

  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allOnPage) rows.forEach((r) => n.delete(r.id)); else rows.forEach((r) => n.add(r.id));
    return n;
  });
  const selectAllMatching = async () => {
    setSelecting(true);
    try {
      const all = await fetchAllPages((page) => adminTenantsApi.list({ ...query, page, limit: 100 }));
      setSelected(new Set(all.map((t) => t.id)));
    } catch {
      toast.error('Could not select all shops');
    } finally {
      setSelecting(false);
    }
  };

  const apply = async () => {
    if (!selected.size) return toast.error('Pick at least one shop');
    if (mode === 'STATUS') {
      const ok = await confirmDialog({
        title: `Set ${num(selected.size)} shops to ${statusLabel(newStatus)}?`,
        text: newStatus === 'ACTIVE' ? 'These shops will be able to sign in again.' : 'These shops may lose access. You can change this back later.',
        yes: 'Apply',
        danger: newStatus !== 'ACTIVE',
      });
      if (ok) statusMut.mutate();
    } else {
      if (!title.trim() || !message.trim()) return toast.error('Write a title and a message');
      if (await confirmDialog({ title: `Send to ${num(selected.size)} shops?`, text: 'Shop owners will see this message in their app.', yes: 'Send' })) sendMut.mutate();
    }
  };

  const chips = status !== 'ALL' ? [<FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>] : [];
  const busy = statusMut.isPending || sendMut.isPending;

  return (
    <PageShell>
      <PageHero
        title="Bulk actions"
        chip={`${num(selected.size)} selected`}
        busy={shops.isFetching}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={[
          { label: 'Selected shops', value: num(selected.size) },
          { label: 'Matching the filters', value: shops.data ? num(total) : '—' },
        ]}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <FilterBar
            search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, username or phone" />}
            chips={chips.length ? chips : undefined}
            onClear={list.clear}
          >
            <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right"
              options={STATUSES.map((v) => ({ value: v, label: v === 'ALL' ? 'All statuses' : statusLabel(v) }))} />
          </FilterBar>

          <ListCard
            title="Pick shops"
            actions={
              <>
                {total > rows.length && <Button size="xs" variant="secondary" loading={selecting} onClick={selectAllMatching}>Select all {num(total)}</Button>}
                {selected.size > 0 && <Button size="xs" variant="ghost" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => setSelected(new Set())}>Clear selection</Button>}
              </>
            }
            loading={shops.isLoading}
            empty={!rows.length}
            emptyIcon={<Store className="h-6 w-6" />}
            emptyTitle="No shops match"
            emptyText="Try another search or clear the filters."
            page={list.page} limit={list.limit} total={total} onPage={list.setPage} onLimit={list.setLimit}
          >
            <Table minWidth="34rem">
              <THead>
                <Tr>
                  <Th className="w-10"><Checkbox checked={allOnPage} onChange={togglePage} aria-label="Select all on this page" /></Th>
                  <Th>Shop</Th><Th>Status</Th><Th>Plan</Th>
                </Tr>
              </THead>
              <TBody>
                {rows.map((t) => (
                  <Tr key={t.id} interactive onClick={() => toggle(t.id)}>
                    <Td><Checkbox checked={selected.has(t.id)} onChange={() => toggle(t.id)} onClick={(e) => e.stopPropagation()} aria-label={`Select ${t.name}`} /></Td>
                    <Td><div className="font-semibold text-slate-900">{t.name}</div><div className="text-[0.75rem] text-slate-500">@{t.slug}</div></Td>
                    <Td><StatusBadge value={t.status} /></Td>
                    <Td className="text-slate-600">{t.subscriptions[0]?.plan.name ?? <span className="text-slate-400">No plan</span>}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </ListCard>
        </div>

        <div className="xl:sticky xl:top-4 xl:self-start">
          <Card title="Action" description={`Applies to ${num(selected.size)} selected ${selected.size === 1 ? 'shop' : 'shops'}.`}>
            <div className="space-y-4">
              <Segmented value={mode} onChange={setMode} label="Action type" items={[{ value: 'STATUS', label: 'Change status' }, { value: 'BROADCAST', label: 'Send message' }]} />
              {mode === 'STATUS' ? (
                <>
                  <Select label="New status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                    options={['ACTIVE', 'SUSPENDED', 'EXPIRED'].map((v) => ({ value: v, label: statusLabel(v) }))} />
                  <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
                </>
              ) : (
                <>
                  <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <Textarea label="Message" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
                </>
              )}
              <Button fullWidth size="lg" loading={busy} disabled={!selected.size}
                leftIcon={mode === 'BROADCAST' ? <Send className="h-4 w-4" /> : newStatus === 'ACTIVE' ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                onClick={apply}>
                {mode === 'BROADCAST' ? `Send to ${num(selected.size)} shops` : `Apply to ${num(selected.size)} shops`}
              </Button>
              <Alert tone="warning">This changes many shops at once. Check your selection first.</Alert>
            </div>
          </Card>
        </div>
      </div>

      {guide.isOpen && (
        <PageGuide
          title="Bulk actions"
          description="Change many shops at once, or send them all the same message."
          flowTitle="How a bulk action runs"
          flow={[
            { label: 'Filter shops', icon: Tag, color: '#4f46e5' },
            { label: 'Tick shops', hint: 'Across pages', icon: ListChecks, color: '#0284c7' },
            { label: 'Choose action', hint: 'Status or message', icon: Layers, color: '#d97706' },
            { label: 'Confirm', icon: Megaphone, color: '#059669' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Narrow the list', text: 'Search or filter by status so only the shops you mean are shown.' },
            { icon: ListChecks, color: '#0284c7', title: 'Pick shops', text: 'Tick rows. Your picks stay when you change page. Select all picks every shop that matches the filters.' },
            { icon: Megaphone, color: '#059669', title: 'Apply', text: 'Change their status or send one message. You are asked to confirm first.' },
          ]}
          tips={['Suspended shops cannot sign in.', 'The message appears in each shop owner’s app.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
