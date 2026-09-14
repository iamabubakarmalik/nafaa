// apps/web/src/modules/pos/components/PosDiscountBar.tsx
import { Percent, Banknote, X } from 'lucide-react';
import { formatPKR } from '@core/lib/format';

/* ═════════════════════════════════════════════════════════════
   POS DISCOUNT BAR — har POS me yehi patti hoti thi, alag alag
   likhi hui. Ab ek hi jagah.

   Do tarah ka discount chalta hai:
     • %      — "10% chhoot"
     • Rupay  — "500 kam kar do"  ← Pakistan me ye ziyada aam hai

   Purana percent-only istemal bhi chalta rehta hai: sirf `value`
   aur `onChange` dein to bar pehle jaisa hi kaam karega.
   ═════════════════════════════════════════════════════════════ */

export type DiscountMode = 'pct' | 'rs';

interface Props {
  /** Discount jis par lagega — rupay wale mode ke liye zaroori */
  subtotal?: number;

  /* ── Dono mode wala istemal ── */
  mode?: DiscountMode;
  pct?: number;
  rs?: number;
  onMode?: (m: DiscountMode) => void;
  onPct?: (v: number) => void;
  onRs?: (v: number) => void;

  /* ── Purana, sirf percent wala istemal ── */
  value?: number;
  onChange?: (pct: number) => void;

  /** Kaunse percent dikhane hain */
  steps?: number[];
  /** Kaunsi rupay wali raqam dikhani hai — na dein to subtotal se khud banti hai */
  rsSteps?: number[];
  tone?: 'amber' | 'emerald' | 'blue' | 'violet' | 'cyan';
  showLabel?: boolean;
}

const TONES: Record<string, string> = {
  amber: 'bg-amber-600',
  emerald: 'bg-emerald-600',
  blue: 'bg-blue-600',
  violet: 'bg-violet-600',
  cyan: 'bg-cyan-600',
};

const ICON_TONES: Record<string, string> = {
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  violet: 'text-violet-600',
  cyan: 'text-cyan-600',
};

const FOCUS: Record<string, string> = {
  amber: 'focus:border-amber-500',
  emerald: 'focus:border-emerald-500',
  blue: 'focus:border-blue-500',
  violet: 'focus:border-violet-500',
  cyan: 'focus:border-cyan-500',
};

/** Subtotal ke hisab se theek theek raqam — 1,240 par "200/500/1000" */
function autoRsSteps(subtotal: number): number[] {
  if (subtotal <= 0) return [100, 200, 500];
  const round = (n: number) => {
    if (n >= 10000) return Math.round(n / 5000) * 5000;
    if (n >= 2000) return Math.round(n / 500) * 500;
    if (n >= 500) return Math.round(n / 100) * 100;
    return Math.max(Math.round(n / 50) * 50, 50);
  };
  const raw = [0.05, 0.1, 0.2].map((f) => round(subtotal * f));
  return [...new Set(raw)].filter((v) => v > 0 && v <= subtotal);
}

export function PosDiscountBar({
  subtotal = 0,
  mode, pct, rs, onMode, onPct, onRs,
  value, onChange,
  steps = [0, 5, 10, 15, 20],
  rsSteps,
  tone = 'amber',
  showLabel = true,
}: Props) {
  /* Purana istemal — sirf percent, mode switch ke baghair */
  const legacy = !onMode && onChange !== undefined;
  const m: DiscountMode = legacy ? 'pct' : (mode ?? 'pct');
  const pctVal = legacy ? (value ?? 0) : (pct ?? 0);
  const rsVal = rs ?? 0;

  const setPct = (v: number) => (legacy ? onChange?.(v) : onPct?.(v));
  const setRs = (v: number) => onRs?.(Math.max(0, Math.min(v, subtotal || v)));

  const amount = m === 'pct'
    ? (subtotal * pctVal) / 100
    : Math.min(rsVal, subtotal || rsVal);
  const has = amount > 0;

  const rsOptions = rsSteps ?? autoRsSteps(subtotal);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        {showLabel && (
          <div className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-slate-600 shrink-0">
            <Percent className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${ICON_TONES[tone]}`} />
            <span className="hidden sm:inline">Discount:</span>
          </div>
        )}

        {/* Mode switch — sirf naye istemal me */}
        {!legacy && (
          <div className="flex rounded-xl border-2 border-slate-200 bg-white p-0.5 shrink-0">
            <button type="button" onClick={() => onMode?.('pct')}
              className={['h-8 px-2.5 rounded-lg text-[11px] font-extrabold transition inline-flex items-center gap-1',
                m === 'pct' ? `${TONES[tone]} text-white shadow` : 'text-slate-500 hover:bg-slate-50'].join(' ')}>
              <Percent className="h-3 w-3" /> %
            </button>
            <button type="button" onClick={() => onMode?.('rs')}
              className={['h-8 px-2.5 rounded-lg text-[11px] font-extrabold transition inline-flex items-center gap-1',
                m === 'rs' ? `${TONES[tone]} text-white shadow` : 'text-slate-500 hover:bg-slate-50'].join(' ')}>
              <Banknote className="h-3 w-3" /> Rs
            </button>
          </div>
        )}

        <div className="flex gap-1 flex-1 min-w-0">
          {m === 'pct'
            ? steps.map((d) => (
                <button key={d} type="button" onClick={() => setPct(d)}
                  className={['flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition',
                    pctVal === d ? `${TONES[tone]} text-white shadow` : 'bg-slate-100 hover:bg-slate-200 text-slate-700'].join(' ')}>
                  {d === 0 ? 'None' : `${d}%`}
                </button>
              ))
            : (
              <>
                {rsOptions.map((v) => (
                  <button key={v} type="button" onClick={() => setRs(v)}
                    className={['flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition tabular-nums',
                      rsVal === v ? `${TONES[tone]} text-white shadow` : 'bg-slate-100 hover:bg-slate-200 text-slate-700'].join(' ')}>
                    {v >= 1000 ? `${v / 1000}k` : v}
                  </button>
                ))}
                <input
                  type="number" min={0} max={subtotal || undefined}
                  value={rsVal || ''}
                  onChange={(e) => setRs(Number(e.target.value || 0))}
                  placeholder="Khud"
                  className={`w-20 h-9 sm:h-10 rounded-xl border-2 border-slate-200 bg-white px-2 text-[11px] sm:text-xs font-extrabold tabular-nums text-center focus:outline-none transition ${FOCUS[tone]}`}
                />
              </>
            )}
        </div>

        {has && (
          <button type="button"
            onClick={() => { setPct(0); onRs?.(0); }}
            title="Discount hatao"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center shrink-0 transition">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {has && subtotal > 0 && (
        <div className="flex items-center justify-between px-1 text-[11px] font-extrabold tabular-nums">
          <span className="text-slate-500">
            {m === 'pct' ? `${pctVal}% chhoot` : `${formatPKR(rsVal)} kam`}
            {' '}<span className="text-slate-400">({((amount / subtotal) * 100).toFixed(1)}%)</span>
          </span>
          <span className={ICON_TONES[tone]}>−{formatPKR(amount)}</span>
        </div>
      )}
    </div>
  );
}
