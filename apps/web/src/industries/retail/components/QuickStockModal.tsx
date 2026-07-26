import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Package, Plus, Minus, Save, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@core/ui/Button';
import { formatPKRFull } from '@core/lib/format';
import { productsApi } from '@modules/inventory/products/api/products.api';
import { forceRefreshProducts } from '@core/lib/offline/offlineProducts';

interface Props {
  product: any;
  onClose: () => void;
}

const QUICK_ADD = [1, 5, 10, 12, 24, 50, 100];

/**
 * QuickStockModal — Shop counter ke liye fastest stock update.
 * Mode "add" = maal aaya (plus), Mode "set" = ginti kar ke exact likho.
 */
export function QuickStockModal({ product, onClose }: Props) {
  const queryClient = useQueryClient();
  const current = Number(product?.stock || 0);
  const unit = product?.unit || 'pcs';

  const [mode, setMode] = useState<'add' | 'set'>('add');
  const [addQty, setAddQty] = useState<number | ''>('');
  const [setQty, setSetQty] = useState<number | ''>(current);

  const finalStock = mode === 'add'
    ? current + Number(addQty || 0)
    : Number(setQty || 0);

  const diff = finalStock - current;

  const mutation = useMutation({
    mutationFn: () => productsApi.update(product.id, { stock: finalStock } as any),
    onSuccess: () => {
      toast.success(`${product.name} — stock ${finalStock} ${unit} ho gaya`, {
        description: diff > 0 ? `+${diff} ${unit} added` : diff < 0 ? `${diff} ${unit} kam hua` : 'No change',
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', product.id] });
      queryClient.invalidateQueries({ queryKey: ['retail-products'] });
      forceRefreshProducts().catch(() => {});
      onClose();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Stock update nahi hua'),
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Head */}
        <div className="px-5 py-4 bg-gradient-to-br from-sky-600 to-cyan-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Package className="h-3 w-3" /> Quick Stock
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{product.name}</h3>
            <div className="text-xs text-white/80 font-bold">
              Abhi stock: <strong>{current} {unit}</strong>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('add')}
              className={[
                'py-3 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'add'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300',
              ].join(' ')}
            >
              ➕ Maal Aaya
              <div className="text-[10px] font-bold opacity-70">Stock me add karo</div>
            </button>
            <button
              onClick={() => setMode('set')}
              className={[
                'py-3 rounded-2xl border-2 font-extrabold text-sm transition',
                mode === 'set'
                  ? 'border-sky-600 bg-sky-50 text-sky-800'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300',
              ].join(' ')}
            >
              ✍️ Ginti Likho
              <div className="text-[10px] font-bold opacity-70">Exact stock set karo</div>
            </button>
          </div>

          {/* Input */}
          {mode === 'add' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Kitna maal aaya? ({unit})
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAddQty(Math.max(0, Number(addQty || 0) - 1))}
                  className="h-14 w-14 rounded-2xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <input
                  autoFocus
                  type="number"
                  value={addQty}
                  onChange={(e) => setAddQty(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="h-14 flex-1 rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-4 text-center text-3xl font-extrabold tabular-nums text-emerald-900 focus:outline-none focus:border-emerald-600"
                />
                <button
                  onClick={() => setAddQty(Number(addQty || 0) + 1)}
                  className="h-14 w-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shrink-0"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_ADD.map((q) => (
                  <button
                    key={q}
                    onClick={() => setAddQty(Number(addQty || 0) + q)}
                    className="px-3 py-1.5 rounded-xl bg-white border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-800 text-xs font-extrabold"
                  >
                    +{q}
                  </button>
                ))}
                <button
                  onClick={() => setAddQty('')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-extrabold"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-1.5">
                Naya total stock ({unit})
              </label>
              <input
                autoFocus
                type="number"
                value={setQty}
                onChange={(e) => setSetQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-14 w-full rounded-2xl border-2 border-sky-300 bg-sky-50 px-4 text-center text-3xl font-extrabold tabular-nums text-sky-900 focus:outline-none focus:border-sky-600"
              />
            </div>
          )}

          {/* Preview */}
          <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Naya Stock</div>
              <div className="text-2xl font-extrabold text-slate-900 tabular-nums">
                {finalStock} <span className="text-sm font-bold text-slate-500">{unit}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider">Stock Value</div>
              <div className="text-lg font-extrabold text-emerald-700 tabular-nums">
                {formatPKRFull(finalStock * Number(product?.price || 0))}
              </div>
            </div>
          </div>

          {finalStock < 0 && (
            <div className="rounded-xl bg-rose-50 border-2 border-rose-200 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stock minus nahi ho sakta
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
            <Button
              onClick={() => mutation.mutate()}
              loading={mutation.isPending}
              disabled={finalStock < 0 || diff === 0}
              className="flex-1 bg-gradient-to-r from-sky-600 to-cyan-700"
            >
              <Save className="h-4 w-4" /> Save Stock
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickStockModal;
