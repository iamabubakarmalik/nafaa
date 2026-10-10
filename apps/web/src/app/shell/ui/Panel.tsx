/**
 * Popover used by the top-bar menus: an anchored dropdown on larger screens
 * and a bottom sheet on phones. Render it inside a `relative` wrapper that
 * also contains the trigger button.
 */

import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';

interface PanelProps {
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  /** Width on larger screens. Must be a literal class (e.g. "sm:w-[360px]") so Tailwind keeps it. */
  widthClass?: string;
  label: string;
  children: ReactNode;
}

export function Panel({ open, onClose, align = 'right', widthClass = 'sm:w-[360px]', label, children }: PanelProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 animate-in fade-in duration-150 sm:hidden" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label={label}
        className={cn(
          'z-50 flex flex-col overflow-hidden border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-white',
          'fixed inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl pb-[env(safe-area-inset-bottom)] animate-in slide-in-from-bottom duration-200',
          'sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-[min(80dvh,680px)] sm:rounded-2xl sm:pb-0 sm:fade-in sm:slide-in-from-top-1',
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
