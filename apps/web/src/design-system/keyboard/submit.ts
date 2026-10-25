/**
 * "Save" and "submit" from the keyboard without page-specific code.
 *
 * Looks for, in order: an element marked `data-save-action`, the form around
 * the focused field (or the only form), then a primary Save button. A form
 * whose submit buttons are all disabled is left alone, so a page that blocks
 * saving while data is incomplete keeps doing so.
 */

import { isVisible } from './keys';

const SAVE_LABEL = /^(save|mehfooz|update)\b/i;

const enabled = (el: HTMLElement) => isVisible(el) && !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true';

function submitForm(form: HTMLFormElement): boolean {
  const submits = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button[type="submit"],input[type="submit"]')).filter(isVisible);
  const ready = submits.find((b) => !b.disabled);
  if (submits.length && !ready) return false;
  form.requestSubmit(ready ?? undefined);
  return true;
}

/** Runs the save action of a page area. Returns false when nothing fits. */
export function triggerSave(root: HTMLElement): boolean {
  const marked = Array.from(root.querySelectorAll<HTMLElement>('[data-save-action]')).find(enabled);
  if (marked) { marked.click(); return true; }

  const active = document.activeElement;
  const around = active && root.contains(active) ? active.closest('form') : null;
  const forms = Array.from(root.querySelectorAll('form')).filter((f) => isVisible(f as HTMLElement));
  const form = around ?? (forms.length === 1 ? forms[0] : null);
  if (form && submitForm(form)) return true;

  const save = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) => enabled(b) && SAVE_LABEL.test((b.textContent || b.getAttribute('aria-label') || '').trim()));
  if (save) { save.click(); return true; }
  return false;
}

/** The main action of a dialog: a marked button, the form's submit, or the last primary/danger button. */
export function dialogPrimary(panel: HTMLElement): HTMLElement | null {
  const marked = panel.querySelector<HTMLElement>('[data-modal-primary]');
  if (marked && enabled(marked)) return marked;
  const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>('button')).filter(enabled);
  return buttons.filter((b) => b.type === 'submit').pop()
    ?? buttons.filter((b) => b.dataset.variant === 'primary' || b.dataset.variant === 'danger').pop()
    ?? null;
}

/**
 * Submits a dialog: its form when it has one, else its primary button.
 * `guessPrimary: false` only presses a button marked `data-modal-primary`
 * (used for dialogs built outside the design system).
 */
export function triggerDialogSubmit(panel: HTMLElement, { guessPrimary = true }: { guessPrimary?: boolean } = {}): boolean {
  const active = document.activeElement;
  const form = (active && panel.contains(active) ? active.closest('form') : null) ?? panel.querySelector('form');
  if (form && submitForm(form)) return true;
  const primary = guessPrimary ? dialogPrimary(panel) : panel.querySelector<HTMLElement>('[data-modal-primary]:not([disabled])');
  if (primary) { primary.click(); return true; }
  return false;
}
