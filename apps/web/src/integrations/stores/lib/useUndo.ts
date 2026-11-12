/**
 * Undo / redo for the theme editor. Holds the past and future copies of a
 * value; quick edits (typing in one box) within a short gap count as one
 * step, so undo goes back a whole word or change, not one letter.
 */

import { useCallback, useRef, useState } from 'react';

const MERGE_MS = 700;
const LIMIT = 80;

export function useUndo<T>(initial: T) {
  const [state, setState] = useState<{ past: T[]; present: T; future: T[] }>({ past: [], present: initial, future: [] });
  const lastAt = useRef(0);
  const lastTag = useRef<string | null>(null);

  /** Replaces the value without history (loading from the server). */
  const reset = useCallback((value: T) => {
    lastAt.current = 0;
    lastTag.current = null;
    setState({ past: [], present: value, future: [] });
  }, []);

  /** `tag` groups quick edits of the same field into one undo step. */
  const set = useCallback((next: T | ((prev: T) => T), tag?: string) => {
    setState((s) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(s.present) : next;
      if (value === s.present) return s;
      const now = Date.now();
      const merge = !!tag && tag === lastTag.current && now - lastAt.current < MERGE_MS;
      lastAt.current = now;
      lastTag.current = tag ?? null;
      return { past: merge ? s.past : [...s.past, s.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);

  const undo = useCallback(() => setState((s) => (s.past.length
    ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setState((s) => (s.future.length
    ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), []);

  return { value: state.present, set, reset, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
