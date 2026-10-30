/**
 * How the money came in (Cash, Card, Bank, JazzCash, Easypaisa), for screens
 * that take a payment outside the POS checkout: membership fees, job
 * advances, order payments. Cash goes to the drawer, the rest to the bank
 * or wallet account.
 */

import { cn } from '@core/lib/cn';
import type { PaymentMethod } from '@modules/sales/sales/api/sales.api';
import { POS_PAYMENT_METHODS } from '../lib/posCart';
import { t } from '@core/i18n';

export function PaymentMethodPicker({ value, onChange, label = t('Payment kaise mili'), hint, className }: {
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  label?: string;
  /** Line under the buttons; left out, says where the money is counted. */
  hint?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1 block text-[0.6875rem] font-extrabold uppercase text-slate-600">{label}</span>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1">
        {POS_PAYMENT_METHODS.map((m) => {
          const on = value === m.id;
          return (
            <button key={m.id} type="button" role="radio" aria-checked={on} onClick={() => onChange(m.id)}
              className={cn('flex h-10 flex-col items-center justify-center rounded-lg border text-[0.6875rem] font-bold transition',
                on ? 'border-transparent text-white shadow' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300')}
              style={on ? { backgroundColor: m.color } : undefined}>
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1 text-[0.6875rem] text-slate-500">
        {hint ?? (value === 'CASH' ? t('Cash drawer me ginti hoga') : t('Bank / wallet account me ginti hoga, drawer me nahi'))}
      </p>
    </div>
  );
}
