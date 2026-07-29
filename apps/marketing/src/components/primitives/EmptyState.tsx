import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: Props) {
  return (
    <div className={cn('text-center py-16 px-6', className)}>
      {Icon && (
        <div className="inline-flex h-16 w-16 rounded-2xl bg-ink-100 dark:bg-ink-800 items-center justify-center mb-5">
          <Icon className="h-8 w-8 text-ink-400" />
        </div>
      )}
      <h3 className="font-display font-bold text-xl text-ink-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-2 text-ink-600 dark:text-ink-300 max-w-md mx-auto leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
