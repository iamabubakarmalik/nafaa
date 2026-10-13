/**
 * Side drawer holding the full order: items, customer, payment, courier and
 * every action. J and K move to the next or previous order in the list.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { IconButton, Kbd } from '@/design-system/components';
import { isTyping } from '@core/lib/shortcuts';
import { OrderDetailPanel } from '../OrderDetailPanel';

/** A modal opened from inside the drawer (cancel, RTO…) takes the keys first. */
const innerModalOpen = () => !!document.querySelector('[role="dialog"][aria-modal="true"]:not([data-drawer])');

export function OrderDrawer({ orderId, onClose, onStep }: {
  orderId: string;
  onClose: () => void;
  /** Move through the list: 1 next, -1 previous; undefined hides the arrows. */
  onStep?: (dir: 1 | -1) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (innerModalOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') onClose();
      if (isTyping() || !onStep) return;
      if (e.key === 'j' || e.key === 'J') { e.preventDefault(); onStep(1); }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); onStep(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onStep]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end print:hidden">
      <div className="absolute inset-0 bg-slate-950/40 animate-in fade-in" onClick={onClose} aria-hidden />
      <aside role="dialog" aria-modal="true" data-drawer aria-label="Order ki tafseel"
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
        {onStep && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-1.5 text-[0.75rem] text-slate-500">
            <span className="hidden items-center gap-1 sm:inline-flex"><Kbd>J</Kbd> agla · <Kbd>K</Kbd> pichla · <Kbd>Esc</Kbd> band</span>
            <span className="flex gap-1">
              <IconButton size="sm" label="Pichla order (K)" onClick={() => onStep(-1)}><ChevronUp className="h-4 w-4" /></IconButton>
              <IconButton size="sm" label="Agla order (J)" onClick={() => onStep(1)}><ChevronDown className="h-4 w-4" /></IconButton>
            </span>
          </div>
        )}
        <div className="min-h-0 flex-1">
          <OrderDetailPanel key={orderId} orderId={orderId} onClose={onClose} />
        </div>
      </aside>
    </div>,
    document.body,
  );
}
