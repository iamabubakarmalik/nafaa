import { cn } from '@/lib/cn';
import type { HTMLAttributes } from 'react';

interface Props extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const sizes = {
  sm:   'max-w-3xl',
  md:   'max-w-5xl',
  lg:   'max-w-7xl',
  xl:   'max-w-[1440px]',
  full: 'max-w-none',
};

export function Container({ className, size = 'xl', ...props }: Props) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8 xl:px-12',
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
