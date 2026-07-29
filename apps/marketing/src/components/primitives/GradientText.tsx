import { cn } from '@/lib/cn';
import type { HTMLAttributes, ElementType } from 'react';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'aurora' | 'gold' | 'pk';
  as?: ElementType;
}

const variants = {
  brand:  'text-gradient-brand',
  aurora: 'text-gradient-aurora',
  gold:   'text-gradient-gold',
  pk:     'text-gradient-pk',
};

export function GradientText({ className, variant = 'brand', as: Comp = 'span', ...props }: Props) {
  return <Comp className={cn(variants[variant], className)} {...props} />;
}
