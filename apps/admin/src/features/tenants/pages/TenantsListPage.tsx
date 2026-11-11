/**
 * Shops (tenants): every business on Nafaa, searchable and filterable on the
 * server (status, industry, way of selling), with CSV export of the whole
 * filtered list. Reference page for the admin page standard (PAGES.md).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, ArrowDownUp, Building2, Download, Factory, Lightbulb, Package, ShoppingCart, Store, Tag, UserPlus, Users,
} from 'lucide-react';
import {
  FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton,
} from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminTenantsApi, type AdminTenant, type TenantStatus } from '@/api/admin-tenants.api';
import { BUSINESS_TYPES, industryForType } from '@/lib/industries';
import { formatDate, formatDateTime } from '@/lib/format';
import { LastSeen, ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { BUSINESS_MODELS, BusinessModelChips } from '../components/BusinessModelChips';
import { num } from '@/lib/format';

const STATUSES: Array<TenantStatus | 'ALL'> = ['ALL', 'ACTIVE', 'TRIAL', 'SUSPENDED', 'EXPIRED'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'active', label: 'Last active' },
] as const;
const ACTIVITY = [
  { value: 'ALL', label: 'Any activity' },
  { value: 'online', label: 'Online now' },
  { value: 'today', label: 'Active today' },
  { value: 'week', label: 'Active this week' },
  { value: 'idle7', label: 'Not seen for 7+ days' },
  { value: 'idle30', label: 'Not seen for 30+ days' },
  { value: 'never', label: 'Never used' },
];


export default function TenantsListPage() {
  const navigate = useNavigate();
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', industry: 'ALL', model: 'ALL', activity: 'ALL', sort: 'newest' });
  const { status, industry, model, activity, sort } = list.filters;

  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : (status as TenantStatus),
    industry: industry === 'ALL' ? undefined : industry,
    model: model === 'ALL' ? undefined : model,
    activity: activity === 'ALL' ? undefined : activity,
    sort: sort as 'newest' | 'oldest' | 'name' | 'active',
  };
  const tenants = useQuery({
    queryKey: ['admin', 'tenants', query, list.page, list.limit],
    queryFn: () => adminTenantsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'tenants', 'stats'], queryFn: adminTenantsApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows = tenants.data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminTenantsApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminTenant>('shops', all, [
        { label: 'Name', value: (t) => t.name },
        { label: 'Username', value: (t) => t.slug },
        { label: 'Phone', value: (t) => t.phone },
        { label: 'Status', value: (t) => t.status },
        { label: 'Industry', value: (t) => industryForType(t.businessType ?? 'NONE').label },
        { label: 'Sells', value: (t) => (t.businessModels ?? []).join(' ') },
        { label: 'Plan', value: (t) => t.subscriptions[0]?.plan.name },
        { label: 'Users', value: (t) => t._count.users },
        { label: 'Products', value: (t) => t._count.products },
        { label: 'Sales', value: (t) => t._count.sales },
        { label: 'Customers', value: (t) => t._count.customers },
        { label: 'Joined', value: (t) => formatDateTime(t.createdAt) },
        { label: 'Last active', value: (t) => (t.lastActiveAt ? formatDateTime(t.lastActiveAt) : 'Never') },
      ]);
      toast.success(`${num(all.length)} shops exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const industryOptions = [
    { value: 'ALL', label: 'All industries' },
    ...(s?.industries ?? BUSINESS_TYPES.map((type) => ({ type, count: undefined as number | undefined })))
      .map((r) => ({ value: r.type, label: `${industryForType(r.type).label}${r.count != null ? ` (${r.count})` : ''}` })),
  ];
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{statusLabel(status)}</FilterChip>,
    industry !== 'ALL' && <FilterChip key="i" onRemove={() => list.setFilter('industry', 'ALL')}>{industryForType(industry).label}</FilterChip>,
    activity !== 'ALL' && <FilterChip key="a" onRemove={() => list.setFilter('activity', 'ALL')}>{ACTIVITY.find((a) => a.value === activity)?.label}</FilterChip>,
    model !== 'ALL' && <FilterChip key="m" onRemove={() => list.setFilter('model', 'ALL')}>{BUSINESS_MODELS.find((m) => m.id === model)?.label ?? model}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Shops"
        chip={s ? `${num(s.total)} on Nafaa` : undefined}
        busy={tenants.isFetching}
        loading={stats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting}>
              <Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
            <button type="button" className={heroButton} onClick={guide.open} aria-label="How this page works (G)"><Lightbulb className="h-4 w-4" /></button>
          </>
        }
        stats={s ? [
          { label: 'Active (paying)', value: num(s.active), hint: `${num(s.trial)} on trial · ${num(s.suspended)} suspended` },
          { label: 'Online now', value: num(s.onlineNow), hint: `${num(s.activeToday)} active today` },
          { label: 'New this week', value: num(s.newThisWeek) },
          { label: 'Not seen 7+ days', value: num(s.idle7) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, username or phone" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={STATUSES.map((v) => ({ value: v, label: v === 'ALL' ? 'All statuses' : statusLabel(v) }))} />
        <FilterMenu icon={Activity} label="Activity" value={activity} active={activity !== 'ALL'} onChange={(v) => list.setFilter('activity', v)} options={ACTIVITY} />
        <FilterMenu icon={Factory} label="Industry" value={industry} active={industry !== 'ALL'} onChange={(v) => list.setFilter('industry', v)} options={industryOptions} width="w-72" />
        <FilterMenu icon={Store} label="Sells" value={model} active={model !== 'ALL'} onChange={(v) => list.setFilter('model', v)}
          options={[{ value: 'ALL', label: 'All ways of selling' }, ...BUSINESS_MODELS.map((m) => ({ value: m.id, label: m.id === 'RETAIL' ? 'Retail (incl. not answered)' : m.label }))]} />
        <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} onChange={(v) => list.setFilter('sort', v)} options={[...SORTS]} align="right" />
      </FilterBar>

      <ListCard
        loading={tenants.isLoading}
        empty={!rows.length}
        emptyIcon={<Building2 className="h-6 w-6" />}
        emptyTitle="No shops match"
        emptyText="Try another search or clear the filters."
        page={list.page}
        limit={list.limit}
        total={tenants.data?.meta.total}
        onPage={list.setPage}
        onLimit={list.setLimit}
      >
        <Table minWidth="66rem">
          <THead>
            <Tr>
              <Th>Shop</Th>
              <Th>Status</Th>
              <Th>Industry</Th>
              <Th>Plan</Th>
              <Th align="right">Users</Th>
              <Th align="right">Products</Th>
              <Th align="right">Sales</Th>
              <Th>Last active</Th>
              <Th align="right">Joined</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((t) => {
              const sub = t.subscriptions[0];
              const ind = industryForType(t.businessType ?? 'NONE');
              return (
                <Tr key={t.id} interactive onClick={() => navigate(`/tenants/${t.id}`)}>
                  <Td>
                    <div className="font-semibold text-slate-900">{t.name}</div>
                    <div className="text-[0.75rem] text-slate-500">@{t.slug}{t.phone ? ` · ${t.phone}` : ''}</div>
                  </Td>
                  <Td><StatusBadge value={t.status} /></Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${ind.color}1a`, color: ind.color }}><ind.icon className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0">
                        <div className="truncate text-slate-900">{ind.label}</div>
                        <BusinessModelChips models={t.businessModels} />
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {sub ? (
                      <>
                        <div className="font-medium text-slate-900">{sub.plan.name}</div>
                        <div className="text-[0.75rem] text-slate-500">{statusLabel(sub.status)} · {statusLabel(sub.interval)}</div>
                      </>
                    ) : <span className="text-[0.8125rem] text-slate-400">No plan</span>}
                  </Td>
                  <Td align="right"><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-slate-400" />{num(t._count.users)}</span></Td>
                  <Td align="right"><span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5 text-slate-400" />{num(t._count.products)}</span></Td>
                  <Td align="right"><span className="inline-flex items-center gap-1"><ShoppingCart className="h-3.5 w-3.5 text-slate-400" />{num(t._count.sales)}</span></Td>
                  <Td><LastSeen at={t.lastActiveAt} compact /></Td>
                  <Td align="right" className="whitespace-nowrap text-slate-500" title={formatDateTime(t.createdAt)}>{formatDate(t.createdAt)}<div className="text-[0.6875rem] text-slate-400">{new Date(t.createdAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })}</div></Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Shops"
          description="Every business that signed up on Nafaa. Open a shop to see its full profile and act on it."
          flowTitle="A shop's life on Nafaa"
          flow={[
            { label: 'Signs up', hint: 'Trial starts', icon: UserPlus, color: '#4f46e5' },
            { label: 'Trial', hint: 'Free days', icon: Store, color: '#0284c7' },
            { label: 'Active', hint: 'Paid plan', icon: Building2, color: '#059669' },
            { label: 'Suspended / expired', hint: 'Cannot sign in', icon: Tag, color: '#e11d48' },
          ]}
          steps={[
            { icon: Tag, color: '#4f46e5', title: 'Filter', text: 'Narrow by status, industry and way of selling. Filters stay in the address, so you can share the link.' },
            { icon: Building2, color: '#0284c7', title: 'Open a shop', text: 'Click a row for the shop’s profile, plan, staff and activity, and to suspend or reactivate it.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every shop that matches the filters, not only this page.' },
          ]}
          tips={['Press / to jump to the search box.', 'Use ↑ ↓ to move between rows and Enter to open one.']}
          shortcuts={[['/', 'Search'], ['↑ ↓', 'Move between rows'], ['Enter', 'Open shop'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
