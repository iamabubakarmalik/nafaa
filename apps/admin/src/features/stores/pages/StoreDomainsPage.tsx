/**
 * Domains monitor: every custom domain on Nafaa Stores websites with its
 * hosting status, DNS records and last check. Retry re-adds a domain on
 * hosting when it is missing and checks it again; "Remove from hosting"
 * detaches a stuck domain while the store and its data stay.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Globe, Lightbulb, RefreshCw, Search, Server, Tag, Unplug, XCircle } from 'lucide-react';
import {
  Alert, Button, Drawer, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, confirmDialog, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStoresApi, type DomainMonitorRow, type DomainStatus } from '@/api/admin-stores.api';
import { DetailList, ListCard, useListParams } from '@/ui';
import { useCan } from '@/lib/access';
import { apiError } from '@/lib/errors';
import { formatRelative, num } from '@/lib/format';
import { Empty, Pill } from '@/features/shared/kit';
import { DomainStatusBadge, dateTime } from '../components/StoresUi';

const PAGE_SIZE = 50;
const STATUSES = [['ALL', 'Any status'], ['ACTIVE', 'Active'], ['PENDING', 'Pending'], ['VERIFYING', 'Verifying'], ['ERROR', 'Error']] as const;

export default function StoreDomainsPage() {
  const guide = usePageGuide();
  const can = useCan();
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useListParams({ status: 'ALL' }, { limit: PAGE_SIZE });
  const { status } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : (status as DomainStatus) };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-store-domains', query, list.page],
    queryFn: () => adminStoresApi.domains({ ...query, page: list.page }),
    placeholderData: keepPreviousData,
  });
  const overview = useQuery({ queryKey: ['admin-stores-overview', '30'], queryFn: () => adminStoresApi.overview(30), staleTime: 60_000 });
  const d = overview.data?.domains;
  const rows = data?.items ?? [];
  const open = rows.find((r) => r.id === openId) ?? null;
  const canManage = can('stores.manage');

  const done = () => {
    void qc.invalidateQueries({ queryKey: ['admin-store-domains'] });
    void qc.invalidateQueries({ queryKey: ['admin-stores-overview'] });
  };
  const retry = useMutation({
    mutationFn: (r: DomainMonitorRow) => adminStoresApi.retryDomain(r.id),
    onSuccess: (res) => { toast.success(res.status === 'ACTIVE' ? `${res.hostname} is active` : `${res.hostname}: ${res.status.toLowerCase()}`); done(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const detach = useMutation({
    mutationFn: (r: DomainMonitorRow) => adminStoresApi.removeFromVercel(r.store.id, r.id),
    onSuccess: () => { toast.success('Removed from hosting. The store and its data stay.'); done(); },
    onError: (e) => toast.error(apiError(e)),
  });
  const askDetach = async (r: DomainMonitorRow) => {
    if (await confirmDialog({
      title: `Remove ${r.hostname} from hosting?`,
      text: `Detaches this domain from the hosting project and marks it "Removed by Nafaa". ${r.store.name} keeps working on its free address, and the domain row and all store data stay.`,
      yes: 'Remove from hosting', danger: true,
    })) detach.mutate(r);
  };

  const chips = status !== 'ALL' ? [<FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{STATUSES.find(([v]) => v === status)?.[1]}</FilterChip>] : undefined;

  return (
    <PageShell>
      <PageHero
        title="Domains"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching || retry.isPending || detach.isPending}
        loading={overview.isLoading}
        actions={<button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>}
        stats={d ? [
          { label: 'Active', value: num(d.active) },
          { label: 'Pending', value: num(d.pending), hint: 'Waiting for DNS or SSL' },
          { label: 'With errors', value: num(d.error) },
          { label: 'Websites with a domain', value: num(overview.data?.counts.withCustomDomain) },
        ] : undefined}
      />

      {data && !data.ready && (
        <Alert tone="warning" title="Hosting is not connected on the server">Domains cannot be added or checked until the hosting settings are set on the API server. Existing rows are shown as stored.</Alert>
      )}

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search domain name" />}
        chips={chips}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={STATUSES.map(([value, label]) => ({ value, label }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Globe className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load domains' : 'No domains match'}
        emptyText={error ? 'The stores service may not be running yet.' : 'Shops have not added custom domains yet, or the filters hide them.'}
        page={list.page} limit={PAGE_SIZE} total={data?.total} onPage={list.setPage}
      >
        <Table minWidth="60rem">
          <THead>
            <Tr><Th>Domain</Th><Th>Store</Th><Th>Status</Th><Th>DNS</Th><Th>Last checked</Th><Th>Added</Th><Th align="right">Actions</Th></Tr>
          </THead>
          <TBody>
            {rows.map((r) => {
              const ok = r.records.filter((x) => x.ok).length;
              return (
                <Tr key={r.id} interactive onClick={() => setOpenId(r.id)}>
                  <Td>
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">{r.hostname}{r.isPrimary && <Pill tone="indigo">Primary</Pill>}</div>
                    {r.redirectTo && <div className="text-[0.75rem] text-slate-500">Redirects to {r.redirectTo}</div>}
                    {r.error && <div className="max-w-[18rem] truncate text-[0.75rem] text-rose-700" title={r.error}>{r.error}</div>}
                  </Td>
                  <Td><Link to={`/stores/${r.store.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-800 hover:text-brand-700">{r.store.name}</Link><div className="text-[0.75rem] text-slate-500">{r.store.slug}</div></Td>
                  <Td><DomainStatusBadge status={r.status} /></Td>
                  <Td>{r.records.length ? <span className={ok === r.records.length ? 'text-emerald-700' : 'text-amber-700'}>{ok} of {r.records.length} OK</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td className="whitespace-nowrap">{r.lastCheckedAt ? formatRelative(r.lastCheckedAt) : <span className="text-slate-400">Never</span>}</Td>
                  <Td className="whitespace-nowrap">{formatRelative(r.createdAt)}</Td>
                  <Td align="right">
                    {canManage ? (
                      <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button size="xs" variant="secondary" leftIcon={<RefreshCw className="h-3.5 w-3.5" />} disabled={retry.isPending} onClick={() => retry.mutate(r)}>Retry</Button>
                        <Button size="xs" variant="critical" leftIcon={<Unplug className="h-3.5 w-3.5" />} disabled={detach.isPending} onClick={() => askDetach(r)} aria-label={`Remove ${r.hostname} from hosting`}>Remove</Button>
                      </div>
                    ) : <span className="text-slate-400">—</span>}
                  </Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open?.hostname ?? ''} description={open ? `${open.store.name} · ${open.kind === 'apex' ? 'Root domain' : open.kind === 'www' ? 'www domain' : 'Subdomain'}` : undefined} size="lg"
        footer={open && canManage ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="critical" leftIcon={<Unplug className="h-4 w-4" />} disabled={detach.isPending} onClick={() => askDetach(open)}>Remove from hosting</Button>
            <Button leftIcon={<RefreshCw className="h-4 w-4" />} loading={retry.isPending} onClick={() => retry.mutate(open)}>Retry</Button>
          </div>
        ) : undefined}>
        {open && (
          <div className="space-y-5 p-4 sm:p-5">
            <DetailList cols={2} items={[
              { label: 'Status', value: <DomainStatusBadge status={open.status} /> },
              { label: 'SSL', value: open.sslReady ? 'Ready' : 'Not yet' },
              { label: 'Primary', value: open.isPrimary ? 'Yes' : 'No' },
              { label: 'Redirects to', value: open.redirectTo },
              { label: 'Last checked', value: dateTime(open.lastCheckedAt) },
              { label: 'Added', value: dateTime(open.createdAt) },
              { label: 'Error', value: open.error ? <span className="text-rose-700">{open.error}</span> : null },
              { label: 'Store', value: <Link to={`/stores/${open.store.id}`} className="font-medium text-brand-700 hover:underline">{open.store.name}</Link> },
            ]} />
            <div>
              <h3 className="mb-2 text-[0.8125rem] font-semibold text-slate-900">DNS records the shop must set</h3>
              {!open.records.length ? <Empty>No records stored for this domain.</Empty> : (
                <Table minWidth="30rem">
                  <THead><Tr><Th>Type</Th><Th>Name</Th><Th>Value</Th><Th>Found</Th></Tr></THead>
                  <TBody>
                    {open.records.map((x, i) => (
                      <Tr key={i}>
                        <Td className="font-mono text-[0.75rem]">{x.type}</Td>
                        <Td className="font-mono text-[0.75rem]">{x.name}</Td>
                        <Td className="max-w-[14rem] break-all font-mono text-[0.75rem]">{x.value}</Td>
                        <Td>{x.ok == null ? <span className="text-slate-400">Not checked</span> : x.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Found" /> : <XCircle className="h-4 w-4 text-rose-600" aria-label="Missing" />}</Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              )}
            </div>
            <p className="text-[0.75rem] text-slate-500">Removing from hosting only detaches the domain. The store, its products, orders and the domain row stay.</p>
          </div>
        )}
      </Drawer>

      {guide.isOpen && (
        <PageGuide
          title="Domains"
          description="Custom domains that shops connect to their websites."
          flowTitle="How a domain connects"
          flow={[
            { label: 'Shop adds', hint: 'In the website editor', icon: Globe, color: '#4f46e5' },
            { label: 'DNS set', hint: 'At their registrar', icon: Server, color: '#0284c7' },
            { label: 'Verified', hint: 'SSL issued', icon: CheckCircle2, color: '#059669' },
            { label: 'Stuck?', hint: 'Retry or remove', icon: XCircle, color: '#e11d48' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Filter by status', text: 'Pending domains wait for DNS. Errors need a look: wrong records, or the domain is used elsewhere.' },
            { icon: Search, color: '#0284c7', title: 'Open a domain', text: 'Click a row to see the DNS records the shop must set and which ones were found.' },
            { icon: RefreshCw, color: '#059669', title: 'Retry or remove', text: 'Retry re-adds the domain on hosting and checks it. Remove detaches a stuck domain; store data stays.' },
          ]}
          tips={['The free store address always works, even when a custom domain fails.', 'Pending checks run on their own; Retry only speeds one up.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
