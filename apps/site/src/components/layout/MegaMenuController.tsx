'use client';

/**
 * Behaviour for the server-rendered mega menu (island, renders nothing):
 * - click or tap on a trigger toggles its panel (touch devices have no hover,
 *   and Safari does not focus buttons on click) and keeps aria-expanded true;
 * - Escape closes the open panel and keeps focus on its trigger (data-closed
 *   hides the panel until focus or the pointer leaves);
 * - a click outside, or a navigation, closes it.
 */
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function closeAll(except?: Element | null) {
  document.querySelectorAll<HTMLElement>('[data-mega-item][data-open]').forEach((item) => {
    if (item === except) return;
    item.removeAttribute('data-open');
    item.querySelector('[data-mega-trigger]')?.setAttribute('aria-expanded', 'false');
  });
}

export function MegaMenuController() {
  const pathname = usePathname();

  useEffect(() => {
    closeAll();
    // Also drop focus from a trigger so :focus-within does not keep the panel open after navigating.
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[data-mega-item]')) active.blur();
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const trigger = target?.closest<HTMLElement>('[data-mega-trigger]');
      if (trigger) {
        const item = trigger.closest<HTMLElement>('[data-mega-item]');
        if (!item) return;
        const open = !item.hasAttribute('data-open');
        item.removeAttribute('data-closed');
        closeAll(item);
        item.toggleAttribute('data-open', open);
        trigger.setAttribute('aria-expanded', String(open));
        if (!open) trigger.blur();
        return;
      }
      if (!target?.closest('[data-mega-item]')) closeAll();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const item = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-mega-item]');
      closeAll();
      if (item) {
        // Keep focus on the trigger but hide the panel until focus or the pointer leaves the item.
        item.setAttribute('data-closed', '');
        item.querySelector<HTMLElement>('[data-mega-trigger]')?.focus();
      }
    };
    const release = (event: FocusEvent | MouseEvent) => {
      const item = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-mega-item][data-closed]') : null;
      const next = event.relatedTarget instanceof Node ? event.relatedTarget : null;
      if (item && !(next && item.contains(next))) item.removeAttribute('data-closed');
    };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusout', release);
    document.addEventListener('mouseout', release);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusout', release);
      document.removeEventListener('mouseout', release);
    };
  }, []);

  return null;
}
