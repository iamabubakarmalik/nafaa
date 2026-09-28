import { forwardRef, useEffect, type ButtonHTMLAttributes, type ReactNode, type RefObject } from 'react';
import { cn } from '@core/lib/cn';

/** Close on outside click / tap and on Escape */
export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [ref, open, close]);
}

/** True when the device has a real pointer — used to skip autofocus on phones */
export const hasHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;

/**
 * Dropdown on desktop, bottom sheet on phones.
 * Render it inside a `relative` wrapper that also holds the trigger.
 * `widthClass` must be a literal like "sm:w-[360px]" so Tailwind keeps it.
 */
export function Panel({
  open, onClose, align = 'right', widthClass = 'sm:w-[360px]', label, children,
}: {
  open: boolean; onClose: () => void; align?: 'left' | 'right'; widthClass?: string; label: string; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 sm:hidden animate-in fade-in duration-150" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={label}
        className={cn(
          'z-50 flex flex-col overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white',
          'fixed inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200',
          'sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-[min(80vh,680px)] sm:rounded-2xl sm:pb-0 sm:slide-in-from-top-1 sm:fade-in',
          align === 'right' ? 'sm:right-0' : 'sm:left-0',
          widthClass,
        )}
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-slate-700 sm:hidden" />
        {children}
      </div>
    </>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd className={cn(
      'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1.5 font-sans text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400',
      className,
    )}>
      {children}
    </kbd>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-900/5 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

/** Initial letter avatar or image */
export function Avatar({ name, url, size = 36, className }: { name?: string; url?: string; size?: number; className?: string }) {
  const initial = (name?.trim()?.charAt(0) || 'N').toUpperCase();
  if (url) {
    return <img src={url} alt={name ?? ''} style={{ width: size, height: size }} className={cn('shrink-0 rounded-full object-cover', className)} />;
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 font-bold text-white', className)}
    >
      {initial}
    </span>
  );
}