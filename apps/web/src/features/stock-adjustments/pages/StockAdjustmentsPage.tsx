import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Plus, ArrowUp, ArrowDown, ShieldAlert, FileWarning } from 'lucide-react';
import { stockAdjustmentsApi, type AdjustmentType } from '@/api/stock-adjustments.api';
import { productsApi } from '@/api/products.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const typeConfig: Record<AdjustmentType, { label: string; tone: string; icon: any }> = {
  ADJUSTMENT_IN: { label: 'Stock In', tone: 'bg-emerald-100 text-emerald-700', icon: ArrowUp },
  ADJUSTMENT_OUT: { label: 'Stock Out', tone: 'bg-blue-100 text-blue-700', icon: ArrowDown },
  DAMAGE: { label: 'Damaged', tone: 'bg-rose-100 text-rose-700', icon: ShieldAlert },
  LOSS: { label: 'Loss', tone: 'bg-amber-100 text-amber-700', icon: FileWarning },
};

export default function StockAdjustmentsPage() {
  const queryClient = useQueryClient();
  const [productId, setProductId] = useState('');
  const [type, setType] = useState<AdjustmentType>('ADJUSTMENT_IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['products-for-adjustments'],
    queryFn: () => productsApi.list({ page: 1, limit: 200 }),
  });

  const { data: adjustments = [] } = useQuery({
    queryKey: ['stock-adjustments'],
    queryFn: stockAdjustmentsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: stockAdjustmentsApi.create,
    onSuccess: () => {
      toast.success('Stock adjustment saved');
      setProductId('');
      setType('ADJUSTMENT_IN');
      setQuantity('');
      setReason('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-adjustments'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Adjustment fail ho gayi');
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-slate-950 via-blue-900 to-blue-700 text-white p-6 shadow-soft">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <ClipboardCheck className="h-3.5 w-3.5" />
            Manual Stock Control
          </div>
          <h2 className="mt-3 text-3xl font-bold">Stock Adjustments</h2>
          <p className="mt-2 text-sm text-white/80">
            Damage, loss, ya counting correction ke liye stock manually adjust karein.
          </p>
        </div>
      </section>

      <section className="grid xl:grid-cols-[400px_1fr] gap-6">
        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6">
          <h3 className="text-xl font-bold text-slate-900">New Adjustment</h3>

          <div className="space-y-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Product</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="">Select product...</option>
                {(productsData?.items ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Adjustment Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AdjustmentType)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                <option value="ADJUSTMENT_IN">Stock In (+) — Counting correction</option>
                <option value="ADJUSTMENT_OUT">Stock Out (−) — Counting correction</option>
                <option value="DAMAGE">Damage — Saamaan kharab ho gaya</option>
                <option value="LOSS">Loss — Chori / kho gaya</option>
              </select>
            </div>

            <Input
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="5"
            />
            <Input
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged in transport"
            />
            <Input
              label="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Additional details"
            />

            <Button
              className="w-full"
              size="lg"
              loading={createMutation.isPending}
              onClick={() => {
                if (!productId) return toast.error('Product select karein');
                if (!Number(quantity) || Number(quantity) <= 0) return toast.error('Valid quantity likhein');
                if (!reason.trim()) return toast.error('Reason likhein');
                createMutation.mutate({
                  productId,
                  type,
                  quantity: Number(quantity),
                  reason: reason.trim(),
                  note: note.trim() || undefined,
                });
              }}
            >
              <Plus className="h-4 w-4" />
              Save Adjustment
            </Button>
          </div>
        </div>

        <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-900">Adjustment History</h3>
            <p className="text-sm text-slate-500">Latest 100 adjustments</p>
          </div>

          {adjustments.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center">
                <ClipboardCheck className="h-7 w-7 text-slate-400" />
              </div>
              <h4 className="mt-4 text-lg font-semibold text-slate-900">No adjustments yet</h4>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {adjustments.map((a) => {
                const cfg = typeConfig[a.type];
                const Icon = cfg.icon;
                return (
                  <div key={a.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.tone}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{a.product.name}</div>
                        <div className="text-xs text-slate-500 truncate">{a.reason}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {formatDate(a.createdAt)} • {a.createdBy?.fullName || 'System'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold ${a.type === 'ADJUSTMENT_IN' ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {a.type === 'ADJUSTMENT_IN' ? '+' : '−'}{a.quantity} {a.product.unit}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${cfg.tone}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
