import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: LucideIcon;
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  suggestedActions?: EmptyStateAction[];
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  suggestedActions,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizes = {
    sm: 'py-8 px-3',
    md: 'py-16 px-4',
    lg: 'py-24 px-6',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', sizes[size], className)}>
      {emoji ? (
        <div className="text-6xl mb-3 animate-bounce-soft">{emoji}</div>
      ) : Icon && (
        <div className="h-16 w-16 rounded-3xl bg-brand-100 dark:bg-brand-900/40 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-brand-600 dark:text-brand-400" />
        </div>
      )}
      <h3 className="text-lg font-bold text-content">{title}</h3>
      {description && (
        <p className="text-sm text-content-muted mt-1.5 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
      {suggestedActions && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {suggestedActions.map((a, i) => (
            a.href ? (
              <a
                key={i}
                href={a.href}
                className={cn(
                  'h-10 px-4 rounded-xl text-sm font-black transition inline-flex items-center',
                  a.variant === 'primary'
                    ? 'bg-gradient-brand text-white shadow-brand hover:opacity-90'
                    : 'bg-surface border border-border text-content hover:bg-surface-muted',
                )}
              >
                {a.label}
              </a>
            ) : (
              <button
                key={i}
                onClick={a.onClick}
                className={cn(
                  'h-10 px-4 rounded-xl text-sm font-black transition',
                  a.variant === 'primary'
                    ? 'bg-gradient-brand text-white shadow-brand hover:opacity-90'
                    : 'bg-surface border border-border text-content hover:bg-surface-muted',
                )}
              >
                {a.label}
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}
