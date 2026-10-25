/**
 * Focus handling for every modal dialog and drawer in the app, including the
 * ones pages build themselves (anything with role="dialog" aria-modal="true"):
 *
 *  - when one opens, focus moves into it (first field, else first control),
 *    unless it already placed focus inside itself;
 *  - Tab and Shift+Tab stay inside the top dialog;
 *  - Ctrl/⌘+Enter submits its form;
 *  - when it closes, focus returns to the element that had it before (or,
 *    when that element is gone, e.g. a menu item, to the last one still on
 *    the page, such as the menu's button).
 *
 * Mounted once by the app shell. The design-system Modal does the same for
 * itself; this covers the rest.
 */

import { useEffect } from 'react';
import { FIELD, FOCUSABLE, focusables, isMod, isVisible, whenUnhandled } from './keys';
import { triggerDialogSubmit } from './submit';

const DIALOG = '[role="dialog"][aria-modal="true"],[role="alertdialog"][aria-modal="true"]';
const FIRST_FIELD = `${FIELD.split(',').map((s) => `${s}:not([disabled]):not([readonly])`).join(',')}`;

function topDialog(): HTMLElement | null {
  const open = Array.from(document.querySelectorAll<HTMLElement>(DIALOG)).filter((d) => isVisible(d) || d.getClientRects().length > 0);
  return open.filter((d) => !d.closest('[aria-hidden="true"]')).pop() ?? null;
}

export function useDialogFocusManager() {
  useEffect(() => {
    const stack: Array<{ dialog: HTMLElement; opener: HTMLElement | null; path: string }> = [];
    const here = () => window.location.pathname + window.location.search;
    // Recent focus outside modal dialogs, newest last.
    const history: HTMLElement[] = [];
    const lastConnected = () => { for (let i = history.length - 1; i >= 0; i -= 1) if (document.contains(history[i])) return history[i]; return null; };
    let frame = 0;
    const hover = window.matchMedia?.('(hover: hover)').matches ?? true;

    // Remember focus outside dialogs so it can be returned later.
    const onFocusIn = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest?.(DIALOG) || t === document.body) return;
      history.push(t);
      if (history.length > 12) history.shift();
    };

    const sync = () => {
      frame = 0;
      // Closed dialogs: return focus to their opener.
      while (stack.length && (!document.contains(stack[stack.length - 1].dialog) || !isOpen(stack[stack.length - 1].dialog))) {
        const { opener, path } = stack.pop()!;
        const active = document.activeElement;
        // Leave focus alone when it already moved on, or when the dialog led to another page.
        if ((active && active !== document.body) || path !== here()) continue;
        const target = opener && document.contains(opener) ? opener : lastConnected();
        target?.focus({ preventScroll: true });
      }
      const top = topDialog();
      if (!top || stack.some((s) => s.dialog === top)) return;
      stack.push({ dialog: top, opener: lastConnected(), path: here() });
      if (top.contains(document.activeElement)) return;
      const first = top.querySelector<HTMLElement>('[data-autofocus]')
        ?? (hover ? focusables(top, FIRST_FIELD)[0] : undefined)
        ?? focusables(top, FOCUSABLE).find((el) => !/^(close|band karein)$/i.test(el.getAttribute('aria-label') ?? ''))
        ?? focusables(top, FOCUSABLE)[0];
      if (first) first.focus({ preventScroll: true });
      else { top.setAttribute('tabindex', '-1'); top.focus({ preventScroll: true }); }
    };
    const isOpen = (d: HTMLElement) => d.getClientRects().length > 0 && !d.closest('[aria-hidden="true"]');
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(sync); };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-hidden', 'aria-modal', 'role', 'hidden'] });

    const onKey = (e: KeyboardEvent) => {
      const top = topDialog();
      if (!top) return;
      if (e.key === 'Tab' && !isMod(e) && !e.altKey) {
        const items = focusables(top, FOCUSABLE);
        if (!items.length) { e.preventDefault(); return; }
        const active = document.activeElement as HTMLElement | null;
        const i = active ? items.indexOf(active) : -1;
        if (i < 0 || (!e.shiftKey && i === items.length - 1) || (e.shiftKey && i === 0)) {
          e.preventDefault();
          (e.shiftKey ? items[items.length - 1] : items[0]).focus();
        }
        return;
      }
      if (isMod(e) && !e.altKey && e.key === 'Enter') {
        whenUnhandled(e, () => { if (triggerDialogSubmit(top, { guessPrimary: false })) e.preventDefault(); });
      }
    };

    document.addEventListener('focusin', onFocusIn);
    window.addEventListener('keydown', onKey, true);
    return () => {
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      document.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('keydown', onKey, true);
    };
  }, []);
}
