/**
 * Market settlements report: per shop, delivered Market orders in the
 * chosen days with item value, delivery fees, Nafaa commission at the
 * current rate, the wallet and points part Nafaa funded, and the net owed
 * to or by the shop. Report only; recording payouts comes later.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, Download, HandCoins, Percent, Wallet } from 'lucide-react';
import { Alert, DateRangeMenu, FilterBar, FilterChip, PageHero, PageShell, Table, TBody, Td, Th, THead, Tr, heroButton, resolveRange, type DateRangeValue } from '@/design-system/components';
import { usePageGuide } from '@core/components/PageGuide';
import { adminMarketApi, type SettlementRow } from '@/api/admin-market.api';
import { ListCard, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { formatPKR, formatPKRFull, num } from '@/lib/format';
import { GuideButton, MarketGuide, shortDay } from '../components/MarketUi';

/** Positive net: Nafaa owes the shop. Negative: the shop owes Nafaa. */
function Net({ value }: { value: number }) {
  if (!value) return <span className="text-slate-400">0</span>;
  return value > 0
    ? <span className="font-medium text-emerald-700">{formatPKRFull(value)} to shop</span>
    : <span className="font-medium text-rose-700">{formatPKRFull(-value)} from shop</span>;
}

export default function MarketSettlementsPage() {
  const guide = usePageGuide();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ shopId: '' });
  const [range, setRange] = useState<DateRangeValue>({ preset: 'month', custom: { from: '', to: '' } });
  const { from, to } = resolveRange(range, 0) ?? { from: '', to: '' };
  const query = { from, to, shopId: list.filters.shopId || undefined };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['admin-market-settlements', query, list.page, list.limit],
    queryFn: () => adminMarketApi.settlements({ ...query, page: list.page, limit: list.limit }),
    placeholderData: keepPreviousData,
  });
  const rows = data?.items ?? [];
  const t = data?.totals;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages(async (page) => {
        const r = await adminMarketApi.settlements({ ...query, page, limit: 100 });
        return { items: r.items, meta: { totalPages: r.pages } };
      });
      downloadCsv<SettlementRow>(`market-settlements-${from}-to-${to}`, all, [
        { label: 'Shop', value: (r) => r.name }, { label: 'City', value: (r) => r.city }, { label: 'Delivered orders', value: (r) => r.orders },
        { label: 'Item value', value: (r) => r.subtotal }, { label: 'Delivery fees', value: (r) => r.deliveryFees }, { label: 'Shop coupons', value: (r) => r.coupons },
        { label: 'Collected by shop', value: (r) => r.collected }, { label: 'Wallet (Nafaa)', value: (r) => r.wallet }, { label: 'Points (Nafaa)', value: (r) => r.loyalty },
        { label: `Commission ${data?.commissionPercent ?? 0}%`, value: (r) => r.commission }, { label: 'Net to shop (negative = shop pays)', value: (r) => r.net },
      ]);
      toast.success(`${num(all.length)} shops exported`);
    } catch { toast.error('Export failed. Try again.'); } finally { setExporting(false); }
  };

  return (
    <PageShell>
      <PageHero
        title="Settlements"
        chip={from && to ? `${shortDay(from)} – ${shortDay(to)}` : undefined}
        busy={isFetching}
        loading={isLoading}
        actions={
          <>
            <button type="button" className={heroButton} onClick={exportCsv} disabled={exporting || !rows.length}><Download className="h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
            <GuideButton onClick={guide.open} />
          </>
        }
        stats={t ? [
          { label: 'Delivered orders', value: num(t.orders), hint: `${num(t.shops)} shops` },
          { label: 'Item value', value: formatPKR(t.subtotal) },
          { label: `Commission (${data?.commissionPercent ?? 0}%)`, value: formatPKR(t.commission) },
          { label: 'Paid by Nafaa', value: formatPKR(t.marketFunded), hint: 'Wallet and points' },
        ] : undefined}
      />

      <Alert tone="info" title="Report only">
        This shows what each shop is owed or owes. Recording payouts and marking them paid comes in a later release. Shops collect the customer's payment directly (cash on delivery or their own payment details).
      </Alert>

      <FilterBar chips={list.filters.shopId ? [<FilterChip key="s" onRemove={() => list.setFilter('shopId', '')}>One shop</FilterChip>] : undefined} onClear={list.clear}>
        <DateRangeMenu value={range} onChange={(v) => { setRange(v); list.setPage(1); }} startHour={0} allowAll={false} defaultPreset="month" />
      </FilterBar>

      <ListCard
        loading={isLoading}
        empty={!!error || !rows.length}
        emptyIcon={<HandCoins className="h-6 w-6" />}
        emptyTitle={error ? 'Could not load settlements' : 'No delivered orders in this period'}
        emptyText={error ? 'Try again in a moment.' : 'Pick a longer period.'}
        page={list.page} limit={list.limit} total={data?.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="66rem">
          <THead>
            <Tr>
              <Th>Shop</Th><Th align="right">Orders</Th><Th align="right">Item value</Th><Th align="right">Delivery fees</Th><Th align="right">Collected</Th>
              <Th align="right">Wallet</Th><Th align="right">Points</Th><Th align="right">Commission</Th><Th align="right">Net</Th>
            </Tr>
          </THead>
          <TBody>
            {rows.map((r) => (
              <Tr key={r.shopId} interactive onClick={() => navigate(`/market/shops/${r.shopId}`)}>
                <Td>
                  <div className="font-semibold text-slate-900">{r.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{r.city ?? '—'}</div>
                </Td>
                <Td align="right">{num(r.orders)}</Td>
                <Td align="right">{formatPKRFull(r.subtotal)}</Td>
                <Td align="right">{formatPKRFull(r.deliveryFees)}</Td>
                <Td align="right">{formatPKRFull(r.collected)}</Td>
                <Td align="right">{formatPKRFull(r.wallet)}</Td>
                <Td align="right">{formatPKRFull(r.loyalty)}</Td>
                <Td align="right">{formatPKRFull(r.commission)}</Td>
                <Td align="right"><Net value={r.net} /></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <MarketGuide
          search={false}
          title="Settlements"
          description="What Nafaa and each shop owe each other for Market orders."
          flowTitle="How the net is worked out"
          flow={[
            { label: 'Delivered', hint: 'Orders in period', icon: HandCoins, color: '#4f46e5' },
            { label: '+ Nafaa paid', hint: 'Wallet and points', icon: Wallet, color: '#16a34a' },
            { label: '− Commission', hint: '% of item value', icon: Percent, color: '#e11d48' },
            { label: 'Net', hint: 'To or from shop', icon: Calculator, color: '#0284c7' },
          ]}
          steps={[
            { icon: HandCoins, color: '#4f46e5', title: 'Pick the period', text: 'Counts orders delivered in these days, Pakistan time.' },
            { icon: Wallet, color: '#16a34a', title: 'Nafaa-paid part', text: 'When a customer pays with wallet money or points, the shop collects less; Nafaa owes the shop that part.' },
            { icon: Percent, color: '#e11d48', title: 'Commission', text: 'Uses the rate in Settings (0% at launch).' },
          ]}
          tips={['Collected is what the customer paid the shop.', 'Export CSV keeps the whole list for the accounts team.']}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
