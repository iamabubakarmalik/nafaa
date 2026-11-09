/**
 * Side drawer: slides in from the end edge over a dimmed page, full screen on
 * phones. Header with title, description and close; the body scrolls; an
 * optional footer stays put. Escape closes it unless a dialog opened from
 * inside it is on top.
 */

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { t } from '@core/i18n';

const SIZES = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-xl', xl: 'sm:max-w-3xl' };

/** A dialog opened from inside the drawer (confirm, modal) takes Escape first. */
const innerDialogOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])');

export function Drawer({ open, onClose, title, description, icon, actions, footer, size = 'md', children, bodyClassName }: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Small mark before the title (a logo, an image). */
  icon?: ReactNode;
  /** Buttons next to the close button. */
  actions?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const id = useId();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || innerDialogOpen()) return;
      // The topmost drawer closes first.
      const drawers = document.querySelectorAll('[data-drawer]');
      if (drawers[drawers.length - 1] !== panelRef.current) return;
      closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end print:hidden">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in duration-150" onClick={onClose} aria-hidden />
      <aside ref={panelRef} role="dialog" aria-modal="true" data-drawer tabIndex={-1} aria-labelledby={`${id}-title`}
        className={cn('relative flex h-full w-full flex-col bg-white shadow-2xl outline-none animate-in slide-in-from-right duration-200 rtl:slide-in-from-left', SIZES[size])}>
        <header className="flex items-start gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">
          {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
          <div className="min-w-0 flex-1">
            <h2 id={`${id}-title`} className="truncate text-base font-semibold leading-tight text-slate-900">{title}</h2>
            {description && <div className="mt-0.5 text-[0.8125rem] text-slate-500">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
          <button type="button" onClick={onClose} aria-label={t('Band karein')} title={t('Band karein (Esc)')}
            className="-me-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', bodyClassName)}>{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3 sm:px-5">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}
