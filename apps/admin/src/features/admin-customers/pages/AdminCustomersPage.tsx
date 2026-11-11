/**
 * Customers: the people shops sell to, across the platform, with the credit
 * (udhaar) they owe. Search and filters run on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Banknote, Download, Lightbulb, Search, Star, Tag, UserRound, Users, Wallet } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminCustomersApi, type AdminCustomer } from '@/api/admin-customers.api';
import { formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { num } from '@/lib/format';


export default function AdminCustomersPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ credit: 'ALL', status: 'ALL' });
  const { credit, status } = list.filters;
  const query = {
    search: list.debouncedSearch || undefined,
    hasCredit: credit === 'credit' ? true : undefined,
    status: status === 'ALL' ? undefined : status,
  };

  const customers = useQuery({
    queryKey: ['admin', 'customers', query, list.page, list.limit],
    queryFn: () => adminCustomersApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'customers', 'stats'], queryFn: adminCustomersApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows = customers.data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminCustomersApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminCustomer>('customers', all, [
        { label: 'Name', value: (c) => c.name },
        { label: 'Phone', value: (c) => c.phone },
        { label: 'Email', value: (c) => c.email },
        { label: 'Shop', value: (c) => c.tenant.name },
        { label: 'Total spent', value: (c) => c.totalSpent },
        { label: 'Credit owed', value: (c) => c.balance },
        { label: 'Loyalty points', value: (c) => c.loyaltyPoints },
        { label: 'Active', value: (c) => c.isActive },
        { label: 'Added', value: (c) => c.createdAt.slice(0, 10) },
      ]);
      toast.success(`${num(all.length)} customers exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = [
    credit !== 'ALL' && <FilterChip key="c" onRemove={() => list.setFilter('credit', 'ALL')}>Owes credit</FilterChip>,
    status !== 'ALL' && <FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{status === 'active' ? 'Active' : 'Inactive'}</FilterChip>,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHero
        title="Customers"
        chip={s ? `${num(s.total)} across all shops` : undefined}
        busy={customers.isFetching}
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
          { label: 'Customers', value: num(s.total) },
          { label: 'Owe credit', value: num(s.withCredit), hint: `${s.total ? Math.round((s.withCredit / s.total) * 100) : 0}% of customers` },
          { label: 'Credit outstanding', value: formatPKR(s.totalOutstandingCredit) },
          { label: 'Total spent', value: formatPKR(s.totalSpentPlatform) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, phone or email" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Wallet} label="Credit" value={credit} active={credit !== 'ALL'} onChange={(v) => list.setFilter('credit', v)}
          options={[{ value: 'ALL', label: 'All customers' }, { value: 'credit', label: 'Owe credit' }]} />
        <FilterMenu icon={Tag} label="Status" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right"
          options={[{ value: 'ALL', label: 'All statuses' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
      </FilterBar>

      <ListCard
        loading={customers.isLoading}
        empty={!rows.length}
        emptyIcon={<Users className="h-6 w-6" />}
        emptyTitle="No customers match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={customers.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="50rem">
          <THead>
            <Tr><Th>Customer</Th><Th>Shop</Th><Th>Status</Th><Th align="right">Total spent</Th><Th align="right">Credit owed</Th><Th align="right">Loyalty</Th></Tr>
          </THead>
          <TBody>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <div className="font-semibold text-slate-900">{c.name}</div>
                  <div className="text-[0.75rem] text-slate-500">{[c.phone, c.email].filter(Boolean).join(' · ') || '—'}</div>
                </Td>
                <Td><Link to={`/tenants/${c.tenant.id}`} className="font-medium text-slate-900 hover:text-brand-700">{c.tenant.name}</Link></Td>
                <Td><StatusBadge value={c.isActive ? 'ACTIVE' : 'INACTIVE'} /></Td>
                <Td align="right" className="font-medium text-emerald-700">{formatPKR(c.totalSpent)}</Td>
                <Td align="right"><span className={c.balance > 0 ? 'font-semibold text-rose-600' : 'text-slate-400'}>{formatPKR(c.balance)}</span></Td>
                <Td align="right"><span className="inline-flex items-center gap-1 text-amber-600"><Star className="h-3.5 w-3.5" />{num(c.loyaltyPoints)}</span></Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Customers"
          description="Everyone shops have saved as a customer, with what they spent and what they still owe."
          flowTitle="How a customer builds up"
          flow={[
            { label: 'Shop adds customer', icon: UserRound, color: '#4f46e5' },
            { label: 'Buys', hint: 'Spend adds up', icon: Banknote, color: '#0284c7' },
            { label: 'Owes credit', hint: 'Udhaar', icon: Wallet, color: '#d97706' },
            { label: 'Pays back', icon: Users, color: '#059669' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Search', text: 'Find a customer by name, phone or email.' },
            { icon: Wallet, color: '#d97706', title: 'Credit', text: 'Use the Credit filter to list only customers who owe money.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every customer that matches the filters.' },
          ]}
          tips={['Click a shop name to open that shop.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
