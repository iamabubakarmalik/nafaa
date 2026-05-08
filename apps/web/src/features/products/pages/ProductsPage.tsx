import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Search, Trash2, Boxes } from 'lucide-react';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const defaultForm = {
  name: '',
  sku: '',
  barcode: '',
  unit: 'pcs',
  price: '',
  costPrice: '',
  stock: '',
  lowStockAlert: '5',
};

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productsApi.list({ search, page: 1, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => {
      toast.success('Product add ho gaya');
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Product create nahi hua');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      toast.success('Product delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Delete fail ho gaya');
    },
  });

  const items = data?.items ?? [];

  const stats = useMemo(() => {
    return {
      total: items.length,
      totalValue: items.reduce((sum, p) => sum + p.price * p.stock, 0),
      lowStock: items.filter((p) => p.stock <= p.lowStockAlert).length,
    };
  }, [items]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error('Product name likhein');
      return;
    }

    createMutation.mutate({
      name: form.name.trim(),
      sku: form.sku.trim() || undefined,
      barcode: form.barcode.trim() || undefined,
      unit: form.unit.trim() || 'pcs',
      price: Number(form.price || 0),
      costPrice: Number(form.costPrice || 0),
      stock: Number(form.stock || 0),
      lowStockAlert: Number(form.lowStockAlert || 5),
      isActive: true,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-100 text-brand-700 px-3 py-1 text-xs font-medium">
              <Boxes className="h-3.5 w-3.5" />
              Inventory Foundation
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Products Management</h2>
            <p className="mt-2 text-sm text-slate-500">
              Yahan se aap apni bakery, kiryana, electronics ya kisi bhi shop ke products manage kar sakte hain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="rounded-2xl bg-slate-950 text-white px-5 py-4 min-w-[170px]">
              <div className="text-xs text-slate-400">Total Products</div>
              <div className="mt-1 text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4 min-w-[170px]">
              <div className="text-xs text-slate-500">Inventory Value</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{formatPKR(stats.totalValue)}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-4 min-w-[170px]">
              <div className="text-xs text-amber-700">Low Stock</div>
              <div className="mt-1 text-2xl font-bold text-amber-900">{stats.lowStock}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[380px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Naya Product</h3>
              <p className="text-sm text-slate-500">Quick add form</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <Input
              label="Product Name"
              placeholder="Chocolate Cake"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
            <Input
              label="SKU"
              placeholder="CAKE-001"
              value={form.sku}
              onChange={(e) => setForm((s) => ({ ...s, sku: e.target.value }))}
            />
            <Input
              label="Barcode"
              placeholder="1234567890123"
              value={form.barcode}
              onChange={(e) => setForm((s) => ({ ...s, barcode: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Price"
                type="number"
                placeholder="1200"
                value={form.price}
                onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
              />
              <Input
                label="Cost Price"
                type="number"
                placeholder="800"
                value={form.costPrice}
                onChange={(e) => setForm((s) => ({ ...s, costPrice: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Input
                label="Stock"
                type="number"
                placeholder="10"
                value={form.stock}
                onChange={(e) => setForm((s) => ({ ...s, stock: e.target.value }))}
              />
              <Input
                label="Unit"
                placeholder="pcs"
                value={form.unit}
                onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
              />
              <Input
                label="Low Stock Alert"
                type="number"
                placeholder="5"
                value={form.lowStockAlert}
                onChange={(e) => setForm((s) => ({ ...s, lowStockAlert: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" loading={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Product add karein
            </Button>
          </form>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Products List</h3>
              <p className="text-sm text-slate-500">Search, review, delete</p>
            </div>

            <div className="relative w-full sm:w-[320px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="Search product, SKU, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading products...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Package className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi product nahi</h4>
              <p className="mt-1 text-sm text-slate-500">Left side se pehla product add karein.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="text-left px-6 py-4 font-medium">Name</th>
                    <th className="text-left px-6 py-4 font-medium">SKU</th>
                    <th className="text-left px-6 py-4 font-medium">Price</th>
                    <th className="text-left px-6 py-4 font-medium">Stock</th>
                    <th className="text-left px-6 py-4 font-medium">Status</th>
                    <th className="text-right px-6 py-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const low = item.stock <= item.lowStockAlert;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500">{item.barcode || 'No barcode'}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{item.sku || '—'}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">{formatPKR(item.price)}</td>
                        <td className="px-6 py-4">
                          <span className={low ? 'text-amber-700 font-semibold' : 'text-slate-700'}>
                            {item.stock} {item.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={[
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                              low
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800',
                            ].join(' ')}
                          >
                            {low ? 'Low stock' : 'Healthy'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => deleteMutation.mutate(item.id)}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
