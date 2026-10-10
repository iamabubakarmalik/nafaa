/**
 * Closes a popover when the user clicks or taps outside it, or presses Escape.
 * Content rendered by Panel (marked `data-shell-panel`) counts as inside.
 */

import { useEffect, type RefObject } from 'react';

export function useDismiss(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element;
      // On phones the Panel sheet is portalled outside `ref`; taps inside it are not "outside".
      if (target.closest?.('[data-shell-panel]')) return;
      if (ref.current && !ref.current.contains(target)) close();
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

/** True on devices with a real pointer; used to skip autofocus on touch screens. */
export const hasHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: hover)').matches;
