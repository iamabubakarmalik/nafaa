/**
 * Shops on Nafaa Market: section, city, listing state, approval and
 * verification, 30-day orders and GMV. The Approvals page is the same list
 * locked to shops waiting for approval, oldest first. Search, filters and
 * pages run on the server; a row opens the shop page.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownUp, BadgeCheck, CheckCircle2, Download, LayoutGrid, MapPin, MousePointerClick, Search, ShieldCheck, Star, Store, Tag } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, MARKET_GATES, type MarketShopRow } from '@/api/admin-market.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { formatPKR, formatRelative, num } from '@/lib/format';
import { Pill } from '@/features/shared/kit';
import { ApprovalBadge, GATE_LABEL, GateTag, GuideButton, LEVEL_LABEL, MarketGuide, ShopStateBadge, gateLabel, todayKey } from '../components/MarketUi';

const STATUSES = [['ALL', 'Any state'], ['listed', 'Published'], ['unlisted', 'Not published'], ['paused', 'Paused'], ['pending', 'Awaiting approval'], ['verified', 'Approved'], ['rejected', 'Rejected']] as const;
const SORTS = [['newest', 'Newest first'], ['orders', 'Most orders'], ['rating', 'Best rated'], ['name', 'Name A–Z']] as const;
const label = (list: ReadonlyArray<readonly [string, string]>, v: string) => list.find(([k]) => k === v)?.[1] ?? v;

export default function MarketShopsPage({ approvals = false }: { approvals?: boolean }) {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', gate: 'ALL', city: '', sort: 'newest' });
  const { gate, city, sort } = list.filters;
  const status = approvals ? 'pending' : list.filters.status;

  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    gate: gate === 'ALL' ? undefined : gate,
    city: city || undefined,
    sort,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-shops', query, list.page, list.limit],
    queryFn: () => adminMarketApi.shops({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  const today = todayKey();
  const overview = useQuery({ queryKey: ['admin-market-overview', 'shops-header', today], queryFn: () => adminMarketApi.overview(today, today), staleTime: 60_000 });
  const settings = useQuery({ queryKey: ['admin-market-settings'], queryFn: adminMarketApi.settings, staleTime: 5 * 60_000 });
  const s = overview.data?.shops;
  const rows = data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminMarketApi.shops({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<MarketShopRow>(approvals ? 'market-approvals' : 'market-shops', all, [
        { label: 'Shop', value: (r) => r.name }, { label: 'Slug', value: (r) => r.slug }, { label: 'Business', value: (r) => r.tenant.name },
        { label: 'Phone', value: (r) => r.tenant.phone }, { label: 'Section', value: (r) => gateLabel(r.gate) }, { label: 'City', value: (r) => r.city },
        { label: 'Published', value: (r) => (r.listed ? 'Yes' : 'No') }, { label: 'Paused', value: (r) => (r.isPaused ? 'Yes' : 'No') },
        { label: 'Approval', value: (r) => r.approval }, { label: 'Verification', value: (r) => LEVEL_LABEL[r.verificationLevel] },
        { label: 'Featured', value: (r) => (r.featured ? 'Yes' : 'No') }, { label: 'Rating', value: (r) => r.rating.toFixed(1) },
        { label: 'Orders 30d', value: (r) => r.orders30d }, { label: 'GMV 30d', value: (r) => r.gmv30d },
        { label: 'Published at', value: (r) => r.listedAt }, { label: 'Created', value: (r) => r.createdAt },
      ]);
      toast.success(`${num(all.length)} shops exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    !approvals && status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{label(STATUSES, status)}</FilterChip>,
    gate !== 'ALL' && <FilterChip key="g" onRemove={() => list.setFilter('gate', 'ALL')}>{gateLabel(gate)}</FilterChip>,
    city && <FilterChip key="c" onRemove={() => list.setFilter('city', '')}>{city}</FilterChip>,
    !approvals && sort !== 'newest' && <FilterChip key="o" onRemove={() => list.setFilter('sort', 'newest')}>{label(SORTS, sort)}</FilterChip>,
  ].filter(Boolean);
  const cityOptions = [{ value: '', label: 'Any city' }, ...(settings.data?.shopCities ?? []).map((c) => ({ value: c.city, label: `${c.city} (${c.shops})` }))];
  if (city && !cityOptions.some((o) => o.value === city)) cityOptions.push({ value: city, label: city });

  return (
    <PageShell>
      <PageHero
        title={approvals ? 'Approvals' : 'Shops'}
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={overview.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting || !rows.length}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={s ? [
          { label: 'Published', value: num(s.listed), hint: `${num(s.total)} with a Market profile` },
          { label: 'Live now', value: num(s.active) },
          { label: 'Awaiting approval', value: num(s.pending), hint: overview.data?.requireApproval ? 'Hidden until approved' : 'Approval is off' },
          { label: 'Paused', value: num(s.paused) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search shop, business, phone or city" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        {!approvals && (
          <FilterMenu icon={Tag} label="State" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
            options={STATUSES.map(([value, l]) => ({ value, label: l }))} />
        )}
        <FilterMenu icon={LayoutGrid} label="Section" value={gate} active={gate !== 'ALL'} onChange={(v) => list.setFilter('gate', v)}
          options={[{ value: 'ALL', label: 'Any section' }, ...MARKET_GATES.map((g) => ({ value: g, label: GATE_LABEL[g] }))]} />
        <FilterMenu icon={MapPin} label="City" value={city} active={!!city} onChange={(v) => list.setFilter('city', v)} options={cityOptions} />
        {!approvals && (
          <FilterMenu icon={ArrowDownUp} label="Sort" value={sort} active={sort !== 'newest'} onChange={(v) => list.setFilter('sort', v)} align="right"
            options={SORTS.map(([value, l]) => ({ value, label: l }))} />
        )}
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={approvals ? <CheckCircle2 className="h-6 w-6" /> : <Store className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load shops' : approvals ? 'Nothing waiting' : 'No shops match'}
        emptyText={error ? 'Try again in a moment.' : approvals ? 'Every published shop has been reviewed.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="70rem">
          <THead>
            <Tr>
              <Th>Shop</Th><Th>Section</Th><Th>City</Th><Th>State</Th><Th>Approval</Th><Th>Level</Th>
              <Th align="right">Rating</Th><Th align="right">Orders (30d)</Th><Th align="right">GMV (30d)</Th><Th>{approvals ? 'Published' : 'Created'}</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.shopId} interactive onClick={() => navigate(`/market/shops/${r.shopId}`)}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    {r.logoUrl ? <img src={r.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" /> : <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><Store className="h-4 w-4" /></div>}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-900">{r.name}{r.featured && <Pill tone="indigo">Featured</Pill>}</div>
                      <Link to={`/tenants/${r.tenantId}`} onClick={(e) => e.stopPropagation()} className="text-[0.75rem] text-slate-500 hover:text-brand-700">{r.tenant.name ?? '—'}</Link>
                    </div>
                  </div>
                </Td>
                <Td><GateTag gate={r.gate} /></Td>
                <Td>{r.city}{r.area && <div className="text-[0.75rem] text-slate-500">{r.area}</div>}</Td>
                <Td><ShopStateBadge listed={r.listed} isPaused={r.isPaused} /></Td>
                <Td><ApprovalBadge state={r.approval} /></Td>
                <Td>{LEVEL_LABEL[r.verificationLevel]}</Td>
                <Td align="right">{r.ratingCount ? <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" />{r.rating.toFixed(1)}</span> : <span className="text-slate-400">—</span>}</Td>
                <Td align="right">{num(r.orders30d)}</Td>
                <Td align="right">{formatPKR(r.gmv30d)}</Td>
                <Td className="whitespace-nowrap">{approvals ? (r.listedAt ? formatRelative(r.listedAt) : '—') : formatRelative(r.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <MarketGuide
          title={approvals ? 'Approvals' : 'Shops'}
          description={approvals ? 'Shops that published on the Market and wait for a decision.' : 'Every shop with a Market profile.'}
          flowTitle={approvals ? 'From request to decision' : 'From list to action'}
          flow={approvals ? [
            { label: 'Published', hint: 'Owner in POS', icon: Store, color: '#4f46e5' },
            { label: 'Check', hint: 'Profile, documents', icon: ShieldCheck, color: '#0284c7' },
            { label: 'Approve', hint: 'Shows to customers', icon: BadgeCheck, color: '#16a34a' },
          ] : [
            { label: 'Find', hint: 'Search or filter', icon: Search, color: '#4f46e5' },
            { label: 'Open', hint: 'Shop page', icon: MousePointerClick, color: '#0284c7' },
            { label: 'Act', hint: 'Approve, pause, feature', icon: BadgeCheck, color: '#16a34a' },
          ]}
          steps={approvals ? [
            { icon: MousePointerClick, color: '#0284c7', title: 'Open the oldest first', text: 'The list starts with the shop that has waited longest.' },
            { icon: ShieldCheck, color: '#0d9488', title: 'Check the profile', text: 'Look at the name, address, photos, CNIC and documents on the shop page.' },
            { icon: BadgeCheck, color: '#16a34a', title: 'Approve or reject', text: 'Approve to show the shop. Reject with a reason; the shop is taken off and can publish again after fixing it.' },
          ] : [
            { icon: Search, color: '#4f46e5', title: 'Find a shop', text: 'Search by shop name, business name, phone or city.' },
            { icon: Tag, color: '#0d9488', title: 'Filter', text: 'Narrow by state, section or city. Sort by orders or rating.' },
            { icon: MousePointerClick, color: '#0284c7', title: 'Open a shop', text: 'See its profile, numbers, reviews and actions.' },
          ]}
          tips={['When approval is off in settings, published shops show at once; approval still records who checked them.', 'Featured shops come first on the customer home screen.', 'Export CSV exports the whole filtered list.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
