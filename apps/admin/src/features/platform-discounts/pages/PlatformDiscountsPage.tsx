import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Percent, DollarSign, X, Check } from 'lucide-react';
import {
  adminPlatformDiscountsApi,
  type PlatformDiscount,
  type DiscountType,
  type UpsertPlatformDiscountPayload,
} from '@/api/admin-platform-discounts.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

const formatDate = (v?: string | null) =>
  v ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'short' }).format(new Date(v)) : '—';

export default function PlatformDiscountsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlatformDiscount | null>(null);

  const [form, setForm] = useState<UpsertPlatformDiscountPayload>({
    code: '', description: '', type: 'PERCENTAGE', value: 0,
    scope: 'ANY', minPurchase: 0, isActive: true,
  });

  const { data: list = [] } = useQuery({
    queryKey: ['admin-platform-discounts'],
    queryFn: adminPlatformDiscountsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: () => editing
      ? adminPlatformDiscountsApi.update(editing.id, form)
      : adminPlatformDiscountsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? 'Discount updated' : 'Discount created');
      setShowForm(false);
      setEditing(null);
      setForm({ code: '', description: '', type: 'PERCENTAGE', value: 0, scope: 'ANY', minPurchase: 0, isActive: true });
      queryClient.invalidateQueries({ queryKey: ['admin-platform-discounts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Save failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: (d: PlatformDiscount) =>
      adminPlatformDiscountsApi.update(d.id, { isActive: !d.isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-platform-discounts'] }),
  });

  const removeMutation = useMutation({
    mutationFn: adminPlatformDiscountsApi.remove,
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-platform-discounts'] });
    },
  });

  const startEdit = (d: PlatformDiscount) => {
    setEditing(d);
    setForm({
      code: d.code, description: d.description ?? '', type: d.type, value: d.value,
      scope: d.scope, minPurchase: d.minPurchase, maxDiscount: d.maxDiscount ?? undefined,
      usageLimit: d.usageLimit ?? undefined, perTenantLimit: d.perTenantLimit ?? undefined,
      validFrom: d.validFrom ?? undefined, validUntil: d.validUntil ?? undefined, isActive: d.isActive,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-pink-900 to-pink-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Tag className="h-3.5 w-3.5" /> Platform Discounts
            </div>
            <h2 className="mt-3 text-3xl font-bold">Promo Codes</h2>
            <p className="mt-2 text-sm text-white/80">Platform-wide promo codes admin ke under</p>
          </div>
          <Button onClick={() => { setShowForm(true); setEditing(null); }}
            className="bg-white text-slate-900 hover:bg-slate-100">
            <Plus className="h-4 w-4" /> New Code
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((d) => (
          <div key={d.id} className={`rounded-2xl border-2 p-5 ${
            d.isActive ? 'border-pink-200 bg-pink-50/50' : 'border-slate-200 bg-slate-50 opacity-60'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-xl font-bold">{d.code}</div>
                {d.description && <div className="text-xs text-slate-600 mt-1">{d.description}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleMutation.mutate(d)} className="rounded-lg p-1.5">
                  {d.isActive ? <ToggleRight className="h-5 w-5 text-emerald-600" /> : <ToggleLeft className="h-5 w-5" />}
                </button>
                <button onClick={() => startEdit(d)} className="text-slate-700 hover:bg-white rounded-lg p-1.5">
                  <Plus className="h-4 w-4 rotate-45" />
                </button>
                <button onClick={() => { if (confirm(`Delete ${d.code}?`)) removeMutation.mutate(d.id); }}
                  className="text-rose-600 hover:bg-white rounded-lg p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-slate-500">Discount</div>
                <div className="font-bold">{d.type === 'PERCENTAGE' ? `${d.value}%` : formatPKR(d.value)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Min Purchase</div>
                <div className="font-medium">{formatPKR(d.minPurchase)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Used</div>
                <div className="font-medium">{d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ''}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Valid Until</div>
                <div className="font-medium text-xs">{formatDate(d.validUntil)}</div>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <div className="col-span-full p-12 text-center text-sm text-slate-500">No platform discounts yet</div>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-xl">{editing ? 'Edit Discount' : 'New Discount'}</h3>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <Input label="Code" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="LAUNCH50" disabled={!!editing} />
              <Input label="Description" value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setForm({ ...form, type: 'PERCENTAGE' })}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${
                      form.type === 'PERCENTAGE' ? 'border-pink-500 bg-pink-50' : 'border-slate-200'
                    }`}>
                    <Percent className="h-4 w-4" /> Percentage
                  </button>
                  <button onClick={() => setForm({ ...form, type: 'FIXED_AMOUNT' })}
                    className={`p-3 rounded-xl border-2 flex items-center justify-center gap-2 ${
                      form.type === 'FIXED_AMOUNT' ? 'border-pink-500 bg-pink-50' : 'border-slate-200'
                    }`}>
                    <DollarSign className="h-4 w-4" /> Fixed
                  </button>
                </div>
              </div>

              <Input label={form.type === 'PERCENTAGE' ? 'Percentage' : 'Amount (PKR)'} type="number"
                value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
              <Input label="Min Purchase (PKR)" type="number" value={form.minPurchase ?? 0}
                onChange={(e) => setForm({ ...form, minPurchase: Number(e.target.value) })} />
              <Input label="Usage Limit (optional)" type="number" value={form.usageLimit ?? ''}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })} />
              <Input label="Valid Until (optional)" type="date" value={form.validUntil?.slice(0, 10) ?? ''}
                onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
                <Button onClick={() => {
                  if (!form.code.trim()) return toast.error('Code likhein');
                  if (!form.value) return toast.error('Value likhein');
                  saveMutation.mutate();
                }} loading={saveMutation.isPending} className="flex-1">
                  <Check className="h-4 w-4" /> {editing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
