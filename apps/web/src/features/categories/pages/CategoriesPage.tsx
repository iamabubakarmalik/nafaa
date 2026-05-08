import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Trash2, Package } from 'lucide-react';
import { categoriesApi } from '@/api/categories.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const colors = [
  '#2c9466', '#3b82f6', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
];

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [color, setColor] = useState(colors[0]);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      toast.success('Category add ho gayi');
      setName('');
      setColor(colors[0]);
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Category add nahi hui');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      toast.success('Category delete ho gayi');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-xs font-medium">
              <Tag className="h-3.5 w-3.5" />
              Product Organization
            </div>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Categories</h2>
            <p className="mt-2 text-sm text-slate-500">
              Apne products ko Bakery, Drinks, Spare Parts mein organize karein.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-950 text-white px-5 py-4 min-w-[180px]">
            <div className="text-xs text-slate-400">Total Categories</div>
            <div className="mt-1 text-2xl font-bold">{categories.length}</div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[380px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">Naya Category</h3>
          <p className="text-sm text-slate-500 mt-1">Quick add</p>

          <div className="space-y-4 mt-6">
            <Input
              label="Category Name"
              placeholder="Bakery Items"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-10 w-10 rounded-xl border-2 transition ${
                      color === c ? 'border-slate-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              loading={createMutation.isPending}
              onClick={() => {
                if (!name.trim()) {
                  toast.error('Name likhein');
                  return;
                }
                createMutation.mutate({ name: name.trim(), color });
              }}
            >
              <Plus className="h-4 w-4" />
              Category add karein
            </Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Categories List</h3>
            <p className="text-sm text-slate-500">All your product categories</p>
          </div>

          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Tag className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">Abhi koi category nahi</h4>
              <p className="mt-1 text-sm text-slate-500">Pehli category add karein.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:shadow-soft transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Tag className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{cat.name}</div>
                        <div className="text-xs text-slate-500 inline-flex items-center gap-1 mt-1">
                          <Package className="h-3 w-3" />
                          {cat._count?.products ?? 0} products
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteMutation.mutate(cat.id)}
                      className="text-red-600 hover:bg-red-50 rounded-lg p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
