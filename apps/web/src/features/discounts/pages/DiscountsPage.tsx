import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Tag, Plus, Trash2, ToggleLeft, ToggleRight,
  Percent, DollarSign, Calendar, BarChart3,
} from 'lucide-react';
import { discountsApi, type DiscountType } from '@/api/discounts.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatPKR } from '@nafaa/shared-utils';
import { toast } from 'sonner';

export default function DiscountsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    code: '',
    description: '',
    type: 'PERCENTAGE' as DiscountType,
    value: '',
    minPurchase: '',
    maxDiscount: '',
    usageLimit: '',
    validUntil: '',
  });

  const { data: codes = [] } = useQuery({
    queryKey: ['discounts'],
    queryFn: discountsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: discountsApi.create,
    onSuccess: () => {
      toast.success('Discount code created');
      setForm({
        code: '',
        description: '',
        type: 'PERCENTAGE',
        value: '',
        minPurchase: '',
        maxDiscount: '',
        usageLimit: '',
        validUntil: '',
      });
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Create fail'),
  });

  const toggleMutation = useMutation({
    mutationFn: discountsApi.toggle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: discountsApi.remove,
    onSuccess: () => {
      toast.success('Deleted');
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
    },
  });

  const stats = {
    total: codes.length,
    active: codes.filter((c) => c.isActive).length,
    used: codes.reduce((s, c) => s + c.usageCount, 0),
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-pink-900 to-pink-700 text-white p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Tag className="h-3.5 w-3.5" />
              Promo Codes
            </div>
            <h2 className="mt-3 text-3xl font-bold">Discount Codes</h2>
            <p className="mt-2 text-sm text-white/80">
              Eid, sales, special offers ke liye promo codes banayein.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-3 min-w-[100px]">
              <div className="text-[10px] text-white/70">Total</div>
              <div className="text-xl font-bold">{stats.total}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 min-w-[100px]">
              <div className="text-[10px] text-white/70">Active</div>
              <div className="text-xl font-bold">{stats.active}</div>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 min-w-[100px]">
              <div className="text-[10px] text-white/70">Times Used</div>
              <div className="text-xl font-bold">{stats.used}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid xl:grid-cols-[400px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">New Discount Code</h3>

          <div className="space-y-4 mt-6">
            <Input
              label="Code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="EID2026"
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Eid special discount"
            />

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setForm({ ...form, type: 'PERCENTAGE' })}
                  className={`p-3 rounded-xl border-2 transition flex items-center justify-center gap-2 ${
                    form.type === 'PERCENTAGE'
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <Percent className="h-4 w-4" />
                  Percentage
                </button>
                <button
                  onClick={() => setForm({ ...form, type: 'FIXED_AMOUNT' })}
                  className={`p-3 rounded-xl border-2 transition flex items-center justify-center gap-2 ${
                    form.type === 'FIXED_AMOUNT'
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  Fixed
                </button>
              </div>
            </div>

            <Input
              label={form.type === 'PERCENTAGE' ? 'Percentage (0-100)' : 'Amount (PKR)'}
              type="number"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              placeholder={form.type === 'PERCENTAGE' ? '20' : '500'}
            />

            <Input
              label="Min Purchase (PKR)"
              type="number"
              value={form.minPurchase}
              onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
              placeholder="0"
            />

            {form.type === 'PERCENTAGE' && (
              <Input
                label="Max Discount Cap (optional)"
                type="number"
                value={form.maxDiscount}
                onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                placeholder="1000"
              />
            )}

            <Input
              label="Usage Limit (optional)"
              type="number"
              value={form.usageLimit}
              onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
              placeholder="100"
            />

            <Input
              label="Valid Until (optional)"
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
            />

            <Button
              className="w-full"
              size="lg"
              loading={createMutation.isPending}
              onClick={() => {
                if (!form.code.trim()) return toast.error('Code likhein');
                if (!Number(form.value)) return toast.error('Value likhein');
                createMutation.mutate({
                  code: form.code.trim(),
                  description: form.description.trim() || undefined,
                  type: form.type,
                  value: Number(form.value),
                  minPurchase: Number(form.minPurchase || 0),
                  maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
                  usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
                  validUntil: form.validUntil || undefined,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Create Code
            </Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Active Codes</h3>
          </div>

          {codes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <Tag className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No codes yet</h4>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4 p-6">
              {codes.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-2xl border-2 p-5 transition ${
                    c.isActive
                      ? 'border-pink-200 bg-pink-50/50'
                      : 'border-slate-200 bg-slate-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xl font-bold text-slate-900">{c.code}</div>
                      {c.description && (
                        <div className="text-xs text-slate-600 mt-1">{c.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleMutation.mutate(c.id)}
                        className="text-slate-700 hover:bg-white rounded-lg p-1.5"
                      >
                        {c.isActive ? (
                          <ToggleRight className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${c.code}?`)) deleteMutation.mutate(c.id);
                        }}
                        className="text-rose-600 hover:bg-white rounded-lg p-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Discount</div>
                      <div className="font-bold text-slate-900">
                        {c.type === 'PERCENTAGE' ? `${c.value}%` : formatPKR(c.value)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Min Purchase</div>
                      <div className="font-medium text-slate-700">{formatPKR(c.minPurchase)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Used</div>
                      <div className="font-medium text-slate-700">
                        {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}
                      </div>
                    </div>
                    {c.validUntil && (
                      <div>
                        <div className="text-xs text-slate-500">Expires</div>
                        <div className="font-medium text-slate-700 text-xs">
                          {new Date(c.validUntil).toLocaleDateString('en-PK')}
                        </div>
                      </div>
                    )}
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
