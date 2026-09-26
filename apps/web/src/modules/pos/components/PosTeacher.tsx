import { X, CheckCircle2, Printer, Zap, GraduationCap, Banknote, Mic, Receipt } from 'lucide-react';

/* ═════════════════════════════════════════════════════════════
   SIKHANE WALA PARDA — naye banday ke liye
   ─────────────────────────────────────────────────────────────
   Dukaan par kaam sikhane ka waqt nahi hota. Naya munshi pehle
   din counter par khara hota hai aur grahak samne. Ye parda wohi
   chaar cheezein batata hai jin ke baghair bill nahi banta.
   ═════════════════════════════════════════════════════════════ */

/* ══════════ POS TEACHER ══════════ */
export function PosTeacher({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-300 dark:border-sky-500/40 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-3 border-b-2 border-sky-200 dark:border-sky-500/30 bg-gradient-to-r from-sky-50 to-cyan-50 dark:from-sky-500/15 dark:to-cyan-500/15 flex items-center justify-between sticky top-0 z-10">
          <h3 className="font-extrabold text-sky-900 dark:text-sky-200 flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> POS — Complete Guide
          </h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-white dark:hover:bg-slate-800 flex items-center justify-center transition">
            <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* 🖨️ PRINT FLOW — sab se zaroori */}
          <div className="rounded-2xl border-2 border-sky-200 dark:border-sky-500/30 bg-sky-50/60 dark:bg-sky-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-sky-700 dark:text-sky-300 flex items-center gap-1">
              <Printer className="h-3 w-3" /> 🖨️ 2-Second Billing Flow
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>Scan/click karo → F12 → done!</strong> Receipt seedha print dialog me aa jayegi — receipt page pe jaana hi nahi</TipRow>
              <TipRow>Settings ⚙️ me <strong>Auto-Print</strong> ON rakho + printer width chuno (80mm standard / 58mm chhota)</TipRow>
              <TipRow>Popup blocked aaye to browser me 🔒 icon → "Pop-ups" → <strong>Allow</strong></TipRow>
              <TipRow>Success modal me <strong>"Print Again"</strong> — receipt dobara nikalni ho to</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-rose-200 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-rose-700 dark:text-rose-300 flex items-center gap-1">
              <Mic className="h-3 w-3" /> 🎤 Voice Sale (F6)
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>"2 kilo chini"</strong> — item cart mein</TipRow>
              <TipRow><strong>"sau ka doodh"</strong> — paise se wazan khud niklega</TipRow>
              <TipRow><strong>"dedh kilo aata"</strong> — 1.5 kg samajhta hai</TipRow>
              <TipRow><strong>"udhaar"</strong> / <strong>"nagad"</strong> — checkout khul jayega</TipRow>
              <TipRow><strong>"5 percent discount"</strong> — discount lag jayega</TipRow>
              <TipRow><strong>"cart clear karo"</strong> — sab saaf</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Zap className="h-3 w-3" /> ⚡ Speed Shortcuts
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow><strong>F12</strong> — INSTANT CASH: scan → F12 → print. Bas!</TipRow>
              <TipRow><strong>F9</strong> — checkout (cash/udhaar/card) • <strong>Enter</strong> — confirm</TipRow>
              <TipRow><strong>F2</strong> scanner • <strong>F6</strong> voice • <strong>F7/F8/F10</strong> tabs</TipRow>
              <TipRow>Checkout me <strong>F1/F3/F4/F5</strong> = payment method, <strong>F6</strong> = udhaar</TipRow>
            </div>
          </div>
          <div className="rounded-2xl border-2 border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/5 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Banknote className="h-3 w-3" /> 💱 Zyada Paisa / Udhaar
            </div>
            <div className="space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <TipRow>Customer ne zyada diya? → bada green <strong>"wapis dein"</strong> dikhta hai</TipRow>
              <TipRow>Ya tick karo <strong>"khaate mein jama"</strong> — advance balance ban jayega</TipRow>
              <TipRow><strong>Kuch Cash</strong> mode — jitna diya likho, baqi khud udhaar</TipRow>
            </div>
          </div>
          <button onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-700 hover:from-sky-700 hover:to-cyan-800 text-white font-extrabold shadow-lg shadow-sky-500/40 inline-flex items-center justify-center gap-2 transition">
            <CheckCircle2 className="h-4 w-4" /> Samajh Gaya — Sale Shuru!
          </button>
        </div>
      </div>
    </div>
  );
}

function TipRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

export default PosTeacher;
