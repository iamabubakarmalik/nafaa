'use client';

/**
 * Turns on the Nastaliq headings once the page has loaded: fetches the face
 * (its Arabic and Latin files), then adds one style rule that gives h1-h3
 * the Nastaliq stack. Until then headings show in Naskh, so the large
 * Nastaliq file stays off the first paint. A rule that matches only the
 * headings restyles only them (a class on <html> would restyle the whole
 * page). Runs again after client-side navigation into /ur, where an inline
 * script would not; the rule is added once and applies only under /ur.
 */
import { useEffect } from 'react';

const RULE_ID = 'nafaa-nastaliq';

export function NastaliqLoader({ family, stack }: { family: string; stack: string }) {
  useEffect(() => {
    if (document.getElementById(RULE_ID)) return;
    const apply = () => {
      if (document.getElementById(RULE_ID)) return;
      const style = document.createElement('style');
      style.id = RULE_ID;
      style.textContent = `html[lang='ur'] :is(h1,h2,h3):not([dir='ltr'] *){font-family:${stack}}`;
      document.head.appendChild(style);
    };
    const load = () => {
      document.fonts.load(`400 1em ${family}`, 'ا a').then(apply, apply);
    };
    if (document.readyState === 'complete') load();
    else window.addEventListener('load', load, { once: true });
    return () => window.removeEventListener('load', load);
  }, [family, stack]);
  return null;
}
