/**
 * Urdu fonts (ARCH 4.2), imported only by app/ur, so the files and their
 * @font-face rules load on Urdu pages alone.
 *
 * Two faces:
 * - Noto Naskh Arabic for all running text (body, lists, buttons, menus,
 *   cards, tables, forms). Naskh shapes and lays out far faster than
 *   Nastaliq and reads well at small sizes.
 * - Noto Nastaliq Urdu for headings only (h1-h3: hero headline and section
 *   titles), where the calligraphic style carries the page.
 *
 * next/font writes a face for every subset; `subsets` only picks the files
 * that are preloaded. The Latin face covers the space and basic punctuation,
 * so every Urdu line needs it as well as the Arabic one. Both Naskh files
 * are preloaded: the first screen is laid out once, in its final text font.
 * Nastaliq is not preloaded and not used by the CSS at first: headings show
 * in Naskh until app/ur/NastaliqLoader has fetched it after the page load,
 * so its large Arabic file (about 240 KB) stays off the first paint. Display
 * swap, variable weight, no generated fallback face (adjustFontFallback:
 * false).
 */
import { Noto_Naskh_Arabic, Noto_Nastaliq_Urdu } from 'next/font/google';

export const naskh = Noto_Naskh_Arabic({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  variable: '--font-naskh',
});

export const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-nastaliq',
});

/** The family stack for Urdu running text: --font-urdu (globals.css `[lang='ur']`). */
export const URDU_FONT_STACK = `${naskh.style.fontFamily}, var(--font-inter), system-ui, sans-serif`;

/** The family stack for Urdu headings (h1-h3), applied by app/ur/NastaliqLoader. */
export const URDU_DISPLAY_STACK = `${nastaliq.style.fontFamily}, ${naskh.style.fontFamily}, var(--font-inter), system-ui, sans-serif`;


/** The Nastaliq family name, for the loader island (app/ur/NastaliqLoader). */
export const NASTALIQ_FAMILY = nastaliq.style.fontFamily;
