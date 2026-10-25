/**
 * Rows of an editable sheet with undo / redo. Every change (cell edits,
 * added or removed rows) is one history step; up to 60 steps are kept.
 * Unchanged rows keep their object, so history stays light on big files.
 */

import { useCallback, useRef, useState } from 'react';

export interface GridRow {
  /** Stable id: the file line for imported rows, a new number for added ones. */
  id: number;
  cells: Record<string, string>;
}

export interface CellPatch {
  id: number;
  key: string;
  value: string;
}

interface State {
  rows: GridRow[];
  past: GridRow[][];
  future: GridRow[][];
}

const LIMIT = 60;

export function useSheetRows(initial: GridRow[] = []) {
  const [state, setState] = useState<State>({ rows: initial, past: [], future: [] });
  const nextId = useRef(initial.reduce((m, r) => Math.max(m, r.id), 0) + 1);

  const push = (s: State, rows: GridRow[]): State =>
    (rows === s.rows ? s : { rows, past: [...s.past.slice(-(LIMIT - 1)), s.rows], future: [] });

  /** Cell edits and, optionally, new rows at the end, as one step. Returns the new rows' ids. */
  const edit = useCallback((patches: CellPatch[], newRows: Array<Record<string, string>> = []) => {
    const ids = newRows.map(() => nextId.current++);
    setState((s) => {
      const byId = new Map<number, Record<string, string>>();
      for (const p of patches) {
        const cur = byId.get(p.id) ?? {};
        cur[p.key] = p.value;
        byId.set(p.id, cur);
      }
      let changed = false;
      const rows = s.rows.map((r) => {
        const ch = byId.get(r.id);
        if (!ch) return r;
        const diff = Object.entries(ch).some(([k, v]) => (r.cells[k] ?? '') !== v);
        if (!diff) return r;
        changed = true;
        return { ...r, cells: { ...r.cells, ...ch } };
      });
      if (newRows.length) {
        changed = true;
        rows.push(...newRows.map((cells, i) => ({ id: ids[i], cells })));
      }
      return changed ? push(s, rows) : s;
    });
    return ids;
  }, []);

  const removeRows = useCallback((ids: Set<number>) => {
    setState((s) => {
      const rows = s.rows.filter((r) => !ids.has(r.id));
      return rows.length === s.rows.length ? s : push(s, rows);
    });
  }, []);

  /** New content without history (a new file, a fresh load). */
  const reset = useCallback((rows: GridRow[]) => {
    nextId.current = rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    setState({ rows, past: [], future: [] });
  }, []);

  const undo = useCallback(() => {
    setState((s) => (s.past.length ? { rows: s.past[s.past.length - 1], past: s.past.slice(0, -1), future: [s.rows, ...s.future] } : s));
  }, []);

  const redo = useCallback(() => {
    setState((s) => (s.future.length ? { rows: s.future[0], past: [...s.past, s.rows], future: s.future.slice(1) } : s));
  }, []);

  return {
    rows: state.rows,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    edit,
    removeRows,
    reset,
    undo,
    redo,
  };
}

export type SheetRows = ReturnType<typeof useSheetRows>;
