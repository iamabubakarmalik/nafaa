import { useEffect, useState, type RefObject } from 'react';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';

/**
 * List-page keys: "/" focuses the search box, and single letters run the
 * given actions (N new, A analytics…). Ignored while typing or in a dialog.
 */
export function usePageKeys(search: RefObject<HTMLInputElement | null>, keys: Record<string, () => void> = {}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping() || isDialogOpen()) return;
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); return; }
      const run = keys[e.key.toLowerCase()];
      if (run) { e.preventDefault(); run(); }
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
