/**
 * Sales: completed bills across every shop. Search, payment method, credit
 * and period filters run on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, CreditCard, Download, Lightbulb, Receipt, Search, ShoppingCart, TrendingUp } from 'lucide-react';
import { DateRangeMenu, FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminSalesApi, type AdminSale } from '@/api/admin-sales.api';
import { formatDate, formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, statusLabel, useListParams } from '@/ui';
import { PERIOD_DEFAULTS, clearPeriod, periodChip, periodQuery, periodValue, setPeriod } from '../../shared/period';
import { num } from '@/lib/format';

const METHODS = ['ALL', 'CASH', 'CARD', 'BANK_TRANSFER', 'JAZZCASH', 'EASYPAISA', 'TRADE_IN'];

export default function AdminSalesPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ method: 'ALL', credit: 'ALL', ...PERIOD_DEFAULTS });
  const { method, credit } = list.filters;
  const range = periodChip(list.filters);

  const query = {
    search: list.debouncedSearch || undefined,
    method: method === 'ALL' ? undefined : method,
    credit: credit === 'credit' ? true : undefined,
    ...periodQuery(list.filters),
  };
  const sales = useQuery({
    queryKey: ['admin', 'sales', query, list.page, list.limit],
    queryFn: () => adminSalesApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'sales', 'stats'], queryFn: adminSalesApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows = sales.data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminSalesApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminSale>('sales', all, [
        { label: 'Bill', value: (x) => x.saleNumber },
        { label: 'Shop', value: (x) => x.tenant.name },
        { label: 'Customer', value: (x) => x.customer?.name },
        { label: 'Cashier', value: (x) => x.createdBy?.fullName },
        { label: 'Total', value: (x) => x.total },
        { label: 'Paid', value: (x) => x.paidAmount },
        { label: 'On credit', value: (x) => x.creditAmount },
        { label: 'Method', value: (x) => x.paymentMethod },
        { label: 'Date', value: (x) => x.soldAt.slice(0, 10) },
      ]);
      toast.success(`${num(all.length)} sales exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    method !== 'ALL' && <FilterChip key="m" onRemove={() => list.setFilter('method', 'ALL')}>{statusLabel(method)}</FilterChip>,
    credit !== 'ALL' && <FilterChip key="c" onRemove={() => list.setFilter('credit', 'ALL')}>On credit</FilterChip>,
    range && <FilterChip key="p" onRemove={() => clearPeriod(list)}>{range}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Sales"
        chip={s ? `${num(s.totalCount)} bills` : undefined}
        busy={sales.isFetching}
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
          { label: 'Today', value: formatPKR(s.todayRevenue), hint: `${num(s.todayCount)} bills` },
          { label: 'This month', value: formatPKR(s.monthRevenue), hint: `${num(s.monthCount)} bills` },
          { label: 'All time', value: formatPKR(s.totalRevenue) },
          { label: 'Profit, all time', value: formatPKR(s.totalProfit) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search bill number, customer or shop" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <DateRangeMenu value={periodValue(list.filters)} onChange={(v) => setPeriod(list, v)} startHour={0} />
        <FilterMenu icon={CreditCard} label="Method" value={method} active={method !== 'ALL'} onChange={(v) => list.setFilter('method', v)}
          options={METHODS.map((v) => ({ value: v, label: v === 'ALL' ? 'All methods' : statusLabel(v) }))} />
        <FilterMenu icon={Banknote} label="Credit" value={credit} active={credit !== 'ALL'} onChange={(v) => list.setFilter('credit', v)} align="right"
          options={[{ value: 'ALL', label: 'All bills' }, { value: 'credit', label: 'Bills with credit' }]} />
      </FilterBar>

      <ListCard
        loading={sales.isLoading}
        empty={!rows.length}
        emptyIcon={<Receipt className="h-6 w-6" />}
        emptyTitle="No sales match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={sales.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead>
            <Tr><Th>Bill</Th><Th>Shop</Th><Th>Customer</Th><Th align="right">Total</Th><Th align="right">Paid</Th><Th>Method</Th><Th align="right">Date</Th></Tr>
          </THead>
          <TBody>
            {rows.map((x) => (
              <Tr key={x.id}>
                <Td className="font-mono text-[0.8125rem] font-semibold text-slate-900">{x.saleNumber}</Td>
                <Td><Link to={`/tenants/${x.tenant.id}`} className="font-medium text-slate-900 hover:text-brand-700">{x.tenant.name}</Link></Td>
                <Td>{x.customer?.name ?? <span className="text-slate-400">Walk-in</span>}</Td>
                <Td align="right" className="font-semibold">{formatPKR(x.total)}</Td>
                <Td align="right">
                  <span className="text-emerald-700">{formatPKR(x.paidAmount)}</span>
                  {x.creditAmount > 0 && <div className="text-[0.75rem] text-rose-600">{formatPKR(x.creditAmount)} on credit</div>}
                </Td>
                <Td><StatusBadge value={x.paymentMethod} variant="default" /></Td>
                <Td align="right" className="whitespace-nowrap text-slate-500">{formatDate(x.soldAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Sales"
          description="Completed bills from every shop. This is a read-only view of what shops sell."
          flowTitle="How a bill gets here"
          flow={[
            { label: 'Shop rings up sale', icon: ShoppingCart, color: '#4f46e5' },
            { label: 'Customer pays', hint: 'Cash, card, wallet', icon: CreditCard, color: '#0284c7' },
            { label: 'Bill completed', icon: Receipt, color: '#059669' },
            { label: 'Counts in revenue', icon: TrendingUp, color: '#7c3aed' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Find a bill', text: 'Search by bill number, customer name or shop name.' },
            { icon: Banknote, color: '#0284c7', title: 'Narrow down', text: 'Filter by period, payment method or bills that were left on credit.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every bill that matches the filters.' },
          ]}
          tips={['Days follow Pakistan time, not the server clock.', 'Only completed bills are listed. Voided and returned bills are not.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
