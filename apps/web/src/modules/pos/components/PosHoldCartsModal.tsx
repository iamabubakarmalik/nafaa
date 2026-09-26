import { X, Pause, Play, Trash2, ShoppingCart } from 'lucide-react';
import { formatPKR } from '@core/lib/format';
import type { PosHeldCart } from '../lib/posCart';

/* ═════════════════════════════════════════════════════════════
   HOLD CARTS — adhoora bill ek taraf rakh dena
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Counter par ye roz hota hai:
   grahak ka bill ban raha hai aur wo "ek cheez aur laata hoon"
   keh kar chala jata hai. Peechhe qatar khari hai. Bill ek taraf
   rakh kar agla nipta liya jata hai, phir wapas uthaya jata hai.

   Waqt bhi dikhta hai — do adhoore bill ek jaise lagte hain,
   aur waqt hi batata hai ke kaun sa kis ka tha.
   ═════════════════════════════════════════════════════════════ */

export function PosHoldCartsModal({
  heldCarts, onResume, onDelete, onClose,
}: {
  heldCarts: PosHeldCart[];
  onResume: (cart: PosHeldCart) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const setShowHeldCarts = (_: boolean) => onClose();
  const resumeCart = onResume;
  const deleteHeld = onDelete;
  return (
<div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
  <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
    <div className="px-5 py-4 bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Pause className="h-6 w-6" />
        <h3 className="font-extrabold text-xl">Hold Carts</h3>
      </div>
      <button onClick={() => setShowHeldCarts(false)} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center">
        <X className="h-5 w-5" />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {heldCarts.length === 0 ? (
        <div className="text-center py-12">
          <Pause className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-extrabold text-slate-700 dark:text-slate-200">Koi hold cart nahi</p>
        </div>
      ) : heldCarts.map((h) => (
        <div key={h.id} className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-3 flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-extrabold text-slate-900 dark:text-white text-sm">{h.lines.length} items • {formatPKR(h.total)}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {new Date(h.heldAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <button onClick={() => resumeCart(h)} className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1 transition">
            <Play className="h-3.5 w-3.5" /> Resume
          </button>
          <button onClick={() => deleteHeld(h.id)} className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-500/15 hover:bg-rose-100 dark:hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 flex items-center justify-center transition">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
        </div>
      </div>
    </div>
  );
}

export default PosHoldCartsModal;
