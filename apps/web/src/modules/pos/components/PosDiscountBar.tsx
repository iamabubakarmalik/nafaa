// apps/web/src/modules/pos/components/PosDiscountBar.tsx
import { Percent } from 'lucide-react';

/* ═════════════════════════════════════════════════════════════
   POS DISCOUNT BAR — har POS me yehi patti hoti thi, alag alag
   likhi hui. Ab ek hi jagah.
   ═════════════════════════════════════════════════════════════ */

interface Props {
  value: number;
  onChange: (pct: number) => void;
  /** Kaunse percent dikhane hain */
  steps?: number[];
  tone?: 'amber' | 'emerald' | 'blue' | 'violet';
  showLabel?: boolean;
}

const TONES: Record<string, string> = {
  amber: 'bg-amber-600',
  emerald: 'bg-emerald-600',
  blue: 'bg-blue-600',
  violet: 'bg-violet-600',
};

const ICON_TONES: Record<string, string> = {
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  blue: 'text-blue-600',
  violet: 'text-violet-600',
};

export function PosDiscountBar({
  value, onChange, steps = [0, 5, 10, 15, 20], tone = 'amber', showLabel = true,
}: Props) {
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <div className="flex items-center gap-1 text-[11px] sm:text-xs font-extrabold text-slate-600 shrink-0">
          <Percent className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${ICON_TONES[tone]}`} />
          <span className="hidden sm:inline">Discount:</span>
        </div>
      )}
      <div className="flex gap-1 flex-1">
        {steps.map((d) => (
          <button key={d} type="button" onClick={() => onChange(d)}
            className={['flex-1 h-9 sm:h-10 rounded-xl text-[11px] sm:text-xs font-extrabold transition',
              value === d
                ? `${TONES[tone]} text-white shadow`
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'].join(' ')}>
            {d === 0 ? 'None' : `${d}%`}
          </button>
        ))}
      </div>
    </div>
  );
}
