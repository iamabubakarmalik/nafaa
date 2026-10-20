'use client';

/**
 * MotionObserver: the only motion island (ARCH 4.4). Mount once in the root
 * layout. It renders nothing.
 *
 * It watches every `[data-animate]` element and sets the attributes that
 * src/styles/motion.css keys on:
 * - `data-seen="initial"` on elements already on screen when it starts, so
 *   they stay fully drawn instead of flashing empty and redrawing;
 * - `data-seen="later"` the first time an element scrolls into view (one-shot
 *   draw and pop animations run once);
 * - `data-inview` while visible, which runs loops. At most MAX_LOOPS looping
 *   elements run at once (earliest in the document wins);
 * - `data-motion` on <html> once armed, and `data-motion-paused` while the tab
 *   is hidden.
 *
 * With reduced motion requested it does nothing, and the CSS shows the final
 * state. It re-scans after client-side navigation.
 */
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const MAX_LOOPS = 3;

export function MotionObserver() {
  const pathname = usePathname();

  useEffect(() => {
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const html = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-animate]'));
    const viewportHeight = window.innerHeight;

    for (const el of elements) {
      if (el.hasAttribute('data-seen')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.top < viewportHeight && rect.bottom > 0) el.setAttribute('data-seen', 'initial');
    }
    html.setAttribute('data-motion', '');

    const visible = new Set<Element>();
    const apply = () => {
      let loops = 0;
      for (const el of elements) {
        const isLoop = el.dataset.animate !== 'once';
        const run = visible.has(el) && (!isLoop || loops < MAX_LOOPS);
        if (run && isLoop) loops += 1;
        el.toggleAttribute('data-inview', run);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target);
            if (!entry.target.hasAttribute('data-seen')) entry.target.setAttribute('data-seen', 'later');
          } else {
            visible.delete(entry.target);
          }
        }
        apply();
      },
      { threshold: 0.2 },
    );
    for (const el of elements) observer.observe(el);

    const onVisibility = () => html.toggleAttribute('data-motion-paused', document.hidden);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}
