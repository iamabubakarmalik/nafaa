/**
 * Keyboard for small popup menus and option lists (FilterMenu, the top-bar
 * menus): ↑ ↓ move, Home / End jump, typing a letter jumps to the next item
 * starting with it, Enter or Space picks (native button behaviour). When the
 * menu opens, focus moves to the chosen item (or the first); when it closes,
 * focus goes back to the button that opened it.
 */

import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';
import { FIELD, focusables } from './keys';

const ITEMS = '[role="option"],[role="menuitem"],[role="menuitemradio"],[role="menuitemcheckbox"],a[href],button:not([disabled])';

/** Moves focus between the items of `menu`. Returns true when the key was used. */
export function handleMenuKey(e: KeyboardEvent | ReactKeyboardEvent, menu: HTMLElement, items = ITEMS, typeahead = true): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const list = focusables(menu, items);
  if (!list.length) return false;
  const active = document.activeElement as HTMLElement | null;
  // Fields inside the popup (search, dates) keep their own keys.
  if (active?.matches(FIELD)) return false;
  const i = active ? list.indexOf(active) : -1;
  const to = (n: number) => { list[(n + list.length) % list.length]?.focus(); };

  switch (e.key) {
    case 'ArrowDown': to(i < 0 ? 0 : i + 1); return true;
    case 'ArrowUp': to(i < 0 ? list.length - 1 : i - 1); return true;
    case 'Home': to(0); return true;
    case 'End': to(list.length - 1); return true;
  }
  // Type-ahead: a single printable character jumps to the next match.
  if (typeahead && e.key.length === 1 && /\S/.test(e.key)) {
    const ch = e.key.toLowerCase();
    const start = i < 0 ? 0 : i + 1;
    for (let n = 0; n < list.length; n += 1) {
      const el = list[(start + n) % list.length];
      if ((el.textContent || el.getAttribute('aria-label') || '').trim().toLowerCase().startsWith(ch)) { el.focus(); return true; }
    }
  }
  return false;
}

/**
 * Focus handling for a popup: on open, focus the selected item (or the first
 * item, or a field marked `data-autofocus`); on close, return focus to the
 * trigger when focus was inside the popup or nowhere.
 */
export function useMenuFocus(open: boolean, menuRef: RefObject<HTMLElement | null>, triggerRef: RefObject<HTMLElement | null>, { autoFocus = true }: { autoFocus?: boolean } = {}) {
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      if (!autoFocus) return;
      const t = window.setTimeout(() => {
        const menu = menuRef.current;
        if (!menu || menu.contains(document.activeElement)) return;
        const target = menu.querySelector<HTMLElement>('[data-autofocus],[aria-selected="true"],[aria-checked="true"],[aria-current="true"],[aria-current="page"]')
          ?? focusables(menu, ITEMS)[0];
        target?.focus({ preventScroll: true });
      }, 0);
      return () => window.clearTimeout(t);
    }
    if (!wasOpen.current) return;
    wasOpen.current = false;
    const active = document.activeElement;
    if (!active || active === document.body || !document.contains(active) || menuRef.current?.contains(active)) {
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [open, menuRef, triggerRef, autoFocus]);
}

/**
 * Tabs and segmented controls (role="tablist" / "radiogroup"): ← → (and ↑ ↓)
 * move to the next tab and select it, Home / End jump to the first / last.
 * Returns true when the key was used.
 */
export function moveInTabs(group: HTMLElement, key: string): boolean {
  if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return false;
  const list = focusables(group, '[role="tab"]:not([disabled]),[role="radio"]:not([disabled])');
  const i = list.indexOf(document.activeElement as HTMLElement);
  if (i < 0) return false;
  const n = key === 'Home' ? 0 : key === 'End' ? list.length - 1
    : (i + (key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1) + list.length) % list.length;
  list[n].focus();
  list[n].click();
  return true;
}

/** onKeyDown for a tablist or radiogroup container. */
export function onTabsKeyDown(e: ReactKeyboardEvent<HTMLElement>) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (moveInTabs(e.currentTarget, e.key)) e.preventDefault();
}
