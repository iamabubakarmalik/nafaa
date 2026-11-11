/**
 * Every online channel across shops, with health columns (last sync, last
 * order, failed syncs, webhook errors, push failures, Shopify plan) and a
 * drill-down panel with logs and actions. Search and filters run on the server.
 */

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Download, Lightbulb, Plug, Pause, Search, Store, Tag, Wrench } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, SearchField, PageShell, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCommerceApi, type CommerceChannelRow } from '@/api/admin-commerce.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { num, Pill } from '@/features/shared/kit';
import { ChannelDrawer } from '../components/ChannelDrawer';
import { ChannelStatus, KINDS, kindLabel, when } from '../components/CommerceUi';

const STATUSES = [['ALL', 'Any status'], ['CONNECTED', 'Connected'], ['PAUSED', 'Paused'], ['ERROR', 'Error'], ['DISCONNECTED', 'Disconnected'], ['PENDING', 'Pending']];

export default function CommerceChannelsPage() {
  const guide = usePageGuide();
  const [params, setParams] = useSearchParams();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ kind: 'ALL', status: 'ALL', problems: 'no' }, { limit: 50 });
  const { kind, status, problems } = list.filters;
  const open = params.get('channel');
  const setOpen = (id: string) => { const p = new URLSearchParams(params); if (id) p.set('channel', id); else p.delete('channel'); setParams(p, { replace: true }); };

  const query = {
    search: list.debouncedSearch || undefined,
    kind: kind === 'ALL' ? undefined : kind,
    status: status === 'ALL' ? undefined : status,
    problems: problems === 'yes',
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-commerce-channels', query, list.page, list.limit],
    queryFn: () => adminCommerceApi.channels({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  // Header numbers come from the overview, which counts every channel by health.
  const overview = useQuery({ queryKey: ['admin-commerce-overview', 'channels-header'], queryFn: () => adminCommerceApi.overview(), staleTime: 60_000 });
  const sum = (k: 'total' | 'connected' | 'paused' | 'error') => (overview.data?.channels ?? []).reduce((s, c) => s + c[k], 0);
  const rows = data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminCommerceApi.channels({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: Math.ceil(r.meta.total / r.meta.limit) } };
      });
      downloadCsv<CommerceChannelRow>('channels', all, [
        { label: 'Shop', value: (c) => c.tenantName }, { label: 'Channel', value: (c) => c.name }, { label: 'Type', value: (c) => kindLabel(c.kind) },
        { label: 'Status', value: (c) => (c.isActive ? c.status : 'PAUSED') }, { label: 'Site', value: (c) => c.siteUrl },
        { label: 'Last sync', value: (c) => c.lastSyncAt }, { label: 'Last order', value: (c) => c.lastOrderAt },
        { label: 'Links', value: (c) => c.links }, { label: 'Push failures', value: (c) => c.pushFailures },
        { label: 'Sync errors 7d', value: (c) => c.syncErrors7d }, { label: 'Webhook errors 7d', value: (c) => c.webhookErrors7d },
      ]);
      toast.success(`${num(all.length)} channels exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    kind !== 'ALL' && <FilterChip key="k" onRemove={() => list.setFilter('kind', 'ALL')}>{kindLabel(kind)}</FilterChip>,
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{STATUSES.find(([v]) => v === status)?.[1]}</FilterChip>,
    problems === 'yes' && <FilterChip key="p" onRemove={() => list.setFilter('problems', 'no')}>With problems</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Channels"
        chip={data ? `${num(data.meta.total)} shown` : undefined}
        busy={isFetching}
        loading={overview.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={overview.data ? [
          { label: 'Channels', value: num(sum('total')) },
          { label: 'Connected', value: num(sum('connected')) },
          { label: 'Paused', value: num(sum('paused')) },
          { label: 'With errors', value: num(sum('error')) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop, channel name, site address or channel id" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Store} label="Type" value={kind} active={kind !== 'ALL'} onChange={(v) => list.setFilter('kind', v)}
          options={[{ value: 'ALL', label: 'All types' }, ...KINDS.map((k) => ({ value: k, label: kindLabel(k) }))]} />
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={STATUSES.map(([value, label]) => ({ value, label }))} />
        <FilterMenu icon={AlertTriangle} label="Problems" value={problems} active={problems === 'yes'} onChange={(v) => list.setFilter('problems', v)} align="right"
          options={[{ value: 'no', label: 'All channels' }, { value: 'yes', label: 'With problems only' }]} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Plug className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load channels' : 'No channels match'}
        emptyText={error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="64rem">
          <THead>
            <Tr>
              <Th>Shop</Th><Th>Channel</Th><Th>Status</Th><Th>Last sync</Th><Th>Last order</Th>
              <Th align="right">Links</Th><Th align="right">Push failures</Th>
              <Th align="right" title="Failed syncs, then webhook errors, in the last 7 days">Errors (7 days)</Th><Th>Plan</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id} interactive onClick={() => setOpen(c.id)}>
                <Td>
                  <Link to={`/tenants/${c.tenantId}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-900 hover:text-brand-700">{c.tenantName}</Link>
                  {c.tenantStatus !== 'ACTIVE' && <div className="text-[0.75rem] text-slate-500">{c.tenantStatus.toLowerCase()}</div>}
                </Td>
                <Td>
                  <div className="font-medium text-slate-900">{c.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{kindLabel(c.kind)}{c.siteUrl ? ` · ${c.siteUrl.replace(/^https?:\/\//, '')}` : ''}</div>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1"><ChannelStatus status={c.status} isActive={c.isActive} />{c.killSwitch && <Pill tone="rose">Kill switch</Pill>}</div>
                  {c.channelError && <div className="mt-1 max-w-[14rem] truncate text-[0.75rem] text-rose-700" title={c.channelError}>{c.channelError}</div>}
                </Td>
                <Td className="whitespace-nowrap">{when(c.lastSyncAt)}</Td>
                <Td className="whitespace-nowrap">{when(c.lastOrderAt)}</Td>
                <Td align="right">{c.links}</Td>
                <Td align="right"><Bad v={c.pushFailures} /></Td>
                <Td align="right" className="whitespace-nowrap"><Bad v={c.syncErrors7d} /> · <Bad v={c.webhookErrors7d} /></Td>
                <Td><Plan c={c} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      <ChannelDrawer id={open} onClose={() => setOpen('')} />

      {guide.isOpen && (
        <PageGuide
          title="Channels"
          description="Every place shops sell online, with the health of each connection."
          flowTitle="What a channel does"
          flow={[
            { label: 'Connect', hint: 'Shop links a channel', icon: Plug, color: '#4f46e5' },
            { label: 'Sync', hint: 'Products and stock', icon: Wrench, color: '#0284c7' },
            { label: 'Orders', hint: 'Come into Nafaa', icon: Store, color: '#059669' },
            { label: 'Problem?', hint: 'Pause or retry here', icon: Pause, color: '#e11d48' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find a channel', text: 'Search by shop, channel name or site address, then filter by type or status.' },
            { icon: AlertTriangle, color: '#e11d48', title: 'Spot trouble', text: 'Use "With problems only" to see failed syncs, webhook errors and push failures.' },
            { icon: Wrench, color: '#059669', title: 'Act', text: 'Click a row to read logs, pause or resume, re-scan the catalog or retry failed links.' },
          ]}
          tips={['Every action is saved in the shop’s activity log.', 'Errors (7 days) shows failed syncs first, then webhook errors.']}
          shortcuts={[['/', 'Search'], ['↑ ↓', 'Move between rows'], ['Enter', 'Open channel'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}

function Bad({ v }: { v: number }) {
  return v ? <span className="font-bold text-rose-700">{v}</span> : <span className="text-slate-400">0</span>;
}

function Plan({ c }: { c: CommerceChannelRow }) {
  if (!c.shopifyPlan) return <span className="text-slate-400">—</span>;
  if (c.shopifyPlan.billing !== 'shopify') return <Pill>Direct</Pill>;
  return <Pill tone={c.shopifyPlan.active ? 'emerald' : 'amber'}>{c.shopifyPlan.active ? c.shopifyPlan.name ?? 'Active' : 'No plan'}</Pill>;
}
