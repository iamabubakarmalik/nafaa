/** Small status pill. */
import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'gray' | 'green' | 'red' | 'amber' | 'brand' | 'blue';
const TONE: Record<Tone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-800',
  brand: 'bg-brand-100 text-brand-800',
  blue: 'bg-blue-100 text-blue-800',
};

export function Badge({ tone = 'gray', icon, children, className }: { tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold', TONE[tone], className)}>
      {icon}
      {children}
    </span>
  );
}
