/**
 * Nafaa Market customers (buyers on the Market app and website): orders,
 * spend, last order, wallet and points, blocked state. Search, city and
 * pages run on the server; a row opens the customer.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ban, Download, MapPin, MousePointerClick, Search, ShieldOff, Users } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, type MarketCustomerRow } from '@/api/admin-market.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { formatPKRFull, formatRelative, num } from '@/lib/format';
import { Pill } from '@/features/shared/kit';
import { GuideButton, MarketGuide } from '../components/MarketUi';

export default function MarketCustomersPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ city: '', blocked: '' });
  const { city, blocked } = list.filters;
  const query = { search: list.debouncedSearch || undefined, city: city || undefined, blocked: blocked || undefined };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-customers', query, list.page, list.limit],
    queryFn: () => adminMarketApi.customers({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  const settings = useQuery({ queryKey: ['admin-market-settings'], queryFn: adminMarketApi.settings, staleTime: 5 * 60_000 });
  const rows = data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminMarketApi.customers({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<MarketCustomerRow>('market-customers', all, [
        { label: 'Name', value: (c) => c.name }, { label: 'Phone', value: (c) => c.phone }, { label: 'Email', value: (c) => c.email }, { label: 'City', value: (c) => c.city },
        { label: 'Orders', value: (c) => c.orders }, { label: 'Spent (delivered)', value: (c) => c.spent }, { label: 'Last order', value: (c) => c.lastOrderAt },
        { label: 'Wallet', value: (c) => c.wallet }, { label: 'Points', value: (c) => c.points }, { label: 'Blocked', value: (c) => (c.blocked ? 'Yes' : 'No') },
        { label: 'Signed up', value: (c) => c.createdAt }, { label: 'Last active', value: (c) => c.lastActiveAt },
      ]);
      toast.success(`${num(all.length)} customers exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const chips = [
    city && <FilterChip key="c" onRemove={() => list.setFilter('city', '')}>{city}</FilterChip>,
    blocked && <FilterChip key="b" onRemove={() => list.setFilter('blocked', '')}>Blocked only</FilterChip>,
  ].filter(Boolean);
  const cityOptions = [{ value: '', label: 'Any city' }, ...(settings.data?.shopCities ?? []).map((c) => ({ value: c.city, label: c.city }))];
  if (city && !cityOptions.some((o) => o.value === city)) cityOptions.push({ value: city, label: city });

  return (
    <PageShell>
      <PageHero
        title="Customers"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting || !rows.length}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={data ? [
          { label: 'Customers', value: num(data.summary.total) },
          { label: 'Matching', value: num(data.total) },
          { label: 'Blocked', value: num(data.summary.blocked) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, phone or email" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={MapPin} label="City" value={city} active={!!city} onChange={(v) => list.setFilter('city', v)} options={cityOptions} />
        <FilterMenu icon={Ban} label="Blocked" value={blocked} active={!!blocked} onChange={(v) => list.setFilter('blocked', v)} align="right"
          options={[{ value: '', label: 'All customers' }, { value: '1', label: 'Blocked only' }]} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<Users className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load customers' : 'No customers match'}
        emptyText={error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="60rem">
          <THead>
            <Tr><Th>Customer</Th><Th>City</Th><Th align="right">Orders</Th><Th align="right">Spent</Th><Th>Last order</Th><Th align="right">Wallet</Th><Th align="right">Points</Th><Th>Signed up</Th></Tr>
          </THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id} interactive onClick={() => navigate(`/market/customers/${c.id}`)}>
                <Td>
                  <div className="flex items-center gap-1.5 font-semibold text-slate-900">{c.name}{c.blocked && <Pill tone="rose">Blocked</Pill>}</div>
                  <div className="text-[0.75rem] text-slate-500">{c.phone}{c.email ? ` · ${c.email}` : ''}</div>
                </Td>
                <Td>{c.city ?? <span className="text-slate-400">—</span>}</Td>
                <Td align="right">{num(c.orders)}</Td>
                <Td align="right">{formatPKRFull(c.spent)}</Td>
                <Td className="whitespace-nowrap">{c.lastOrderAt ? formatRelative(c.lastOrderAt) : <span className="text-slate-400">Never</span>}</Td>
                <Td align="right">{c.wallet ? formatPKRFull(c.wallet) : <span className="text-slate-400">0</span>}</Td>
                <Td align="right">{num(c.points)}</Td>
                <Td className="whitespace-nowrap">{formatRelative(c.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <MarketGuide
          title="Customers"
          description="People who buy on Nafaa Market."
          flowTitle="Look up a customer"
          flow={[
            { label: 'Find', hint: 'Name or phone', icon: Search, color: '#4f46e5' },
            { label: 'Open', hint: 'Orders and tickets', icon: MousePointerClick, color: '#0284c7' },
            { label: 'Block', hint: 'Only for abuse', icon: ShieldOff, color: '#e11d48' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find a customer', text: 'Search by name, phone or email, or filter by city.' },
            { icon: MousePointerClick, color: '#0284c7', title: 'Open the customer', text: 'See orders, spend, wallet, addresses and support tickets.' },
            { icon: ShieldOff, color: '#e11d48', title: 'Block abuse', text: 'A blocked customer is signed out and cannot order. Unblock any time.' },
          ]}
          tips={['Spent counts delivered orders only.', 'These are Market buyers, not shop customers in the POS.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
