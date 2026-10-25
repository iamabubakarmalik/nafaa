/**
 * Small DOM helpers shared by the keyboard hooks: what counts as focusable,
 * whether the user is typing, and a way to run a default action only when no
 * page handler has already taken the key.
 */

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { isDialogOpen, isTyping } from '@core/lib/shortcuts';

export { isDialogOpen, isTyping };

export const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/** Text-like fields: Enter and letters belong to the field. */
export const FIELD = 'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]),select,textarea';

/** Visible, enabled focusable elements inside `root`, in DOM order. */
export function focusables(root: ParentNode, selector = FOCUSABLE): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(isVisible);
}

export function isVisible(el: HTMLElement): boolean {
  if (el.closest('[aria-hidden="true"],[inert]')) return false;
  return el.offsetParent !== null || getComputedStyle(el).position === 'fixed';
}

/** True when the key event has any of Ctrl, ⌘, Alt. Shift is allowed (it makes "?"). */
export const hasModifier = (e: KeyboardEvent) => e.ctrlKey || e.metaKey || e.altKey;

/** Ctrl on Windows/Linux, ⌘ on Mac. */
export const isMod = (e: KeyboardEvent | ReactKeyboardEvent) => e.ctrlKey || e.metaKey;

/**
 * Runs `fn` after every other keydown listener for this event, and only if
 * none of them called preventDefault. Call it from a capture listener on
 * window: the listener added here joins window's bubble phase, which runs
 * last. Lets the shell give a default for a key (/, Ctrl+S, Esc) without
 * stepping on pages that already handle it.
 */
export function whenUnhandled(e: KeyboardEvent, fn: () => void) {
  const last = (ev: Event) => {
    if (ev !== e) return;
    window.removeEventListener('keydown', last);
    if (!e.defaultPrevented) fn();
  };
  window.addEventListener('keydown', last);
  window.setTimeout(() => window.removeEventListener('keydown', last), 0);
}

/** Focuses an element and makes it focusable first when it is not. */
export function focusEl(el: HTMLElement | null | undefined, scroll: ScrollIntoViewOptions | false = { block: 'nearest' }) {
  if (!el) return;
  if (!el.matches(FOCUSABLE) && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: !!scroll });
  if (scroll) el.scrollIntoView(scroll);
}

const SEARCH_HINT = /search|dhoond|talash|khoj/i;

/** A page search box: SearchField, type="search", or an input labelled as search. */
export function isSearchBox(el: Element | null): el is HTMLInputElement {
  if (!el || el.tagName !== 'INPUT') return false;
  return el.matches('[data-page-search],[type="search"]') || SEARCH_HINT.test(`${(el as HTMLInputElement).placeholder} ${el.getAttribute('aria-label') ?? ''}`);
}

/** The first visible search box inside `root`. */
export function findSearchBox(root: ParentNode): HTMLInputElement | null {
  const inputs = Array.from(root.querySelectorAll<HTMLInputElement>('input')).filter(isVisible);
  return inputs.find((el) => el.matches('[data-page-search],[type="search"]')) ?? inputs.find(isSearchBox) ?? null;
}
