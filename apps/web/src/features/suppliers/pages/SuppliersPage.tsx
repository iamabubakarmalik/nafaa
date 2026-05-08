import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Truck, Plus, Search, Trash2 } from 'lucide-react';
import { suppliersApi } from '@/api/suppliers.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const defaultForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(defaultForm);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => suppliersApi.list({ search, page: 1, limit: 50 }),
  });

  const createMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      toast.success('Supplier add ho gaya');
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Supplier create nahi hua');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: suppliersApi.remove,
    onSuccess: () => {
      toast.success('Supplier delete ho gaya');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  const items = data?.items ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Supplier name likhein');
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      address: form.address.trim() || undefined,
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 text-orange-700 px-3 py-1 text-xs font-medium">
              <Truck className="h-3.5 w-3.5" />
              Supply Chain
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Suppliers</h2>
            <p className="mt-2 text-sm text-slate-500">
              Aap kis kis se maal khareedte hain — sab yahan manage hoga.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-950 text-white px-5 py-4 min-w-[180px]">
            <div className="text-xs text-slate-400">Total Suppliers</div>
            <div className="mt-1 text-2xl font-bold">{items.length}</div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[380px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">Naya Supplier</h3>
          <p className="text-sm text-slate-500 mt-1">Quick supplier creation</p>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <Input
              label="Supplier Name"
              placeholder="ABC Wholesalers"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            />
            <Input
              label="Phone"
              placeholder="+923009998877"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            />
            <Input
              label="Email"
              placeholder="contact@abc.com"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            />
            <Input
              label="Address"
              placeholder="Saddar, Karachi"
              value={form.address}
              onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
            />
            <Input
              label="Notes"
              placeholder="Trusted supplier"
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />

            <Button type="submit" className="w-full" size="lg" loading={createMutation.isPending}>
              <Plus className="h-4 w-4" />
              Supplier add karein
            </Button>
          </form>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Suppliers List</h3>
              <p className="text-sm text-slate-500">Search & manage</p>
            </div>

            <div className="relative w-full sm:w-[320px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                placeholder="Search supplier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="p-6 text-sm text-slate-500">Loading suppliers...</div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Truck className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi supplier nahi</h4>
              <p className="mt-1 text-sm text-slate-500">Left form se supplier add karein.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">
                      {item.phone || 'No phone'} • {item.email || 'No email'}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteMutation.mutate(item.id)}
                    className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
