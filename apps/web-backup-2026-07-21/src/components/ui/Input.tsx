import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="text-sm font-bold text-slate-700 mb-1.5 block">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">{leftIcon}</div>
          )}
          <input
            ref={ref}
            className={`
              w-full h-11 ${leftIcon ? 'pl-10' : 'pl-3'} ${rightIcon ? 'pr-10' : 'pr-3'}
              rounded-xl border ${error ? 'border-rose-300' : 'border-slate-200'} bg-white text-sm
              focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20
              disabled:bg-slate-50 disabled:text-slate-500
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightIcon}</div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

