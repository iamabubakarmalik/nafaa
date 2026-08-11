import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { productsApi } from '@modules/inventory/products/api/products.api';

/**
 * ProductDeleteButton — shared smart delete for EVERY industry page.
 *
 * Flow:
 *   Click → normal delete try
 *     → No history: delete ho gaya, done
 *     → Sales/purchase history: DANGER modal khulti hai →
 *       2-step confirm → force=true → backend cascade delete
 *       (sales items, purchases, stock, images, variants, batches,
 *        IMEIs, carpet rolls, shop stock — sab + empty orphan sales)
 *
 * Usage (kisi bhi industry page pe, 2 lines):
 *   import { ProductDeleteButton } from '@core/components/ProductDeleteButton';
 *   <ProductDeleteButton id={p.id} name={p.name} />
 */
export function ProductDeleteButton({
  id,
  name,
  onDeleted,
  className,
  size = 'sm',
}: {
  id: string;
  name: string;
  onDeleted?: () => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const queryClient = useQueryClient();
  const [dangerOpen, setDangerOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);

  const afterDelete = () => {
    // Sab product-related caches refresh (har industry ke query keys cover)
    queryClient.invalidateQueries();
    onDeleted?.();
  };

  const softTry = useMutation({
    mutationFn: () => productsApi.remove(id, false),
    onSuccess: (r: any) => {
      if (r?.softDeleted) {
        // History hai — danger modal kholo
        setStep(1);
        setDangerOpen(true);
        toast.message(`"${name}" ki sales history hai`, {
          description: 'Cascade delete ke liye confirm karein',
        });
      } else {
        toast.success(`"${name}" delete ho gaya`);
        afterDelete();
      }
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || 'Delete nahi hua'),
  });

  const doForceDelete = async () => {
    setBusy(true);
    try {
      const r: any = await productsApi.remove(id, true);
      toast.success(r?.message || `"${name}" + sales + stock — sab permanently delete`);
      setDangerOpen(false);
      afterDelete();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Force delete failed');
    } finally {
      setBusy(false);
    }
  };

  const btnSize =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : 'h-10 px-3 rounded-xl gap-1.5 text-xs font-extrabold';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          softTry.mutate();
        }}
        disabled={softTry.isPending}
        title="Delete — sales & stock bhi delete honge"
        className={
          className ??
          `${btnSize} bg-rose-50 hover:bg-rose-100 text-rose-600 inline-flex items-center justify-center transition disabled:opacity-50`
        }
      >
        <Trash2 className="h-3.5 w-3.5" />
        {size === 'md' && <span>Delete</span>}
      </button>

      {dangerOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !busy && setDangerOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <Trash2 className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-widest font-extrabold text-white/80">
                    Permanent Delete — Step {step}/2
                  </div>
                  <h3 className="font-extrabold text-lg truncate">{name}</h3>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {step === 1 ? (
                <>
                  <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border-2 border-rose-200 dark:border-rose-800 p-4">
                    <div className="font-extrabold text-rose-900 dark:text-rose-200 text-sm mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Is product ki sales history hai. Delete karne se ye sab jayega:
                    </div>
                    <ul className="text-xs font-semibold text-rose-800 dark:text-rose-300 space-y-1">
                      <li>• Product + images + variants + batches</li>
                      <li>• Stock records (har shop ka)</li>
                      <li>• Sale items & purchase history</li>
                      <li>• IMEIs / carpet rolls / cut pieces (agar hain)</li>
                      <li>• Empty ho jane wali sale receipts</li>
                    </ul>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold text-center">
                    Sirf demo/test products ke liye. Ye action{' '}
                    <strong>undo nahi</strong> ho sakta.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDangerOpen(false)}
                      className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200"
                    >
                      Cancel — Rehne Do
                    </button>
                    <button
                      onClick={() => setStep(2)}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold"
                    >
                      Samajh gaya, aage →
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-center leading-relaxed">
                    Final confirmation:
                    <br />
                    <span className="text-rose-600 font-extrabold">"{name}"</span> aur
                    iski saari history delete kar dein?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStep(1)}
                      disabled={busy}
                      className="flex-1 h-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-extrabold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                    >
                      ← Wapas
                    </button>
                    <button
                      onClick={doForceDelete}
                      disabled={busy}
                      className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-extrabold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {busy ? 'Deleting...' : 'Delete Forever'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
