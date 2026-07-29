import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

type EyebrowVariant = 'brand' | 'aurora' | 'gold' | 'mono' | 'pk' | 'live' | 'ink';

interface EyebrowProps {
  children: ReactNode;
  variant?: EyebrowVariant;
  icon?: ReactNode;
  className?: string;
}

const variantClasses: Record<EyebrowVariant, string> = {
  brand: 'text-brand-600 dark:text-brand-400',
  aurora: 'text-aurora-purple dark:text-purple-400',
  gold: 'text-gold dark:text-amber-400',
  mono: 'text-ink-500 dark:text-ink-400 font-mono',
  pk: 'text-pk-green dark:text-emerald-400',
  live: 'text-emerald-600 dark:text-emerald-400',
  ink: 'text-ink-600 dark:text-ink-300',
};

export function Eyebrow({ children, variant = 'brand', icon, className }: EyebrowProps) {
  return (
    <div className={cn(
      'inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest font-bold',
      variantClasses[variant],
      className,
    )}>
      {icon}
      {children}
    </div>
  );
}
