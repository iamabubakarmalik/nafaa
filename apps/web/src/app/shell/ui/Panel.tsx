/**
 * Popover used by the top-bar menus: an anchored dropdown from 640px up and a
 * bottom sheet on phones.
 *
 * Render it inside a `relative` wrapper that also contains the trigger. On
 * phones the sheet is portalled to <body>, so no ancestor with a transform,
 * filter or overflow can trap or clip it.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@core/lib/cn';

interface PanelProps {
  open: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
  /** Width from 640px up. Must be a literal class (e.g. "sm:w-[360px]") so Tailwind keeps it. */
  widthClass?: string;
  label: string;
  children: ReactNode;
}

const PHONE_QUERY = '(max-width: 639px)';

function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(PHONE_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return phone;
}

export function Panel({ open, onClose, align = 'right', widthClass = 'sm:w-[360px]', label, children }: PanelProps) {
  const phone = useIsPhone();

  useEffect(() => {
    if (!open || !phone) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, phone]);

  if (!open) return null;

  if (phone) {
    return createPortal(
      <div data-shell-panel className="fixed inset-0 z-[85]" role="dialog" aria-modal="true" aria-label={label}>
        <div className="absolute inset-0 bg-slate-950/50 animate-in fade-in duration-150" onClick={onClose} aria-hidden />
        <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-3xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] text-slate-900 shadow-2xl animate-in slide-in-from-bottom duration-200">
          <div className="mx-auto mb-1 mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-300" aria-hidden />
          {children}
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div
      data-shell-panel
      role="dialog"
      aria-label={label}
      className={cn(
        'absolute top-full z-50 mt-2 flex max-h-[min(80dvh,42rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl',
        'animate-in fade-in slide-in-from-top-1 duration-150',
        align === 'right' ? 'right-0' : 'left-0',
        widthClass,
      )}
    >
      {children}
    </div>
  );
}
