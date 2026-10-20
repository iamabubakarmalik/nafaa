'use client';

/**
 * Loads the globe island only in the browser and in its own chunk, so the
 * canvas code stays out of the page's first-load JavaScript. The placeholder
 * keeps the same square box, so nothing shifts when it arrives.
 */
import dynamic from 'next/dynamic';
import fx from './fx.module.css';

export const GlobeLazy = dynamic(() => import('./Globe').then((m) => m.Globe), {
  ssr: false,
  loading: () => <div aria-hidden className={fx.globeWrap} />,
});
