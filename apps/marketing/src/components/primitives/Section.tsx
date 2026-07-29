import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLElement> {
  variant?: 'default' | 'subtle' | 'inverse' | 'aurora' | 'mesh' | 'gradient';
  spacing?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  as?: 'section' | 'div' | 'article' | 'aside';
}

const variants = {
  default:  'bg-ink-0 dark:bg-ink-900',
  subtle:   'bg-ink-50 dark:bg-ink-950/60',
  inverse:  'bg-ink-950 text-white',
  aurora:   'aurora-bg relative',
  mesh:     'bg-mesh-light dark:bg-mesh-dark',
  gradient: 'bg-gradient-brand text-white',
};

const spacings = {
  none: 'py-0',
  sm:   'py-12 lg:py-16',
  md:   'py-16 lg:py-24',
  lg:   'py-24 lg:py-32',
  xl:   'py-32 lg:py-40',
};

export function Section({
  className, variant = 'default', spacing = 'md', as: Comp = 'section', ...props
}: Props) {
  return (
    <Comp
      className={cn('relative overflow-hidden', variants[variant], spacings[spacing], className)}
      {...props}
    />
  );
}
