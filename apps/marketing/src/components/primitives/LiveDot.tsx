import { cn } from '@/lib/cn';

interface Props {
  color?: 'emerald' | 'red' | 'amber' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const colors = {
  emerald: 'bg-emerald-500',
  red:     'bg-red-500',
  amber:   'bg-amber-500',
  blue:    'bg-blue-500',
};

const sizes = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2   w-2',
  lg: 'h-2.5 w-2.5',
};

export function LiveDot({ color = 'emerald', size = 'md', className }: Props) {
  return (
    <span className={cn('relative inline-flex', sizes[size], className)}>
      <span className={cn('absolute inline-flex h-full w-full rounded-full animate-ping opacity-70', colors[color])} />
      <span className={cn('relative inline-flex rounded-full', sizes[size], colors[color])} />
    </span>
  );
}
