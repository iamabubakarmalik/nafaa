import { useEffect, ReactNode, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@core/lib/cn';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: Size;
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
  footer?: ReactNode;
  className?: string;
}

const sizeClasses: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] h-[95vh]',
};

export function Modal({
  open, onClose, title, description, children, size = 'md',
  closeOnBackdrop = true, hideClose, footer, className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdrop = (e: MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={handleBackdrop}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div
        className={cn(
          'relative w-full bg-white dark:bg-neutral-900 rounded-2xl shadow-soft-xl border border-slate-200 dark:border-neutral-800 flex flex-col max-h-[90vh] animate-slide-up',
          sizeClasses[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between p-5 border-b border-slate-100 dark:border-neutral-800">
            <div className="flex-1 min-w-0">
              {title && <h2 className="text-lg font-extrabold text-slate-900 dark:text-white leading-tight">{title}</h2>}
              {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
            </div>
            {!hideClose && (
              <button
                onClick={onClose}
                className="ml-4 h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center transition"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-y-auto p-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/50 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
