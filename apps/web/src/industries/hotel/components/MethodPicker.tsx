/** Payment method buttons (Cash, Card, JazzCash, EasyPaisa, Bank). */

import { cn } from '@core/lib/cn';
import type { PayMethod } from '../api/bookings.api';
import { PAY_METHODS } from './meta';

export function MethodPicker({ value, onChange, label = 'Paisa kaise mila' }: { value: PayMethod; onChange: (m: PayMethod) => void; label?: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
      {PAY_METHODS.map((m) => (
        <button key={m.id} type="button" role="radio" aria-checked={value === m.id} onClick={() => onChange(m.id)}
          className={cn('inline-flex h-9 items-center justify-center rounded-lg text-[0.75rem] font-semibold ring-1 transition-colors',
            value === m.id ? 'bg-slate-900 text-white ring-slate-900' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50')}>
          {m.label}
        </button>
      ))}
    </div>
  );
}
