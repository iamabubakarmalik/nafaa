import { Delete, Check, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel?: () => void;
  allowDecimal?: boolean;
  confirmLabel?: string;
  size?: 'md' | 'lg';
}

/**
 * BigNumpad — huge touch-friendly numpad.
 * 72px buttons, 30px digits — designed for elderly shopkeepers.
 */
export function BigNumpad({
  value, onChange, onConfirm, onCancel,
  allowDecimal = true, confirmLabel = 'OK', size = 'lg',
}: Props) {
  const btnSize = size === 'lg' ? 'h-[72px] text-3xl' : 'h-16 text-2xl';

  const press = (digit: string) => {
    if (digit === '.' && value.includes('.')) return;
    if (digit === '.' && value === '') return onChange('0.');
    if (value === '0' && digit !== '.') return onChange(digit);
    onChange(value + digit);
  };

  const backspace = () => onChange(value.slice(0, -1));
  const clear = () => onChange('');

  const KEYS = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3']];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {KEYS.flat().map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => press(k)}
            className={[
              btnSize,
              'rounded-2xl bg-white border-4 border-slate-200 hover:border-sky-400',
              'active:bg-sky-100 active:scale-95 font-extrabold text-slate-900',
              'shadow-sm transition-all tabular-nums',
            ].join(' ')}
          >
            {k}
          </button>
        ))}

        {allowDecimal ? (
          <button
            type="button"
            onClick={() => press('.')}
            className={[btnSize, 'rounded-2xl bg-white border-4 border-slate-200 hover:border-sky-400 active:bg-sky-100 active:scale-95 font-extrabold text-slate-900 shadow-sm transition-all'].join(' ')}
          >
            .
          </button>
        ) : (
          <button
            type="button"
            onClick={clear}
            className={[btnSize, 'rounded-2xl bg-slate-100 border-4 border-slate-200 hover:bg-slate-200 active:scale-95 font-extrabold text-slate-700 shadow-sm transition-all text-xl'].join(' ')}
          >
            C
          </button>
        )}

        <button
          type="button"
          onClick={() => press('0')}
          className={[btnSize, 'rounded-2xl bg-white border-4 border-slate-200 hover:border-sky-400 active:bg-sky-100 active:scale-95 font-extrabold text-slate-900 shadow-sm transition-all tabular-nums'].join(' ')}
        >
          0
        </button>

        <button
          type="button"
          onClick={backspace}
          className={[btnSize, 'rounded-2xl bg-amber-100 border-4 border-amber-300 hover:bg-amber-200 active:scale-95 text-amber-800 shadow-sm transition-all flex items-center justify-center'].join(' ')}
        >
          <Delete className="h-8 w-8" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-16 rounded-2xl bg-slate-200 hover:bg-slate-300 active:scale-95 font-extrabold text-slate-700 text-lg shadow-sm transition-all inline-flex items-center justify-center gap-2"
          >
            <X className="h-6 w-6" />
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={onConfirm}
          className={[
            'h-16 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600',
            'hover:from-emerald-700 hover:to-green-700 active:scale-95',
            'font-extrabold text-white text-xl shadow-lg shadow-emerald-500/30',
            'transition-all inline-flex items-center justify-center gap-2',
            onCancel ? '' : 'col-span-2',
          ].join(' ')}
        >
          <Check className="h-7 w-7" />
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
