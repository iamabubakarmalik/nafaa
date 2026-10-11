/** Inline message: info, success, warning or danger, with optional title and action. */

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@core/lib/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: 'bg-blue-50 text-blue-900 ring-blue-200', icon: <Info className="h-4 w-4 text-blue-600" /> },
  success: { box: 'bg-success-50 text-success-900 ring-success-200', icon: <CheckCircle2 className="h-4 w-4 text-success-600" /> },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', icon: <AlertTriangle className="h-4 w-4 text-amber-600" /> },
  danger: { box: 'bg-rose-50 text-rose-900 ring-rose-200', icon: <XCircle className="h-4 w-4 text-rose-600" /> },
};

interface AlertProps {
  tone?: Tone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  /** Replaces the tone's default icon. */
  icon?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, action, icon, className }: AlertProps) {
  const t = TONES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-lg px-3.5 py-3 text-sm ring-1 ring-inset', t.box, className)}>
      <span className="mt-0.5 shrink-0">{icon ?? t.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <div className="font-semibold">{title}</div>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
