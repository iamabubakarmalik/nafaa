import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'h-10 text-sm',
  md: 'h-12 text-sm',
  lg: 'h-14 text-base',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, hint, leftIcon, rightIcon, className, inputSize = 'md', ...props
}, ref) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-bold text-content mb-1.5">{label}</label>
    )}
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-2xl bg-surface border border-border text-content',
          'placeholder:text-content-subtle',
          'focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10',
          'transition-all',
          sizeStyles[inputSize],
          leftIcon && 'pl-11',
          rightIcon && 'pr-11',
          !leftIcon && !rightIcon && 'px-4',
          leftIcon && !rightIcon && 'pr-4',
          !leftIcon && rightIcon && 'pl-4',
          error && 'border-danger focus:border-danger focus:ring-danger/10',
          className,
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-content-subtle">
          {rightIcon}
        </div>
      )}
    </div>
    {error && <p className="text-xs text-danger mt-1.5 font-medium">{error}</p>}
    {hint && !error && <p className="text-xs text-content-subtle mt-1.5">{hint}</p>}
  </div>
));
Input.displayName = 'Input';
