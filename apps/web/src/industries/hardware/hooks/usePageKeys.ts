import { useEffect, useState, type RefObject } from 'react';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';

/**
 * Page keys: "/" focuses the search box, single letters run the given
 * actions (N new…). Ignored while typing or in a dialog.
 */
export function usePageKeys(search: RefObject<HTMLInputElement | null> | null, keys: Record<string, () => void> = {}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/' && search) { e.preventDefault(); search.current?.focus(); return; }
      const run = keys[e.key.toLowerCase()];
      if (run) { e.preventDefault(); run(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}

/** Ctrl+S (or Cmd+S) saves a form, even while typing in it. */
export function useSaveKey(save: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
}

/** Value that follows `value` after `ms` of no change (for server search). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
