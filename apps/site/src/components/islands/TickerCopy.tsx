'use client';

/**
 * TickerCopy: the second, aria-hidden row of a looping ticker, copied in the
 * browser from the row just before it once the section is about a screen
 * away. The copy exists only so the loop has no gap, so it stays out of the
 * server HTML and the page payload: the page carries the visible row once.
 *
 * The copy drops titles and ids and takes its links out of the tab order.
 * Until it is filled the list is hidden, as the RenderNear placeholder was.
 */
import { useEffect, useRef } from 'react';

const AHEAD = '100% 0px';

export function TickerCopy({ className }: { className?: string }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    const source = el?.previousElementSibling;
    if (!el || !source) return;
    const fill = () => {
      el.innerHTML = source.innerHTML;
      for (const node of el.querySelectorAll('[title],[id]')) {
        node.removeAttribute('title');
        node.removeAttribute('id');
      }
      for (const node of el.querySelectorAll('a,button')) node.setAttribute('tabindex', '-1');
      el.hidden = false;
    };
    if (typeof IntersectionObserver === 'undefined') {
      fill();
      return;
    }
    const target = el.closest('section') ?? el.parentElement ?? el;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        fill();
      },
      { rootMargin: AHEAD },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return <ul ref={ref} className={className} aria-hidden hidden />;
}
