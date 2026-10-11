/**
 * Guards for page keyboard shortcuts. A shortcut must not fire while a
 * dialog is open or while the user is typing in a field.
 */

/** True when a visible dialog is open. Closed drawers stay mounted under aria-hidden, so they are skipped. */
export function isDialogOpen(): boolean {
  return [...document.querySelectorAll('[role="dialog"]')].some((el) => !el.closest('[aria-hidden="true"]'));
}

/** True when focus is in an input, textarea, select or editable element. */
export function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}
