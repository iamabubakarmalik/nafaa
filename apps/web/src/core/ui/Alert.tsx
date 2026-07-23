import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '@core/lib/cn';

type Variant = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps {
  variant?: Variant;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
  icon?: any;
}

const config: Record<Variant, { bg: string; icon: any; iconColor: string }> = {
  info:    { bg: 'bg-info-50 border-info-200 dark:bg-info-900/20 dark:border-info-800', icon: Info, iconColor: 'text-info-600 dark:text-info-400' },
  success: { bg: 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800', icon: CheckCircle2, iconColor: 'text-success-600 dark:text-success-400' },
  warning: { bg: 'bg-accent-50 border-accent-200 dark:bg-accent-900/20 dark:border-accent-800', icon: AlertCircle, iconColor: 'text-accent-600 dark:text-accent-400' },
  danger:  { bg: 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800', icon: XCircle, iconColor: 'text-rose-600 dark:text-rose-400' },
};

export function Alert({ variant = 'info', title, children, onClose, className, icon }: AlertProps) {
  const { bg, icon: DefaultIcon, iconColor } = config[variant];
  const Icon = icon || DefaultIcon;

  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-2xl border', bg, className)} role="alert">
      <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColor)} />
      <div className="flex-1 min-w-0">
        {title && <div className="font-extrabold text-slate-900 dark:text-white text-sm">{title}</div>}
        {children && <div className={cn('text-sm text-slate-700 dark:text-slate-300', title && 'mt-1')}>{children}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="shrink-0 h-6 w-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center transition"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>
      )}
    </div>
  );
}
