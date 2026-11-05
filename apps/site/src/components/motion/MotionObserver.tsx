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
 * It starts once the page has loaded and the main thread is idle, or at the
 * first scroll, tap or key press if that comes sooner, so loops never compete
 * with the first paint and hydration. Until then every element shows its
 * resting frame. The first IntersectionObserver report tells which elements
 * were on screen at that moment, so nothing forces a layout.
 *
 * With reduced motion requested it does nothing, and the CSS shows the final
 * state. It re-scans after client-side navigation.
 */
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const MAX_LOOPS = 3;
/** Longest wait for an idle moment after load before motion starts anyway. */
const IDLE_TIMEOUT_MS = 2500;
const WAKE_EVENTS = ['scroll', 'pointerdown', 'keydown', 'touchstart'] as const;

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
    let observer: IntersectionObserver | undefined;
    let idleHandle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const onVisibility = () => html.toggleAttribute('data-motion-paused', document.hidden);

    const start = () => {
      if (observer) return;
      cancelWait();
      const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-animate]'));
      const visible = new Set<Element>();
      const reported = new WeakSet<Element>();

      const apply = () => {
        let loops = 0;
        for (const el of elements) {
          const isLoop = el.dataset.animate !== 'once';
          const run = visible.has(el) && (!isLoop || loops < MAX_LOOPS);
          if (run && isLoop) loops += 1;
          el.toggleAttribute('data-inview', run);
        }
      };

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const el = entry.target;
            const first = !reported.has(el);
            reported.add(el);
            if (entry.isIntersecting) {
              visible.add(el);
              // On screen in its first report: shown drawn, never replayed.
              if (!el.hasAttribute('data-seen')) el.setAttribute('data-seen', first ? 'initial' : 'later');
            } else {
              visible.delete(el);
            }
          }
          // Armed after the first report, so elements already on screen are
          // marked before the waiting state (motion.css) could hide them.
          if (!html.hasAttribute('data-motion')) html.setAttribute('data-motion', '');
          apply();
        },
        { threshold: 0.2 },
      );
      for (const el of elements) observer.observe(el);
      onVisibility();
      document.addEventListener('visibilitychange', onVisibility);
    };

    const schedule = () => {
      if ('requestIdleCallback' in window) idleHandle = window.requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
      else timer = setTimeout(start, 1200);
    };

    function cancelWait() {
      window.removeEventListener('load', schedule);
      for (const type of WAKE_EVENTS) window.removeEventListener(type, start);
      if (idleHandle !== undefined) window.cancelIdleCallback(idleHandle);
      if (timer !== undefined) clearTimeout(timer);
    }

    for (const type of WAKE_EVENTS) window.addEventListener(type, start, { once: true, passive: true });
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    return () => {
      cancelWait();
      observer?.disconnect();
      // The next page waits for its own start, showing resting frames until then.
      html.removeAttribute('data-motion');
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}
