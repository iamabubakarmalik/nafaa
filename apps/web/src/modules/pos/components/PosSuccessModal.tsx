import { X, CheckCircle2, Printer, ArrowRight } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

/* ═════════════════════════════════════════════════════════════
   SALE HO GAYI — aur wapsi kitni deni hai
   ─────────────────────────────────────────────────────────────
   Retail POS ka design, ab shared. Sab se bara harf wapsi ki
   raqam par hai: counter par sab se zyada ghalti wahin hoti hai.

   Agar zyada paisa khate me jama kar diya gaya to rang badal
   jata hai — warna munshi wohi raqam haath se bhi wapis kar
   deta tha.
   ═════════════════════════════════════════════════════════════ */

export interface PosLastSale {
  id: string;
  number: string;
  change: number;
  total: number;
  /** Zyada paisa customer ke khate me jama hua (wapis nahi diya) */
  deposited: boolean;
}

export function PosSuccessModal({
  lastSale, autoPrint, autoClose, onPrintAgain, onClose,
}: {
  lastSale: PosLastSale;
  autoPrint?: boolean;
  autoClose?: boolean;
  onPrintAgain: () => void;
  onClose: () => void;
}) {
  const closeSuccessModal = onClose;
  return (
<div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={closeSuccessModal}>
  <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150" onClick={(e) => e.stopPropagation()}>
    <div className="relative px-6 py-6 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-center">
      <button onClick={closeSuccessModal} className="absolute top-3 right-3 h-10 w-10 rounded-2xl bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center transition">
        <X className="h-5 w-5" />
      </button>
      <div className="h-16 w-16 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-2">
        <CheckCircle2 className="h-10 w-10" />
      </div>
      <h3 className="text-2xl font-extrabold">Sale Ho Gayi! 🎉</h3>
      <p className="text-xs font-bold text-white/90 mt-0.5 font-mono">{lastSale.number}</p>
      {autoPrint && (
        <p className="text-[10px] font-bold text-emerald-100 mt-1 inline-flex items-center gap-1">
          <Printer className="h-3 w-3" /> Receipt auto-print ho rahi hai
        </p>
      )}
    </div>
    {lastSale.change > 0 && (
      <div className={[
        'px-6 py-4 border-b-4 text-center',
        lastSale.deposited
          ? 'bg-violet-50 dark:bg-violet-500/15 border-violet-200 dark:border-violet-500/30'
          : 'bg-amber-50 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
      ].join(' ')}>
        <div className={['text-xs uppercase font-extrabold tracking-wider',
          lastSale.deposited ? 'text-violet-800 dark:text-violet-300' : 'text-amber-800 dark:text-amber-300'].join(' ')}>
          {lastSale.deposited ? '📔 Khaate mein jama ho gaya' : 'Customer ko wapis dein'}
        </div>
        <div className={['text-4xl font-extrabold tabular-nums mt-1',
          lastSale.deposited ? 'text-violet-700 dark:text-violet-300' : 'text-amber-700 dark:text-amber-300'].join(' ')}>
          {formatPKR(lastSale.change)}
        </div>
      </div>
    )}
    <div className="p-3 grid grid-cols-2 gap-2">
      <button
        onClick={onPrintAgain}
        className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 font-extrabold text-slate-700 dark:text-slate-200 transition inline-flex items-center justify-center gap-2">
        <Printer className="h-5 w-5" /> Print Again
      </button>
      <button onClick={closeSuccessModal} className="h-14 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-700 hover:to-cyan-700 active:scale-95 font-extrabold text-white text-lg shadow-lg transition inline-flex items-center justify-center gap-2">
        Nayi Sale <ArrowRight className="h-5 w-5" />
      </button>
    </div>
    {autoClose && (
      <div className="px-4 pb-2.5 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500">
        ⏱️ 3 sec me khud band — click karo foran band karne ke liye
      </div>
    )}
  </div>
</div>
  );
}

export default PosSuccessModal;
