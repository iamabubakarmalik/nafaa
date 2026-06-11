import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Trash2, Star, MapPin, Phone } from 'lucide-react';
import { shopsApi } from '@/api/shops.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

export default function ShopsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    isMain: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: shopsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: shopsApi.create,
    onSuccess: () => {
      toast.success('Shop add ho gayi');
      setForm({ name: '', address: '', phone: '', isMain: false });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create fail'),
  });

  const deleteMutation = useMutation({
    mutationFn: shopsApi.remove,
    onSuccess: () => {
      toast.success('Shop delete ho gayi');
      queryClient.invalidateQueries({ queryKey: ['shops'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-900 to-indigo-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Building2 className="h-3.5 w-3.5" />
              Multi-Branch Setup
            </div>
            <h2 className="mt-3 text-3xl font-bold">Shops / Branches</h2>
            <p className="mt-2 text-sm text-white/80">
              Agar aap ki ek se zyada dukan hain, sab ko yahan add karein.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 min-w-[160px]">
            <div className="text-xs text-white/70">Total Shops</div>
            <div className="mt-1 text-2xl font-bold">{shops.length}</div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[400px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">Naya Shop / Branch</h3>

          <div className="space-y-4 mt-6">
            <Input
              label="Shop Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Main Branch"
            />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Liberty Market, Lahore"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+923001234567"
            />

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isMain}
                onChange={(e) => setForm({ ...form, isMain: e.target.checked })}
                className="h-5 w-5 rounded border-slate-300 text-brand-600"
              />
              <span className="text-sm font-medium text-slate-700">Main shop ke tor pe set karein</span>
            </label>

            <Button
              className="w-full"
              size="lg"
              loading={createMutation.isPending}
              onClick={() => {
                if (!form.name.trim()) return toast.error('Name likhein');
                createMutation.mutate({
                  name: form.name.trim(),
                  address: form.address.trim() || undefined,
                  phone: form.phone.trim() || undefined,
                  isMain: form.isMain,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Shop add karein
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {shops.length === 0 ? (
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi shop nahi</h4>
              <p className="mt-1 text-sm text-slate-500">Pehla shop add karein.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className={`rounded-3xl border p-6 shadow-sm ${
                    shop.isMain ? 'bg-gradient-to-br from-amber-50 to-white border-amber-300' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center">
                      <Building2 className="h-6 w-6" />
                    </div>
                    {shop.isMain && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                        <Star className="h-3 w-3 fill-current" />
                        MAIN
                      </span>
                    )}
                  </div>

                  <h4 className="mt-4 text-lg font-bold text-slate-900">{shop.name}</h4>

                  {shop.address && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                      <MapPin className="h-3 w-3" />
                      {shop.address}
                    </div>
                  )}
                  {shop.phone && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                      <Phone className="h-3 w-3" />
                      {shop.phone}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (confirm(`Delete ${shop.name}?`)) deleteMutation.mutate(shop.id);
                    }}
                    className="mt-4 text-rose-600 hover:bg-rose-50 rounded-lg px-3 py-2 text-sm flex items-center gap-2"
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
