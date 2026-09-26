import { X, CheckCircle2, Printer, Settings2 } from 'lucide-react';
import type { PrinterWidth } from '../hooks/usePosPreferences';

/* ═════════════════════════════════════════════════════════════
   POS SETTINGS — auto-print, printer ka naap, auto-close
   ─────────────────────────────────────────────────────────────
   Ye Retail POS ka design hai, ab har industry ke liye. Settings
   khud ye modal nahi sambhalta — `usePosPreferences` sambhalta
   hai. Is tarah bulane wala page chahe to apni marzi ki jagah se
   value de sakta hai.
   ═════════════════════════════════════════════════════════════ */

/* ═════════════════════════════════════════════════════════════
   ⚙️ POS SETTINGS MODAL
   ═════════════════════════════════════════════════════════════ */
export function PosSettingsModal({
  autoPrint, setAutoPrint, autoClose, setAutoClose, printerWidth, setPrinterWidth, onClose,
}: {
  autoPrint: boolean; setAutoPrint: (v: boolean) => void;
  autoClose: boolean; setAutoClose: (v: boolean) => void;
  printerWidth: PrinterWidth; setPrinterWidth: (v: PrinterWidth) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6" />
            <h3 className="font-extrabold text-xl">POS Settings</h3>
          </div>
          <button onClick={onClose} className="h-11 w-11 rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Auto print */}
          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/40 bg-sky-50 dark:bg-sky-500/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Printer className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">🖨️ Auto-Print Receipt</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Sale hote hi print dialog — receipt page nahi khulega</div>
                </div>
              </div>
              <button
                onClick={() => setAutoPrint(!autoPrint)}
                className={['shrink-0 w-14 h-8 rounded-full transition relative',
                  autoPrint ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'].join(' ')}>
                <span className={['absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all',
                  autoPrint ? 'left-7' : 'left-1'].join(' ')} />
              </button>
            </div>
            {autoPrint && (
              <div className="mt-3 pt-3 border-t border-sky-200 dark:border-sky-500/30">
                <div className="text-[10px] uppercase font-extrabold text-sky-700 dark:text-sky-300 tracking-wider mb-1.5">Printer width</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['80', '58'] as const).map((w) => (
                    <button key={w} onClick={() => setPrinterWidth(w)}
                      className={['h-10 rounded-xl text-sm font-extrabold transition border-2',
                        printerWidth === w
                          ? 'bg-sky-600 border-sky-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'].join(' ')}>
                      {w}mm {w === '80' ? '(standard)' : '(chhota)'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Auto close */}
          <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900 dark:text-white text-sm">✅ Success Auto-Close</div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">Sale ke baad modal 3 sec me khud band</div>
                </div>
              </div>
              <button
                onClick={() => setAutoClose(!autoClose)}
                className={['shrink-0 w-14 h-8 rounded-full transition relative',
                  autoClose ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'].join(' ')}>
                <span className={['absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all',
                  autoClose ? 'left-7' : 'left-1'].join(' ')} />
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
            💡 <strong>Popup blocked?</strong> Browser ke address bar me 🔒 icon pe click → "Pop-ups and redirects" → Allow. Tabhi auto-print chalega.
          </div>
        </div>
      </div>
    </div>
  );
}

export default PosSettingsModal;
