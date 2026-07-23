import { ReactNode } from 'react';
import { cn } from '@lib/cn';

interface EmptyStateProps {
  icon?: any;
  emoji?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EmptyState({
  icon: Icon, emoji, title, description, action, size = 'md', className,
}: EmptyStateProps) {
  const sizes = {
    sm: { wrap: 'py-8', iconWrap: 'h-14 w-14', icon: 'h-6 w-6', emoji: 'text-3xl', title: 'text-base', desc: 'text-xs' },
    md: { wrap: 'py-12', iconWrap: 'h-20 w-20', icon: 'h-9 w-9', emoji: 'text-5xl', title: 'text-lg', desc: 'text-sm' },
    lg: { wrap: 'py-20', iconWrap: 'h-28 w-28', icon: 'h-12 w-12', emoji: 'text-6xl', title: 'text-2xl', desc: 'text-base' },
  }[size];

  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6', sizes.wrap, className)}>
      {emoji ? (
        <div className={cn('mb-4 grayscale-[10%]', sizes.emoji)}>{emoji}</div>
      ) : Icon ? (
        <div className={cn('mb-4 rounded-3xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center', sizes.iconWrap)}>
          <Icon className={cn('text-slate-400 dark:text-slate-500', sizes.icon)} />
        </div>
      ) : null}
      <h3 className={cn('font-extrabold text-slate-900 dark:text-white', sizes.title)}>{title}</h3>
      {description && (
        <p className={cn('mt-1.5 max-w-sm text-slate-500 dark:text-slate-400', sizes.desc)}>{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
