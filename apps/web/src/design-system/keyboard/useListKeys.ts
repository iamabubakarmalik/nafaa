/**
 * Keyboard movement through a list or table.
 *
 *   ↑ ↓          previous / next row (↓ from the page search enters the list,
 *                ↑ from the first row goes back to the search); in a card
 *                grid ↑ ↓ move a whole line and ← → one card
 *   Home / End   first / last row
 *   PgUp / PgDn  previous / next page where the list pages, else 10 rows
 *   Enter        open the row
 *   Space        select the row where rows can be selected
 *
 * Rows are elements marked `data-nav-row` (Tr with `interactive` does this).
 * Without marked rows, the largest table body with clickable rows is used,
 * so plain tables work too. Inside a row, mark the open target with
 * `data-nav-open` and the select control with `data-nav-select` when the
 * defaults (first link or button, first checkbox or toggle) are not right.
 * Mark a pager button with `data-pager="next" | "prev" | "more"`.
 * Put `data-keynav="off"` on a container to keep its rows out.
 *
 * The app shell turns this on for the main content area, so every list page
 * gets it. Use the hook directly for lists inside drawers or dialogs.
 */

import { useEffect, type RefObject } from 'react';
import { FIELD, findSearchBox, focusEl, hasModifier, isDialogOpen, isSearchBox, isVisible, whenUnhandled } from './keys';

const ROW = '[data-nav-row]';
/** Widgets that use the arrow keys themselves. */
const ARROW_WIDGETS = '[role="tablist"],[role="listbox"],[role="menu"],[role="radiogroup"],[role="grid"],[role="slider"],[role="tree"],select,input[type="range"]';
const PAGE_STEP = 10;

const usable = (el: HTMLElement) => isVisible(el) && !el.closest('[data-keynav="off"]');

/** Rows of the list inside `root`, in screen order. */
export function listRows(root: HTMLElement): HTMLElement[] {
  const marked = Array.from(root.querySelectorAll<HTMLElement>(ROW)).filter(usable);
  if (marked.length) return marked;
  let best: HTMLElement[] = [];
  root.querySelectorAll<HTMLTableSectionElement>('tbody').forEach((body) => {
    if (!usable(body)) return;
    const rows = Array.from(body.rows).filter((r) => isVisible(r) && (r.classList.contains('cursor-pointer') || r.querySelector('a[href],button')));
    if (rows.length > best.length) best = rows;
  });
  return best;
}

function pager(root: HTMLElement, kind: 'next' | 'prev' | 'more'): HTMLButtonElement | null {
  const marked = root.querySelector<HTMLButtonElement>(`[data-pager="${kind}"]:not([disabled])`);
  if (marked && isVisible(marked)) return marked;
  const pattern = kind === 'next' ? /^(next|agla|agle|aage)\b/i : kind === 'prev' ? /^(prev|previous|pichla|pichle|peeche)\b/i : /^aur\b.*(dikhayein|dekhein|load)/i;
  return Array.from(root.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
    .find((b) => isVisible(b) && pattern.test((b.getAttribute('aria-label') || b.textContent || '').trim())) ?? null;
}

export function openRow(row: HTMLElement) {
  const target = row.querySelector<HTMLElement>('[data-nav-open]')
    ?? (row.classList.contains('cursor-pointer') ? row : null)
    ?? row.querySelector<HTMLElement>('a[href]')
    ?? row.querySelector<HTMLElement>('button:not([aria-pressed]):not([data-nav-select]):not([disabled])')
    ?? row;
  target.click();
}

function selectRow(row: HTMLElement): boolean {
  const control = row.querySelector<HTMLElement>('[data-nav-select],input[type="checkbox"],[role="checkbox"],button[aria-pressed]');
  if (!control) return false;
  control.click();
  return true;
}

function focusRow(row: HTMLElement | undefined) {
  if (!row) return;
  // Heuristic rows get the marker so they share the focus style.
  if (!row.hasAttribute('data-nav-row')) row.setAttribute('data-nav-row', '');
  focusEl(row);
}

/**
 * Handles one key for the list in `root`. Returns true when it used the key.
 * `fromOutside` lets ↓ start the list when nothing is focused.
 */
export function handleListKey(e: KeyboardEvent, root: HTMLElement, fromOutside: boolean): boolean {
  if (hasModifier(e) || e.isComposing) return false;
  const k = e.key;
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageDown', 'PageUp', 'Enter', ' '].includes(k)) return false;

  const active = document.activeElement as HTMLElement | null;
  const rows = listRows(root);
  if (!rows.length) return false;
  const current = active ? rows.findIndex((r) => r === active || r.contains(active)) : -1;
  const onRow = current >= 0 && rows[current] === active;
  const inSearch = isSearchBox(active) && root.contains(active);

  if (current < 0) {
    // Enter the list: ↓ from the page search, or ↓ when nothing has focus.
    const idle = !active || active === document.body || active === root || (fromOutside && !root.contains(active) && !active.closest('[role="dialog"],nav,header'));
    if (k !== 'ArrowDown') return false;
    if (inSearch) { focusRow(rows[0]); return true; }
    // From nothing focused, only on list pages (marked rows or a search box),
    // so ↓ still scrolls reports and dashboards; start at the first row in view.
    if (!idle || !(root.querySelector(ROW) || findSearchBox(root))) return false;
    const view = root.getBoundingClientRect();
    focusRow(rows.find((r) => r.getBoundingClientRect().bottom > view.top + 8) ?? rows[0]);
    return true;
  }

  // Inside a row but on a field or arrow widget: leave the key to it.
  if (active !== rows[current] && (active?.matches(FIELD) || active?.closest(ARROW_WIDGETS))) return false;

  const go = (i: number) => focusRow(rows[Math.max(0, Math.min(rows.length - 1, i))]);
  // Cards side by side: a line holds as many cards as share the first card's top edge.
  const top = (el: HTMLElement) => Math.round(el.getBoundingClientRect().top);
  const cols = Math.max(1, rows.filter((r) => top(r) === top(rows[0])).length);
  switch (k) {
    case 'ArrowRight':
    case 'ArrowLeft':
      if (cols === 1 || !onRow) return false;
      go(current + (k === 'ArrowRight' ? 1 : -1));
      return true;
    case 'ArrowDown':
      go(current + cols);
      return true;
    case 'ArrowUp': {
      if (current < cols) {
        const search = findSearchBox(root);
        if (search) { search.focus(); return true; }
      }
      go(current - cols);
      return true;
    }
    case 'Home': go(0); return true;
    case 'End': go(rows.length - 1); return true;
    case 'PageDown': {
      const next = pager(root, 'next');
      if (next) { next.click(); window.setTimeout(() => focusRow(listRows(root)[0]), 250); return true; }
      if (current === rows.length - 1) {
        const more = pager(root, 'more');
        if (more) { more.click(); window.setTimeout(() => go(current + 1), 600); return true; }
      }
      go(current + PAGE_STEP * cols);
      return true;
    }
    case 'PageUp': {
      const prev = pager(root, 'prev');
      if (prev) { prev.click(); window.setTimeout(() => focusRow(listRows(root)[0]), 250); return true; }
      go(current - PAGE_STEP * cols);
      return true;
    }
    case 'Enter':
      if (!onRow) return false;
      openRow(rows[current]);
      return true;
    case ' ':
      return onRow && selectRow(rows[current]);
  }
  return false;
}

/**
 * Turns list keys on for the rows inside `ref`.
 * `global`: listen on the whole window (used once by the app shell for the
 * main content), give pages first say, and stay quiet while a dialog is open.
 */
export function useListKeys(ref: RefObject<HTMLElement | null>, { enabled = true, global = false }: { enabled?: boolean; global?: boolean } = {}) {
  useEffect(() => {
    if (!enabled) return;
    if (global) {
      const onKey = (e: KeyboardEvent) => {
        const root = ref.current;
        if (!root || root.closest('[data-keynav="off"]') || isDialogOpen()) return;
        whenUnhandled(e, () => { if (handleListKey(e, root, true)) e.preventDefault(); });
      };
      window.addEventListener('keydown', onKey, true);
      return () => window.removeEventListener('keydown', onKey, true);
    }
    const root = ref.current;
    if (!root) return;
    const onKey = (e: KeyboardEvent) => { if (!e.defaultPrevented && handleListKey(e, root, false)) { e.preventDefault(); e.stopPropagation(); } };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [ref, enabled, global]);
}
