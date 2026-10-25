/**
 * App-wide keys, mounted once by AppShell:
 *
 *   G then D/P/S/I/C/R/E   go to Dashboard, POS, Sales, Products, Customers,
 *                          Reports, Expenses (G alone still opens the page
 *                          guide after a short pause)
 *   /                      focus the page search box
 *   ?                      shortcuts overlay
 *   Ctrl/⌘+S               save the form on the page
 *   Esc                    in a search box: clear, then leave it; in another
 *                          field: leave it; otherwise go back on pages with a
 *                          back arrow
 *   Enter                  next field inside `data-enter-next` quick-entry forms
 *   ← → Home End           move between tabs of any tab strip
 *
 * Pages keep priority: the defaults for /, ?, Ctrl+S and Esc run only when no
 * page handler took the key first (see whenUnhandled).
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { FIELD, findSearchBox, focusables, hasModifier, isDialogOpen, isMod, isSearchBox, isTyping, isVisible, whenUnhandled } from '@/design-system/keyboard/keys';
import { triggerSave } from '@/design-system/keyboard/submit';
import { moveInTabs } from '@/design-system/keyboard/useMenuKeys';

export const GO_TO = [
  { key: 'd', to: '/dashboard', label: 'Dashboard' },
  { key: 'p', to: '/pos', label: 'POS counter' },
  { key: 's', to: '/sales', label: 'Sales history' },
  { key: 'i', to: '/products', label: 'Inventory / Products' },
  { key: 'c', to: '/customers', label: 'Customers' },
  { key: 'r', to: '/reports', label: 'Reports' },
  { key: 'e', to: '/expenses', label: 'Expenses' },
] as const;

const CHORD_MS = 900;
/** Clears a React-controlled input the same way typing would. */
function clearInput(el: HTMLInputElement) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/** The page's back arrow: HeroBack, PageHeader's back link, a marked one, or a link led by a left arrow icon. */
function backLink(root: HTMLElement): HTMLElement | null {
  const marked = Array.from(root.querySelectorAll<HTMLElement>('[data-page-back],a[aria-label$="par wapas"]')).find(isVisible);
  if (marked) return marked;
  return Array.from(root.querySelectorAll<HTMLElement>('a[href]')).find((a) =>
    isVisible(a) && !!a.firstElementChild?.matches('svg.lucide-arrow-left,svg.lucide-chevron-left')) ?? null;
}

export function useGlobalKeys(mainRef: RefObject<HTMLElement | null>, onHelp: () => void) {
  const navigate = useNavigate();
  const [chord, setChord] = useState(false);
  const timer = useRef<number | null>(null);
  const replaying = useRef(false);
  const helpRef = useRef(onHelp);
  helpRef.current = onHelp;

  useEffect(() => {
    const endChord = () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      setChord(false);
    };
    // Hands the held "G" to the page (it opens the page guide there).
    const replayG = () => {
      replaying.current = true;
      try {
        (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true, cancelable: true }));
      } finally { replaying.current = false; }
    };

    const onKey = (e: KeyboardEvent) => {
      if (replaying.current || e.isComposing) return;
      const main = mainRef.current;

      // G-chord, second key.
      if (timer.current) {
        endChord();
        const target = !hasModifier(e) && GO_TO.find((g) => g.key === e.key.toLowerCase());
        if (target) { e.preventDefault(); e.stopImmediatePropagation(); navigate(target.to); return; }
        if (e.key !== 'Shift') replayG();
      }

      const plain = !hasModifier(e);
      // A region marked data-own-keys (the POS bill lines) uses plain letter keys itself.
      const typing = isTyping() || !!(document.activeElement as HTMLElement | null)?.closest?.('[data-own-keys]');
      const dialog = isDialogOpen();

      // G-chord, first key.
      if (plain && !e.shiftKey && (e.key === 'g' || e.key === 'G') && !e.repeat && !typing && !dialog) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setChord(true);
        timer.current = window.setTimeout(() => { endChord(); replayG(); }, CHORD_MS);
        return;
      }

      if (plain && e.key === '?' && !typing && !dialog) {
        whenUnhandled(e, () => { e.preventDefault(); helpRef.current(); });
        return;
      }

      if (!main) return;

      if (plain && e.key === '/' && !typing && !dialog) {
        whenUnhandled(e, () => {
          const search = findSearchBox(main);
          if (!search) return;
          e.preventDefault();
          search.focus();
          search.select();
        });
        return;
      }

      // Ctrl/⌘+S: save the page form. Dialogs handle their own.
      if (isMod(e) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 's' && !dialog) {
        whenUnhandled(e, () => { e.preventDefault(); triggerSave(main); });
        return;
      }

      if (e.key === 'Escape' && plain && !dialog) {
        const active = document.activeElement as HTMLElement | null;
        whenUnhandled(e, () => {
          if (active && typing && main.contains(active)) {
            e.preventDefault();
            if (isSearchBox(active) && active.value) clearInput(active);
            else active.blur();
            return;
          }
          // Nothing focused and no menu open: go back where the page has a back arrow.
          if (typing || document.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
          const back = backLink(main);
          if (back) { e.preventDefault(); back.click(); }
        });
        return;
      }

      // Arrow keys inside any tab strip or segmented control, also hand-built ones.
      if (plain && !e.shiftKey) {
        const t = e.target as HTMLElement;
        const group = t.matches?.('[role="tab"],[role="radio"]') ? t.closest<HTMLElement>('[role="tablist"],[role="radiogroup"]') : null;
        if (group) {
          whenUnhandled(e, () => { if (moveInTabs(group, e.key)) e.preventDefault(); });
          return;
        }
      }

      // Enter moves to the next field in quick-entry forms.
      if (e.key === 'Enter' && plain && !e.shiftKey) {
        const field = e.target as HTMLElement;
        const box = field.closest?.<HTMLElement>('[data-enter-next]');
        if (!box || field.tagName !== 'INPUT' || !field.matches(FIELD)) return;
        whenUnhandled(e, () => {
          const fields = focusables(box, `${FIELD},button[data-enter-stop]`).filter((f) => !(f as HTMLInputElement).readOnly);
          const next = fields[fields.indexOf(field) + 1];
          if (!next) return;
          e.preventDefault();
          next.focus();
          if (next instanceof HTMLInputElement) next.select();
        });
      }
    };

    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('keydown', onKey, true); endChord(); };
  }, [mainRef, navigate]);

  return { chord };
}
