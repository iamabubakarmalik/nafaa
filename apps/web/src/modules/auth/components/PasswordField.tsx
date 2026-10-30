/**
 * Password input with show/hide, a Caps Lock warning and an optional
 * strength meter. Works with react-hook-form's register().
 */

import { forwardRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Field, controlClass } from '@/design-system/components';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: ReactNode;
  labelAction?: ReactNode;
  error?: string;
  hint?: ReactNode;
  /** Current value; pass it to show the strength meter. */
  strengthOf?: string;
}

function strength(pw: string): { score: number; label: string; bar: string; text: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length < 8 || s <= 1) return { score: 1, label: t('Kamzor'), bar: 'bg-rose-500', text: 'text-rose-600' };
  if (s === 2) return { score: 2, label: t('Theek hai'), bar: 'bg-amber-500', text: 'text-amber-700' };
  if (s === 3) return { score: 3, label: t('Acha'), bar: 'bg-success-500', text: 'text-success-700' };
  return { score: 4, label: t('Bohat mazboot'), bar: 'bg-success-600', text: 'text-success-700' };
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { label = t('Password'), labelAction, error, hint, strengthOf, className, onKeyDown, onKeyUp, onBlur, id, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  const [capsOn, setCapsOn] = useState(false);

  const readCaps = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') setCapsOn(e.getModifierState('CapsLock'));
  };

  const meter = strengthOf ? strength(strengthOf) : null;
  const fieldLabel = labelAction ? (
    <span className="flex items-center justify-between gap-2">
      <span>{label}</span>
      {labelAction}
    </span>
  ) : label;

  return (
    <Field label={fieldLabel} error={error} hint={hint} id={id}>
      {(controlId, describedBy) => (
        <>
          <div className="relative">
            <Lock className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              ref={ref}
              id={controlId}
              type={visible ? 'text' : 'password'}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
              className={cn(controlClass(!!error), 'h-11 ps-10 pe-11 text-base sm:text-sm', className)}
              onKeyDown={(e) => { readCaps(e); onKeyDown?.(e); }}
              onKeyUp={(e) => { readCaps(e); onKeyUp?.(e); }}
              onBlur={(e) => { setCapsOn(false); onBlur?.(e); }}
              {...props}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? t('Password chhupayein') : t('Password dikhayein')}
              aria-pressed={visible}
              className="absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsOn && (
            <p className="mt-1.5 text-xs font-medium text-amber-700" role="status">
              {t('Caps Lock on hai — password chhote/barhe huroof ka farq samajhta hai.')}
            </p>
          )}
          {meter && strengthOf && (
            <div className="mt-2 flex items-center gap-2" aria-live="polite">
              <div className="flex flex-1 gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className={cn('h-1.5 flex-1 rounded-full', i <= meter.score ? meter.bar : 'bg-slate-200')} />
                ))}
              </div>
              <span className={cn('text-xs font-semibold', meter.text)}>{meter.label}</span>
            </div>
          )}
        </>
      )}
    </Field>
  );
});
