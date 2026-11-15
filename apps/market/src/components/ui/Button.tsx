/** Buttons on the shared tokens: primary (brand), secondary, ghost, danger; sm/md/lg. */
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand-600 text-brand-fg hover:bg-brand-700 shadow-brand disabled:shadow-none',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  outline: 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
};
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-base gap-2 rounded-xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

interface Common {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}

export function Button({ variant, size, loading, icon, block, className, children, disabled, ...rest }: Common & ComponentProps<'button'>) {
  return (
    <button {...rest} disabled={disabled || loading} className={buttonClass(variant, size, cn(block && 'w-full', className))}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, block, className, children, ...rest }: Omit<Common, 'loading'> & ComponentProps<typeof Link>) {
  return (
    <Link {...rest} className={buttonClass(variant, size, cn(block && 'w-full', className))}>
      {icon}
      {children}
    </Link>
  );
}
