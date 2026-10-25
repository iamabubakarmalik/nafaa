/**
 * Arrow keys for search-as-you-type pickers (product, customer, supplier…):
 * a text field with a dropdown of result buttons positioned under it.
 *
 * While the field has focus, ↓ / ↑ highlight a result without leaving the
 * field, Enter picks the highlighted result, and typing clears the highlight
 * (so Enter goes back to the page's own behaviour, e.g. "add first match").
 * Fields that run their own list (aria-activedescendant, role="combobox", or
 * a page handler that takes the arrows) are left alone.
 *
 * Mounted once by the app shell, so every picker gets it without changes.
 */

import { useEffect } from 'react';
import { FIELD, isVisible, whenUnhandled } from './keys';

const ACTIVE = 'data-kb-active';
const ITEMS = '[role="option"],button:not([disabled]),a[href]';
/** Number and date fields use the arrows themselves. */
const TEXT_TYPES = new Set(['text', 'search', 'tel', 'email', 'url']);

/** The dropdown that belongs to `input`: an absolutely placed box next to it, holding buttons. */
function popupFor(input: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = input.parentElement;
  for (let depth = 0; node && depth < 4; depth += 1, node = node.parentElement) {
    for (const child of Array.from(node.children) as HTMLElement[]) {
      if (child.contains(input) || !isVisible(child)) continue;
      const pos = getComputedStyle(child).position;
      if ((pos === 'absolute' || pos === 'fixed') && child.querySelector(ITEMS)) return child;
    }
  }
  return null;
}

function items(popup: HTMLElement): HTMLElement[] {
  // One entry per result row: skip buttons nested in another entry's row
  // (e.g. "+ carton" chips next to a result).
  const all = Array.from(popup.querySelectorAll<HTMLElement>(ITEMS)).filter(isVisible);
  return all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
}

function clear(popup: ParentNode | null) {
  popup?.querySelectorAll(`[${ACTIVE}]`).forEach((el) => el.removeAttribute(ACTIVE));
}

export function useSuggestKeys({ enabled = true }: { enabled?: boolean } = {}) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      const input = e.target as HTMLElement;
      if (input.tagName !== 'INPUT' || !input.matches(FIELD) || !TEXT_TYPES.has((input as HTMLInputElement).type)
        || input.hasAttribute('aria-activedescendant') || input.getAttribute('role') === 'combobox') return;

      if (e.key === 'Enter') {
        const popup = popupFor(input);
        const picked = popup?.querySelector<HTMLElement>(`[${ACTIVE}]`);
        if (!picked || !isVisible(picked)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        clear(popup);
        picked.click();
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      whenUnhandled(e, () => {
        const popup = popupFor(input);
        if (!popup) return;
        const list = items(popup);
        if (!list.length) return;
        e.preventDefault();
        const i = list.findIndex((el) => el.hasAttribute(ACTIVE));
        const next = list[e.key === 'ArrowDown' ? Math.min(i + 1, list.length - 1) : Math.max(i - 1, 0)];
        clear(popup);
        next.setAttribute(ACTIVE, '');
        next.scrollIntoView({ block: 'nearest' });
      });
    };
    // Typing changes the results: drop the highlight.
    const onInput = (e: Event) => {
      const input = e.target as HTMLElement;
      if (input.tagName === 'INPUT') clear(popupFor(input));
    };
    window.addEventListener('keydown', onKey, true);
    document.addEventListener('input', onInput, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.removeEventListener('input', onInput, true);
    };
  }, [enabled]);
}
