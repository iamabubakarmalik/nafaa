import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Package, Plus, Minus, Save, AlertTriangle, TrendingUp } from 'lucide-react';
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

type Mode = 'add' | 'remove' | 'set';

/**
 * QuickStockModal v3 — Shop counter ke liye fastest stock update.
 * ➕ Maal Aaya  •  ➖ Maal Kam (toota/nikla)  •  ✍️ Ginti (exact set)
 * FIX: viewport clipping — modal ab max-h + internal scroll, kabhi cut nahi hoga.
 * ⌨️ Enter = Save, Esc = Band
 */
export function QuickStockModal({ product, onClose }: Props) {
  const queryClient = useQueryClient();
  const current = Number(product?.stock || 0);
  const unit = product?.unit || 'pcs';
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>('add');
  const [addQty, setAddQty] = useState<number | ''>('');
  const [removeQty, setRemoveQty] = useState<number | ''>('');
  const [setQty, setSetQty] = useState<number | ''>(current);

  const finalStock =
    mode === 'add' ? current + Number(addQty || 0)
    : mode === 'remove' ? current - Number(removeQty || 0)
    : Number(setQty || 0);

  const diff = finalStock - current;
  const inputEmpty =
    mode === 'add' ? addQty === '' : mode === 'remove' ? removeQty === '' : setQty === '';

  const mutation = useMutation({
    mutationFn: () => productsApi.update(product.id, { stock: finalStock } as any),
    onSuccess: () => {
      toast.success(`${product.name} — stock ${finalStock} ${unit} ho gaya`, {
        description: diff > 0 ? `+${diff} ${unit} add hua` : diff < 0 ? `${diff} ${unit} kam hua` : 'No change',
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

  /* ─── Keyboard: Enter = save, Esc = band + body scroll lock ─── */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'Enter' && !mutation.isPending && finalStock >= 0 && diff !== 0) {
        e.preventDefault();
        mutation.mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalStock, diff, mutation.isPending]);

  const focusInput = () => setTimeout(() => inputRef.current?.focus(), 50);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      {/* ✅ FIX: max-h-[92vh] + flex-col + body scroll — ab kabhi cut nahi hoga */}
      <div
        className="w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head — shrink-0, hamesha dikhega */}
        <div className="shrink-0 px-5 py-4 bg-gradient-to-br from-sky-600 to-cyan-700 text-white flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold">
              <Package className="h-3 w-3" /> Quick Stock
            </div>
            <h3 className="font-extrabold text-lg mt-1.5 truncate">{product.name}</h3>
            <div className="text-xs text-white/80 font-bold">
              Abhi stock: <strong>{current} {unit}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center shrink-0 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Mode — 3 tareeqay */}
          <div className="grid grid-cols-3 gap-2">
            <ModeBtn
              active={mode === 'add'}
              onClick={() => { setMode('add'); focusInput(); }}
              activeCls="border-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
              title="➕ Maal Aaya"
              sub="Add karo"
            />
            <ModeBtn
              active={mode === 'remove'}
              onClick={() => { setMode('remove'); focusInput(); }}
              activeCls="border-rose-600 bg-rose-50 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300"
              title="➖ Maal Kam"
              sub="Nikalo"
            />
            <ModeBtn
              active={mode === 'set'}
              onClick={() => { setMode('set'); focusInput(); }}
              activeCls="border-sky-600 bg-sky-50 dark:bg-sky-500/15 text-sky-800 dark:text-sky-300"
              title="✍️ Ginti"
              sub="Exact set"
            />
          </div>

          {/* Input */}
          {mode !== 'set' ? (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                {mode === 'add' ? `Kitna maal aaya? (${unit})` : `Kitna maal kam hua? (${unit})`}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const v = mode === 'add' ? Number(addQty || 0) : Number(removeQty || 0);
                    const nv = Math.max(0, v - 1);
                    mode === 'add' ? setAddQty(nv) : setRemoveQty(nv);
                  }}
                  className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 transition"
                >
                  <Minus className="h-5 w-5" />
                </button>
                <input
                  ref={inputRef}
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={mode === 'add' ? addQty : removeQty}
                  onChange={(e) => {
                    const v = e.target.value === '' ? '' : Number(e.target.value);
                    mode === 'add' ? setAddQty(v) : setRemoveQty(v);
                  }}
                  placeholder="0"
                  className={[
                    'h-14 flex-1 min-w-0 rounded-2xl border-2 px-4 text-center text-3xl font-extrabold tabular-nums focus:outline-none transition',
                    mode === 'add'
                      ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 focus:border-emerald-600'
                      : 'border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-900 dark:text-rose-200 focus:border-rose-600',
                  ].join(' ')}
                />
                <button
                  onClick={() => {
                    const v = mode === 'add' ? Number(addQty || 0) : Number(removeQty || 0);
                    mode === 'add' ? setAddQty(v + 1) : setRemoveQty(v + 1);
                  }}
                  className={[
                    'h-14 w-14 rounded-2xl text-white flex items-center justify-center shrink-0 transition',
                    mode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700',
                  ].join(' ')}
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_ADD.map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      const v = mode === 'add' ? Number(addQty || 0) : Number(removeQty || 0);
                      mode === 'add' ? setAddQty(v + q) : setRemoveQty(v + q);
                    }}
                    className={[
                      'px-3 py-1.5 rounded-xl border-2 text-xs font-extrabold transition',
                      mode === 'add'
                        ? 'bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-500/40 hover:bg-emerald-50 dark:hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800 border-rose-200 dark:border-rose-500/40 hover:bg-rose-50 dark:hover:bg-rose-500/15 text-rose-800 dark:text-rose-300',
                    ].join(' ')}
                  >
                    +{q}
                  </button>
                ))}
                <button
                  onClick={() => mode === 'add' ? setAddQty('') : setRemoveQty('')}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-extrabold transition"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                Naya total stock ({unit})
              </label>
              <input
                ref={inputRef}
                autoFocus
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                value={setQty}
                onChange={(e) => setSetQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-14 w-full rounded-2xl border-2 border-sky-300 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 px-4 text-center text-3xl font-extrabold tabular-nums text-sky-900 dark:text-sky-200 focus:outline-none focus:border-sky-600 transition"
              />
            </div>
          )}

          {/* Preview */}
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 border-2 border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Naya Stock</div>
              <div className={[
                'text-2xl font-extrabold tabular-nums',
                finalStock < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white',
              ].join(' ')}>
                {finalStock} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">{unit}</span>
              </div>
            </div>
            {diff !== 0 && (
              <div className={[
                'px-2.5 py-1 rounded-xl text-sm font-extrabold tabular-nums shrink-0',
                diff > 0
                  ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300',
              ].join(' ')}>
                {diff > 0 ? '+' : ''}{diff}
              </div>
            )}
            <div className="text-right">
              <div className="text-[10px] uppercase font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">Stock Value</div>
              <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums">
                {formatPKRFull(Math.max(finalStock, 0) * Number(product?.price || 0))}
              </div>
            </div>
          </div>

          {finalStock < 0 && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/15 border-2 border-rose-200 dark:border-rose-500/40 p-2.5 flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Stock minus nahi ho sakta — abhi sirf {current} {unit} hai
            </div>
          )}
        </div>

        {/* Footer — shrink-0, hamesha dikhega */}
        <div className="shrink-0 border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80 p-4 flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            loading={mutation.isPending}
            disabled={finalStock < 0 || diff === 0 || inputEmpty}
            className="flex-1 bg-gradient-to-r from-sky-600 to-cyan-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> Save Stock
          </Button>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, activeCls, title, sub }: {
  active: boolean; onClick: () => void; activeCls: string; title: string; sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'py-3 rounded-2xl border-2 font-extrabold text-xs sm:text-sm transition',
        active
          ? activeCls
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600',
      ].join(' ')}
    >
      {title}
      <div className="text-[10px] font-bold opacity-70">{sub}</div>
    </button>
  );
}

export default QuickStockModal;
