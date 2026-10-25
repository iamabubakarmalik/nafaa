/**
 * Spreadsheet grid used by the product import preview and the bulk product
 * editor. Only the rows in view are rendered, so 10,000 rows scroll smoothly.
 *
 * Keys (when the grid has focus):
 *   arrows move · Shift+arrows select a block · Ctrl+arrows jump to the edge
 *   Enter / F2 edit · typing replaces the cell · Tab / Shift+Tab next / previous
 *   Delete clears · Ctrl+Z undo · Ctrl+Y / Ctrl+Shift+Z redo · Ctrl+A select rows
 *   Ctrl+C copies the block · Ctrl+V pastes cells copied from Excel (new lines
 *   are added at the end when the paste runs past the last row).
 * While editing: Enter saves and goes down, Tab saves and goes right, Esc cancels.
 */

import {
  forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent, type ReactNode,
} from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { cn } from '@core/lib/cn';
import type { CellPatch, GridRow } from './useSheetRows';

export interface GridColumn {
  key: string;
  label: string;
  width: number;
  /** Right-aligned, tabular figures. */
  numeric?: boolean;
  /** Suggestions while typing (categories, units, brands). */
  options?: string[];
  /** Shown on the header. */
  hint?: string;
  /** Why this cell cannot be edited, or null when it can. */
  lock?: (id: number) => string | null;
  /** Text shown in an empty cell. */
  placeholder?: string;
}

export type MarkTone = 'green' | 'blue' | 'slate' | 'red' | 'amber';

export interface RowMark {
  tone: MarkTone;
  label: string;
  messages?: string[];
  cellErrors?: Partial<Record<string, string>>;
}

export interface SheetGridHandle {
  scrollToRow: (id: number) => void;
  focus: () => void;
}

interface Props {
  /** Rows in view, in display order. */
  rows: GridRow[];
  columns: GridColumn[];
  marks?: Map<number, RowMark>;
  selected: Set<number>;
  onSelectedChange: (next: Set<number>) => void;
  onEdit: (patches: CellPatch[], newRows?: Array<Record<string, string>>) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  /** Cells edited since loading (bulk editor), drawn highlighted. */
  isChanged?: (id: number, key: string) => boolean;
  /** Paste past the last row adds rows (import); off for the bulk editor. */
  canAddRows?: boolean;
  height?: number;
  emptyText?: ReactNode;
}

const RH = 34;
const HEAD = 36;
const OVERSCAN = 10;
const FIXED = { check: 36, line: 64, status: 118 };
const FIXED_W = FIXED.check + FIXED.line + FIXED.status;

const TONE: Record<MarkTone, string> = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  red: 'bg-rose-50 text-rose-700 ring-rose-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
};

interface Pos { r: number; c: number }

/** Tab-separated text as copied from Excel; quoted cells may hold tabs and new lines. */
function parseTsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const s = text.replace(/\r\n?/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quoted) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === '\t') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); out.push(row); row = []; cell = ''; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); out.push(row); }
  return out;
}

const tsvCell = (v: string) => (/[\t\n"]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export const SheetGrid = forwardRef<SheetGridHandle, Props>(function SheetGrid({
  rows, columns, marks, selected, onSelectedChange, onEdit, onUndo, onRedo, isChanged, canAddRows = true, height = 560, emptyText,
}, ref) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const [viewH, setViewH] = useState(height);
  const [active, setActive] = useState<Pos>({ r: 0, c: 0 });
  const [anchor, setAnchor] = useState<Pos | null>(null);
  const [editing, setEditingState] = useState<{ pos: Pos; value: string } | null>(null);
  // Mirror of `editing` that changes at once, so a blur after Esc or Enter does not save twice.
  const editRef = useRef<{ pos: Pos; value: string } | null>(null);
  const setEditing = (next: { pos: Pos; value: string } | null) => { editRef.current = next; setEditingState(next); };
  const lastClicked = useRef<number | null>(null);
  const dragging = useRef(false);

  const width = FIXED_W + columns.reduce((s, c) => s + c.width, 0);
  const lefts = useMemo(() => {
    const out: number[] = [];
    let x = FIXED_W;
    for (const c of columns) { out.push(x); x += c.width; }
    return out;
  }, [columns]);

  // Keep the active cell inside the grid when rows or columns change.
  useEffect(() => {
    setActive((a) => ({ r: Math.max(0, Math.min(a.r, rows.length - 1)), c: Math.max(0, Math.min(a.c, columns.length - 1)) }));
  }, [rows.length, columns.length]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(0, Math.floor(scroll.top / RH) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((scroll.top + viewH) / RH) + OVERSCAN);

  const range = useMemo(() => {
    const a = anchor ?? active;
    return { r1: Math.min(a.r, active.r), r2: Math.max(a.r, active.r), c1: Math.min(a.c, active.c), c2: Math.max(a.c, active.c) };
  }, [anchor, active]);

  const lockOf = useCallback((r: number, c: number) => {
    const row = rows[r];
    const col = columns[c];
    return row && col?.lock ? col.lock(row.id) : null;
  }, [rows, columns]);

  /** Scrolls so the cell is visible below the header and right of the fixed columns. */
  const reveal = useCallback((p: Pos) => {
    const el = boxRef.current;
    if (!el) return;
    const top = p.r * RH;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + RH > el.scrollTop + el.clientHeight - HEAD) el.scrollTop = top + RH - el.clientHeight + HEAD;
    const left = lefts[p.c] ?? FIXED_W;
    const w = columns[p.c]?.width ?? 0;
    if (left - FIXED_W < el.scrollLeft) el.scrollLeft = left - FIXED_W;
    else if (left + w > el.scrollLeft + el.clientWidth) el.scrollLeft = left + w - el.clientWidth;
  }, [lefts, columns]);

  const focusBox = () => boxRef.current?.focus({ preventScroll: true });

  useImperativeHandle(ref, () => ({
    scrollToRow: (id: number) => {
      const r = rows.findIndex((x) => x.id === id);
      if (r < 0) return;
      const p = { r, c: 0 };
      setActive(p);
      setAnchor(null);
      reveal(p);
      focusBox();
    },
    focus: focusBox,
  }), [rows, reveal]);

  const move = (p: Pos, extend = false) => {
    const next = { r: Math.max(0, Math.min(rows.length - 1, p.r)), c: Math.max(0, Math.min(columns.length - 1, p.c)) };
    if (extend) setAnchor((a) => a ?? active);
    else setAnchor(null);
    setActive(next);
    reveal(next);
  };

  const startEdit = (p: Pos, value?: string) => {
    const row = rows[p.r];
    const col = columns[p.c];
    if (!row || !col || lockOf(p.r, p.c)) return;
    setEditing({ pos: p, value: value ?? row.cells[col.key] ?? '' });
  };

  const commit = (then?: Pos) => {
    const cur = editRef.current;
    if (!cur) return;
    const row = rows[cur.pos.r];
    const col = columns[cur.pos.c];
    if (row && col && (row.cells[col.key] ?? '') !== cur.value) onEdit([{ id: row.id, key: col.key, value: cur.value }]);
    setEditing(null);
    if (then) move(then);
    requestAnimationFrame(focusBox);
  };

  const clearRange = () => {
    const patches: CellPatch[] = [];
    for (let r = range.r1; r <= range.r2; r++) {
      for (let c = range.c1; c <= range.c2; c++) {
        if (lockOf(r, c)) continue;
        const row = rows[r];
        const key = columns[c].key;
        if (row.cells[key]) patches.push({ id: row.id, key, value: '' });
      }
    }
    if (patches.length) onEdit(patches);
  };

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (editing || !rows.length) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key;
    let handled = true;
    if (mod && (k === 'z' || k === 'Z')) { if (e.shiftKey) onRedo?.(); else onUndo?.(); }
    else if (mod && (k === 'y' || k === 'Y')) onRedo?.();
    else if (mod && (k === 'a' || k === 'A')) onSelectedChange(new Set(rows.map((r) => r.id)));
    else if (mod && (k === 'c' || k === 'C' || k === 'v' || k === 'V' || k === 'x' || k === 'X')) handled = false;
    else if (k === 'ArrowDown') move({ r: mod ? rows.length - 1 : active.r + 1, c: active.c }, e.shiftKey);
    else if (k === 'ArrowUp') move({ r: mod ? 0 : active.r - 1, c: active.c }, e.shiftKey);
    else if (k === 'ArrowRight') move({ r: active.r, c: mod ? columns.length - 1 : active.c + 1 }, e.shiftKey);
    else if (k === 'ArrowLeft') move({ r: active.r, c: mod ? 0 : active.c - 1 }, e.shiftKey);
    else if (k === 'PageDown') move({ r: active.r + Math.floor(viewH / RH) - 1, c: active.c });
    else if (k === 'PageUp') move({ r: active.r - Math.floor(viewH / RH) + 1, c: active.c });
    else if (k === 'Home') move({ r: mod ? 0 : active.r, c: 0 });
    else if (k === 'End') move({ r: mod ? rows.length - 1 : active.r, c: columns.length - 1 });
    else if (k === 'Tab') {
      const c = active.c + (e.shiftKey ? -1 : 1);
      if (c >= columns.length) move({ r: active.r + 1, c: 0 });
      else if (c < 0) move({ r: active.r - 1, c: columns.length - 1 });
      else move({ r: active.r, c });
    } else if (k === 'Enter' || k === 'F2') startEdit(active);
    else if (k === 'Delete' || k === 'Backspace') clearRange();
    else if (k === 'Escape') { setAnchor(null); handled = !!anchor; }
    else if (k === ' ' && e.shiftKey) {
      const id = rows[active.r].id;
      const next = new Set(selected);
      if (next.has(id)) next.delete(id); else next.add(id);
      onSelectedChange(next);
    } else if (k.length === 1 && !mod && !e.altKey) startEdit(active, k);
    else handled = false;
    if (handled) {
      e.preventDefault();
      // Page shortcuts (G guide, / search) must not fire while working in the grid.
      e.stopPropagation();
    }
  };

  // Copy and paste reach the focused grid through the document.
  useEffect(() => {
    const inGrid = () => !!boxRef.current && boxRef.current.contains(document.activeElement) && !editing;
    const onCopy = (e: ClipboardEvent) => {
      if (!inGrid() || !rows.length) return;
      const lines: string[] = [];
      for (let r = range.r1; r <= range.r2; r++) {
        const cells: string[] = [];
        for (let c = range.c1; c <= range.c2; c++) cells.push(tsvCell(rows[r]?.cells[columns[c].key] ?? ''));
        lines.push(cells.join('\t'));
      }
      e.clipboardData?.setData('text/plain', lines.join('\n'));
      e.preventDefault();
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!inGrid()) return;
      const text = e.clipboardData?.getData('text/plain') ?? '';
      if (!text) return;
      e.preventDefault();
      let matrix = parseTsv(text);
      if (matrix.length > 1 && matrix[matrix.length - 1].every((x) => x === '')) matrix = matrix.slice(0, -1);
      const patches: CellPatch[] = [];
      const extra: Array<Record<string, string>> = [];
      // One value over a selected block fills the block (like Excel).
      if (matrix.length === 1 && matrix[0].length === 1 && (range.r2 > range.r1 || range.c2 > range.c1)) {
        for (let r = range.r1; r <= range.r2; r++) {
          for (let c = range.c1; c <= range.c2; c++) {
            if (!lockOf(r, c)) patches.push({ id: rows[r].id, key: columns[c].key, value: matrix[0][0].trim() });
          }
        }
      } else {
        matrix.forEach((cells, i) => {
          const r = range.r1 + i;
          const target: Record<string, string> = {};
          cells.forEach((v, j) => {
            const c = range.c1 + j;
            if (c >= columns.length) return;
            if (r < rows.length) {
              if (!lockOf(r, c)) patches.push({ id: rows[r].id, key: columns[c].key, value: v.trim() });
            } else target[columns[c].key] = v.trim();
          });
          if (r >= rows.length && canAddRows && Object.values(target).some(Boolean)) extra.push(target);
        });
      }
      if (patches.length || extra.length) onEdit(patches, extra);
      setAnchor({ r: range.r1, c: range.c1 });
      setActive({ r: Math.min(range.r1 + matrix.length - 1, rows.length + extra.length - 1), c: Math.min(range.c1 + (matrix[0]?.length ?? 1) - 1, columns.length - 1) });
    };
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    return () => {
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
    };
  }, [rows, columns, range, editing, onEdit, lockOf, canAddRows]);

  useEffect(() => {
    const up = () => { dragging.current = false; };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, []);

  const toggleRow = (index: number, shift: boolean) => {
    const id = rows[index].id;
    const next = new Set(selected);
    if (shift && lastClicked.current !== null) {
      const a = Math.min(lastClicked.current, index);
      const b = Math.max(lastClicked.current, index);
      const on = !selected.has(id);
      for (let i = a; i <= b; i++) { if (on) next.add(rows[i].id); else next.delete(rows[i].id); }
    } else if (next.has(id)) next.delete(id);
    else next.add(id);
    lastClicked.current = index;
    onSelectedChange(next);
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const activeRow = rows[active.r];
  const activeCol = columns[active.c];
  const activeMark = activeRow ? marks?.get(activeRow.id) : undefined;
  const activeError = activeRow && activeCol ? activeMark?.cellErrors?.[activeCol.key] : undefined;
  const activeLock = activeRow ? lockOf(active.r, active.c) : null;

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
      {columns.filter((c) => c.options?.length).map((c) => (
        <datalist key={c.key} id={`sheet-opts-${c.key}`}>{c.options!.slice(0, 500).map((o) => <option key={o} value={o} />)}</datalist>
      ))}
      <div
        ref={boxRef}
        tabIndex={0}
        role="grid"
        aria-rowcount={rows.length}
        aria-colcount={columns.length}
        onKeyDown={onKeyDown}
        onScroll={(e) => setScroll({ top: e.currentTarget.scrollTop, left: e.currentTarget.scrollLeft })}
        className="relative overflow-auto text-[0.8125rem] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500/40"
        style={{ height }}
      >
        <div style={{ width, height: HEAD + rows.length * RH, position: 'relative' }}>
          {/* Header */}
          <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-slate-50 text-[0.75rem] font-semibold text-slate-600" style={{ height: HEAD, width }}>
            <div className="sticky left-0 z-10 flex items-center justify-center bg-slate-50" style={{ width: FIXED.check }}>
              <input type="checkbox" aria-label="Sab lines chunein" checked={allSelected} className="h-4 w-4 accent-brand-600"
                onChange={() => onSelectedChange(allSelected ? new Set() : new Set(rows.map((r) => r.id)))} />
            </div>
            <div className="sticky z-10 flex items-center bg-slate-50 px-2" style={{ left: FIXED.check, width: FIXED.line }}>Line</div>
            <div className="sticky z-10 flex items-center border-r border-slate-200 bg-slate-50 px-2" style={{ left: FIXED.check + FIXED.line, width: FIXED.status }}>Haal</div>
            {columns.map((c, i) => (
              <div key={c.key} title={c.hint} role="columnheader"
                className={cn('flex items-center truncate border-r border-slate-100 px-2', c.numeric && 'justify-end', i === active.c && 'bg-brand-50/70 text-brand-800')}
                style={{ width: c.width }}>{c.label}</div>
            ))}
          </div>

          {rows.length === 0 && (
            <div className="absolute inset-x-0 flex items-center justify-center text-slate-500" style={{ top: HEAD + 40 }}>{emptyText ?? 'Koi line nahi'}</div>
          )}

          {/* Rows in view */}
          <div style={{ position: 'absolute', top: HEAD + start * RH, left: 0, width }}>
            {rows.slice(start, end).map((row, k) => {
              const r = start + k;
              const mark = marks?.get(row.id);
              const isSel = selected.has(row.id);
              const rowBg = isSel ? 'bg-brand-50/60' : r % 2 ? 'bg-slate-50/40' : 'bg-white';
              return (
                <div key={row.id} role="row" className={cn('flex border-b border-slate-100', rowBg)} style={{ height: RH, width }}>
                  <div className={cn('sticky left-0 z-10 flex items-center justify-center', rowBg === 'bg-white' ? 'bg-white' : isSel ? 'bg-brand-50' : 'bg-slate-50')} style={{ width: FIXED.check }}>
                    <input type="checkbox" aria-label={`Line ${row.id} chunein`} checked={isSel} className="h-4 w-4 accent-brand-600"
                      onChange={() => undefined}
                      onClick={(e) => { e.stopPropagation(); toggleRow(r, e.shiftKey); }} />
                  </div>
                  <div className={cn('sticky z-10 flex items-center px-2 font-mono text-[0.75rem] tabular-nums text-slate-500', isSel ? 'bg-brand-50' : r % 2 ? 'bg-slate-50' : 'bg-white')}
                    style={{ left: FIXED.check, width: FIXED.line }}>{row.id || <span className="font-sans text-brand-600" title="Yahan likhne se nayi line banti hai">+ nayi</span>}</div>
                  <div className={cn('sticky z-10 flex items-center border-r border-slate-200 px-1.5', isSel ? 'bg-brand-50' : r % 2 ? 'bg-slate-50' : 'bg-white')}
                    style={{ left: FIXED.check + FIXED.line, width: FIXED.status }}
                    title={mark?.messages?.join('\n')}>
                    {mark && (
                      <span className={cn('inline-flex h-6 max-w-full items-center gap-1 truncate rounded-full px-2 text-[0.6875rem] font-semibold ring-1', TONE[mark.tone])}>
                        {mark.tone === 'red' && <AlertTriangle className="h-3 w-3 shrink-0" />}{mark.label}
                      </span>
                    )}
                  </div>
                  {columns.map((col, c) => {
                    const value = row.cells[col.key] ?? '';
                    const err = mark?.cellErrors?.[col.key];
                    const lock = col.lock?.(row.id) ?? null;
                    const isActive = r === active.r && c === active.c;
                    const inRange = r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
                    const isEditing = editing && editing.pos.r === r && editing.pos.c === c;
                    const changed = isChanged?.(row.id, col.key);
                    return (
                      <div key={col.key} role="gridcell" aria-selected={isActive}
                        title={err ?? lock ?? (value.length > 18 ? value : undefined)}
                        onMouseDown={(e) => {
                          if (isEditing) return;
                          e.preventDefault();
                          if (editing) commit();
                          focusBox();
                          if (e.shiftKey) { setAnchor((a) => a ?? active); setActive({ r, c }); }
                          else { setAnchor(null); setActive({ r, c }); dragging.current = true; }
                        }}
                        onMouseEnter={() => {
                          if (!dragging.current) return;
                          setAnchor((a) => a ?? active);
                          setActive({ r, c });
                        }}
                        onDoubleClick={() => startEdit({ r, c })}
                        className={cn('relative flex items-center border-r border-slate-100 px-2',
                          col.numeric && 'justify-end tabular-nums',
                          inRange && !isActive && 'bg-brand-100/50',
                          changed && !err && 'bg-amber-50 font-semibold text-amber-900',
                          err && 'bg-rose-50 text-rose-800',
                          lock && 'cursor-not-allowed text-slate-400',
                          isActive && 'z-[5] outline outline-2 -outline-offset-2 outline-brand-600')}
                        style={{ width: col.width }}>
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editing.value}
                            list={col.options?.length ? `sheet-opts-${col.key}` : undefined}
                            onChange={(e) => setEditing({ pos: editing.pos, value: e.target.value })}
                            onBlur={() => commit()}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === 'Enter') { e.preventDefault(); commit({ r: r + (e.shiftKey ? -1 : 1), c }); }
                              else if (e.key === 'Tab') { e.preventDefault(); commit({ r, c: c + (e.shiftKey ? -1 : 1) }); }
                              else if (e.key === 'Escape') { e.preventDefault(); setEditing(null); requestAnimationFrame(focusBox); }
                              else if (e.key === 'ArrowDown' && !col.options?.length) { e.preventDefault(); commit({ r: r + 1, c }); }
                              else if (e.key === 'ArrowUp' && !col.options?.length) { e.preventDefault(); commit({ r: r - 1, c }); }
                            }}
                            className={cn('absolute inset-0 h-full w-full bg-white px-2 text-slate-900 outline outline-2 -outline-offset-2 outline-brand-600', col.numeric && 'text-right')}
                          />
                        ) : (
                          <>
                            <span className={cn('truncate', !value && 'text-slate-300')}>{value || (lock ? '' : col.placeholder ?? '')}</span>
                            {lock && <Lock className="ml-auto h-3 w-3 shrink-0 text-slate-300" />}
                            {err && <span aria-hidden className="absolute right-0 top-0 h-0 w-0 border-l-[7px] border-t-[7px] border-l-transparent border-t-rose-500" />}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status line: where the cursor is and what is wrong there. */}
      <div className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-[0.75rem]">
        {activeRow && activeCol ? (
          <>
            <span className="font-semibold text-slate-700">Line {activeRow.id} · {activeCol.label}</span>
            {activeError && <span className="font-medium text-rose-700">{activeError}</span>}
            {!activeError && activeLock && <span className="text-slate-500">{activeLock}</span>}
            {!activeError && !activeLock && activeMark?.messages?.[0] && (
              <span className={activeMark.tone === 'red' ? 'text-rose-700' : 'text-slate-600'}>{activeMark.messages[0]}</span>
            )}
          </>
        ) : <span className="text-slate-500">Cell par click karein</span>}
        <span className="ml-auto hidden text-slate-400 lg:inline">Enter/F2 edit · Tab aage · Ctrl+Z wapas · Ctrl+V Excel se paste · Shift+arrows block</span>
      </div>
    </div>
  );
});
