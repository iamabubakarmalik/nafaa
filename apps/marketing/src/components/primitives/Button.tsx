'use client';

import Link from 'next/link';
import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'aurora' | 'sunset' | 'inverse' | 'gold';
type Size = 'sm' | 'md' | 'lg' | 'xl';

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-brand text-white shadow-brand-glow hover:shadow-[0_16px_48px_-8px_rgba(18,183,106,0.6)] hover:-translate-y-0.5 active:translate-y-0',
  secondary:
    'bg-ink-0 dark:bg-ink-800 text-ink-900 dark:text-white ring-1 ring-inset ring-ink-200 dark:ring-ink-700 hover:ring-ink-300 dark:hover:ring-ink-600 hover:bg-ink-50 dark:hover:bg-ink-700',
  ghost:
    'text-ink-700 dark:text-ink-200 hover:bg-ink-100/70 dark:hover:bg-ink-800/70',
  outline:
    'ring-2 ring-inset ring-brand-600 dark:ring-brand-500 text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40',
  aurora:
    'bg-gradient-aurora text-white shadow-aurora-glow hover:-translate-y-0.5 active:translate-y-0',
  sunset:
    'bg-gradient-sunset text-white shadow-sunset-glow hover:-translate-y-0.5 active:translate-y-0',
  inverse:
    'bg-ink-900 dark:bg-white text-white dark:text-ink-900 hover:bg-ink-800 dark:hover:bg-ink-100',
  gold:
    'bg-gradient-text-gold text-white shadow-gold-glow hover:-translate-y-0.5',
};

const sizes: Record<Size, string> = {
  sm: 'h-9  px-4  text-sm  rounded-lg gap-1.5',
  md: 'h-11 px-5  text-sm  rounded-xl gap-2',
  lg: 'h-12 px-6  text-base rounded-xl gap-2',
  xl: 'h-14 px-8  text-base rounded-2xl gap-2.5',
};

interface Base {
  variant?: Variant;
  size?: Size;
  className?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  glow?: boolean;
}

type ButtonProps = Base & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  href?: undefined;
  children?: ReactNode;
};
type LinkProps   = Base & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children'> & {
  href: string;
  children?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps | LinkProps>(
  ({ className, variant = 'primary', size = 'md', leftIcon, rightIcon, loading, fullWidth, glow, children, ...props }, ref) => {
    const classes = cn(
      'relative inline-flex items-center justify-center font-semibold whitespace-nowrap',
      'transition-all duration-300 ease-out-expo',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-ink-900',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      glow && 'animate-pulse-glow',
      className,
    );

    const content = (
      <>
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="3" stroke="currentColor" className="opacity-25" />
            <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
          </svg>
        )}
        {!loading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        {children && <span className="inline-flex items-center">{children}</span>}
        {!loading && rightIcon && <span className="inline-flex shrink-0 transition-transform group-hover:translate-x-0.5">{rightIcon}</span>}
      </>
    );

    if ('href' in props && props.href) {
      const { href, ...rest } = props as LinkProps;
      return (
        <Link
          href={href}
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={cn('group', classes)}
          {...(rest as any)}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={cn('group', classes)}
        disabled={loading || (props as ButtonHTMLAttributes<HTMLButtonElement>).disabled}
        {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  },
);
Button.displayName = 'Button';
