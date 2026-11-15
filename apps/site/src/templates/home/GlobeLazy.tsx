'use client';

/**
 * Loads the globe island only in the browser, in its own chunk, and only once
 * the services band is about a screen away. The globe builds its dot map and
 * starts drawing when it mounts, so mounting it during page load would spend
 * main-thread time on a picture nobody can see yet. The placeholder keeps the
 * same square box, so nothing shifts when it arrives.
 */
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import fx from './fx.module.css';

const Globe = dynamic(() => import('./Globe').then((m) => m.Globe), {
  ssr: false,
  loading: () => <div aria-hidden className={fx.globeWrap} />,
});

/** How far ahead of the viewport the globe starts loading. */
const AHEAD = '100% 0px';

export function GlobeLazy() {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setNear(true);
      },
      { rootMargin: AHEAD },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return near ? <Globe /> : <div ref={ref} aria-hidden className={fx.globeWrap} />;
}
