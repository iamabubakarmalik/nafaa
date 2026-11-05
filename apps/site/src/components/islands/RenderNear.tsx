'use client';

/**
 * RenderNear: renders its children once the surrounding section is about a
 * screen away from the viewport. For decorative, aria-hidden pieces below the
 * fold (illustration mock-ups, the duplicate row of a ticker), so the first
 * HTML, the DOM and hydration stay small. Until then it leaves an empty
 * hidden placeholder; the container around it keeps the layout.
 *
 * The children are still server-rendered elements in the page payload, so
 * nothing changes for the content once shown. Not for text people or search
 * engines need: that must stay in the server HTML.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** How far ahead of the viewport the section starts rendering. */
const AHEAD = '100% 0px';

export function RenderNear({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setShow(true);
      return;
    }
    const target = el.closest('section') ?? el.parentElement ?? el;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setShow(true);
      },
      { rootMargin: AHEAD },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return show ? <>{children}</> : <span ref={ref} hidden />;
}
