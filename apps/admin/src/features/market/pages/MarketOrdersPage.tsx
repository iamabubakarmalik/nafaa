/**
 * Market orders monitor across all shops: status, section, city, shop,
 * stuck orders and a date range. Stuck means pending for over 15 minutes or
 * not sent to the shop after 2 minutes. Search, filters and pages run on
 * the server; a row opens the order.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Ban, Download, LayoutGrid, MapPin, MousePointerClick, PhoneCall, Search, ShoppingBag, Tag } from 'lucide-react';
import { DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, MARKET_GATES, type MarketOrderRow } from '@/api/admin-market.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { formatPKRFull, formatRelative, num } from '@/lib/format';
import { Pill } from '@/features/shared/kit';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '@/features/shared/period';
import { GATE_LABEL, GateTag, GuideButton, MarketGuide, ORDER_STATUS_OPTIONS, OrderStatusBadge, PAYMENT_LABEL, gateLabel, orderStatusLabel, todayKey } from '../components/MarketUi';

export default function MarketOrdersPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL', gate: 'ALL', city: '', shopId: '', stuck: '', ...PERIOD_DEFAULTS });
  const { status, gate, city, shopId, stuck } = list.filters;

  const query = {
    search: list.debouncedSearch || undefined,
    status: status === 'ALL' ? undefined : status,
    gate: gate === 'ALL' ? undefined : gate,
    city: city || undefined,
    shopId: shopId || undefined,
    stuck: stuck || undefined,
    ...periodQuery(list.filters),
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-orders', query, list.page, list.limit],
    queryFn: () => adminMarketApi.orders({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });
  const today = todayKey();
  const todayStats = useQuery({ queryKey: ['admin-market-overview', today, today], queryFn: () => adminMarketApi.overview(today, today), staleTime: 60_000, refetchInterval: 60_000 });
  const settings = useQuery({ queryKey: ['admin-market-settings'], queryFn: adminMarketApi.settings, staleTime: 5 * 60_000 });
  const t = todayStats.data;
  const rows = data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminMarketApi.orders({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<MarketOrderRow>('market-orders', all, [
        { label: 'Order', value: (o) => o.orderNumber }, { label: 'Placed', value: (o) => o.createdAt }, { label: 'Status', value: (o) => orderStatusLabel(o.status) },
        { label: 'Shop', value: (o) => o.shop.name }, { label: 'City', value: (o) => o.shop.city }, { label: 'Section', value: (o) => gateLabel(o.gate) },
        { label: 'Customer', value: (o) => o.customer.name }, { label: 'Phone', value: (o) => o.customer.phone }, { label: 'Items', value: (o) => o.items },
        { label: 'Item value', value: (o) => o.subtotal }, { label: 'Delivery fee', value: (o) => o.deliveryFee }, { label: 'Paid by Nafaa', value: (o) => o.marketFunded },
        { label: 'Total', value: (o) => o.total }, { label: 'Payment', value: (o) => PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod },
        { label: 'Payment status', value: (o) => o.paymentStatus }, { label: 'Sent to shop', value: (o) => (o.sentToShop ? 'Yes' : 'No') }, { label: 'Stuck', value: (o) => (o.stuck ? 'Yes' : 'No') },
      ]);
      toast.success(`${num(all.length)} orders exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  const period = periodChip(list.filters);
  const chips = [
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{ORDER_STATUS_OPTIONS.find(([k]) => k === status)?.[1] ?? status}</FilterChip>,
    gate !== 'ALL' && <FilterChip key="g" onRemove={() => list.setFilter('gate', 'ALL')}>{gateLabel(gate)}</FilterChip>,
    city && <FilterChip key="c" onRemove={() => list.setFilter('city', '')}>{city}</FilterChip>,
    shopId && <FilterChip key="sh" onRemove={() => list.setFilter('shopId', '')}>One shop</FilterChip>,
    stuck && <FilterChip key="st" onRemove={() => list.setFilter('stuck', '')}>Stuck only</FilterChip>,
    period && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{period}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Orders"
        chip={data ? `${num(data.total)} shown` : undefined}
        busy={isFetching}
        loading={todayStats.isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting || !rows.length}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={t ? [
          { label: 'Orders today', value: num(t.totals.orders) },
          { label: 'Delivered today', value: num(t.totals.delivered) },
          { label: 'Cancelled today', value: num(t.totals.cancelled) },
          { label: 'Stuck now', value: num(t.stuck), hint: t.stuck ? 'Needs a call' : 'All moving' },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search order number, customer, phone or shop" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)}
          options={ORDER_STATUS_OPTIONS.map(([value, l]) => ({ value, label: l }))} />
        <FilterMenu icon={LayoutGrid} label="Section" value={gate} active={gate !== 'ALL'} onChange={(v) => list.setFilter('gate', v)}
          options={[{ value: 'ALL', label: 'Any section' }, ...MARKET_GATES.map((g) => ({ value: g, label: GATE_LABEL[g] }))]} />
        <FilterMenu icon={MapPin} label="City" value={city} active={!!city} onChange={(v) => list.setFilter('city', v)}
          options={[{ value: '', label: 'Any city' }, ...(settings.data?.shopCities ?? []).map((c) => ({ value: c.city, label: c.city })), ...(city && !(settings.data?.shopCities ?? []).some((c) => c.city === city) ? [{ value: city, label: city }] : [])]} />
        <FilterMenu icon={AlertTriangle} label="Stuck" value={stuck} active={!!stuck} onChange={(v) => list.setFilter('stuck', v)} align="right"
          options={[{ value: '', label: 'All orders' }, { value: '1', label: 'Stuck only' }]} />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<ShoppingBag className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load orders' : stuck ? 'No stuck orders' : 'No orders match'}
        emptyText={error ? 'Try again in a moment.' : 'Try another search or clear the filters.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="68rem">
          <THead>
            <Tr>
              <Th>Order</Th><Th>Shop</Th><Th>Section</Th><Th>Customer</Th><Th>Status</Th><Th>Payment</Th>
              <Th align="right">Items</Th><Th align="right">Total</Th><Th>Placed</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((o) => (
              <Tr key={o.id} interactive onClick={() => navigate(`/market/orders/${o.id}`)}>
                <Td>
                  <div className="font-semibold text-slate-900">#{o.orderNumber}</div>
                  {!o.sentToShop && <div className="text-[0.75rem] text-rose-600">Not sent to shop</div>}
                </Td>
                <Td>
                  <div className="font-medium text-slate-800">{o.shop.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{o.shop.city ?? '—'}</div>
                </Td>
                <Td><GateTag gate={o.gate} /></Td>
                <Td>
                  <div className="text-slate-800">{o.customer.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{o.customer.phone}</div>
                </Td>
                <Td><span className="inline-flex flex-wrap gap-1"><OrderStatusBadge status={o.status} />{o.stuck && <Pill tone="rose">Stuck</Pill>}</span></Td>
                <Td>
                  <div className="text-[0.8125rem]">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</div>
                  {o.marketFunded > 0 && <div className="text-[0.75rem] text-slate-500">Nafaa paid {formatPKRFull(o.marketFunded)}</div>}
                </Td>
                <Td align="right">{num(o.items)}</Td>
                <Td align="right">{formatPKRFull(o.total)}</Td>
                <Td className="whitespace-nowrap">{formatRelative(o.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <MarketGuide
          title="Orders"
          description="Every Market order across shops, with the ones that need help."
          flowTitle="Help a stuck order"
          flow={[
            { label: 'Spot', hint: 'Stuck filter', icon: AlertTriangle, color: '#e11d48' },
            { label: 'Open', hint: 'Order page', icon: MousePointerClick, color: '#0284c7' },
            { label: 'Call shop', hint: 'Accept in POS', icon: PhoneCall, color: '#16a34a' },
            { label: 'Or cancel', hint: 'Bill voided, refund', icon: Ban, color: '#64748b' },
          ]}
          steps={[
            { icon: AlertTriangle, color: '#e11d48', title: 'Check stuck orders', text: 'Use the Stuck filter. These are pending too long or never reached the shop.' },
            { icon: Search, color: '#4f46e5', title: 'Find an order', text: 'Search by order number, customer name, phone or shop.' },
            { icon: MousePointerClick, color: '#0284c7', title: 'Open it', text: 'See items, history, the POS bill and cancel if needed.' },
          ]}
          tips={['The list refreshes every minute.', 'Orders not sent to the shop are retried for 10 minutes, then cancelled with a refund.', 'Export CSV exports the whole filtered list.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
