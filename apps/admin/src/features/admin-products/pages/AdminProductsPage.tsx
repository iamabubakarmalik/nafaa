/**
 * Products: every product across all shops, with stock health at a glance.
 * Search and the stock filter run on the server.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Download, Lightbulb, Package, Search, Tag, Warehouse } from 'lucide-react';
import { FilterBar, FilterChip, FilterMenu, PageHero, PageShell, SearchField, Table, TBody, Td, Th, THead, Tr, heroButton } from '@/design-system/components';
import { PageGuide, usePageGuide } from '@core/components/PageGuide';
import { adminProductsApi, type AdminProduct } from '@/api/admin-products.api';
import { formatPKR } from '@/lib/format';
import { ListCard, StatusBadge, downloadCsv, fetchAllPages, useListParams } from '@/ui';
import { num } from '@/lib/format';

const STOCK = [
  { value: 'ALL', label: 'All products' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'low', label: 'Low stock' },
  { value: 'out', label: 'Out of stock' },
];

export default function AdminProductsPage() {
  const guide = usePageGuide();
  const [exporting, setExporting] = useState(false);
  const list = useListParams({ status: 'ALL' });
  const { status } = list.filters;
  const query = { search: list.debouncedSearch || undefined, status: status === 'ALL' ? undefined : status };

  const products = useQuery({
    queryKey: ['admin', 'products', query, list.page, list.limit],
    queryFn: () => adminProductsApi.list({ ...query, page: list.page, limit: list.limit }),
    placeholderData: (prev) => prev,
  });
  const stats = useQuery({ queryKey: ['admin', 'products', 'stats'], queryFn: adminProductsApi.stats, staleTime: 60_000 });
  const s = stats.data;
  const rows = products.data?.items ?? [];

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all = await fetchAllPages((page) => adminProductsApi.list({ ...query, page, limit: 100 }));
      downloadCsv<AdminProduct>('products', all, [
        { label: 'Name', value: (p) => p.name },
        { label: 'SKU', value: (p) => p.sku },
        { label: 'Barcode', value: (p) => p.barcode },
        { label: 'Shop', value: (p) => p.tenant.name },
        { label: 'Category', value: (p) => p.category?.name },
        { label: 'Price', value: (p) => p.price },
        { label: 'Cost', value: (p) => p.costPrice },
        { label: 'Stock', value: (p) => p.stock },
        { label: 'Active', value: (p) => p.isActive },
      ]);
      toast.success(`${num(all.length)} products exported`);
    } catch {
      toast.error('Export failed. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const chips = status !== 'ALL' ? [<FilterChip key="s" onRemove={() => list.setFilter('status', 'ALL')}>{STOCK.find((o) => o.value === status)?.label}</FilterChip>] : [];

  return (
    <PageShell>
      <PageHero
        title="Products"
        chip={s ? `${num(s.total)} across all shops` : undefined}
        busy={products.isFetching}
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
          { label: 'Active products', value: num(s.active), hint: `of ${num(s.total)}` },
          { label: 'Low stock', value: num(s.lowStock) },
          { label: 'Out of stock', value: num(s.outOfStock) },
          { label: 'Units in stock', value: num(s.totalStockUnits) },
        ] : undefined}
      />

      <FilterBar
        search={<SearchField value={list.search} onChange={list.setSearch} placeholder="Search name, SKU or barcode" />}
        chips={chips.length ? chips : undefined}
        onClear={list.clear}
      >
        <FilterMenu icon={Tag} label="Show" value={status} active={status !== 'ALL'} onChange={(v) => list.setFilter('status', v)} align="right" options={STOCK} />
      </FilterBar>

      <ListCard
        loading={products.isLoading}
        empty={!rows.length}
        emptyIcon={<Package className="h-6 w-6" />}
        emptyTitle="No products match"
        emptyText="Try another search or clear the filters."
        page={list.page} limit={list.limit} total={products.data?.meta.total} onPage={list.setPage} onLimit={list.setLimit}
      >
        <Table minWidth="54rem">
          <THead>
            <Tr><Th>Product</Th><Th>Shop</Th><Th>Category</Th><Th align="right">Price</Th><Th align="right">Cost</Th><Th align="right">Stock</Th><Th>Status</Th></Tr>
          </THead>
          <TBody>
            {rows.map((p) => {
              const out = p.stock <= 0;
              const low = !out && p.stock <= p.lowStockAlert;
              return (
                <Tr key={p.id}>
                  <Td>
                    <div className="font-semibold text-slate-900">{p.name}</div>
                    <div className="font-mono text-[0.75rem] text-slate-500">{[p.sku, p.barcode].filter(Boolean).join(' · ') || '—'}</div>
                  </Td>
                  <Td><Link to={`/tenants/${p.tenant.id}`} className="font-medium text-slate-900 hover:text-brand-700">{p.tenant.name}</Link></Td>
                  <Td>
                    {p.category
                      ? <span className="inline-flex items-center gap-1.5 text-slate-700"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.category.color }} />{p.category.name}</span>
                      : <span className="text-slate-400">—</span>}
                  </Td>
                  <Td align="right" className="font-medium">{formatPKR(p.price)}</Td>
                  <Td align="right" className="text-slate-500">{formatPKR(p.costPrice)}</Td>
                  <Td align="right">
                    <span className={out ? 'font-semibold text-rose-600' : low ? 'inline-flex items-center gap-1 font-semibold text-amber-600' : ''}>
                      {low && <AlertTriangle className="h-3.5 w-3.5" />}{num(p.stock)} <span className="font-normal text-slate-400">{p.unit}</span>
                    </span>
                  </Td>
                  <Td><StatusBadge value={p.isActive ? 'ACTIVE' : 'INACTIVE'} /></Td>
                </Tr>
              );
            })}
          </TBody>
        </Table>
      </ListCard>

      {guide.isOpen && (
        <PageGuide
          title="Products"
          description="Every product that shops have added, in one list. Shops manage their own products; this is a read-only view."
          flowTitle="Where stock numbers come from"
          flow={[
            { label: 'Shop adds product', icon: Package, color: '#4f46e5' },
            { label: 'Stock in', hint: 'Purchases', icon: Warehouse, color: '#0284c7' },
            { label: 'Sold at counter', icon: Tag, color: '#059669' },
            { label: 'Low or out', hint: 'Needs restock', icon: AlertTriangle, color: '#d97706' },
          ]}
          steps={[
            { icon: Search, color: '#4f46e5', title: 'Search', text: 'Find a product by name, SKU or barcode across all shops.' },
            { icon: AlertTriangle, color: '#d97706', title: 'Spot stock problems', text: 'Use Show to list low stock or out of stock products.' },
            { icon: Download, color: '#059669', title: 'Export', text: 'Export CSV downloads every product that matches the filters.' },
          ]}
          tips={['Click a shop name to open that shop.']}
          shortcuts={[['/', 'Search'], ['G', 'This guide']]}
          onClose={guide.close}
        />
      )}
    </PageShell>
  );
}
