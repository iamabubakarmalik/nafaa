/**
 * Modal dialog.
 *
 * Centered on larger screens, a bottom sheet on phones. Renders in a portal,
 * locks page scroll, closes on Escape and (optionally) backdrop click, keeps
 * keyboard focus inside while open and returns it to the trigger on close.
 * Nested modals stack correctly: only the top one reacts to Escape.
 *
 * Keyboard: the first field gets focus (or the element marked
 * `data-autofocus`); Enter in the only field of a dialog presses its main
 * button; Ctrl/⌘+Enter or Ctrl/⌘+S submits; Esc closes; Tab stays inside.
 */

import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@core/lib/cn';
import { FIELD, focusables, isMod, triggerDialogSubmit } from '../keyboard';
import { t } from '@core/i18n';

type Size = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  size?: Size;
  closeOnBackdrop?: boolean;
  hideClose?: boolean;
  footer?: ReactNode;
  className?: string;
}

const SIZES: Record<Size, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  full: 'sm:max-w-[min(96vw,90rem)] sm:h-[92dvh]',
};

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
/** Text-like fields that take focus first; read-only ones are skipped. */
const FIRST_FIELD = 'input:not([disabled]):not([readonly]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]),select:not([disabled]),textarea:not([disabled]):not([readonly])';
const hasHover = () => window.matchMedia?.('(hover: hover)').matches ?? true;

/** Open modals, newest last; Escape closes only the top one. */
const stack: string[] = [];

export function Modal({ open, onClose, title, description, children, size = 'md', closeOnBackdrop = true, hideClose, footer, className }: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    stack.push(id);
    const returnFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const panel = panelRef.current;
    const body = panel?.querySelector<HTMLElement>('[data-modal-body]');
    // Skip the header close button: start on the first field, then the first control.
    // Phones skip fields so the on-screen keyboard does not cover the dialog.
    const first = panel?.querySelector<HTMLElement>('[data-autofocus]')
      ?? (body && hasHover() ? focusables(body, FIRST_FIELD)[0] : undefined)
      ?? (body ? focusables(body, FOCUSABLE)[0] : undefined)
      ?? (panel ? focusables(panel, '[data-modal-footer] button:not([disabled])').pop() : undefined);
    (first ?? panel)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (!panel || e.defaultPrevented) return;
      // Ctrl/⌘+Enter and Ctrl/⌘+S submit the dialog.
      if (isMod(e) && !e.altKey && (e.key === 'Enter' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        triggerDialogSubmit(panel);
        return;
      }
      // Enter in the only field of a dialog (outside a form, which submits itself) presses the main button.
      const target = e.target as HTMLElement;
      if (e.key === 'Enter' && !e.shiftKey && !isMod(e) && !e.isComposing && panel.contains(target)
        && target.matches(FIELD) && target.tagName === 'INPUT' && !(target as HTMLInputElement).form
        && focusables(panel, FIELD).length === 1) {
        e.preventDefault();
        triggerDialogSubmit(panel);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const [head, tail] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === head) { e.preventDefault(); tail.focus(); }
      else if (!e.shiftKey && document.activeElement === tail) { e.preventDefault(); head.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(id), 1);
      if (!stack.length) document.body.style.overflow = previousOverflow;
      returnFocus?.focus?.({ preventScroll: true });
    };
  }, [open, id]);

  if (!open) return null;

  const onBackdrop = (e: MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center sm:p-4" onMouseDown={onBackdrop}>
      <div className="pointer-events-none absolute inset-0 bg-slate-950/50 animate-in fade-in duration-150" aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? `${id}-title` : undefined}
        aria-describedby={description ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={cn(
          'relative flex max-h-[92dvh] w-full flex-col overflow-hidden bg-white shadow-2xl outline-none',
          'rounded-t-2xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200',
          'sm:rounded-2xl sm:border sm:border-slate-200 sm:pb-0 sm:fade-in sm:zoom-in-95 sm:slide-in-from-bottom-0',
          SIZES[size],
          className,
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0 flex-1">
              {title && <h2 id={`${id}-title`} className="text-base font-semibold leading-tight text-slate-900">{title}</h2>}
              {description && <p id={`${id}-desc`} className="mt-1 text-[0.8125rem] text-slate-500">{description}</p>}
            </div>
            {!hideClose && (
              <button type="button" onClick={onClose} aria-label={t('Close')}
                className="-me-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div data-modal-body className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div data-modal-footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
