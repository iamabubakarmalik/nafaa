/**
 * Closes a popover when the user clicks or taps outside it, or presses Escape.
 * Content rendered by Panel (marked `data-shell-panel`) counts as inside.
 *
 * Keyboard: while open, ↑ ↓ Home End move between the panel's links and
 * buttons (from the trigger too); Escape closes and puts focus back on the
 * trigger (the first button in `ref`).
 */

import { useEffect, type RefObject } from 'react';
import { handleMenuKey } from '@/design-system/keyboard';

const PANEL_ITEMS = 'a[href],button:not([disabled]),[role="menuitem"],[role="option"]';

export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element;
      // On phones the Panel sheet is portalled outside `ref`; taps inside it are not "outside".
      if (target.closest?.('[data-shell-panel]')) return;
      if (ref.current && !ref.current.contains(target)) close();
    };
    const panelEl = () => ref.current?.querySelector<HTMLElement>('[data-shell-panel]') ?? document.querySelector<HTMLElement>('[data-shell-panel]');
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const panel = panelEl();
      const inside = !!active && (!!ref.current?.contains(active) || !!panel?.contains(active));
      if (e.key === 'Escape') {
        close();
        if (inside || !active || active === document.body) ref.current?.querySelector<HTMLElement>('button')?.focus();
        return;
      }
      if (inside && panel && handleMenuKey(e, panel, PANEL_ITEMS, false)) e.preventDefault();
    };
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

/** True on devices with a real pointer; used to skip autofocus on touch screens. */
export const hasHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
