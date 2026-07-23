import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@core/lib/cn';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: Size;
  ring?: boolean;
  status?: 'online' | 'offline' | 'busy' | 'away';
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
  '2xl': 'h-24 w-24 text-2xl',
};

const statusColor = {
  online: 'bg-success-500',
  offline: 'bg-slate-400',
  busy: 'bg-rose-500',
  away: 'bg-accent-500',
};

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase() || '').join('') || '?';
}

function colorFromName(name = ''): string {
  const colors = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, name = '', size = 'md', ring, status, ...props }, ref) => (
    <div ref={ref} className={cn('relative inline-flex shrink-0', className)} {...props}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            'rounded-full object-cover',
            sizeClasses[size],
            ring && 'ring-2 ring-white dark:ring-neutral-900 ring-offset-2 ring-offset-brand-500',
          )}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-gradient-to-br text-white font-extrabold flex items-center justify-center shadow-sm',
            colorFromName(name),
            sizeClasses[size],
            ring && 'ring-2 ring-white dark:ring-neutral-900 ring-offset-2 ring-offset-brand-500',
          )}
        >
          {initials(name)}
        </div>
      )}
      {status && (
        <span className={cn(
          'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-neutral-900',
          statusColor[status],
        )} />
      )}
    </div>
  ),
);
Avatar.displayName = 'Avatar';
