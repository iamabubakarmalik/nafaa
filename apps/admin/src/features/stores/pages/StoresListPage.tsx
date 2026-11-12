/**
 * Every Nafaa Stores website across shops: status, theme, domains, add-on,
 * last publish and 30-day orders and sales value. Search, filters, sort and
 * pages run on the server; a row opens the store page.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, Download, Globe, Lightbulb, MousePointerClick, Palette, Search, ShieldAlert, Store, Tag } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminStoresApi, THEME_IDS, type AdminStoreRow, type StoresListQuery } from '@/api/admin-stores.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { formatPKR, formatRelative, num } from '@/lib/format';
import { Pill } from '@/features/shared/kit';
import { DomainStatusBadge, StoreStatusBadge, themeLabel } from '../components/StoresUi';

const STATUSES = [['ALL', 'Any status'], ['LIVE', 'Live'], ['PASSWORD', 'Password'], ['DRAFT', 'Draft'], ['CLOSED', 'Closed'], ['SUSPENDED', 'Suspended']] as const;
const DOMAINS = [['ALL', 'Any domain'], ['custom', 'With a custom domain'], ['none', 'Subdomain only'], ['error', 'Domain with errors']] as const;
const SORTS = [['newest', 'Newest first'], ['gmv', 'Sales value (30 days)'], ['orders', 'Orders (30 days)'], ['name', 'Name A–Z']] as const;
const label = (list: ReadonlyArray<readonly [string, string]>, v: string) => list.find(([k]) => k === v)?.[1] ?? v;

export default function StoresListPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', domain: 'ALL', theme: 'ALL', sort: 'newest' });
  const { status, domain, theme, sort } = list.filters;

  const query: StoresListQuery = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : (status as StoresListQuery['status']),
    domain: domain === 'ALL' ? undefined : (domain as StoresListQuery['domain']),
    theme: theme === 'ALL' ? undefined : (theme as StoresListQuery['theme']),
    sort: sort as StoresListQuery['sort'],
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-stores-list', query, list.page, list.limit],
    queryFn: () => adminStoresApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  // Header numbers come from the overview, which counts every website by status.
  const overview = useQuery({ queryKey: ['admin-stores-overview', '30'], queryFn: () => adminStoresApi.overview(30), staleTime: 60_000 });
  const c = overview.data?.counts;
  const rows = data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminStoresApi.list({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<AdminStoreRow>('websites', all, [
        { label: 'Store', value: (s) => s.name }, { label: 'Address', value: (s) => s.subdomain },
        { label: 'Shop', value: (s) => s.tenant.name }, { label: 'Email', value: (s) => s.tenant.email }, { label: 'Phone', value: (s) => s.tenant.phone },
        { label: 'Status', value: (s) => (s.suspended ? 'SUSPENDED' : s.status) }, { label: 'Locked by Nafaa', value: (s) => (s.forcedPassword ? 'Yes' : 'No') },
        { label: 'Theme', value: (s) => themeLabel(s.themeId) }, { label: 'Domains', value: (s) => s.domains.map((d) => `${d.hostname} (${d.status})`).join('; ') },
        { label: 'Website add-on', value: (s) => (s.entitled ? 'Yes' : 'No') },
        { label: 'Orders 30d', value: (s) => s.orders30d }, { label: 'Sales value 30d', value: (s) => s.gmv30d },
        { label: 'Last published', value: (s) => s.lastPublishedAt }, { label: 'Launched', value: (s) => s.launchedAt }, { label: 'Created', value: (s) => s.createdAt },
      ]);
      toast.success(`${num(all.length)} websites exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{label(STATUSES, status)}</FilterChip>,
    domain !== 'ALL' && <FilterChip key="d" onRemove={() => list.setFilter('domain', 'ALL')}>{label(DOMAINS, domain)}</FilterChip>,
    theme !== 'ALL' && <FilterChip key="t" onRemove={() => list.setFilter('theme', 'ALL')}>{themeLabel(theme)} theme</FilterChip>,
    sort !== 'newest' && <FilterChip key="o" onRemove={() => list.setFilter('sort', 'newest')}>{label(SORTS, sort)}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Stores"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={overview.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting || !rows.length}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={c ? [
          { label: 'Websites', value: num(c.total) },
          { label: 'Live', value: num(c.LIVE) },
          { label: 'Password or draft', value: num(c.PASSWORD + c.DRAFT) },
          { label: 'Suspended', value: num(c.suspended) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search store name, address, shop or domain" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={STATUSES.map(([value, l]) => ({ value, label: l }))} />
        <FilterMenu icon={Globe} label="Domain" value={domain} active={domain !== 'ALL'} onChange={(v) => list.setFilter('domain', v)}
          options={DOMAINS.map(([value, l]) => ({ value, label: l }))} />
        <FilterMenu icon={Palette} label="Theme" value={theme} active={theme !== 'ALL'} onChange={(v) => list.setFilter('theme', v)}
          options={[{ value: 'ALL', label: 'Any theme' }, ...THEME_IDS.map((t) => ({ value: t, label: themeLabel(t) }))]} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} active={sort !== 'newest'} onChange={(v) => list.setFilter('sort', v)} align="right"
          options={SORTS.map(([value, l]) => ({ value, label: l }))} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Store className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load websites' : 'No websites match'}
        emptyText={error ? 'The stores service may not be running yet. Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="72rem">
          <THead>
            <Tr>
              <Th>Store</Th><Th>Shop</Th><Th>Status</Th><Th>Theme</Th><Th>Domains</Th><Th>Add-on</Th>
              <Th align="right">Orders (30d)</Th><Th align="right">Sales (30d)</Th><Th>Last published</Th><Th>Created</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((s) => (
              <Tr key={s.id} interactive onClick={() => navigate(`/stores/${s.id}`)}>
                <Td>
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{s.subdomain}</div>
                </Td>
                <Td>
                  <Link to={`/tenants/${s.tenant.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-slate-800 hover:text-brand-700">{s.tenant.name ?? '—'}</Link>
                  <div className="max-w-[14rem] truncate text-[0.75rem] text-slate-500">{s.tenant.email ?? s.tenant.phone ?? ''}</div>
                </Td>
                <Td><StoreStatusBadge status={s.status} suspended={s.suspended} forcedPassword={s.forcedPassword} /></Td>
                <Td>{themeLabel(s.themeId)}</Td>
                <Td>
                  {!s.domains.length ? <span className="text-slate-400">Subdomain only</span> : (
                    <div className="space-y-1">
                      {s.domains.slice(0, 2).map((d) => (
                        <div key={d.id} className="flex items-center gap-1.5">
                          <span className="max-w-[11rem] truncate text-[0.8125rem] text-slate-700" title={d.error ?? d.hostname}>{d.hostname}</span>
                          <DomainStatusBadge status={d.status} />
                        </div>
                      ))}
                      {s.domains.length > 2 && <div className="text-[0.75rem] text-slate-500">+{s.domains.length - 2} more</div>}
                    </div>
                  )}
                </Td>
                <Td>{s.entitled ? <Pill tone="emerald">Active</Pill> : <Pill tone="amber">Missing</Pill>}</Td>
                <Td align="right">{num(s.orders30d)}</Td>
                <Td align="right">{formatPKR(s.gmv30d)}</Td>
                <Td className="whitespace-nowrap">{s.lastPublishedAt ? formatRelative(s.lastPublishedAt) : <span className="text-slate-400">Never</span>}</Td>
                <Td className="whitespace-nowrap">{formatRelative(s.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Stores"
          description="Every merchant website, its domains and its recent sales."
          flowTitle="From list to action"
          flow={[
            { label: 'Find', hint: 'Search or filter', icon: Search, color: '#4f46e5' },
            { label: 'Open', hint: 'Store page', icon: MousePointerClick, color: '#0284c7' },
            { label: 'Act', hint: 'Suspend, lock, re-verify', icon: ShieldAlert, color: '#e11d48' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find a website', text: 'Search by store name, its address, the shop name or a custom domain.' },
            { icon: Tag, color: '#0d9488', title: 'Filter', text: 'Narrow by status, domain state or theme. Sort by sales value or orders to see the busiest stores.' },
            { icon: MousePointerClick, color: '#0284c7', title: 'Open a store', text: 'Click a row to see its settings, domains, orders, reports and actions.' },
          ]}
          tips={['"Add-on missing" means the shop no longer pays for the website add-on.', '"Locked by Nafaa" means password mode was forced from here; the shop cannot go live.', 'Export CSV exports the whole filtered list.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
